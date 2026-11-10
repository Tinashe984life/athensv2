/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export const ACCENTS = [
  { id: 'indigo', label: 'Indigo', swatch: '#4f46e5' },
  { id: 'violet', label: 'Violet', swatch: '#7c3aed' },
  { id: 'blue', label: 'Blue', swatch: '#2563eb' },
  { id: 'teal', label: 'Teal', swatch: '#0d9488' },
  { id: 'emerald', label: 'Emerald', swatch: '#059669' },
  { id: 'rose', label: 'Rose', swatch: '#e11d48' },
  { id: 'amber', label: 'Amber', swatch: '#d97706' },
];

const DEFAULTS = { mode: 'light', accent: 'indigo' };

const storageKey = (userId) => `hp-theme:${userId || 'guest'}`;

function loadPrefs(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode === 'dark' ? 'dark' : 'light',
        accent: ACCENTS.some((a) => a.id === parsed.accent) ? parsed.accent : DEFAULTS.accent,
      };
    }
  } catch {
    /* ignore corrupt prefs */
  }
  return { ...DEFAULTS };
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [userId, setUserId] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved).id : null;
    } catch {
      return null;
    }
  });
  const [prefs, setPrefs] = useState(() => loadPrefs(userId));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', prefs.mode === 'dark');
    document.documentElement.setAttribute('data-accent', prefs.accent);
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
    } catch {
      /* storage unavailable */
    }
  }, [prefs, userId]);

  // Switch preference namespace when a user signs in or out
  const adoptUser = useCallback((newUserId) => {
    setUserId(newUserId || null);
    setPrefs(loadPrefs(newUserId));
  }, []);

  const setMode = useCallback((mode) => setPrefs((p) => ({ ...p, mode })), []);
  const toggleMode = useCallback(
    () => setPrefs((p) => ({ ...p, mode: p.mode === 'dark' ? 'light' : 'dark' })),
    []
  );
  const setAccent = useCallback((accent) => setPrefs((p) => ({ ...p, accent })), []);

  return (
    <ThemeContext.Provider
      value={{ mode: prefs.mode, accent: prefs.accent, setMode, toggleMode, setAccent, adoptUser }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
