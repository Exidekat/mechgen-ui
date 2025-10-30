#!/usr/bin/env python3
"""
Image-GS Compression Wrapper for MechGen

This script wraps the NYU Image-GS compression algorithm for use in MechGen.
It accepts frame paths and returns compressed Gaussian representations.
"""

import argparse
import json
import os
import sys
from pathlib import Path

import torch
import numpy as np

# Add image-gs to path and change working directory
IMAGE_GS_PATH = Path(__file__).parent / "image-gs"
sys.path.insert(0, str(IMAGE_GS_PATH))

# Change to Image-GS directory for asset loading
original_cwd = os.getcwd()
os.chdir(IMAGE_GS_PATH)

from model import GaussianSplatting2D
from utils.misc_utils import load_cfg


def compress_frame(frame_path: str, frame_index: int, config: dict = None) -> dict:
    """
    Compress a single frame using Image-GS.

    Args:
        frame_path: Path to the image file
        frame_index: Index of the frame in the dataset
        config: Optional configuration dict with compression settings

    Returns:
        Dictionary with compression results and Gaussian parameters
    """
    config = config or {}

    # Default configuration (optimized for speed/quality balance)
    num_gaussians = config.get('num_gaussians', 5000)
    max_steps = config.get('max_steps', 1000)
    quantize_bits = config.get('quantize_bits', 12)
    init_mode = config.get('init_mode', 'gradient')

    # Create temporary log directory
    temp_dir = f"/tmp/image-gs-{os.getpid()}-{frame_index}"
    os.makedirs(temp_dir, exist_ok=True)

    try:
        # Load default configuration
        parser = argparse.ArgumentParser()
        parser = load_cfg(cfg_path=str(IMAGE_GS_PATH / "cfgs" / "default.yaml"), parser=parser)

        # Override with compression-specific settings
        args_list = [
            f"--input_path={frame_path}",
            f"--exp_name=compress",
            f"--log_root={temp_dir}",
            f"--num_gaussians={num_gaussians}",
            f"--max_steps={max_steps}",
            f"--init_mode={init_mode}",
            "--quantize",
            f"--pos_bits={quantize_bits}",
            f"--scale_bits={quantize_bits}",
            f"--rot_bits={quantize_bits}",
            f"--feat_bits={quantize_bits}",
            f"--save_image_steps={max_steps + 1}",  # Don't save intermediate images
            f"--save_ckpt_steps={max_steps + 1}",   # Don't save intermediate checkpoints
            f"--eval_steps={max_steps}",             # Only eval at end
            "--log_level=WARNING",                   # Reduce logging noise
        ]

        args = parser.parse_args(args_list)
        args.log_dir = f"{temp_dir}/compress"

        # Get original file size
        original_size = os.path.getsize(frame_path)

        # Run compression
        print(f"[COMPRESS] Starting compression for frame {frame_index}: {frame_path}")
        print(f"[COMPRESS] Gaussians: {num_gaussians}, Steps: {max_steps}, Bits: {quantize_bits}")

        # Initialize model and optimize
        image_gs = GaussianSplatting2D(args)
        image_gs.optimize()

        # Extract Gaussian parameters from state dict
        state_dict = image_gs.state_dict()

        # Convert to numpy for serialization
        xy = state_dict['xy'].detach().cpu().numpy()  # Positions (Nx2)
        scale = state_dict['scale'].detach().cpu().numpy()  # Scales (Nx2)
        rot = state_dict['rot'].detach().cpu().numpy()  # Rotations (Nx1)
        feat = state_dict['feat'].detach().cpu().numpy()  # Features (NxC)

        # Calculate compressed size (in bytes)
        # Each parameter stored at specified bit precision
        bits_per_gaussian = (
            2 * quantize_bits +  # xy (2 values)
            2 * quantize_bits +  # scale (2 values)
            1 * quantize_bits +  # rot (1 value)
            feat.shape[1] * quantize_bits  # feat (C values, typically 3 for RGB)
        )
        compressed_size = (num_gaussians * bits_per_gaussian) // 8  # Convert bits to bytes

        # Add overhead for metadata
        compressed_size += 1024  # ~1KB for headers, metadata

        compression_ratio = original_size / compressed_size if compressed_size > 0 else 0

        # Get quality metrics if available
        psnr = getattr(image_gs, 'psnr_final', None)
        ssim = getattr(image_gs, 'ssim_final', None)

        print(f"[COMPRESS] Completed: {original_size} -> {compressed_size} bytes ({compression_ratio:.2f}x)")
        print(f"[COMPRESS] Quality: PSNR={psnr:.2f}dB, SSIM={ssim:.4f}" if psnr else "")

        # Package Gaussian parameters for database storage
        gaussian_data = {
            'xy': xy.tolist(),
            'scale': scale.tolist(),
            'rot': rot.tolist(),
            'feat': feat.tolist(),
            'num_gaussians': num_gaussians,
            'feat_dim': feat.shape[1],
        }

        # Serialize to bytes for database storage
        gaussian_bytes = json.dumps(gaussian_data).encode('utf-8')

        return {
            'frame_index': frame_index,
            'status': 'success',
            'original_size': original_size,
            'compressed_size': compressed_size,
            'compression_ratio': compression_ratio,
            'gaussian_latent': gaussian_bytes.hex(),  # Hex-encoded for JSON transport
            'metadata': {
                'algorithm': 'image-gs',
                'version': 'siggraph-2025',
                'num_gaussians': num_gaussians,
                'optimization_steps': max_steps,
                'quantization_bits': quantize_bits,
                'init_mode': init_mode,
                'psnr_db': float(psnr) if psnr else None,
                'ssim': float(ssim) if ssim else None,
                'device': str(image_gs.device),
                'feat_dim': int(feat.shape[1]),
            }
        }

    except Exception as e:
        print(f"[COMPRESS] Error processing frame {frame_index}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()

        return {
            'frame_index': frame_index,
            'status': 'error',
            'error': str(e),
            'error_type': type(e).__name__,
        }

    finally:
        # Cleanup temporary directory
        import shutil
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    """
    Main entry point for command-line usage and JSON I/O.
    Reads frame list from stdin, outputs compression results to stdout.
    """
    # Read input from stdin
    input_data = json.load(sys.stdin)
    frames = input_data.get('frames', [])
    config = input_data.get('config', {})

    results = []

    for frame in frames:
        frame_path = frame['path']
        frame_index = frame['index']

        result = compress_frame(frame_path, frame_index, config)
        results.append(result)

    # Output results as JSON
    output = {
        'status': 'completed',
        'total_frames': len(frames),
        'results': results,
    }

    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
