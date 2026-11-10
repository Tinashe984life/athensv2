import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Landing from './components/Landing';
import Login from './components/Login';
import Signup from './components/Signup';
import AppLayout from './components/AppLayout';
import Overview from './components/Overview';
import Students from './components/Students';
import StudentDetail from './components/StudentDetail';
import Teams from './components/Teams';
import Sessions from './components/Sessions';
import Performance from './components/Performance';
import SportsManager from './components/SportsManager';
import AdminPanel from './components/AdminPanel';
import Profile from './components/Profile';

function AppRoutes() {
  const { adoptUser } = useTheme();
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (userData, token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    adoptUser(userData.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    adoptUser(null);
  };

  const handleUserUpdate = (updated) => {
    const merged = { ...user, ...updated };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  const isStaff = user && (user.role === 'coach' || user.role === 'admin');

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />

        <Route
          path="/dashboard"
          element={user ? <AppLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Overview user={user} />} />
          <Route
            path="students"
            element={isStaff ? <Students user={user} /> : <Navigate to="/dashboard" replace />}
          />
          <Route path="students/:athleteId" element={<StudentDetail user={user} />} />
          <Route
            path="teams"
            element={isStaff ? <Teams user={user} /> : <Navigate to="/dashboard" replace />}
          />
          <Route path="sessions" element={<Sessions user={user} />} />
          <Route path="performance" element={<Performance user={user} />} />
          <Route
            path="sports"
            element={isStaff ? <SportsManager user={user} /> : <Navigate to="/dashboard" replace />}
          />
          <Route
            path="admin"
            element={user?.role === 'admin' ? <AdminPanel user={user} /> : <Navigate to="/dashboard" replace />}
          />
          <Route path="profile" element={<Profile user={user} onUserUpdate={handleUserUpdate} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppRoutes />
    </ThemeProvider>
  );
}

export default App;
