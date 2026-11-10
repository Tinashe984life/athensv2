import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { athletes, teams } from '../services/athletes';
import { workload } from '../services/workload';
import { sports } from '../services/sports';
import { PageLoader, StatStrip, SectionHeader, EmptyState, SESSION_TYPE_META } from './ui';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const Overview = ({ user }) => {
  const isStaff = user.role === 'coach' || user.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, teams: 0, sessions7: 0, records: 0 });
  const [recentSessions, setRecentSessions] = useState([]);
  const [summaries, setSummaries] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        if (isStaff) {
          const [athletesRes, teamsRes, sessionsRes, recordsRes] = await Promise.all([
            athletes.getAll(),
            teams.getAll(),
            workload.listSessions({ limit: 8 }),
            sports.getRecords({ start_date: weekAgo, limit: 500 }),
          ]);
          if (cancelled) return;
          const sessionList = sessionsRes.success ? sessionsRes.sessions || [] : [];
          setStats({
            students: athletesRes.data?.athletes?.length || 0,
            teams: teamsRes.data?.teams?.length || 0,
            sessions7: sessionList.filter((s) => s.date >= weekAgo).length,
            records: recordsRes.data?.records?.length || 0,
          });
          setRecentSessions(sessionList);
        } else {
          const athletesRes = await athletes.getAll();
          if (cancelled) return;
          const me = athletesRes.data?.athletes?.[0];
          if (me) {
            const [sessionsRes, summaryRes] = await Promise.all([
              workload.listSessions({ limit: 8 }),
              sports.getAthleteSummary(me.id),
            ]);
            if (cancelled) return;
            setRecentSessions(sessionsRes.success ? sessionsRes.sessions || [] : []);
            setSummaries(summaryRes.data?.summaries || []);
          }
        }
      } catch (err) {
        console.error('Error loading overview:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  if (loading) return <PageLoader />;

  const staffStats = [
    { label: 'Students', value: stats.students },
    { label: 'Teams', value: stats.teams },
    { label: 'Sessions this week', value: stats.sessions7 },
    { label: 'Results this week', value: stats.records },
  ];

  const studentStats = [
    { label: 'Recent sessions', value: recentSessions.length },
    { label: 'Metrics tracked', value: summaries.length },
    { label: 'Improving', value: summaries.filter((s) => s.trend === 'improving').length },
    { label: 'Latest session', value: recentSessions[0] ? formatDate(recentSessions[0].date) : '—' },
  ];

  const quickActions = [
    { to: '/dashboard/sessions', label: 'Log a session' },
    { to: '/dashboard/performance', label: 'Record results' },
    { to: '/dashboard/students', label: 'Manage students' },
  ];

  return (
    <div>
      {/* Editorial header with athletic speed stripes */}
      <div className="relative mb-8 overflow-visible">
        <svg
          className="pointer-events-none absolute -top-6 right-0 hidden h-28 w-72 sm:block"
          viewBox="0 0 288 112"
          fill="none"
          aria-hidden="true"
        >
          <path d="M150 112 L210 0 h22 L172 112 Z" fill="rgb(var(--accent-400))" opacity="0.9" />
          <path d="M196 112 L256 0 h14 L210 112 Z" fill="#fb923c" opacity="0.55" />
          <path d="M234 112 L288 11 V40 L250 112 Z" fill="#38bdf8" opacity="0.4" />
        </svg>
        <p className="micro-label mb-2">{isStaff ? 'School programme' : 'My training'}</p>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {greeting()}, <span className="text-accent-600 dark:text-accent-400">{user.name}</span>
        </h1>
      </div>

      {/* Flush metrics strip */}
      <StatStrip items={isStaff ? staffStats : studentStats} />

      {/* Inline action toolbar */}
      {isStaff && (
        <div className="mb-12 flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-gray-200 pb-6 dark:border-gray-800">
          <span className="micro-label">Quick actions</span>
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group text-sm font-semibold text-gray-900 transition-colors hover:text-accent-600 dark:text-white dark:hover:text-accent-400"
            >
              {a.label}{' '}
              <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          ))}
        </div>
      )}

      {/* 70 / 30 asymmetric split */}
      <div className="grid gap-12 lg:grid-cols-10">
        {/* Recent activity — dominant column */}
        <section className="lg:col-span-7">
          <SectionHeader
            label="Recent sessions"
            action={
              <Link
                to="/dashboard/sessions"
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                View all →
              </Link>
            }
          />
          {recentSessions.length === 0 ? (
            <EmptyState
              title="No sessions yet"
              message={
                isStaff
                  ? 'Log your first PE lesson or training session.'
                  : 'Your logged sessions will appear here.'
              }
              action={
                isStaff && (
                  <Link to="/dashboard/sessions" className="btn-primary">
                    Log a session
                  </Link>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {recentSessions.map((s) => {
                const meta = SESSION_TYPE_META[s.session_type] || { label: s.session_type, text: '' };
                return (
                  <li key={s.id} className="flex items-baseline justify-between gap-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
                        {s.session_name || meta.label || 'Session'}
                        {isStaff && s.athlete_name ? (
                          <span className="font-normal text-gray-500 dark:text-gray-400"> — {s.athlete_name}</span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-gray-400 dark:text-gray-500">
                        {formatDate(s.date)} · {s.duration_minutes} min · RPE {s.perceived_exertion}
                      </p>
                    </div>
                    <span className={`micro-label shrink-0 ${meta.text}`}>{meta.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Tight rail */}
        <aside className="lg:col-span-3">
          {isStaff ? (
            <>
              <SectionHeader label="Getting started" />
              <ol className="space-y-5">
                {[
                  ['Create your teams', 'One per sport department.', '/dashboard/teams'],
                  ['Add your students', 'Manually, or let them sign up.', '/dashboard/students'],
                  ['Log sessions & results', 'PE lessons, training, testing.', '/dashboard/sessions'],
                ].map(([t, d, to], i) => (
                  <li key={t} className="flex gap-3.5">
                    <span className="mt-0.5 text-xs font-bold tabular-nums text-gray-300 dark:text-gray-600">
                      0{i + 1}
                    </span>
                    <div>
                      <Link
                        to={to}
                        className="text-sm font-semibold tracking-tight text-gray-900 hover:text-accent-600 dark:text-white dark:hover:text-accent-400"
                      >
                        {t}
                      </Link>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <>
              <SectionHeader
                label="My progress"
                action={
                  <Link
                    to="/dashboard/performance"
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Details →
                  </Link>
                }
              />
              {summaries.length === 0 ? (
                <EmptyState
                  title="No results yet"
                  message="Once your teacher records your test results, your progress will show here."
                />
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                  {summaries.slice(0, 6).map((m) => (
                    <li key={m.metric_id} className="flex items-baseline justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
                          {m.metric_name}
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-gray-400 dark:text-gray-500">
                          {m.sport_name} · latest {m.latest_value}
                          {m.unit ? ` ${m.unit}` : ''}
                        </p>
                      </div>
                      <span
                        className={`micro-label shrink-0 ${
                          m.trend === 'improving'
                            ? '!text-accent-600 dark:!text-accent-400'
                            : m.trend === 'declining'
                            ? '!text-red-500'
                            : ''
                        }`}
                      >
                        {m.trend === 'improving' ? '▲ Up' : m.trend === 'declining' ? '▼ Down' : '— Steady'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Overview;
