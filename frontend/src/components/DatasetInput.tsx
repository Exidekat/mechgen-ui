import { useState } from 'react';

interface DatasetInputProps {
  onSubmitSuccess?: (jobId: number, datasetId: number) => void;
  onSubmitError?: (error: string) => void;
}

export default function DatasetInput({ onSubmitSuccess, onSubmitError }: DatasetInputProps) {
  const [huggingfaceId, setHuggingfaceId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate format
      if (!huggingfaceId.includes('/')) {
        const errorMsg = 'Invalid format. Expected "author/dataset" (e.g., "lerobot/svla_so101_pickplace")';
        setError(errorMsg);
        onSubmitError?.(errorMsg);
        setIsSubmitting(false);
        return;
      }

      // Submit to API
      const response = await fetch('/api/datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ huggingface_id: huggingfaceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit dataset');
      }

      // Success - call callback with job ID
      if (onSubmitSuccess) {
        onSubmitSuccess(data.job.id, data.dataset.id);
      }

      // Reset form
      setHuggingfaceId('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      onSubmitError?.(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-2 text-gray-900">
          Compress Your Dataset
        </h2>
        <p className="text-gray-600 mb-6">
          Enter a HuggingFace dataset ID to compress it using Gaussian splatting
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="huggingface-id" className="block text-sm font-medium text-gray-700 mb-2">
              HuggingFace Dataset ID
            </label>
            <input
              id="huggingface-id"
              type="text"
              value={huggingfaceId}
              onChange={(e) => setHuggingfaceId(e.target.value)}
              placeholder="lerobot/svla_so101_pickplace"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Format: author/dataset-name
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !huggingfaceId.trim()}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? 'Submitting...' : 'Start Compression'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Example Datasets:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              <button
                onClick={() => setHuggingfaceId('lerobot/svla_so101_pickplace')}
                className="text-blue-600 hover:underline"
                type="button"
              >
                lerobot/svla_so101_pickplace
              </button>
            </li>
            <li>
              <button
                onClick={() => setHuggingfaceId('sample/test-dataset')}
                className="text-blue-600 hover:underline"
                type="button"
              >
                sample/test-dataset
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
