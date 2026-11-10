import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Logo, Avatar, SunIcon, MoonIcon } from './ui';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard', label: 'Overview', end: true },
      { to: '/dashboard/sessions', label: 'Sessions' },
      { to: '/dashboard/performance', label: 'Performance' },
    ],
  },
  {
    label: 'Manage',
    staff: true,
    items: [
      { to: '/dashboard/students', label: 'Students', staff: true },
      { to: '/dashboard/teams', label: 'Teams', staff: true },
      { to: '/dashboard/sports', label: 'Sports & Metrics', staff: true },
      { to: '/dashboard/admin', label: 'Admin', admin: true },
    ],
  },
];

const AppLayout = ({ user, onLogout }) => {
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStaff = user.role === 'coach' || user.role === 'admin';
  const roleLabel = user.role === 'admin' ? 'Admin' : user.role === 'coach' ? 'Teacher / Coach' : 'Student';

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => (!i.staff || isStaff) && (!i.admin || user.role === 'admin')),
  })).filter((g) => g.items.length > 0 && (!g.staff || isStaff));

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  // Sharp active state: 2px accent indicator on the left edge, high-contrast text
  const navLink = (item, onClick) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `-ml-px block border-l-2 py-2 pl-4 pr-3 text-sm transition-colors ${
          isActive
            ? 'border-accent-500 font-semibold text-gray-900 dark:text-white'
            : 'border-transparent font-medium text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-100'
        }`
      }
    >
      {item.label}
    </NavLink>
  );

  const navGroups = (onClick) =>
    groups.map((g) => (
      <div key={g.label} className="mb-7">
        <p className="micro-label mb-2 pl-4">{g.label}</p>
        <div className="border-l border-gray-200 dark:border-gray-800">
          {g.items.map((item) => navLink(item, onClick))}
        </div>
      </div>
    ));

  return (
    <div className="bg-canvas min-h-screen">
      {/* Athletic racing stripe */}
      <div
        className="fixed inset-x-0 top-0 z-50 h-[3px] bg-gradient-to-r from-accent-500 via-orange-400 to-sky-500"
        aria-hidden="true"
      />
      {/* Desktop sidebar — pure white, flush against the canvas */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-gray-900 lg:flex">
        <div className="mb-10 pl-1">
          <Link to="/" aria-label="HER-PACE home">
            <Logo className="h-8 w-8" textClass="text-base text-gray-900 dark:text-white" />
          </Link>
        </div>
        <nav className="flex-1">{navGroups()}</nav>
        <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
          <NavLink
            to="/dashboard/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-1 py-2 transition-opacity ${isActive ? '' : 'opacity-80 hover:opacity-100'}`
            }
          >
            <Avatar name={user.name} surname={user.surname} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
                {user.name} {user.surname}
              </p>
              <p className="micro-label !tracking-[0.1em]">{roleLabel}</p>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            className="mt-2 w-full px-1 py-1.5 text-left text-sm font-medium text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-gray-100"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* Topbar */}
      <header className="bg-canvas-translucent sticky top-0 z-20 border-b border-gray-200 backdrop-blur dark:border-gray-800 lg:pl-60">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="btn-ghost !px-2.5"
              aria-label="Toggle navigation"
            >
              ☰
            </button>
            <Link to="/" aria-label="HER-PACE home">
              <Logo className="h-7 w-7" textClass="text-sm text-gray-900 dark:text-white" />
            </Link>
          </div>
          <p className="micro-label hidden lg:block">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMode}
              className="btn-ghost !px-2.5"
              aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <NavLink to="/dashboard/profile" className="lg:hidden">
              <Avatar name={user.name} surname={user.surname} size="sm" />
            </NavLink>
          </div>
        </div>
        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="border-t border-gray-200 bg-white px-5 py-5 dark:border-gray-800 dark:bg-gray-900 lg:hidden">
            {navGroups(() => setMobileOpen(false))}
            <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
              <NavLink
                to="/dashboard/profile"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                My profile
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full py-2 text-left text-sm font-medium text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Sign out →
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="px-4 py-8 sm:px-8 lg:pl-[18.5rem] lg:pr-12">
        <div className="mx-auto max-w-6xl animate-fade-in-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
