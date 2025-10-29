-- MechGen Database Schema
-- Dataset Compression and Processing System

-- Drop existing tables if they exist
DROP TABLE IF EXISTS compressed_outputs CASCADE;
DROP TABLE IF EXISTS processing_jobs CASCADE;
DROP TABLE IF EXISTS datasets CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- Datasets table: stores HuggingFace dataset information
CREATE TABLE datasets (
  id SERIAL PRIMARY KEY,
  huggingface_id VARCHAR(255) NOT NULL UNIQUE, -- e.g., 'lerobot/svla_so101_pickplace'
  name VARCHAR(255),
  description TEXT,
  total_frames INTEGER, -- Total number of frames/images in dataset
  metadata JSONB, -- Store additional dataset info from HuggingFace
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Processing Jobs table: tracks compression job status
CREATE TABLE processing_jobs (
  id SERIAL PRIMARY KEY,
  dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0, -- 0-100 percentage
  current_step VARCHAR(255), -- 'downloading', 'processing_frame_1/100', 'compressing', etc.
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compressed Outputs table: stores the Gaussian latent compression results
CREATE TABLE compressed_outputs (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES processing_jobs(id) ON DELETE CASCADE,
  frame_index INTEGER NOT NULL, -- Which frame this output belongs to
  original_size BIGINT, -- Original size in bytes
  compressed_size BIGINT, -- Compressed size in bytes
  compression_ratio FLOAT, -- Calculated compression ratio
  gaussian_latent BYTEA, -- Binary data of compressed Gaussian representation
  metadata JSONB, -- Additional compression metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_job_frame UNIQUE(job_id, frame_index)
);

-- Create indexes for faster queries
CREATE INDEX idx_datasets_huggingface_id ON datasets(huggingface_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_dataset_id ON processing_jobs(dataset_id);
CREATE INDEX idx_compressed_outputs_job_id ON compressed_outputs(job_id);

-- Insert sample data for development/testing
INSERT INTO datasets (huggingface_id, name, description, total_frames) VALUES
(
  'sample/test-dataset',
  'Test Dataset',
  'A sample dataset for testing the MechGen compression pipeline',
  10
);

INSERT INTO processing_jobs (dataset_id, status, progress, current_step) VALUES
(
  1,
  'completed',
  100,
  'completed'
);
