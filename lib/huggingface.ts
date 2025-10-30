import { listFiles, downloadFile } from '@huggingface/hub';
import { writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Timeout utility - wraps a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation "${operationName}" timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

export interface HuggingFaceFrame {
  path: string;
  index: number;
  filename: string;
}

export interface HuggingFaceDataset {
  frames: HuggingFaceFrame[];
  totalFrames: number;
  metadata: {
    huggingface_id: string;
    name?: string;
    description?: string;
    files_found: number;
    image_extensions: string[];
  };
}

/**
 * Download image/video frames from a HuggingFace dataset
 *
 * @param huggingfaceId - Dataset ID in format "author/dataset"
 * @param outputDir - Directory to save downloaded frames
 * @param maxFrames - Maximum number of frames to download (default: 50 for MVP)
 * @returns Dataset information with frame paths
 */
export async function downloadDatasetFrames(
  huggingfaceId: string,
  outputDir: string,
  maxFrames: number = 50
): Promise<HuggingFaceDataset> {
  console.log(`[HF-DOWNLOAD] Starting download for: ${huggingfaceId}`);
  console.log(`[HF-DOWNLOAD] Output directory: ${outputDir}`);
  console.log(`[HF-DOWNLOAD] Max frames: ${maxFrames}`);

  try {
    // List all files in the repository
    console.log(`[HF-DOWNLOAD] Creating file list iterator`);

    let fileList;
    try {
      fileList = listFiles({
        repo: {
          type: 'dataset',
          name: huggingfaceId
        },
        recursive: true, // Search all subdirectories
        // Optional: add credentials if needed
        // credentials: { accessToken: process.env.HUGGINGFACE_TOKEN }
      });
      console.log(`[HF-DOWNLOAD] File list iterator created successfully (recursive mode)`);
    } catch (listError) {
      console.error(`[HF-DOWNLOAD] Failed to create file list:`, listError);
      throw new Error(
        `Cannot access HuggingFace dataset "${huggingfaceId}". ` +
        `Error: ${listError instanceof Error ? listError.message : 'Unknown error'}. ` +
        `Make sure the dataset exists and is public, or provide HUGGINGFACE_TOKEN in environment variables.`
      );
    }

    // Filter for image and video files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    const validExtensions = [...imageExtensions, ...videoExtensions];

    const mediaFiles: Array<{ path: string; oid: string }> = [];

    console.log(`[HF-DOWNLOAD] Starting file enumeration (max: ${maxFrames} frames)`);
    let fileCount = 0;

    // Wrap enumeration in timeout (20 seconds for listing files)
    const enumerationTimeout = 20000;
    console.log(`[HF-DOWNLOAD] Enumeration timeout set to ${enumerationTimeout}ms`);

    try {
      await withTimeout(
        (async () => {
          for await (const file of fileList) {
            fileCount++;

            if (fileCount === 1) {
              console.log(`[HF-DOWNLOAD] First file found: ${file.path}`);
            }

            if (fileCount % 100 === 0) {
              console.log(`[HF-DOWNLOAD] Enumerated ${fileCount} files, found ${mediaFiles.length} media files so far`);
            }

            const ext = file.path.toLowerCase().slice(file.path.lastIndexOf('.'));
            if (validExtensions.includes(ext)) {
              mediaFiles.push(file);
              console.log(`[HF-DOWNLOAD] Found media file ${mediaFiles.length}/${maxFrames}: ${file.path} (${ext})`);
            }

            // Limit the number of files to process (for MVP)
            if (mediaFiles.length >= maxFrames) {
              console.log(`[HF-DOWNLOAD] Reached max frames limit (${maxFrames}), stopping enumeration`);
              break;
            }

            // Safety limit: stop after checking 1000 files total
            if (fileCount >= 1000) {
              console.log(`[HF-DOWNLOAD] Reached safety limit (1000 files checked), stopping`);
              break;
            }
          }
        })(),
        enumerationTimeout,
        'HuggingFace file enumeration'
      );
    } catch (iteratorError) {
      console.error(`[HF-DOWNLOAD] Error during file enumeration:`, iteratorError);
      throw new Error(`Failed to list files in repository: ${iteratorError instanceof Error ? iteratorError.message : 'Unknown error'}`);
    }

    console.log(`[HF-DOWNLOAD] Enumeration complete: Found ${mediaFiles.length} media files out of ${fileCount} total files`);

    if (mediaFiles.length === 0) {
      return {
        frames: [],
        totalFrames: 0,
        metadata: {
          huggingface_id: huggingfaceId,
          files_found: 0,
          image_extensions: validExtensions
        }
      };
    }

    // Download files to output directory
    const frames: HuggingFaceFrame[] = [];

    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      const filename = file.path.split('/').pop() || `frame_${i}`;
      const localPath = join(outputDir, filename);

      try {
        // Download file from HuggingFace with timeout (10 seconds per file)
        console.log(`[HF-DOWNLOAD] Downloading file ${i + 1}/${mediaFiles.length}: ${file.path}`);

        const response = await withTimeout(
          downloadFile({
            repo: {
              type: 'dataset',
              name: huggingfaceId
            },
            path: file.path
          }),
          10000,
          `Download file ${file.path}`
        );

        if (!response) {
          console.warn(`[HF-DOWNLOAD] Failed to download file (no response): ${file.path}`);
          continue;
        }

        // Save to local filesystem
        console.log(`[HF-DOWNLOAD] Converting to buffer: ${filename}`);
        const buffer = Buffer.from(await response.arrayBuffer());

        console.log(`[HF-DOWNLOAD] Writing to disk: ${localPath}`);
        await withTimeout(
          writeFile(localPath, buffer),
          5000,
          `Write file ${filename}`
        );

        frames.push({
          path: localPath,
          index: i,
          filename: filename
        });

        console.log(`[HF-DOWNLOAD] Downloaded: ${filename} (${buffer.length} bytes)`);
      } catch (downloadError) {
        console.error(`[HF-DOWNLOAD] Error downloading ${file.path}:`, downloadError);
        console.error(`[HF-DOWNLOAD] Error type: ${downloadError instanceof Error ? downloadError.constructor.name : typeof downloadError}`);
        if (downloadError instanceof Error) {
          console.error(`[HF-DOWNLOAD] Error message: ${downloadError.message}`);
          console.error(`[HF-DOWNLOAD] Error stack: ${downloadError.stack}`);
        }
        // Continue with next file
      }
    }

    return {
      frames,
      totalFrames: frames.length,
      metadata: {
        huggingface_id: huggingfaceId,
        name: huggingfaceId.split('/').pop(),
        files_found: mediaFiles.length,
        image_extensions: validExtensions
      }
    };
  } catch (error) {
    console.error(`Error accessing HuggingFace dataset ${huggingfaceId}:`, error);

    // Return error information
    throw new Error(
      `Failed to download HuggingFace dataset "${huggingfaceId}". ` +
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      `Make sure the dataset exists and is public, or provide HUGGINGFACE_TOKEN.`
    );
  }
}

/**
 * Get basic information about a HuggingFace dataset without downloading
 *
 * @param huggingfaceId - Dataset ID in format "author/dataset"
 * @returns Basic dataset metadata
 */
export async function getDatasetInfo(huggingfaceId: string): Promise<{
  exists: boolean;
  fileCount: number;
  mediaFileCount: number;
}> {
  try {
    const fileList = listFiles({
      repo: {
        type: 'dataset',
        name: huggingfaceId
      },
      recursive: true
    });

    let fileCount = 0;
    let mediaFileCount = 0;
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.mp4', '.avi', '.mov', '.mkv', '.webm'];

    for await (const file of fileList) {
      fileCount++;
      const ext = file.path.toLowerCase().slice(file.path.lastIndexOf('.'));
      if (mediaExtensions.includes(ext)) {
        mediaFileCount++;
      }

      // Limit enumeration for performance
      if (fileCount >= 1000) break;
    }

    return {
      exists: true,
      fileCount,
      mediaFileCount
    };
  } catch (error) {
    return {
      exists: false,
      fileCount: 0,
      mediaFileCount: 0
    };
  }
}
