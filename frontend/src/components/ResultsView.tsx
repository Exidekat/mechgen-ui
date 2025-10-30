import { useEffect, useState } from 'react';

interface CompressedOutput {
  id: number;
  job_id: number;
  frame_index: number;
  original_size: number | null;
  compressed_size: number | null;
  compression_ratio: number | null;
  metadata: any;
  created_at: string;
}

interface CompressionStats {
  total_frames: number;
  total_original_size: number;
  total_compressed_size: number;
  avg_compression_ratio: number;
}

interface ResultsData {
  jobId: number;
  outputs: CompressedOutput[];
  stats: CompressionStats | null;
}

interface ResultsViewProps {
  jobId: number;
}

export default function ResultsView({ jobId }: ResultsViewProps) {
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/outputs/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch results');
        }
        const resultsData = await response.json();
        setData(resultsData);
        setLoading(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        setLoading(false);
      }
    };

    fetchResults();
  }, [jobId]);

  const formatBytes = (bytes: number | null): string => {
    if (bytes === null || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
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
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Compression Results</h2>
          <p className="text-gray-600">Job ID: {jobId}</p>
        </div>

        {/* Statistics */}
        {data.stats && data.stats.total_frames > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Frames</p>
              <p className="text-2xl font-bold text-blue-900">{data.stats.total_frames}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Original Size</p>
              <p className="text-2xl font-bold text-green-900">
                {formatBytes(data.stats.total_original_size)}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Compressed Size</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatBytes(data.stats.total_compressed_size)}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Avg Compression</p>
              <p className="text-2xl font-bold text-orange-900">
                {data.stats.avg_compression_ratio.toFixed(2)}x
              </p>
            </div>
          </div>
        )}

        {/* No Results */}
        {data.outputs.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 text-gray-700 px-6 py-8 rounded-md text-center">
            <p className="text-lg font-medium mb-2">No compressed outputs available</p>
            <p className="text-sm text-gray-600">
              This job completed without generating any compressed frames. This may be due to the
              placeholder algorithm or an empty dataset.
            </p>
          </div>
        )}

        {/* Outputs Table */}
        {data.outputs.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Frame Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frame
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Original Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compressed Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ratio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Algorithm
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.outputs.map((output) => (
                    <tr key={output.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{output.frame_index}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatBytes(output.original_size)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatBytes(output.compressed_size)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {output.compression_ratio?.toFixed(2)}x
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {output.metadata?.algorithm || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          {data.outputs.length > 0 && (
            <a
              href={`/api/outputs/${jobId}/download`}
              download={`compressed-dataset-${jobId}.json`}
              className="px-6 py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition"
            >
              Download Compressed Dataset
            </a>
          )}
          <a
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition"
          >
            Compress Another Dataset
          </a>
          <a
            href={`/jobs/${jobId}`}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition"
          >
            View Job Status
          </a>
        </div>
      </div>
    </div>
  );
}
