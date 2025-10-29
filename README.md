# MechGen - Dataset Compression with Gaussian Splatting

**MechGen** is a web application for compressing video and image datasets from HuggingFace using Gaussian splatting compression algorithms. Built on the NRVV stack (**N**eon + **R**eact + **V**ercel + **V**ite).

## Overview

MechGen allows users to:
1. Submit HuggingFace dataset IDs (e.g., `lerobot/svla_so101_pickplace`)
2. Process datasets with Gaussian splatting compression
3. Track processing progress in real-time
4. View and download compression results

## Tech Stack

- **Frontend**: React 18 + TypeScript 5 + Vite 4
- **Styling**: Tailwind CSS 3.4 + PostCSS
- **UI Components**: Radix UI + Lucide React icons
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: PostgreSQL via Neon (serverless)
- **Processing**: Python 3.10+ with Gaussian splatting algorithm
- **Runtime**: Bun (preferred) or Node.js 18+
- **Deployment**: Vercel

## Features

- HuggingFace dataset integration
- Real-time progress tracking with polling
- Async background processing
- Comprehensive compression statistics
- Python subprocess execution for compression
- RESTful API with CORS support
- Responsive modern UI

## Getting Started

### Prerequisites

- **Bun** (recommended) or Node.js 18+
- **Python 3.10+** (for compression algorithm)
- **Neon Database** account (or PostgreSQL database)
- **Conda** (optional but recommended, per project requirements)

### 1. Install Dependencies

```bash
# Install Node.js dependencies
bun install

# Set up Python environment (using ltx conda environment per project config)
conda create -n ltx python=3.10 -y
conda activate ltx
cd algo
pip install -r requirements.txt
cd ..
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database connection (get from Neon dashboard: https://console.neon.tech)
DATABASE_URL=postgresql://user:password@host/database

# Optional: Python executable path for conda environment
PYTHON_PATH=/path/to/conda/envs/ltx/bin/python
```

### 3. Run Database Migration

```bash
bun run migrate
```

This creates the following tables:
- `datasets` - HuggingFace dataset information
- `processing_jobs` - Job status and progress tracking
- `compressed_outputs` - Compression results and Gaussian latents

### 4. Start Development Server

```bash
bun run dev
```

The app will be available at `http://localhost:5173`

API endpoints will be proxied to `http://localhost:3000/api/*`

## Project Structure

```
/frontend/              - React SPA
  /src/
    /components/        - React components
      DatasetInput.tsx  - HuggingFace dataset input form
      JobStatus.tsx     - Processing progress tracker
      ResultsView.tsx   - Compression results display
    /lib/              - Utilities
    App.tsx            - Main app with routing
/api/                  - Vercel serverless functions
  /datasets/           - Dataset submission endpoint
  /jobs/               - Job status endpoints
  /outputs/            - Compression results endpoint
/lib/
  db.ts                - Database client and queries
  processor.ts         - Background processing logic
/algo/                 - Python compression algorithm
  main.py              - Gaussian splatting compression script
  requirements.txt     - Python dependencies
  README.md            - Algorithm documentation
/scripts/              - Database migrations
  migrate.sql          - Schema definitions
  migrate.js           - Migration runner
```

## API Endpoints

### Datasets
- `POST /api/datasets` - Submit HuggingFace dataset for compression
  - Body: `{ "huggingface_id": "author/dataset" }`
  - Returns: `{ dataset, job }`

- `GET /api/datasets` - List all datasets

### Jobs
- `GET /api/jobs` - List all processing jobs
- `GET /api/jobs/:id` - Get job status with real-time progress
  - Returns: Job with status, progress percentage, current step

### Outputs
- `GET /api/outputs/:jobId` - Get compression results
  - Returns: Compressed outputs and statistics

## How It Works

1. **User submits dataset**: User enters HuggingFace dataset ID (e.g., `lerobot/svla_so101_pickplace`)

2. **Job creation**: API creates dataset record and processing job

3. **Background processing**:
   - Downloads dataset from HuggingFace (placeholder for MVP)
   - Spawns Python subprocess with `algo/main.py`
   - Processes frames with Gaussian splatting compression
   - Updates job progress in database

4. **Progress tracking**: Frontend polls job status every 2 seconds

5. **Results**: Compressed Gaussian latents stored in database, statistics displayed

## Python Compression Algorithm

The compression algorithm is in `/algo/main.py`.

**Current Status**: **PLACEHOLDER** - Returns frames uncompressed for MVP testing.

### To implement your algorithm:

1. Replace `compress_frame()` function in `algo/main.py`
2. Update `algo/requirements.txt` with necessary packages (torch, gsplat, etc.)
3. Test locally: `python algo/main.py --frames /path/to/frame1.jpg`

See `algo/README.md` for detailed algorithm documentation.

## Database Schema

### `datasets`
- `id` - Primary key
- `huggingface_id` - Unique dataset identifier (author/dataset)
- `name` - Dataset name
- `description` - Description
- `total_frames` - Number of frames
- `metadata` - JSONB metadata from HuggingFace

### `processing_jobs`
- `id` - Primary key
- `dataset_id` - Foreign key to datasets
- `status` - 'pending' | 'processing' | 'completed' | 'failed'
- `progress` - 0-100 percentage
- `current_step` - Current processing step
- `error_message` - Error details if failed
- `started_at`, `completed_at` - Timestamps

### `compressed_outputs`
- `id` - Primary key
- `job_id` - Foreign key to processing_jobs
- `frame_index` - Frame number
- `original_size` - Original size in bytes
- `compressed_size` - Compressed size in bytes
- `compression_ratio` - Compression ratio
- `gaussian_latent` - BYTEA compressed data
- `metadata` - JSONB compression metadata

## Development Scripts

```bash
bun run dev      # Start dev server (Vite + API proxy)
bun run build    # Build for production
bun run preview  # Preview production build
bun run migrate  # Run database migrations
```

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
bun add -g vercel
```

2. Deploy:
```bash
vercel deploy
```

3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` - Your Neon database connection string
   - `PYTHON_PATH` - Path to Python executable (optional)

### Important Notes

- **Vercel Timeout Limits**: Serverless functions have 10-50s timeout
- For long-running compression jobs, consider:
  - Moving to dedicated compute service (Modal, Railway, AWS Lambda with longer timeouts)
  - Implementing job queue (BullMQ, Inngest)
  - Using Vercel Background Functions (beta)

## Current Limitations

1. **Placeholder Algorithm**: `algo/main.py` currently returns frames uncompressed
2. **HuggingFace Integration**: Placeholder - needs actual API integration
3. **No Authentication**: MVP has no user auth (planned for future)
4. **Vercel Timeouts**: Long-running jobs may timeout (10-50s limit)
5. **Blob Storage**: Compressed outputs stored in DB (BYTEA); consider S3/R2 for production

## Roadmap

- [ ] Implement actual Gaussian splatting compression algorithm
- [ ] Add real HuggingFace Hub API integration
- [ ] Implement user authentication and authorization
- [ ] Add blob storage (S3/Cloudflare R2) for large compressed outputs
- [ ] Move processing to dedicated compute service (Modal/Railway)
- [ ] Add job queue for better reliability
- [ ] WebSockets or SSE for real-time updates (instead of polling)
- [ ] Dataset preview and visualization
- [ ] Compression quality settings
- [ ] Batch processing support

## Contributing

This is a project in active development. To implement the real compression algorithm:

1. See `algo/README.md` for algorithm implementation guide
2. Update `lib/processor.ts` `downloadDatasetFrames()` for HuggingFace integration
3. Consider compute service migration for production reliability

## License

MIT

---

**Built with the NRVV stack** - For more info on the underlying template, see `TEMPLATE_INFO.md`
