import { mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  updateJobStatus,
  updateJobProgress,
  updateDataset,
  createCompressedOutput
} from './db';

/**
 * Download frames from HuggingFace dataset
 * This is a placeholder - implement actual HuggingFace Hub API integration
 */
async function downloadDatasetFrames(
  huggingfaceId: string,
  _outputDir: string
): Promise<{ frames: string[]; totalFrames: number; metadata: any }> {
  // TODO: Implement actual HuggingFace Hub API integration
  // For now, return empty/mock data

  console.log(`[STUB] Downloading dataset: ${huggingfaceId}`);

  // Placeholder: In real implementation, use @huggingface/hub or REST API
  // to fetch dataset files and metadata

  return {
    frames: [], // Array of file paths
    totalFrames: 0,
    metadata: {
      huggingface_id: huggingfaceId,
      note: 'Placeholder - no actual download performed'
    }
  };
}

/**
 * STUB: Mock compression algorithm
 * This replaces the Python subprocess version that doesn't work in Vercel
 *
 * TODO Phase 2: Replace with external compute service (Modal/Railway)
 */
async function runCompressionAlgorithm(
  _framesDir: string,
  framePaths: string[]
): Promise<any> {
  console.log(`[STUB] Compressing ${framePaths.length} frames (mock)`);

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return mock compression results
  const results = framePaths.map((_path, index) => ({
    frame_index: index,
    status: 'success',
    original_size: 100000 + Math.floor(Math.random() * 50000), // Mock size
    compressed_size: 10000 + Math.floor(Math.random() * 5000), // Mock compressed size
    compression_ratio: 10.0,
    gaussian_latent: null, // No actual compression in stub
    metadata: {
      algorithm: 'stub_placeholder',
      version: '0.1.0',
      note: 'This is a stub - no actual compression performed. Waiting for Phase 2 external compute service.'
    }
  }));

  return {
    status: 'completed',
    total_frames: framePaths.length,
    results,
    metadata: {
      algorithm: 'gaussian_splatting_stub',
      version: '0.1.0',
      note: 'Stub implementation - replace with external compute service'
    }
  };
}

/**
 * Main processing function for dataset compression
 * This runs asynchronously after job creation
 *
 * CURRENT: Stub implementation for Vercel compatibility
 * TODO Phase 2: Move to external compute service (Modal/Railway)
 */
export async function processDataset(
  jobId: number,
  datasetId: number,
  huggingfaceId: string
): Promise<void> {
  try {
    console.log(`[STUB] Starting processing for job ${jobId}, dataset ${datasetId}`);

    // Update job to processing status
    await updateJobStatus(jobId, 'processing', 0, 'Initializing (stub mode)');

    // Create temporary directory for this job
    const jobDir = join(tmpdir(), `mechgen-job-${jobId}`);
    await mkdir(jobDir, { recursive: true });

    // Step 1: Download dataset from HuggingFace (stub)
    await updateJobProgress(jobId, 10, 'Downloading dataset from HuggingFace (stub)');
    const { frames, totalFrames, metadata } = await downloadDatasetFrames(
      huggingfaceId,
      jobDir
    );

    // Update dataset with metadata
    await updateDataset(datasetId, {
      total_frames: totalFrames,
      metadata
    });

    if (frames.length === 0) {
      // No frames to process - create mock data for testing
      console.log(`[STUB] No frames downloaded, creating mock compression data for job ${jobId}`);

      // Create 3 mock frames for demonstration
      const mockFramePaths = [
        '/tmp/mock_frame_0.jpg',
        '/tmp/mock_frame_1.jpg',
        '/tmp/mock_frame_2.jpg'
      ];

      await updateJobProgress(jobId, 30, 'Running Gaussian splatting compression (stub)');
      const compressionResult = await runCompressionAlgorithm(jobDir, mockFramePaths);

      // Step 3: Save compressed outputs to database
      await updateJobProgress(jobId, 70, 'Saving compressed outputs');

      if (compressionResult.results) {
        for (const frameResult of compressionResult.results) {
          if (frameResult.status === 'success') {
            await createCompressedOutput(
              jobId,
              frameResult.frame_index,
              frameResult.original_size,
              frameResult.compressed_size,
              frameResult.gaussian_latent,
              frameResult.metadata
            );
          }
        }
      }

      // Update dataset with mock frame count
      await updateDataset(datasetId, {
        total_frames: mockFramePaths.length
      });
    } else {
      // If we had real frames, process them
      await updateJobProgress(jobId, 30, 'Running Gaussian splatting compression (stub)');
      const compressionResult = await runCompressionAlgorithm(jobDir, frames);

      await updateJobProgress(jobId, 70, 'Saving compressed outputs');

      if (compressionResult.results) {
        for (const frameResult of compressionResult.results) {
          if (frameResult.status === 'success') {
            await createCompressedOutput(
              jobId,
              frameResult.frame_index,
              frameResult.original_size,
              frameResult.compressed_size,
              frameResult.gaussian_latent,
              frameResult.metadata
            );
          }
        }
      }
    }

    // Step 4: Complete job
    await updateJobStatus(
      jobId,
      'completed',
      100,
      'Compression completed (stub mode - waiting for Phase 2 external compute)'
    );
    console.log(`[STUB] Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`[STUB] Job ${jobId} failed:`, error);
    await updateJobStatus(
      jobId,
      'failed',
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
