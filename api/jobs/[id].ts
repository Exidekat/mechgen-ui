import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getJobById } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { id } = req.query;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: 'Invalid job ID' });
      }

      const jobId = parseInt(id, 10);
      if (isNaN(jobId)) {
        return res.status(400).json({ error: 'Job ID must be a number' });
      }

      const job = await getJobById(jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(200).json(job);
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
