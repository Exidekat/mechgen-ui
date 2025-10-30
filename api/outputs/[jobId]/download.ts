import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getJobById, getOutputsByJobId, getCompressionStats } from '../../../lib/db.js';
import { ensureDatabase } from '../../../lib/db-init.js';

/**
 * Download compressed dataset
 * GET /api/outputs/:jobId/download
 *
 * Returns the compressed dataset as a downloadable file.
 * For MVP with mock compression, returns JSON with metadata.
 * For production with real compression, will return .tar.gz with gaussian latents.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure database tables exist
    await ensureDatabase();

    const { jobId } = req.query;

    if (!jobId || Array.isArray(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID' });
    }

    const jobIdNum = parseInt(jobId, 10);
    if (isNaN(jobIdNum)) {
      return res.status(400).json({ error: 'Job ID must be a number' });
    }

    // Get job details
    const job = await getJobById(jobIdNum);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!job.dataset) {
      return res.status(404).json({ error: 'Job has no associated dataset' });
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      return res.status(400).json({
        error: 'Job not completed',
        message: 'Cannot download dataset until processing is complete',
        status: job.status
      });
    }

    // Get compressed outputs and stats
    const outputs = await getOutputsByJobId(jobIdNum);
    const stats = await getCompressionStats(jobIdNum);

    if (outputs.length === 0) {
      return res.status(404).json({
        error: 'No compressed outputs found',
        message: 'This job completed without generating any compressed frames'
      });
    }

    // Build download package
    const downloadData = {
      job: {
        id: job.id,
        status: job.status,
        started_at: job.started_at,
        completed_at: job.completed_at,
      },
      dataset: {
        id: job.dataset.id,
        huggingface_id: job.dataset.huggingface_id,
        name: job.dataset.name,
        total_frames: job.dataset.total_frames,
        metadata: job.dataset.metadata,
      },
      compression: {
        stats,
        frames: outputs.map(output => ({
          frame_index: output.frame_index,
          original_size: output.original_size,
          compressed_size: output.compressed_size,
          compression_ratio: output.compression_ratio,
          metadata: output.metadata,
          // Note: gaussian_latent would be included here for real compression
          // gaussian_latent_base64: output.gaussian_latent ? output.gaussian_latent.toString('base64') : null,
        })),
      },
      generated_at: new Date().toISOString(),
      format_version: '1.0.0',
      notes: 'This is mock compression data. In production, this endpoint will return a .tar.gz with actual gaussian latent representations.',
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="compressed-dataset-job-${jobIdNum}.json"`);

    return res.status(200).json(downloadData);

  } catch (error) {
    console.error('Download API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
