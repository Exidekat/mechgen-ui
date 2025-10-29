import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');

// ============ Types ============

export interface Dataset {
  id: number;
  huggingface_id: string;
  name: string | null;
  description: string | null;
  total_frames: number | null;
  metadata: any; // JSONB
  created_at: Date;
  updated_at: Date;
}

export interface ProcessingJob {
  id: number;
  dataset_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  current_step: string | null;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CompressedOutput {
  id: number;
  job_id: number;
  frame_index: number;
  original_size: number | null;
  compressed_size: number | null;
  compression_ratio: number | null;
  gaussian_latent: Buffer | null;
  metadata: any; // JSONB
  created_at: Date;
}

export interface JobWithDataset extends ProcessingJob {
  dataset?: Dataset;
}

// ============ Dataset Functions ============

export async function getAllDatasets(): Promise<Dataset[]> {
  const result = await sql`SELECT * FROM datasets ORDER BY created_at DESC`;
  return result as Dataset[];
}

export async function getDatasetById(id: number): Promise<Dataset | null> {
  const result = await sql`SELECT * FROM datasets WHERE id = ${id}`;
  return result[0] as Dataset || null;
}

export async function getDatasetByHuggingfaceId(huggingfaceId: string): Promise<Dataset | null> {
  const result = await sql`SELECT * FROM datasets WHERE huggingface_id = ${huggingfaceId}`;
  return result[0] as Dataset || null;
}

export async function createDataset(
  huggingfaceId: string,
  name?: string,
  description?: string,
  totalFrames?: number,
  metadata?: any
): Promise<Dataset> {
  const result = await sql`
    INSERT INTO datasets (huggingface_id, name, description, total_frames, metadata)
    VALUES (${huggingfaceId}, ${name || null}, ${description || null}, ${totalFrames || null}, ${metadata ? JSON.stringify(metadata) : null})
    RETURNING *
  `;
  return result[0] as Dataset;
}

export async function updateDataset(
  id: number,
  updates: {
    name?: string;
    description?: string;
    total_frames?: number;
    metadata?: any;
  }
): Promise<Dataset> {
  const result = await sql`
    UPDATE datasets
    SET
      name = COALESCE(${updates.name || null}, name),
      description = COALESCE(${updates.description || null}, description),
      total_frames = COALESCE(${updates.total_frames || null}, total_frames),
      metadata = COALESCE(${updates.metadata ? JSON.stringify(updates.metadata) : null}, metadata),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] as Dataset;
}

// ============ Processing Job Functions ============

export async function getAllJobs(): Promise<JobWithDataset[]> {
  const result = await sql`
    SELECT
      pj.*,
      json_build_object(
        'id', d.id,
        'huggingface_id', d.huggingface_id,
        'name', d.name,
        'description', d.description,
        'total_frames', d.total_frames,
        'metadata', d.metadata,
        'created_at', d.created_at,
        'updated_at', d.updated_at
      ) as dataset
    FROM processing_jobs pj
    LEFT JOIN datasets d ON pj.dataset_id = d.id
    ORDER BY pj.created_at DESC
  `;
  return result as JobWithDataset[];
}

export async function getJobById(id: number): Promise<JobWithDataset | null> {
  const result = await sql`
    SELECT
      pj.*,
      json_build_object(
        'id', d.id,
        'huggingface_id', d.huggingface_id,
        'name', d.name,
        'description', d.description,
        'total_frames', d.total_frames,
        'metadata', d.metadata,
        'created_at', d.created_at,
        'updated_at', d.updated_at
      ) as dataset
    FROM processing_jobs pj
    LEFT JOIN datasets d ON pj.dataset_id = d.id
    WHERE pj.id = ${id}
  `;
  return result[0] as JobWithDataset || null;
}

export async function getJobsByDatasetId(datasetId: number): Promise<ProcessingJob[]> {
  const result = await sql`
    SELECT * FROM processing_jobs
    WHERE dataset_id = ${datasetId}
    ORDER BY created_at DESC
  `;
  return result as ProcessingJob[];
}

export async function createJob(datasetId: number): Promise<ProcessingJob> {
  const result = await sql`
    INSERT INTO processing_jobs (dataset_id, status, progress)
    VALUES (${datasetId}, 'pending', 0)
    RETURNING *
  `;
  return result[0] as ProcessingJob;
}

export async function updateJobStatus(
  id: number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress?: number,
  currentStep?: string,
  errorMessage?: string
): Promise<ProcessingJob> {
  const now = new Date().toISOString();

  // Determine timestamp updates
  const startedAt = status === 'processing' ? now : null;
  const completedAt = (status === 'completed' || status === 'failed') ? now : null;

  const result = await sql`
    UPDATE processing_jobs
    SET
      status = ${status},
      progress = COALESCE(${progress ?? null}, progress),
      current_step = COALESCE(${currentStep || null}, current_step),
      error_message = ${errorMessage || null},
      started_at = COALESCE(started_at, ${startedAt}),
      completed_at = COALESCE(completed_at, ${completedAt}),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] as ProcessingJob;
}

export async function updateJobProgress(
  id: number,
  progress: number,
  currentStep?: string
): Promise<ProcessingJob> {
  const result = await sql`
    UPDATE processing_jobs
    SET
      progress = ${progress},
      current_step = ${currentStep || null},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] as ProcessingJob;
}

// ============ Compressed Output Functions ============

export async function createCompressedOutput(
  jobId: number,
  frameIndex: number,
  originalSize?: number,
  compressedSize?: number,
  gaussianLatent?: Buffer,
  metadata?: any
): Promise<CompressedOutput> {
  const compressionRatio = originalSize && compressedSize
    ? originalSize / compressedSize
    : null;

  const result = await sql`
    INSERT INTO compressed_outputs (
      job_id,
      frame_index,
      original_size,
      compressed_size,
      compression_ratio,
      gaussian_latent,
      metadata
    )
    VALUES (
      ${jobId},
      ${frameIndex},
      ${originalSize || null},
      ${compressedSize || null},
      ${compressionRatio},
      ${gaussianLatent || null},
      ${metadata ? JSON.stringify(metadata) : null}
    )
    RETURNING *
  `;
  return result[0] as CompressedOutput;
}

export async function getOutputsByJobId(jobId: number): Promise<CompressedOutput[]> {
  const result = await sql`
    SELECT * FROM compressed_outputs
    WHERE job_id = ${jobId}
    ORDER BY frame_index ASC
  `;
  return result as CompressedOutput[];
}

export async function getOutputByJobAndFrame(
  jobId: number,
  frameIndex: number
): Promise<CompressedOutput | null> {
  const result = await sql`
    SELECT * FROM compressed_outputs
    WHERE job_id = ${jobId} AND frame_index = ${frameIndex}
  `;
  return result[0] as CompressedOutput || null;
}

export async function getCompressionStats(jobId: number): Promise<{
  total_frames: number;
  total_original_size: number;
  total_compressed_size: number;
  avg_compression_ratio: number;
} | null> {
  const result = await sql`
    SELECT
      COUNT(*) as total_frames,
      SUM(original_size) as total_original_size,
      SUM(compressed_size) as total_compressed_size,
      AVG(compression_ratio) as avg_compression_ratio
    FROM compressed_outputs
    WHERE job_id = ${jobId}
  `;
  return result[0] as any || null;
}
