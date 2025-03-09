import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext'; 
import '../styles/Spinner.css';

function AutomationForm() {
  const { user } = useAuth();
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
    totalJobsToApply: '5',
    // Internshala-specific fields
    email: '',
    password: '',
    filters: [],
    filtersText: '',
    coverLetter: ''
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
      // Transform data based on platform
      let transformedData = {
        ...formData,
        profile_id: user?.id,
        totalJobsToApply: parseInt(formData.totalJobsToApply) || 5
      };
      
      if (platform === 'linkedin') {
        // LinkedIn-specific transformations
        transformedData = {
          ...transformedData,
          datePosted: {
            '24h': 'r86400',
            'week': 'r604800',
            'month': 'r2592000'
          }[formData.datePosted] || formData.datePosted,
          workplaceType: {
            'onsite': '1',
            'hybrid': '3',
            'remote': '2'
          }[formData.workplaceType] || formData.workplaceType,
          experience: parseInt(formData.experience) || 0,
          currentSalary: parseInt(formData.currentSalary) || 0,
          expectedSalary: parseInt(formData.expectedSalary) || 0
        };
      }
      else if (platform === 'internshala') {
        // Internshala-specific transformations
        if (formData.filtersText) {
          transformedData.filters = formData.filtersText.split(',').map(f => f.trim()).filter(Boolean);
        }
      }

      // Use platform-specific message type
      const messageType = `${platform.toUpperCase()}_AUTOMATION_REQUEST`;
      
      window.postMessage({
        type: messageType,
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
    const handleMessage = (event) => {
      console.log("Received message:", event.data);
      
      // Make this platform-agnostic by checking for any platform response
      const responseTypes = [
        'LINKEDIN_AUTOMATION_RESPONSE',
        'INTERNSHALA_AUTOMATION_RESPONSE',
        'INDEED_AUTOMATION_RESPONSE',
        'UNSTOP_AUTOMATION_RESPONSE'
      ];
      
      const progressTypes = [
        'LINKEDIN_AUTOMATION_PROGRESS',
        'INTERNSHALA_AUTOMATION_PROGRESS',
        'INDEED_AUTOMATION_PROGRESS',
        'UNSTOP_AUTOMATION_PROGRESS'
      ];
      
      const completeTypes = [
        'LINKEDIN_AUTOMATION_COMPLETE',
        'INTERNSHALA_AUTOMATION_COMPLETE',
        'INDEED_AUTOMATION_COMPLETE',
        'UNSTOP_AUTOMATION_COMPLETE'
      ];
      
      if (responseTypes.includes(event.data.type)) {
        if (event.data.error) {
          console.error("Automation error:", event.data.error);
          alert('Error: ' + event.data.error);
          setProgress(prev => ({ ...prev, isRunning: false }));
        } else if (event.data.response?.success) {
          console.log("Automation started successfully");
          setProgress(prev => ({ ...prev, isRunning: true }));
          // Scroll to the top of the page to see the loader
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } 
      else if (progressTypes.includes(event.data.type)) {
        console.log("Progress update:", event.data);
        const applied = event.data.data?.total || 0;
        const total = event.data.data?.totalJobsToApply || parseInt(formData.totalJobsToApply);
        
        setProgress(prev => ({
          isRunning: true,
          totalApplied: applied
        }));
        
        // Ensure we're scrolled to the top to see progress
        if (window.scrollY > 100) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
      else if (completeTypes.includes(event.data.type)) {
        console.log("Automation complete:", event.data);
        setProgress(prev => ({
          isRunning: false,
          totalApplied: event.data.data?.totalApplied || prev.totalApplied
        }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [formData.totalJobsToApply]);

  // Platform-specific form fields
  const renderFormFields = () => {
    if (platform === 'internshala') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filters (comma separated)
            </label>
            <input
              type="text"
              name="filtersText"
              value={formData.filtersText}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g., Engineering, Marketing, Design"
            />
            <p className="text-xs text-gray-500 mt-1">Engineering, Marketing, Management, Design, Content, Finance, HR</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Letter
            </label>
            <textarea
              name="coverLetter"
              value={formData.coverLetter}
              onChange={handleChange}
              className="form-input min-h-[120px]"
              placeholder="Your default cover letter text for applications"
            ></textarea>
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
              <option value="remote">Remote</option>
            </select>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg mb-2">
            <div className="flex items-center">
              <div className="text-blue-500 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <p className="text-sm text-blue-700">
                You must be logged in to Internshala in your browser before starting the automation.
              </p>
            </div>
          </div>
        </>
      );
    } else {
      // Default LinkedIn/Indeed/Unstop fields
      return (
        <>
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
        </>
      );
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Spinner */}
      {progress.isRunning && (
        <div className="mb-8 p-6 bg-white rounded-xl shadow-md">
          <div className="flex flex-col items-center">
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-xl font-semibold mb-2">Automation in Progress</h3>
              <p className="text-gray-600 mb-3">Please keep this window open</p>
              <div className="relative w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                  style={{ 
                    width: `${(progress.totalApplied / parseInt(formData.totalJobsToApply)) * 100}%`
                  }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Applied: <span className="font-semibold text-indigo-600">{progress.totalApplied}</span> 
                <span className="mx-1">/</span> 
                <span className="font-semibold text-gray-700">{formData.totalJobsToApply}</span> jobs
              </p>
            </div>
          </div>
        </div>
      )}

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
        {/* Render platform-specific form fields */}
        {renderFormFields()}

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
    </div>
  );
}

export default AutomationForm;