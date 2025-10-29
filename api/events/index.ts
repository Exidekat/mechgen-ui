import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllEvents, createEvent } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const events = await getAllEvents();
      return res.status(200).json(events);
    }

    if (req.method === 'POST') {
      const { name, description, start_date, end_date } = req.body;

      if (!name || !start_date || !end_date) {
        return res.status(400).json({
          error: 'Missing required fields: name, start_date, end_date'
        });
      }

      const event = await createEvent(name, description, start_date, end_date);
      return res.status(201).json(event);
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
