import { useEffect, useState } from 'react';

interface Job {
  id: number;
  dataset_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_step: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  dataset?: {
    id: number;
    huggingface_id: string;
    name: string | null;
    description: string | null;
    total_frames: number | null;
  };
}

interface JobStatusProps {
  jobId: number;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export default function JobStatus({ jobId, onComplete, onError }: JobStatusProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobStatus = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }
      const data = await response.json();
      setJob(data);
      setLoading(false);

      // Call callbacks based on status
      if (data.status === 'completed' && onComplete) {
        onComplete();
      } else if (data.status === 'failed' && onError) {
        onError(data.error_message || 'Job failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchJobStatus();

    // Set up polling every 2 seconds
    const interval = setInterval(() => {
      fetchJobStatus();
    }, 2000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [jobId]);

  // Stop polling if job is completed or failed
  useEffect(() => {
    if (job && (job.status === 'completed' || job.status === 'failed')) {
      // We'll still keep polling in case user refreshes, but could add logic to stop
    }
  }, [job?.status]);

  if (loading && !job) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const statusColors = {
    pending: 'bg-gray-500',
    processing: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  const statusLabels = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">Job Status</h2>
            <span
              className={`px-3 py-1 rounded-full text-white text-sm font-medium ${
                statusColors[job.status]
              }`}
            >
              {statusLabels[job.status]}
            </span>
          </div>
          <p className="text-gray-600">
            Dataset: <span className="font-mono text-sm">{job.dataset?.huggingface_id}</span>
          </p>
          <p className="text-gray-500 text-sm">Job ID: {job.id}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {job.current_step || 'Initializing...'}
            </span>
            <span className="text-sm font-medium text-gray-700">{job.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                job.status === 'failed'
                  ? 'bg-red-500'
                  : job.status === 'completed'
                  ? 'bg-green-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${job.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Error Message */}
        {job.status === 'failed' && job.error_message && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="font-medium">Error:</p>
            <p className="text-sm">{job.error_message}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <span className="font-medium">Created:</span>{' '}
            {new Date(job.created_at).toLocaleString()}
          </p>
          {job.started_at && (
            <p>
              <span className="font-medium">Started:</span>{' '}
              {new Date(job.started_at).toLocaleString()}
            </p>
          )}
          {job.completed_at && (
            <p>
              <span className="font-medium">Completed:</span>{' '}
              {new Date(job.completed_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* Dataset Info */}
        {job.dataset && job.dataset.total_frames !== null && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Total Frames:</span> {job.dataset.total_frames}
            </p>
          </div>
        )}

        {/* Actions */}
        {job.status === 'completed' && (
          <div className="mt-6">
            <a
              href={`/results/${job.id}`}
              className="block w-full bg-green-600 text-white py-3 px-6 rounded-md font-medium hover:bg-green-700 transition text-center"
            >
              View Results
            </a>
          </div>
        )}

        {(job.status === 'pending' || job.status === 'processing') && (
          <div className="mt-6 flex items-center justify-center text-gray-500">
            <svg
              className="animate-spin h-5 w-5 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-sm">Processing... updates every 2 seconds</span>
          </div>
        )}
      </div>
    </div>
  );
}
