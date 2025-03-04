import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [formData, setFormData] = useState({
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

  const [extensionStatus, setExtensionStatus] = useState({
    detected: false,
    checking: true
  });

  useEffect(() => {
    // Listen for extension detection
    const handleExtensionDetection = (event) => {
      if (event.data.type === 'LINKEDIN_AUTOMATION_EXTENSION_DETECTED') {
        setExtensionStatus({
          detected: true,
          checking: false
        });
      }
    };

    // Listen for automation responses
    const handleAutomationResponse = (event) => {
      if (event.data.type === 'LINKEDIN_AUTOMATION_RESPONSE') {
        if (event.data.error) {
          alert('Error: ' + event.data.error);
          setProgress(prev => ({ ...prev, isRunning: false }));
        } else {
          // Handle successful response
          console.log('Automation response:', event.data.response);
        }
      }
    };

    window.addEventListener('message', handleExtensionDetection);
    window.addEventListener('message', handleAutomationResponse);

    // Set timeout to update status if extension isn't detected
    const timeout = setTimeout(() => {
      setExtensionStatus(prev => ({
        ...prev,
        checking: false
      }));
    }, 1000);

    return () => {
      window.removeEventListener('message', handleExtensionDetection);
      window.removeEventListener('message', handleAutomationResponse);
      clearTimeout(timeout);
    };
  }, []);

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
      // Send message through postMessage
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
    <div className="container">
      <h1>LinkedIn Job Automation</h1>
      
      {extensionStatus.checking ? (
        <div className="extension-status checking">
          Checking for LinkedIn Automation Extension...
        </div>
      ) : extensionStatus.detected ? (
        <div className="extension-status installed">
          ✅ LinkedIn Automation Extension detected
        </div>
      ) : (
        <div className="extension-status not-installed">
          ❌ LinkedIn Automation Extension not detected. 
          <a href="YOUR_EXTENSION_STORE_LINK" target="_blank" rel="noopener noreferrer">
            Click here to install
          </a>
        </div>
      )}

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
  )
}

export default App
