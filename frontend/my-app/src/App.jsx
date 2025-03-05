import { useState, useEffect } from 'react'
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function App() {
  const [formData, setFormData] = useState({
    platform: 'linkedin', // Add platform selection
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
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
