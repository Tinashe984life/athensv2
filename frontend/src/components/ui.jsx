/* eslint-disable react-refresh/only-export-components */
import React, { useEffect } from 'react';

export function Spinner({ className = 'h-8 w-8' }) {
  return (
    <div
      className={`${className} animate-spin rounded-full border-2 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <Spinner />
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

export function PageHeader({ overline, title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {overline && <p className="micro-label mb-2">{overline}</p>}
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* Flush editorial metrics strip — hairline-bounded, divider-separated cells */
const STRIP_TONES = ['bg-accent-500', 'bg-orange-500', 'bg-sky-500', 'bg-violet-500'];

export function StatStrip({ items }) {
  return (
    <div className="mb-10 grid grid-cols-2 border-y border-gray-200 dark:border-gray-800 lg:grid-cols-4 lg:divide-x lg:divide-gray-200 dark:lg:divide-gray-800">
      {items.map(({ label, value, hint }, i) => (
        <div key={label} className="py-5 pr-6 lg:px-8 lg:first:pl-0">
          <span className={`mb-2.5 block h-1 w-8 rounded-full ${STRIP_TONES[i % STRIP_TONES.length]}`} />
          <p className="micro-label">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums text-gray-900 dark:text-white">
            {value}
          </p>
          {hint && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
        </div>
      ))}
    </div>
  );
}

/* Shared session-type colour language */
export const SESSION_TYPE_META = {
  pe: { label: 'PE Lesson', badge: 'badge-accent', text: '!text-accent-600 dark:!text-accent-400' },
  training: { label: 'Training', badge: 'badge-sky', text: '!text-sky-600 dark:!text-sky-400' },
  match: { label: 'Match', badge: 'badge-orange', text: '!text-orange-600 dark:!text-orange-400' },
  recovery: { label: 'Recovery', badge: 'badge-teal', text: '!text-teal-600 dark:!text-teal-400' },
};

export function SectionHeader({ label, action }) {
  return (
    <div className="mb-4 flex items-baseline justify-between border-b border-gray-200 pb-3 dark:border-gray-800">
      <h2 className="micro-label !text-gray-900 dark:!text-gray-200">{label}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-3 text-2xl opacity-60">{icon}</div>}
      <h3 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({ type = 'error', children, onDismiss }) {
  const styles =
    type === 'success'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
      : 'border-red-300 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300';
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm ${styles}`} role="alert">
      <span>{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="font-bold opacity-60 hover:opacity-100" aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-950/50" onClick={onClose} />
      <div
        className={`relative max-h-[90vh] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} animate-fade-in-up overflow-y-auto rounded-md border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="btn-ghost !px-2 !py-1" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Avatar({ name = '', surname = '', src, size = 'md' }) {
  const initials = `${(name[0] || '').toUpperCase()}${(surname[0] || '').toUpperCase()}` || '?';
  const sizes = { sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-xs', lg: 'h-14 w-14 text-base' };
  if (src) {
    return (
      <img
        src={src}
        alt={`${name} ${surname}`.trim() || 'Profile picture'}
        className={`${sizes[size]} shrink-0 rounded-md object-cover`}
      />
    );
  }
  // Deterministic vibrant hue per person
  const str = `${name}${surname}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return (
    <div
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-md font-bold tracking-wide text-white`}
      style={{ backgroundColor: `hsl(${hue} 58% 42%)` }}
    >
      {initials}
    </div>
  );
}

export function Logo({ className = 'h-9 w-9', textClass }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`${className} inline-flex items-center justify-center rounded-md bg-gray-900 text-accent-400 dark:bg-white dark:text-accent-600`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-[62%] w-[62%]" aria-hidden="true">
          <path
            d="M4 14l4-8 4 10 4-6 4 4"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {textClass && <span className={`font-extrabold tracking-tight ${textClass}`}>HER-PACE</span>}
    </span>
  );
}

export function SunIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
