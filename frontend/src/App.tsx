import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import DatasetInput from './components/DatasetInput';
import JobStatus from './components/JobStatus';
import ResultsView from './components/ResultsView';

// Home page with dataset input
function HomePage() {
  const navigate = useNavigate();

  const handleSubmitSuccess = (jobId: number) => {
    // Redirect to job status page
    navigate(`/jobs/${jobId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-8">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">MechGen</h1>
        <p className="text-xl text-gray-600">
          Gaussian Splatting Dataset Compression
        </p>
      </div>
      <DatasetInput onSubmitSuccess={handleSubmitSuccess} />
    </div>
  );
}

// Job status page
function JobPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
        <div className="text-red-600">Invalid job ID</div>
      </div>
    );
  }

  const jobId = parseInt(id, 10);

  const handleComplete = () => {
    // Job completed - could auto-redirect to results or just update UI
    console.log('Job completed!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MechGen</h1>
        <p className="text-gray-600">Dataset Compression Progress</p>
      </div>
      <JobStatus jobId={jobId} onComplete={handleComplete} />
      <div className="mt-6">
        <a
          href="/"
          className="text-blue-600 hover:underline text-sm"
        >
          ← Back to home
        </a>
      </div>
    </div>
  );
}

// Results page
function ResultsPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
        <div className="text-red-600">Invalid job ID</div>
      </div>
    );
  }

  const jobId = parseInt(id, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">MechGen</h1>
        <p className="text-gray-600">Compression Results</p>
      </div>
      <ResultsView jobId={jobId} />
    </div>
  );
}

// Main App component with routing
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs/:id" element={<JobPage />} />
        <Route path="/results/:id" element={<ResultsPage />} />
        <Route path="*" element={
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
              <a href="/" className="text-blue-600 hover:underline">
                Go back home
              </a>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
