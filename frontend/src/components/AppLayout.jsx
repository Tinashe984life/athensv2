import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Logo, Avatar } from './ui';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: '🏠', end: true },
  { to: '/dashboard/students', label: 'Students', icon: '🧑‍🎓', staff: true },
  { to: '/dashboard/teams', label: 'Teams', icon: '🏆', staff: true },
  { to: '/dashboard/sessions', label: 'Sessions', icon: '🏃' },
  { to: '/dashboard/performance', label: 'Performance', icon: '📈' },
  { to: '/dashboard/sports', label: 'Sports & Metrics', icon: '🎯', staff: true },
  { to: '/dashboard/admin', label: 'Admin', icon: '🛠️', admin: true },
];

const AppLayout = ({ user, onLogout }) => {
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStaff = user.role === 'coach' || user.role === 'admin';
  const items = NAV_ITEMS.filter(
    (item) => (!item.staff || isStaff) && (!item.admin || user.role === 'admin')
  );

  const roleLabel = user.role === 'admin' ? 'Admin' : user.role === 'coach' ? 'Teacher / Coach' : 'Student';

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const navLinks = (onClick) =>
    items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onClick}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
            isActive
              ? 'bg-accent-50 text-accent-700 dark:bg-accent-600/15 dark:text-accent-300'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
          }`
        }
      >
        <span aria-hidden="true">{item.icon}</span>
        {item.label}
      </NavLink>
    ));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-200 bg-white px-4 py-5 dark:border-gray-800 dark:bg-gray-900 lg:flex">
        <div className="mb-8 px-2">
          <Logo textClass="text-lg text-gray-900 dark:text-white" />
        </div>
        <nav className="flex-1 space-y-1">{navLinks()}</nav>
        <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
          <NavLink
            to="/dashboard/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-2 py-2 transition-colors ${
                isActive ? 'bg-accent-50 dark:bg-accent-600/15' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
          >
            <Avatar name={user.name} surname={user.surname} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {user.name} {user.surname}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabel}</p>
            </div>
          </NavLink>
          <button onClick={handleLogout} className="btn-ghost mt-2 w-full !justify-start">
            <span aria-hidden="true">👋</span> Sign out
          </button>
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80 lg:pl-64">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="btn-ghost !px-2.5"
              aria-label="Toggle navigation"
            >
              ☰
            </button>
            <Logo className="h-8 w-8" textClass="text-base text-gray-900 dark:text-white" />
          </div>
          <div className="hidden text-sm text-gray-500 dark:text-gray-400 lg:block">
            Welcome back, <span className="font-semibold text-gray-900 dark:text-white">{user.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMode}
              className="btn-ghost !px-2.5"
              aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {mode === 'dark' ? '☀️' : '🌙'}
            </button>
            <NavLink to="/dashboard/profile" className="lg:hidden">
              <Avatar name={user.name} surname={user.surname} size="sm" />
            </NavLink>
          </div>
        </div>
        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="space-y-1 border-t border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 lg:hidden">
            {navLinks(() => setMobileOpen(false))}
            <NavLink
              to="/dashboard/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <span aria-hidden="true">⚙️</span> My profile
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <span aria-hidden="true">👋</span> Sign out
            </button>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="px-4 py-6 sm:px-6 lg:pl-[17.5rem] lg:pr-8">
        <div className="mx-auto max-w-6xl animate-fade-in-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
