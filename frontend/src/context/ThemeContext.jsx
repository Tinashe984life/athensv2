/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export const ACCENTS = [
  { id: 'lime', label: 'Lime', swatch: '#84cc16' },
  { id: 'orange', label: 'Orange', swatch: '#f97316' },
  { id: 'indigo', label: 'Indigo', swatch: '#4f46e5' },
  { id: 'violet', label: 'Violet', swatch: '#7c3aed' },
  { id: 'blue', label: 'Blue', swatch: '#2563eb' },
  { id: 'teal', label: 'Teal', swatch: '#0d9488' },
  { id: 'emerald', label: 'Emerald', swatch: '#059669' },
  { id: 'rose', label: 'Rose', swatch: '#e11d48' },
];

export const BG_PRESETS = [
  { id: 'stone', label: 'Stone', hex: null }, // app default
  { id: 'white', label: 'Pure white', hex: '#ffffff' },
  { id: 'cool', label: 'Cool grey', hex: '#64748b' },
  { id: 'cream', label: 'Cream', hex: '#eab308' },
  { id: 'mint', label: 'Mint', hex: '#10b981' },
  { id: 'ice', label: 'Ice blue', hex: '#3b82f6' },
  { id: 'blush', label: 'Blush', hex: '#f43f5e' },
];

/* ---------- colour math ---------- */

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

const SHADE_LIGHTNESS = { 50: 0.97, 100: 0.93, 200: 0.85, 300: 0.74, 400: 0.62, 500: 0.5, 600: 0.42, 700: 0.34 };
export const SHADES = Object.keys(SHADE_LIGHTNESS).map(Number);

/* Build a full accent palette ("r g b" triplets) from a single hex colour */
export function paletteFromHex(hex) {
  const [h, s] = rgbToHsl(hexToRgb(hex));
  const sat = Math.max(s, 0.3); // keep custom accents vibrant
  const out = {};
  SHADES.forEach((shade) => {
    out[shade] = hslToRgb(h, sat, SHADE_LIGHTNESS[shade]).join(' ');
  });
  return out;
}

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
}

/* Derive a subtle canvas tint from any colour, per theme mode */
export function canvasTint(hex, mode) {
  const rgb = hexToRgb(hex);
  const tinted = mode === 'dark' ? mix([10, 10, 12], rgb, 0.1) : mix([255, 255, 255], rgb, 0.07);
  return tinted.join(' ');
}

/* ---------- provider ---------- */

const DEFAULTS = { mode: 'light', accent: 'lime', accentHex: null, bg: null };

const storageKey = (userId) => `hp-theme:${userId || 'guest'}`;

function loadPrefs(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      const p = JSON.parse(raw);
      const validPreset = ACCENTS.some((a) => a.id === p.accent);
      const validCustom = p.accent === 'custom' && /^#[0-9a-fA-F]{6}$/.test(p.accentHex || '');
      return {
        mode: p.mode === 'dark' ? 'dark' : 'light',
        accent: validPreset || validCustom ? p.accent : DEFAULTS.accent,
        accentHex: validCustom ? p.accentHex : null,
        bg: /^#[0-9a-fA-F]{6}$/.test(p.bg || '') ? p.bg : null,
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
    const root = document.documentElement;
    root.classList.toggle('dark', prefs.mode === 'dark');

    if (prefs.accent === 'custom' && prefs.accentHex) {
      const pal = paletteFromHex(prefs.accentHex);
      SHADES.forEach((s) => root.style.setProperty(`--accent-${s}`, pal[s]));
      root.setAttribute('data-accent', 'custom');
    } else {
      SHADES.forEach((s) => root.style.removeProperty(`--accent-${s}`));
      root.setAttribute('data-accent', prefs.accent);
    }

    if (prefs.bg) {
      root.style.setProperty('--canvas', canvasTint(prefs.bg, prefs.mode));
    } else {
      root.style.removeProperty('--canvas');
    }

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
  const setAccent = useCallback((accent) => setPrefs((p) => ({ ...p, accent, accentHex: null })), []);
  const setAccentCustom = useCallback(
    (hex) => setPrefs((p) => ({ ...p, accent: 'custom', accentHex: hex })),
    []
  );
  const setBg = useCallback((hex) => setPrefs((p) => ({ ...p, bg: hex })), []);

  return (
    <ThemeContext.Provider
      value={{
        mode: prefs.mode,
        accent: prefs.accent,
        accentHex: prefs.accentHex,
        bg: prefs.bg,
        setMode,
        toggleMode,
        setAccent,
        setAccentCustom,
        setBg,
        adoptUser,
      }}
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
