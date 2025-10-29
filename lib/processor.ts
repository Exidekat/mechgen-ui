import { spawn } from 'child_process';
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

  console.log(`Downloading dataset: ${huggingfaceId}`);

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
 * Run Python compression algorithm on frames
 */
async function runCompressionAlgorithm(
  _framesDir: string,
  framePaths: string[]
): Promise<any> {
  return new Promise((resolve, reject) => {
    // Prepare input JSON for Python script
    const inputData = {
      frames: framePaths.map((path, index) => ({
        path,
        index
      }))
    };

    // Path to Python script
    const pythonScript = join(process.cwd(), 'algo', 'main.py');

    // Determine Python executable
    // Try to use ltx conda environment first (per user's global instructions)
    const pythonExe = process.env.PYTHON_PATH || 'python3';

    console.log(`Spawning Python process: ${pythonExe} ${pythonScript}`);

    // Spawn Python process
    const pythonProcess = spawn(pythonExe, [pythonScript], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Python stderr:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error}`));
        }
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });

    // Write input data to stdin
    pythonProcess.stdin.write(JSON.stringify(inputData));
    pythonProcess.stdin.end();
  });
}

/**
 * Main processing function for dataset compression
 * This runs asynchronously after job creation
 */
export async function processDataset(
  jobId: number,
  datasetId: number,
  huggingfaceId: string
): Promise<void> {
  try {
    console.log(`Starting processing for job ${jobId}, dataset ${datasetId}`);

    // Update job to processing status
    await updateJobStatus(jobId, 'processing', 0, 'Initializing');

    // Create temporary directory for this job
    const jobDir = join(tmpdir(), `mechgen-job-${jobId}`);
    await mkdir(jobDir, { recursive: true });

    // Step 1: Download dataset from HuggingFace
    await updateJobProgress(jobId, 10, 'Downloading dataset from HuggingFace');
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
      // Placeholder: No actual frames downloaded
      console.log(`No frames to process for job ${jobId} (placeholder mode)`);
      await updateJobStatus(
        jobId,
        'completed',
        100,
        'Completed (placeholder - no frames processed)'
      );
      return;
    }

    // Step 2: Run compression algorithm
    await updateJobProgress(jobId, 30, 'Running Gaussian splatting compression');
    const compressionResult = await runCompressionAlgorithm(jobDir, frames);

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

    // Step 4: Complete job
    await updateJobStatus(jobId, 'completed', 100, 'Compression completed');
    console.log(`Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    await updateJobStatus(
      jobId,
      'failed',
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
