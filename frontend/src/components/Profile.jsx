import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme, ACCENTS } from '../context/ThemeContext';
import { athletes } from '../services/athletes';
import { PageHeader, Avatar } from './ui';

const Profile = ({ user }) => {
  const { mode, setMode, accent, setAccent } = useTheme();
  const [myAthleteId, setMyAthleteId] = useState(null);

  useEffect(() => {
    if (user.role !== 'athlete') return;
    athletes
      .getAll()
      .then((res) => setMyAthleteId(res.data?.athletes?.[0]?.id || null))
      .catch(() => {});
  }, [user.role]);

  const roleLabel = user.role === 'admin' ? 'Administrator' : user.role === 'coach' ? 'Teacher / Coach' : 'Student';

  return (
    <div>
      <PageHeader title="My profile" subtitle="Your account details and appearance preferences." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account */}
        <div className="card">
          <div className="mb-6 flex items-center gap-4">
            <Avatar name={user.name} surname={user.surname} size="lg" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {user.name} {user.surname}
              </h2>
              <span className="badge-accent mt-1">{roleLabel}</span>
            </div>
          </div>
          <dl className="space-y-4">
            {[
              ['Username', user.username],
              ['Email', user.email || '—'],
              ['Role', roleLabel],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 dark:border-gray-800">
                <dt className="text-sm text-gray-500 dark:text-gray-400">{k}</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">{v}</dd>
              </div>
            ))}
          </dl>
          {user.role === 'athlete' && myAthleteId && (
            <Link to={`/dashboard/students/${myAthleteId}`} className="btn-primary mt-6 w-full">
              ✏️ View & edit my athlete profile
            </Link>
          )}
        </div>

        {/* Appearance */}
        <div className="card">
          <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">Appearance</h2>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Personalise HER-PACE for your account. Your choices are saved automatically.
          </p>

          <p className="label">Theme</p>
          <div className="mb-6 grid grid-cols-2 gap-3">
            {[
              { id: 'light', label: 'Light', icon: '☀️' },
              { id: 'dark', label: 'Dark', icon: '🌙' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                className={`rounded-xl border p-4 text-center transition ${
                  mode === opt.id
                    ? 'border-accent-500 bg-accent-50 ring-2 ring-accent-500/25 dark:bg-accent-600/10'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
                aria-pressed={mode === opt.id}
              >
                <div className="text-xl">{opt.icon}</div>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{opt.label}</p>
              </button>
            ))}
          </div>

          <p className="label">Accent colour</p>
          <div className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  accent === a.id ? 'ring-2 ring-gray-900 ring-offset-2 dark:ring-white dark:ring-offset-gray-900' : ''
                }`}
                style={{ backgroundColor: a.swatch }}
                title={a.label}
                aria-label={`${a.label} accent`}
                aria-pressed={accent === a.id}
              >
                {accent === a.id && <span className="text-sm text-white">✓</span>}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Accent colours help with visual comfort and accessibility.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
