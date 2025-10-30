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
  try {
    console.log(`[PROCESSOR] Starting job ${jobId} for dataset ${huggingfaceId}`);

    // Update to processing status
    await updateJobStatus(jobId, 'processing', 10, 'Downloading dataset from HuggingFace');

    // Create temp directory
    const jobDir = join(tmpdir(), `mechgen-job-${jobId}`);
    await mkdir(jobDir, { recursive: true });

    // Download frames from HuggingFace (limit to 10 for MVP/timeout safety)
    console.log(`[PROCESSOR] Downloading from HuggingFace: ${huggingfaceId}`);
    const maxFrames = 10; // Keep low for Vercel timeout
    const dataset = await downloadDatasetFrames(huggingfaceId, jobDir, maxFrames);

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
