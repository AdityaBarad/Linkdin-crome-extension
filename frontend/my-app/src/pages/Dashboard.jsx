import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Dashboard() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    platform: 'linkedin',
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

  const handleInputChange = (e) => {
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
      window.postMessage({
        type: 'LINKEDIN_AUTOMATION_REQUEST',
        message: {
          action: 'startAutomation',
          data: formData
        }
      }, '*');
    } catch (error) {
      console.error('Automation error:', error);
      alert('Error: ' + error.message);
      setProgress(prev => ({ ...prev, isRunning: false }));
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Welcome, {user.email}</h2>
      
      <div className="platform-tabs">
        {['linkedin', 'indeed', 'unstop'].map(platform => (
          <button
            key={platform}
            className={`platform-tab ${formData.platform === platform ? 'active' : ''}`}
            onClick={() => setFormData(prev => ({ ...prev, platform }))}
          >
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <input
            type="text"
            name="keywords"
            placeholder="Job Keywords"
            value={formData.keywords}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <input
            type="text"
            name="location"
            placeholder="Location"
            value={formData.location}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <select
            name="datePosted"
            value={formData.datePosted}
            onChange={handleInputChange}
          >
            <option value="">Any time</option>
            <option value="r2592000">Past month</option>
            <option value="r604800">Past week</option>
            <option value="r86400">Past 24 hours</option>
          </select>
        </div>

        <div className="form-group">
          <select
            name="workplaceType"
            value={formData.workplaceType}
            onChange={handleInputChange}
          >
            <option value="">Any workplace</option>
            <option value="1">On-site</option>
            <option value="2">Remote</option>
            <option value="3">Hybrid</option>
          </select>
        </div>

        <div className="form-group">
          <input
            type="number"
            name="experience"
            placeholder="Years of Experience"
            value={formData.experience}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <input
            type="number"
            name="currentSalary"
            placeholder="Current Salary/CTC"
            value={formData.currentSalary}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <input
            type="number"
            name="expectedSalary"
            placeholder="Expected Salary/CTC"
            value={formData.expectedSalary}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <input
            type="number"
            name="totalJobsToApply"
            placeholder="Number of Jobs to Apply"
            value={formData.totalJobsToApply}
            onChange={handleInputChange}
          />
        </div>

        <button 
          type="submit" 
          className="submit-button"
          disabled={progress.isRunning}
        >
          {progress.isRunning ? 'Automation Running...' : 'Start Automation'}
        </button>
      </form>

      {progress.isRunning && (
        <div className="progress">
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

export default Dashboard;
