import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme, ACCENTS, BG_PRESETS, canvasTint } from '../context/ThemeContext';
import { athletes } from '../services/athletes';
import { users } from '../services/users';
import { PageHeader, Avatar, SectionHeader, Alert } from './ui';
import HexWheel from './HexWheel';

const Profile = ({ user, onUserUpdate }) => {
  const { mode, setMode, accent, accentHex, bg, setAccent, setAccentCustom, setBg } = useTheme();
  const [myAthleteId, setMyAthleteId] = useState(null);
  const [showAccentWheel, setShowAccentWheel] = useState(false);
  const [showBgWheel, setShowBgWheel] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState(null); // {type, text}
  const fileRef = useRef(null);

  useEffect(() => {
    if (user.role !== 'athlete') return;
    athletes
      .getAll()
      .then((res) => setMyAthleteId(res.data?.athletes?.[0]?.id || null))
      .catch(() => {});
  }, [user.role]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setPhotoMsg(null);
    try {
      const res = await users.uploadAvatar(user.id, file);
      if (res.data?.success) {
        onUserUpdate?.({ avatar_url: res.data.avatar_url });
        setPhotoMsg({ type: 'success', text: 'Profile picture updated.' });
      }
    } catch (err) {
      setPhotoMsg({ type: 'error', text: err.response?.data?.message || 'Failed to upload picture.' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploading(true);
    setPhotoMsg(null);
    try {
      await users.deleteAvatar(user.id);
      onUserUpdate?.({ avatar_url: null });
      setPhotoMsg({ type: 'success', text: 'Profile picture removed.' });
    } catch (err) {
      setPhotoMsg({ type: 'error', text: err.response?.data?.message || 'Failed to remove picture.' });
    } finally {
      setUploading(false);
    }
  };

  const roleLabel = user.role === 'admin' ? 'Administrator' : user.role === 'coach' ? 'Teacher / Coach' : 'Student';

  return (
    <div>
      <PageHeader
        overline="Account"
        title="My profile"
        subtitle="Your account details and appearance preferences."
      />

      <div className="grid gap-10 lg:grid-cols-10">
        {/* Account */}
        <div className="lg:col-span-4">
          <SectionHeader label="Account" />
          {photoMsg && (
            <Alert type={photoMsg.type === 'success' ? 'success' : 'error'} onDismiss={() => setPhotoMsg(null)}>
              {photoMsg.text}
            </Alert>
          )}
          <div className="mb-6 flex items-center gap-4">
            <Avatar name={user.name} surname={user.surname} src={user.avatar_url} size="lg" />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                {user.name} {user.surname}
              </h2>
              <span className="badge-accent mt-1">{roleLabel}</span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFile}
                  className="hidden"
                  aria-label="Upload profile picture"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="btn-secondary !px-3 !py-1.5 !text-xs"
                >
                  {uploading ? 'Uploading…' : user.avatar_url ? 'Change photo' : 'Upload photo'}
                </button>
                {user.avatar_url && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={uploading}
                    className="btn-ghost !px-3 !py-1.5 !text-xs !text-red-500"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <dl>
            {[
              ['Username', user.username],
              ['Email', user.email || '—'],
              ['Role', roleLabel],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between border-b border-gray-200 py-3 last:border-0 dark:border-gray-800"
              >
                <dt className="micro-label">{k}</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white">{v}</dd>
              </div>
            ))}
          </dl>
          {user.role === 'athlete' && myAthleteId && (
            <Link to={`/dashboard/students/${myAthleteId}`} className="btn-primary mt-6 w-full">
              View & edit my athlete profile
            </Link>
          )}
        </div>

        {/* Appearance */}
        <div className="lg:col-span-6">
          <SectionHeader label="Appearance" />
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Personalise HER-PACE for your account. Your choices are saved automatically.
          </p>

          {/* Theme */}
          <p className="micro-label mb-3">Theme</p>
          <div className="mb-8 grid max-w-sm grid-cols-2 gap-3">
            {[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                className={`rounded-md border px-4 py-3 text-sm font-semibold transition ${
                  mode === opt.id
                    ? 'border-accent-500 text-gray-900 ring-1 ring-accent-500 dark:text-white'
                    : 'border-gray-200 text-gray-500 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400'
                }`}
                aria-pressed={mode === opt.id}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Accent */}
          <p className="micro-label mb-3">Accent colour</p>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
                  accent === a.id ? 'ring-2 ring-gray-900 ring-offset-2 dark:ring-white dark:ring-offset-gray-950' : ''
                }`}
                style={{ backgroundColor: a.swatch }}
                title={a.label}
                aria-label={`${a.label} accent`}
                aria-pressed={accent === a.id}
              >
                {accent === a.id && <span className="text-sm font-bold text-white drop-shadow">✓</span>}
              </button>
            ))}
            {accent === 'custom' && accentHex && (
              <span
                className="flex h-9 w-9 items-center justify-center rounded-md ring-2 ring-gray-900 ring-offset-2 dark:ring-white dark:ring-offset-gray-950"
                style={{ backgroundColor: accentHex }}
                title={`Custom ${accentHex}`}
              >
                <span className="text-sm font-bold text-white drop-shadow">✓</span>
              </span>
            )}
            <button onClick={() => setShowAccentWheel((v) => !v)} className="btn-secondary !px-3 !py-1.5 !text-xs">
              {showAccentWheel ? 'Hide colour wheel' : 'More colours…'}
            </button>
          </div>
          {showAccentWheel && (
            <div className="mb-4 max-w-sm rounded-md border border-gray-200 p-5 dark:border-gray-800">
              <HexWheel value={accentHex} onChange={(hex) => setAccentCustom(hex)} />
              {accentHex && (
                <p className="mt-3 text-center font-mono text-xs text-gray-500 dark:text-gray-400">
                  Custom accent: {accentHex}
                </p>
              )}
            </div>
          )}

          {/* Background */}
          <p className="micro-label mb-3 mt-8">Background</p>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            {BG_PRESETS.map((p) => {
              const selected = (p.hex === null && !bg) || (p.hex && bg === p.hex);
              const preview = p.hex ? `rgb(${canvasTint(p.hex, mode)})` : mode === 'dark' ? '#0a0a0c' : '#fafaf9';
              return (
                <button
                  key={p.id}
                  onClick={() => setBg(p.hex)}
                  className={`flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 transition dark:border-gray-600 ${
                    selected ? 'ring-2 ring-gray-900 ring-offset-2 dark:ring-white dark:ring-offset-gray-950' : ''
                  }`}
                  style={{ backgroundColor: preview }}
                  title={p.label}
                  aria-label={`${p.label} background`}
                  aria-pressed={!!selected}
                >
                  {selected && <span className="text-sm font-bold text-gray-500">✓</span>}
                </button>
              );
            })}
            <button onClick={() => setShowBgWheel((v) => !v)} className="btn-secondary !px-3 !py-1.5 !text-xs">
              {showBgWheel ? 'Hide colour wheel' : 'More colours…'}
            </button>
            {bg && (
              <button onClick={() => setBg(null)} className="btn-ghost !px-3 !py-1.5 !text-xs">
                Reset
              </button>
            )}
          </div>
          {showBgWheel && (
            <div className="mb-4 max-w-sm rounded-md border border-gray-200 p-5 dark:border-gray-800">
              <HexWheel value={bg} onChange={(hex) => setBg(hex)} />
              <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
                The chosen colour is applied as a subtle canvas tint
                {bg ? ` — ${bg}` : ''}.
              </p>
            </div>
          )}

          <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
            Accent and background customisation helps with visual comfort and accessibility.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
