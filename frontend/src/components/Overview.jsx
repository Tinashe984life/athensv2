import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { athletes, teams } from '../services/athletes';
import { workload } from '../services/workload';
import { sports } from '../services/sports';
import { PageHeader, StatCard, PageLoader, EmptyState } from './ui';

const SESSION_TYPE_LABELS = {
  pe: 'PE Lesson',
  training: 'Training',
  match: 'Match',
  recovery: 'Recovery',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const QuickAction = ({ to, icon, title, text }) => (
  <Link to={to} className="card-hover flex items-start gap-4 !p-5">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-xl dark:bg-accent-600/15">
      {icon}
    </div>
    <div>
      <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{text}</p>
    </div>
  </Link>
);

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

  return (
    <div>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${user.name} 👋`}
        subtitle={
          isStaff
            ? 'Here’s what’s happening across your school’s sport and PE programme.'
            : 'Here’s a snapshot of your training and performance.'
        }
      />

      {isStaff ? (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Students" value={stats.students} icon="🧑‍🎓" />
            <StatCard label="Teams" value={stats.teams} icon="🏆" />
            <StatCard label="Sessions this week" value={stats.sessions7} icon="🏃" />
            <StatCard label="Results this week" value={stats.records} icon="📈" />
          </div>

          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Quick actions
          </h2>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <QuickAction
              to="/dashboard/sessions"
              icon="🏃"
              title="Log a session"
              text="Record a PE lesson, training session or match."
            />
            <QuickAction
              to="/dashboard/performance"
              icon="📈"
              title="Record results"
              text="Capture test results for one or many students."
            />
            <QuickAction
              to="/dashboard/students"
              icon="🧑‍🎓"
              title="Manage students"
              text="Add students or update their profiles."
            />
          </div>
        </>
      ) : (
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Recent sessions" value={recentSessions.length} icon="🏃" />
          <StatCard label="Metrics tracked" value={summaries.length} icon="📊" />
          <StatCard
            label="Improving"
            value={summaries.filter((s) => s.trend === 'improving').length}
            icon="🚀"
          />
          <StatCard
            label="Latest session"
            value={recentSessions[0] ? formatDate(recentSessions[0].date) : '—'}
            icon="🗓️"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent sessions */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent sessions</h2>
            <Link to="/dashboard/sessions" className="text-sm font-medium text-accent-600 hover:text-accent-500 dark:text-accent-400">
              View all →
            </Link>
          </div>
          {recentSessions.length === 0 ? (
            <EmptyState
              icon="🏃"
              title="No sessions yet"
              message={isStaff ? 'Log your first PE lesson or training session.' : 'Your logged sessions will appear here.'}
              action={
                isStaff && (
                  <Link to="/dashboard/sessions" className="btn-primary">
                    Log a session
                  </Link>
                )
              }
            />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentSessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {s.session_name || SESSION_TYPE_LABELS[s.session_type] || 'Session'}
                      {isStaff && s.athlete_name ? ` · ${s.athlete_name}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(s.date)} · {s.duration_minutes} min · RPE {s.perceived_exertion}
                    </p>
                  </div>
                  <span className="badge-accent shrink-0">
                    {SESSION_TYPE_LABELS[s.session_type] || s.session_type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Student: my progress / Staff: getting started */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {isStaff ? 'Getting started' : 'My progress'}
            </h2>
            {!isStaff && (
              <Link to="/dashboard/performance" className="text-sm font-medium text-accent-600 hover:text-accent-500 dark:text-accent-400">
                Details →
              </Link>
            )}
          </div>
          {isStaff ? (
            <ol className="space-y-4">
              {[
                ['Create your teams', 'Set up a team for each sport department you run.', '/dashboard/teams'],
                ['Add your students', 'Add students manually or let them sign up themselves.', '/dashboard/students'],
                ['Log sessions & results', 'Capture PE lessons, training and performance tests.', '/dashboard/sessions'],
              ].map(([t, d, to], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700 dark:bg-accent-600/20 dark:text-accent-300">
                    {i + 1}
                  </span>
                  <div>
                    <Link to={to} className="text-sm font-semibold text-gray-900 hover:text-accent-600 dark:text-white dark:hover:text-accent-400">
                      {t}
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : summaries.length === 0 ? (
            <EmptyState
              icon="📊"
              title="No results yet"
              message="Once your teacher or coach records your test results, your progress will show here."
            />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {summaries.slice(0, 6).map((m) => (
                <li key={m.metric_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{m.metric_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {m.sport_name} · latest {m.latest_value}
                      {m.unit ? ` ${m.unit}` : ''}
                    </p>
                  </div>
                  <span
                    className={
                      m.trend === 'improving' ? 'badge-green' : m.trend === 'declining' ? 'badge-red' : 'badge-gray'
                    }
                  >
                    {m.trend === 'improving' ? '▲ Improving' : m.trend === 'declining' ? '▼ Declining' : '— Steady'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Overview;
