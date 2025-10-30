/**
 * Dataset Processing Module
 *
 * This module triggers background processing for compression jobs.
 * The actual processing happens in /api/process/[jobId].ts to avoid
 * blocking the main API response.
 *
 * Architecture:
 * 1. User submits dataset → POST /api/datasets
 * 2. Job created → processDataset() called
 * 3. Triggers POST /api/process/:jobId (async, non-blocking)
 * 4. Frontend polls GET /api/jobs/:jobId for status
 * 5. Processing endpoint downloads HuggingFace data & compresses
 * 6. Results stored in database
 */

/**
 * Trigger background processing for a dataset compression job
 *
 * This function triggers the processing endpoint and returns immediately.
 * The actual work happens asynchronously in the processing endpoint.
 *
 * @param jobId - Processing job ID
 * @param datasetId - Dataset ID (unused in trigger, but kept for compatibility)
 * @param huggingfaceId - HuggingFace dataset identifier (unused in trigger)
 */
export async function processDataset(
  jobId: number,
  _datasetId: number,
  _huggingfaceId: string
): Promise<void> {
  try {
    console.log(`[PROCESSOR] Triggering processing for job ${jobId}`);

    // Determine the API base URL
    // In production: use the same host
    // In development: call the processing endpoint
    const apiBase = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.API_BASE || 'http://localhost:3000';

    const processingUrl = `${apiBase}/api/process/${jobId}`;

    console.log(`[PROCESSOR] Calling processing endpoint: ${processingUrl}`);

    // Trigger the processing endpoint (fire and forget)
    const response = await fetch(processingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(
        `Processing endpoint returned ${response.status}: ${errorData.error || response.statusText}`
      );
    }

    const result = await response.json();
    console.log(`[PROCESSOR] Processing triggered successfully:`, result);

  } catch (error) {
    console.error(`[PROCESSOR] Failed to trigger processing for job ${jobId}:`, error);

    // Don't throw - just log the error
    // The job will remain in 'pending' state and can be retried
    console.error(
      `[PROCESSOR] Job ${jobId} processing failed to start. ` +
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
