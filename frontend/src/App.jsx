import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import { health } from './services/api';

function App() {
  const [apiStatus, setApiStatus] = useState('checking');
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    // Check API health on mount
    const checkApiHealth = async () => {
      try {
        await health.check();
        setApiStatus('healthy');
      } catch (error) {
        console.error('API connection error:', error);
        setApiStatus('unhealthy');
      }
    };
    
    checkApiHealth();
    
    // Check if token exists in localStorage
    const token = localStorage.getItem('access_token');
    if (token && !user) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Show loading spinner while checking API
  if (apiStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan mx-auto"></div>
          <p className="mt-4 text-slate-300">Starting HER-PACE...</p>
        </div>
      </div>
    );
  }

  // Show error only if we're NOT on the root path
  // This allows the app to load even if API is initially unreachable
  const isRootPath = window.location.pathname === '/';
  
  if (apiStatus === 'unhealthy' && !isRootPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center p-8 bg-red-900/20 border border-red-700 rounded-xl max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">API Connection Failed</h2>
          <p className="text-slate-300 mb-4">
            Unable to connect to the backend server. The app may still work for browsing.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Retry Connection
            </button>
            <button 
              onClick={() => {
                // Try to load the app anyway
                setApiStatus('healthy');
              }}
              className="btn-secondary w-full"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={
            user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
          } />
          <Route path="login" element={
            user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
          } />
          <Route path="signup" element={
            user ? <Navigate to="/dashboard" /> : <Signup />
          } />
          <Route path="dashboard" element={
            user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;