import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './ui';
import { useTheme } from '../context/ThemeContext';

const FEATURES = [
  {
    icon: '🏃',
    title: 'PE session logging',
    text: 'Teachers log class PE sessions in seconds — duration, intensity and notes for every student.',
  },
  {
    icon: '📊',
    title: 'Performance tracking',
    text: 'Record sport-specific test results and watch progress build over time with clear trends and charts.',
  },
  {
    icon: '🏆',
    title: 'Team management',
    text: 'Coaches create teams, build rosters and log training telemetry for every sport department.',
  },
  {
    icon: '🧑‍🎓',
    title: 'Student profiles',
    text: 'Students own their profile, see their results, and follow their own improvement journey.',
  },
  {
    icon: '🎯',
    title: 'Sport-ready metrics',
    text: 'Football, Rugby, Cricket, Hockey, Swimming, Netball, Basketball and Athletics — with the metrics coaches actually use.',
  },
  {
    icon: '🌙',
    title: 'Made to be yours',
    text: 'Light and dark modes with customisable accent colours for comfortable, accessible viewing.',
  },
];

const SPORTS = ['⚽ Football', '🏉 Rugby', '🏏 Cricket', '🏑 Hockey', '🏊 Swimming', '🏐 Netball', '🏀 Basketball', '🏅 Athletics'];

const Landing = () => {
  const { mode, toggleMode } = useTheme();

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo textClass="text-lg text-gray-900 dark:text-white" />
          <nav className="flex items-center gap-2">
            <button onClick={toggleMode} className="btn-ghost" aria-label="Toggle dark mode">
              {mode === 'dark' ? '☀️' : '🌙'}
            </button>
            <Link to="/login" className="btn-ghost">
              Sign in
            </Link>
            <Link to="/signup" className="btn-primary">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b from-accent-50 to-transparent dark:from-accent-600/10"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
          <span className="badge-accent mb-6">Built for primary & high schools</span>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
            School sport performance,{' '}
            <span className="bg-gradient-to-r from-accent-600 to-accent-400 bg-clip-text text-transparent">
              beautifully simple
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            HER-PACE helps PE teachers and coaches log sessions, track student performance and manage
            sports teams — while every student watches their own progress grow.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup" className="btn-primary !px-6 !py-3 !text-base">
              Create your account
            </Link>
            <Link to="/login" className="btn-secondary !px-6 !py-3 !text-base">
              Sign in
            </Link>
          </div>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-2">
            {SPORTS.map((s) => (
              <span key={s} className="badge-gray !px-3 !py-1.5 !text-sm">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-hover">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-xl dark:bg-accent-600/15">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-100 bg-gray-50 py-20 dark:border-gray-800 dark:bg-gray-900/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Up and running in three steps</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { n: '1', t: 'Add your students', d: 'Teachers and coaches add students, or students sign up and manage their own profiles.' },
              { n: '2', t: 'Log every session', d: 'Capture PE lessons, team training and matches with duration, intensity and telemetry.' },
              { n: '3', t: 'Track the progress', d: 'Record sport-specific metrics and watch trends emerge for every student and team.' },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-600 text-lg font-bold text-white shadow-sm">
                  {s.n}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{s.t}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500 dark:text-gray-400">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-600 to-accent-700 px-6 py-16 text-center text-white shadow-lg">
          <h2 className="text-3xl font-bold tracking-tight">Ready to move your school forward?</h2>
          <p className="mx-auto mt-3 max-w-xl text-accent-100">
            Join HER-PACE and give every PE lesson, training session and student the attention it deserves.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-base font-semibold text-accent-700 shadow-sm transition hover:bg-accent-50"
          >
            Get started — it’s free
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <Logo className="h-7 w-7" textClass="text-sm text-gray-700 dark:text-gray-300" />
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} HER-PACE. School sport & PE performance.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
