import { listFiles, downloadFile } from '@huggingface/hub';
import { writeFile } from 'fs/promises';
import { join } from 'path';

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
  console.log(`Downloading dataset from HuggingFace: ${huggingfaceId}`);

  try {
    // List all files in the repository
    const fileList = listFiles({
      repo: huggingfaceId,
      // Optional: add credentials if needed
      // credentials: { accessToken: process.env.HUGGINGFACE_TOKEN }
    });

    // Filter for image and video files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    const validExtensions = [...imageExtensions, ...videoExtensions];

    const mediaFiles: Array<{ path: string; oid: string }> = [];

    for await (const file of fileList) {
      const ext = file.path.toLowerCase().slice(file.path.lastIndexOf('.'));
      if (validExtensions.includes(ext)) {
        mediaFiles.push(file);
      }

      // Limit the number of files to process (for MVP)
      if (mediaFiles.length >= maxFrames) {
        console.log(`Reached max frames limit (${maxFrames}), stopping file enumeration`);
        break;
      }
    }

    console.log(`Found ${mediaFiles.length} media files in dataset ${huggingfaceId}`);

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

      console.log(`Downloading file ${i + 1}/${mediaFiles.length}: ${file.path}`);

      try {
        // Download file from HuggingFace
        const response = await downloadFile({
          repo: huggingfaceId,
          path: file.path
        });

        if (!response) {
          console.warn(`Failed to download file: ${file.path}`);
          continue;
        }

        // Save to local filesystem
        const buffer = Buffer.from(await response.arrayBuffer());
        await writeFile(localPath, buffer);

        frames.push({
          path: localPath,
          index: i,
          filename: filename
        });

        console.log(`Downloaded: ${filename} (${buffer.length} bytes)`);
      } catch (downloadError) {
        console.error(`Error downloading ${file.path}:`, downloadError);
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
      repo: huggingfaceId
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
