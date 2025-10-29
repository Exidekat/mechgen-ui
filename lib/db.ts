import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');

export interface Event {
  id: number;
  name: string;
  description: string | null;
  start_date: string;  // Using string to handle very large numbers
  end_date: string;    // Using string to handle very large numbers
  created_at: Date;
  updated_at: Date;
}

export async function getAllEvents(): Promise<Event[]> {
  const result = await sql`SELECT * FROM events ORDER BY created_at DESC`;
  return result as Event[];
}

export async function getEventById(id: number): Promise<Event | null> {
  const result = await sql`SELECT * FROM events WHERE id = ${id}`;
  return result[0] as Event || null;
}

export async function createEvent(
  name: string,
  description: string,
  start_date: string,
  end_date: string
): Promise<Event> {
  const result = await sql`
    INSERT INTO events (name, description, start_date, end_date)
    VALUES (${name}, ${description}, ${start_date}, ${end_date})
    RETURNING *
  `;
  return result[0] as Event;
}
