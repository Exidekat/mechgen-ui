import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getAllDatasets,
  createDataset,
  getDatasetByHuggingfaceId,
  createJob
} from '../../lib/db.js';
import { ensureDatabase } from '../../lib/db-init.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Ensure database tables exist
    await ensureDatabase();

    if (req.method === 'GET') {
      // List all datasets
      const datasets = await getAllDatasets();
      return res.status(200).json(datasets);
    }

    if (req.method === 'POST') {
      // Submit new dataset for processing
      const { huggingface_id } = req.body;

      if (!huggingface_id) {
        return res.status(400).json({
          error: 'Missing required field: huggingface_id (e.g., "lerobot/svla_so101_pickplace")'
        });
      }

      // Validate format (author/dataset)
      if (!huggingface_id.includes('/')) {
        return res.status(400).json({
          error: 'Invalid huggingface_id format. Expected "author/dataset" (e.g., "lerobot/svla_so101_pickplace")'
        });
      }

      // Check if dataset already exists
      let dataset = await getDatasetByHuggingfaceId(huggingface_id);

      if (!dataset) {
        // Create new dataset record
        dataset = await createDataset(huggingface_id);
      }

      // Create new processing job
      const job = await createJob(dataset.id);

      // Return job immediately
      // Note: Frontend will trigger /api/process/[jobId] to start processing
      // This two-step pattern is required because Vercel terminates serverless
      // functions immediately after sending HTTP response
      return res.status(201).json({
        message: 'Job created - trigger /api/process/:jobId to start processing',
        dataset,
        job
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
