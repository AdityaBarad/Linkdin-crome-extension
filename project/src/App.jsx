import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import AutomatePage from './pages/AutomatePage';
import ManagePage from './pages/ManagePage';
import JobDetailsPage from './pages/JobDetailsPage';
import AutomationForm from './pages/AutomationForm';
import PricingPage from './pages/PricingPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route 
            path="/dashboard/*" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/dashboard/automate/:platform" 
            element={
              <PrivateRoute>
                <AutomationForm />
              </PrivateRoute>
            } 
          />
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<Navigate to="/dashboard/automate" replace />} />
            <Route path="automate" element={<AutomatePage />} />
            <Route path="manage" element={<ManagePage />} />
            <Route path="jobs" element={<JobDetailsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;