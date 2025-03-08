import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext'; // Add this import

function AutomationForm() {
  const { user } = useAuth(); // Add this line
  const { platform } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    platform: platform,
    keywords: '',
    location: '',
    datePosted: '',
    workplaceType: '',
    experience: '',
    currentSalary: '',
    expectedSalary: '',
    totalJobsToApply: '5'
  });

  const [progress, setProgress] = useState({
    isRunning: false,
    totalApplied: 0
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProgress(prev => ({ ...prev, isRunning: true }));

    try {
      // Transform data to match extension's expected format
      const transformedData = {
        ...formData,
        // Add user's profile ID
        profile_id: user?.id,
        // Convert datePosted to LinkedIn's format
        datePosted: {
          '24h': 'r86400',
          'week': 'r604800',
          'month': 'r2592000'
        }[formData.datePosted] || formData.datePosted,
        // Convert workplaceType to LinkedIn's format
        workplaceType: {
          'onsite': '1',
          'hybrid': '3',
          'remote': '2'
        }[formData.workplaceType] || formData.workplaceType,
        // Ensure numeric values
        experience: parseInt(formData.experience) || 0,
        currentSalary: parseInt(formData.currentSalary) || 0,
        expectedSalary: parseInt(formData.expectedSalary) || 0,
        totalJobsToApply: parseInt(formData.totalJobsToApply) || 5,
        // Add platform
        platform: 'linkedin'
      };

      window.postMessage({
        type: 'LINKEDIN_AUTOMATION_REQUEST',
        message: {
          action: 'startAutomation',
          data: transformedData
        }
      }, '*');
    } catch (error) {
      console.error('Automation error:', error);
      alert('Error: ' + error.message);
      setProgress(prev => ({ ...prev, isRunning: false }));
    }
  };

  useEffect(() => {
    const handleAutomationResponse = (event) => {
      if (event.data.type === 'LINKEDIN_AUTOMATION_RESPONSE') {
        if (event.data.error) {
          alert('Error: ' + event.data.error);
          setProgress(prev => ({ ...prev, isRunning: false }));
        } else {
          console.log('Automation response:', event.data.response);
          setProgress(prev => ({
            ...prev,
            totalApplied: event.data.response.totalApplied
          }));
        }
      }
    };

    window.addEventListener('message', handleAutomationResponse);

    return () => {
      window.removeEventListener('message', handleAutomationResponse);
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/dashboard/automate')}
          className="mr-4 p-2 hover:bg-gray-100 rounded-full"
        >
          <FiArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold">Configure Automation for {platform.charAt(0).toUpperCase() + platform.slice(1)}</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Keywords
          </label>
          <input
            type="text"
            name="keywords"
            value={formData.keywords}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g., Software Engineer, React Developer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g., New York, Remote"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Posted
          </label>
          <select
            name="datePosted"
            value={formData.datePosted}
            onChange={handleChange}
            className="form-input"
          >
            <option value="">Select date range</option>
            <option value="24h">Past 24 hours</option>
            <option value="week">Past week</option>
            <option value="month">Past month</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workplace Type
          </label>
          <select
            name="workplaceType"
            value={formData.workplaceType}
            onChange={handleChange}
            className="form-input"
          >
            <option value="">Select workplace type</option>
            <option value="onsite">On-site</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Experience (years)
          </label>
          <input
            type="number"
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g., 2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Salary
            </label>
            <input
              type="text"
              name="currentSalary"
              value={formData.currentSalary}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g., 75000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Salary
            </label>
            <input
              type="text"
              name="expectedSalary"
              value={formData.expectedSalary}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g., 90000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Jobs to Apply
          </label>
          <input
            type="number"
            name="totalJobsToApply"
            value={formData.totalJobsToApply}
            onChange={handleChange}
            className="form-input"
            min="1"
            max="50"
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={progress.isRunning}>
          {progress.isRunning ? 'Automation Running...' : 'Start Automation'}
        </button>
      </form>

      {progress.isRunning && (
        <div className="progress mt-6">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${(progress.totalApplied / formData.totalJobsToApply) * 100}%`
              }}
            />
          </div>
          <p>Applied: {progress.totalApplied} jobs</p>
        </div>
      )}
    </div>
  );
}

export default AutomationForm;