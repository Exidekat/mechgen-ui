import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllJobs } from '../../lib/db.js';
import { ensureDatabase } from '../../lib/db-init.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Ensure database tables exist
    await ensureDatabase();

    if (req.method === 'GET') {
      const jobs = await getAllJobs();
      return res.status(200).json(jobs);
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
