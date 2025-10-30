import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  getJobById,
  updateJobStatus,
  updateJobProgress,
  updateDataset,
  createCompressedOutput
} from '../../lib/db.js';
import { downloadDatasetFrames } from '../../lib/huggingface.js';

/**
 * Process a dataset compression job
 * POST /api/process/:jobId
 *
 * This endpoint handles the actual processing work:
 * 1. Download frames from HuggingFace
 * 2. Run compression algorithm (mock for MVP)
 * 3. Store results in database
 *
 * Note: This runs within Vercel's 10-50s timeout, so we limit frame count
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jobId } = req.query;

  if (!jobId || Array.isArray(jobId)) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  const jobIdNum = parseInt(jobId, 10);
  if (isNaN(jobIdNum)) {
    return res.status(400).json({ error: 'Job ID must be a number' });
  }

  try {
    // Get job details
    const job = await getJobById(jobIdNum);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!job.dataset) {
      return res.status(400).json({ error: 'Job has no associated dataset' });
    }

    const { dataset } = job;
    const huggingfaceId = dataset.huggingface_id;

    console.log(`[PROCESS] Starting job ${jobIdNum} for dataset ${huggingfaceId}`);

    // Start processing - return immediately, continue in background
    // Note: We still have timeout limits, but we'll process what we can
    res.status(202).json({
      message: 'Processing started',
      jobId: jobIdNum,
      status: 'processing'
    });

    // Continue processing in background (within timeout limits)
    processJobInBackground(jobIdNum, dataset.id, huggingfaceId).catch((error) => {
      console.error(`[PROCESS] Job ${jobIdNum} failed:`, error);
    });

  } catch (error) {
    console.error('[PROCESS] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Background processing function
 * This continues after response is sent (within timeout limits)
 */
async function processJobInBackground(
  jobId: number,
  datasetId: number,
  huggingfaceId: string
): Promise<void> {
  try {
    // Update to processing
    await updateJobStatus(jobId, 'processing', 10, 'Downloading dataset from HuggingFace');

    // Create temp directory
    const jobDir = join(tmpdir(), `mechgen-job-${jobId}`);
    await mkdir(jobDir, { recursive: true });

    // Download frames from HuggingFace (limit to 10 for MVP/timeout safety)
    console.log(`[PROCESS] Downloading from HuggingFace: ${huggingfaceId}`);
    const maxFrames = 10; // Keep low for Vercel timeout
    const dataset = await downloadDatasetFrames(huggingfaceId, jobDir, maxFrames);

    // Update dataset metadata
    await updateDataset(datasetId, {
      total_frames: dataset.totalFrames,
      metadata: dataset.metadata
    });

    console.log(`[PROCESS] Downloaded ${dataset.frames.length} frames`);

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

      console.log(`[PROCESS] Compressed frame ${i + 1}/${dataset.frames.length}: ${frame.filename}`);
    }

    // Complete
    await updateJobStatus(
      jobId,
      'completed',
      100,
      `Successfully compressed ${dataset.frames.length} frames from ${huggingfaceId}`
    );

    console.log(`[PROCESS] Job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`[PROCESS] Job ${jobId} background processing failed:`, error);

    await updateJobStatus(
      jobId,
      'failed',
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Unknown processing error'
    );
  }
}
