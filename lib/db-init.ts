import { neon } from '@neondatabase/serverless';

// Validate database URL exists
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  throw new Error(
    'Missing DATABASE_URL or POSTGRES_URL environment variable. ' +
    'Please set one in your .env file or Vercel environment variables.'
  );
}

const sql = neon(databaseUrl);

/**
 * Check if a table exists in the database
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ) as exists;
    `;
    return result[0]?.exists || false;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Initialize database tables if they don't exist
 * This is safe to call multiple times - it only creates tables if missing
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Check if tables exist
    const datasetsExists = await tableExists('datasets');
    const jobsExists = await tableExists('processing_jobs');
    const outputsExists = await tableExists('compressed_outputs');

    // If all tables exist, no need to initialize
    if (datasetsExists && jobsExists && outputsExists) {
      console.log('[DB-INIT] Database tables already exist');
      return;
    }

    console.log('[DB-INIT] Creating missing database tables...');

    // Create datasets table
    if (!datasetsExists) {
      console.log('[DB-INIT] Creating datasets table');
      await sql`
        CREATE TABLE datasets (
          id SERIAL PRIMARY KEY,
          huggingface_id VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255),
          description TEXT,
          total_frames INTEGER,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await sql`CREATE INDEX idx_datasets_huggingface_id ON datasets(huggingface_id);`;
    }

    // Create processing_jobs table
    if (!jobsExists) {
      console.log('[DB-INIT] Creating processing_jobs table');
      await sql`
        CREATE TABLE processing_jobs (
          id SERIAL PRIMARY KEY,
          dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          current_step VARCHAR(255),
          error_message TEXT,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await sql`CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);`;
      await sql`CREATE INDEX idx_processing_jobs_dataset_id ON processing_jobs(dataset_id);`;
    }

    // Create compressed_outputs table
    if (!outputsExists) {
      console.log('[DB-INIT] Creating compressed_outputs table');
      await sql`
        CREATE TABLE compressed_outputs (
          id SERIAL PRIMARY KEY,
          job_id INTEGER REFERENCES processing_jobs(id) ON DELETE CASCADE,
          frame_index INTEGER NOT NULL,
          original_size BIGINT,
          compressed_size BIGINT,
          compression_ratio FLOAT,
          gaussian_latent BYTEA,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_job_frame UNIQUE(job_id, frame_index)
        );
      `;
      await sql`CREATE INDEX idx_compressed_outputs_job_id ON compressed_outputs(job_id);`;
    }

    console.log('[DB-INIT] Database initialization complete');
  } catch (error) {
    console.error('[DB-INIT] Database initialization failed:', error);
    throw new Error(
      `Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Cache initialization status to avoid repeated checks
let isInitialized = false;

/**
 * Ensure database is initialized (with caching to avoid repeated checks)
 * Call this at the start of API endpoints
 */
export async function ensureDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  await initializeDatabase();
  isInitialized = true;
}
