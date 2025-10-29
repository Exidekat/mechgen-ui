# MechGen Gaussian Splatting Algorithm

This directory contains the Gaussian splatting compression algorithm for processing video/image datasets.

## Current Status

**This is a PLACEHOLDER implementation** that returns frames without compression. Replace `main.py` with your actual Gaussian splatting compression logic when ready.

## Setup

### Using Conda (Recommended - as per user's global instructions)

```bash
# Create the ltx conda environment if it doesn't exist
conda create -n ltx python=3.10 -y

# Activate the environment
conda activate ltx

# Install dependencies
pip install -r requirements.txt
```

### Using venv

```bash
# Create virtual environment
python3 -m venv .venv

# Activate (Linux/Mac)
source .venv/bin/activate

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

The `main.py` script accepts frame data via:
1. Command line arguments
2. Input JSON file
3. stdin (JSON)

### Examples

**From command line:**
```bash
python main.py --frames /tmp/frame1.jpg /tmp/frame2.jpg /tmp/frame3.jpg
```

**From JSON file:**
```bash
python main.py --input frames.json --output results.json
```

**From stdin:**
```bash
echo '{"frames": [{"path": "/tmp/frame1.jpg", "index": 0}]}' | python main.py
```

### Input Format (JSON)

```json
{
  "frames": [
    {"path": "/path/to/frame1.jpg", "index": 0},
    {"path": "/path/to/frame2.jpg", "index": 1}
  ]
}
```

### Output Format (JSON)

```json
{
  "status": "completed",
  "total_frames": 2,
  "results": [
    {
      "frame_index": 0,
      "status": "success",
      "original_size": 123456,
      "compressed_size": 123456,
      "compression_ratio": 1.0,
      "gaussian_latent": null,
      "metadata": {
        "algorithm": "placeholder",
        "version": "0.1.0"
      }
    }
  ],
  "metadata": {
    "algorithm": "gaussian_splatting_placeholder",
    "version": "0.1.0"
  }
}
```

## Implementing the Real Algorithm

When ready to implement the actual Gaussian splatting compression:

1. Update `requirements.txt` with necessary packages (torch, gsplat, etc.)
2. Replace the `compress_frame()` function in `main.py` with your compression logic
3. Update the output to include actual Gaussian latent data
4. Test thoroughly before integrating with the API

## Integration with Serverless Functions

The Node.js serverless functions in `/api` will spawn this Python script as a subprocess. The API will:
1. Download frames from HuggingFace dataset to `/tmp`
2. Create input JSON with frame paths
3. Execute `python algo/main.py --input /tmp/input.json`
4. Read stdout JSON output
5. Store compressed results in NeonDB
