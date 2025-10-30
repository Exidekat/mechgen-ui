/**
 * Dataset Processing Module
 *
 * This module handles background processing for compression jobs.
 * Processing runs asynchronously after job creation.
 *
 * Architecture:
 * 1. User submits dataset → POST /api/datasets
 * 2. Job created → processDataset() called (non-blocking)
 * 3. Frontend polls GET /api/jobs/:jobId for status
 * 4. Processing downloads HuggingFace data & compresses
 * 5. Results stored in database
 */

import { mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  updateJobStatus,
  updateJobProgress,
  updateDataset,
  createCompressedOutput
} from './db.js';
import { downloadDatasetFrames } from './huggingface.js';

/**
 * Timeout utility - wraps a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation "${operationName}" timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Process a dataset compression job
 *
 * This function runs asynchronously after job creation.
 * It downloads frames from HuggingFace, applies compression, and stores results.
 *
 * @param jobId - Processing job ID
 * @param datasetId - Dataset ID
 * @param huggingfaceId - HuggingFace dataset identifier (e.g., "author/dataset")
 */
export async function processDataset(
  jobId: number,
  datasetId: number,
  huggingfaceId: string
): Promise<void> {
  const overallTimeout = 40000; // 40 seconds - leave buffer for Vercel's max timeout
  console.log(`[PROCESSOR] Starting job ${jobId} for dataset ${huggingfaceId} (timeout: ${overallTimeout}ms)`);

  try {
    // Wrap entire processing in timeout
    await withTimeout(
      (async () => {
        // Update to processing status
        await updateJobStatus(jobId, 'processing', 10, 'Downloading dataset from HuggingFace');
        console.log(`[PROCESSOR] Updated status to processing`);

        // Create temp directory
        const jobDir = join(tmpdir(), `mechgen-job-${jobId}`);
        await mkdir(jobDir, { recursive: true });
        console.log(`[PROCESSOR] Created temp directory: ${jobDir}`);

        // Download frames from HuggingFace (limit to 10 for MVP/timeout safety)
        console.log(`[PROCESSOR] About to download from HuggingFace: ${huggingfaceId}`);
        const maxFrames = 10; // Keep low for Vercel timeout

        let dataset;
        try {
          dataset = await downloadDatasetFrames(huggingfaceId, jobDir, maxFrames);
          console.log(`[PROCESSOR] Download completed successfully`);
        } catch (downloadError) {
          console.error(`[PROCESSOR] Download failed:`, downloadError);
          throw downloadError; // Re-throw to be caught by outer try-catch
        }

        // Update dataset metadata
        await updateDataset(datasetId, {
          total_frames: dataset.totalFrames,
          metadata: dataset.metadata
        });

        console.log(`[PROCESSOR] Downloaded ${dataset.frames.length} frames`);

        if (dataset.frames.length === 0) {
          await updateJobStatus(
            jobId,
            'failed',
            undefined,
            undefined,
            'No image/video files found in HuggingFace dataset. Make sure the dataset contains .jpg, .png, .mp4, or other media files.'
          );
          return;
        }

        // Process each frame with mock compression
        await updateJobProgress(jobId, 30, `Compressing ${dataset.frames.length} frames`);

        for (let i = 0; i < dataset.frames.length; i++) {
          const frame = dataset.frames[i];
          const progress = 30 + Math.floor((i / dataset.frames.length) * 60);

          await updateJobProgress(
            jobId,
            progress,
            `Processing frame ${i + 1}/${dataset.frames.length}`
          );

          // Mock compression - generate realistic-looking data
          const originalSize = 100000 + Math.floor(Math.random() * 100000);
          const compressionRatio = 8 + Math.random() * 4; // 8-12x compression
          const compressedSize = Math.floor(originalSize / compressionRatio);

          await createCompressedOutput(
            jobId,
            frame.index,
            originalSize,
            compressedSize,
            undefined, // No actual gaussian latent in mock
            {
              algorithm: 'mock_gaussian_splatting',
              version: '0.2.0',
              filename: frame.filename,
              note: 'Mock compression - replace with real algorithm in production'
            }
          );

          console.log(`[PROCESSOR] Compressed frame ${i + 1}/${dataset.frames.length}: ${frame.filename}`);
        }

        // Complete
        await updateJobStatus(
          jobId,
          'completed',
          100,
          `Successfully compressed ${dataset.frames.length} frames from ${huggingfaceId}`
        );

        console.log(`[PROCESSOR] Job ${jobId} completed successfully`);
      })(),
      overallTimeout,
      `Process dataset ${huggingfaceId}`
    );

  } catch (error) {
    console.error(`[PROCESSOR] Job ${jobId} failed:`, error);

    await updateJobStatus(
      jobId,
      'failed',
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Unknown processing error'
    );
  }
}
