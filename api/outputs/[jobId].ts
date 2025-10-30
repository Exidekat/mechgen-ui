import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOutputsByJobId, getCompressionStats } from '../../lib/db.js';

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
      const { jobId } = req.query;

      if (!jobId || Array.isArray(jobId)) {
        return res.status(400).json({ error: 'Invalid job ID' });
      }

      const jobIdNum = parseInt(jobId, 10);
      if (isNaN(jobIdNum)) {
        return res.status(400).json({ error: 'Job ID must be a number' });
      }

      // Get all compressed outputs for this job
      const outputs = await getOutputsByJobId(jobIdNum);

      // Get compression statistics
      const stats = await getCompressionStats(jobIdNum);

      return res.status(200).json({
        jobId: jobIdNum,
        outputs,
        stats
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
