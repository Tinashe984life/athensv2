import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { athletes, teams } from '../services/athletes';
import { sports } from '../services/sports';
import { workload } from '../services/workload';
import { users } from '../services/users';
import { PageHeader, PageLoader, EmptyState, Alert, Avatar, Modal, SESSION_TYPE_META } from './ui';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'performance', label: 'Performance' },
  { id: 'sessions', label: 'Sessions' },
];

const PROFILE_FIELDS = [
  ['name', 'First name', 'text'],
  ['surname', 'Surname', 'text'],
  ['date_of_birth', 'Date of birth', 'date'],
  ['sex', 'Sex', 'select', ['', 'female', 'male', 'other']],
  ['grade_level', 'Grade', 'number'],
  ['class_group', 'Class', 'text'],
  ['position', 'Position', 'text'],
  ['jersey_number', 'Jersey #', 'number'],
  ['height', 'Height (cm)', 'number'],
  ['weight', 'Weight (kg)', 'number'],
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const StudentDetail = ({ user }) => {
  const { athleteId } = useParams();
  const navigate = useNavigate();
  const isStaff = user.role === 'coach' || user.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState(null);
  const [teamList, setTeamList] = useState([]);
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // {type, text}
  const [summaries, setSummaries] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [chartRecords, setChartRecords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef(null);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !athlete?.user?.id) return;
    setUploadingPhoto(true);
    setMessage(null);
    try {
      const res = await users.uploadAvatar(athlete.user.id, file);
      if (res.data?.success) {
        setAthlete((prev) => ({ ...prev, user: { ...prev.user, avatar_url: res.data.avatar_url } }));
        setMessage({ type: 'success', text: 'Profile picture updated.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to upload picture.' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [aRes, tRes, sRes, sessRes] = await Promise.all([
          athletes.getById(athleteId),
          isStaff ? teams.getAll() : Promise.resolve(null),
          sports.getAthleteSummary(athleteId),
          workload.listSessions({ athlete_id: athleteId, limit: 30 }),
        ]);
        if (cancelled) return;
        setAthlete(aRes.data?.athlete || null);
        setTeamList(tRes?.data?.teams || []);
        setSummaries(sRes.data?.summaries || []);
        setSessions(sessRes.success ? sessRes.sessions || [] : []);
      } catch (err) {
        console.error('Error loading student:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [athleteId, isStaff]);

  useEffect(() => {
    if (!selectedMetric) return undefined;
    let cancelled = false;
    sports
      .getRecords({ athlete_id: athleteId, metric_id: selectedMetric.metric_id, limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const records = (res.data?.records || [])
          .slice()
          .reverse()
          .map((r) => ({ date: formatDate(r.date), value: r.value }));
        setChartRecords(records);
      })
      .catch(() => setChartRecords([]));
    return () => {
      cancelled = true;
    };
  }, [selectedMetric, athleteId]);

  const startEdit = () => {
    setForm({
      name: athlete.user?.name || '',
      surname: athlete.user?.surname || '',
      date_of_birth: athlete.date_of_birth || '',
      sex: athlete.sex || '',
      grade_level: athlete.grade_level ?? '',
      class_group: athlete.class_group || '',
      position: athlete.position || '',
      jersey_number: athlete.jersey_number ?? '',
      height: athlete.height ?? '',
      weight: athlete.weight ?? '',
      team_id: athlete.team_id || '',
      bio_notes: athlete.bio_notes || '',
      medical_notes: athlete.medical_notes || '',
    });
    setEditing(true);
    setMessage(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = { ...form };
      ['grade_level', 'jersey_number'].forEach((k) => {
        payload[k] = payload[k] === '' ? null : parseInt(payload[k], 10);
      });
      ['height', 'weight'].forEach((k) => {
        payload[k] = payload[k] === '' ? null : parseFloat(payload[k]);
      });
      if (!payload.date_of_birth) delete payload.date_of_birth;
      if (!isStaff) delete payload.team_id;
      const res = await athletes.update(athleteId, payload);
      if (res.data?.success) {
        setAthlete(res.data.athlete);
        setEditing(false);
        setMessage({ type: 'success', text: 'Profile updated.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await athletes.delete(athleteId);
      navigate('/dashboard/students');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete student.' });
      setConfirmDelete(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!athlete) {
    return <EmptyState icon="🔍" title="Student not found" message="This profile may have been removed." />;
  }

  const teamName = teamList.find((t) => t.id === athlete.team_id)?.name || (athlete.team_id ? 'Team' : 'No team');

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="group relative">
            <Avatar
              name={athlete.user?.name}
              surname={athlete.user?.surname}
              src={athlete.user?.avatar_url}
              size="lg"
            />
            {(isStaff || athlete.user_id === user.id) && (
              <>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handlePhoto}
                  className="hidden"
                  aria-label="Upload profile picture"
                />
                <button
                  onClick={() => photoRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-[10px] text-white opacity-80 transition hover:opacity-100 dark:bg-white dark:text-gray-900"
                  title="Change profile picture"
                  aria-label="Change profile picture"
                >
                  {uploadingPhoto ? '…' : '📷'}
                </button>
              </>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {athlete.user?.name} {athlete.user?.surname}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {[
                athlete.grade_level ? `Grade ${athlete.grade_level}${athlete.class_group || ''}` : null,
                athlete.position,
                teamName,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button onClick={startEdit} className="btn-primary">
              ✏️ Edit profile
            </button>
          )}
          {isStaff && (
            <button onClick={() => setConfirmDelete(true)} className="btn-secondary !text-red-600 dark:!text-red-400">
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-6 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 pb-2.5 text-sm transition-colors ${
              tab === t.id
                ? 'border-accent-500 font-semibold text-gray-900 dark:text-white'
                : 'border-transparent font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <Alert type={message.type === 'success' ? 'success' : 'error'} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Profile tab */}
      {tab === 'profile' &&
        (editing ? (
          <form onSubmit={handleSave} className="card space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {PROFILE_FIELDS.map(([key, label, type, options]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  {type === 'select' ? (
                    <select
                      value={form[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      className="input-field"
                    >
                      {options.map((o) => (
                        <option key={o} value={o}>
                          {o ? o[0].toUpperCase() + o.slice(1) : '—'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={type}
                      value={form[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      className="input-field"
                      step={type === 'number' ? 'any' : undefined}
                    />
                  )}
                </div>
              ))}
              {isStaff && (
                <div>
                  <label className="label">Team</label>
                  <select
                    value={form.team_id}
                    onChange={(e) => setForm((p) => ({ ...p, team_id: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">No team</option>
                    {teamList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="label">Bio / notes</label>
              <textarea
                value={form.bio_notes}
                onChange={(e) => setForm((p) => ({ ...p, bio_notes: e.target.value }))}
                className="input-field"
                rows={3}
              />
            </div>
            {isStaff && (
              <div>
                <label className="label">Medical notes (staff only)</label>
                <textarea
                  value={form.medical_notes}
                  onChange={(e) => setForm((p) => ({ ...p, medical_notes: e.target.value }))}
                  className="input-field"
                  rows={3}
                />
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="card">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              {[
                ['Date of birth', formatDate(athlete.date_of_birth)],
                ['Age', athlete.age ?? '—'],
                ['Sex', athlete.sex ? athlete.sex[0].toUpperCase() + athlete.sex.slice(1) : '—'],
                ['Grade', athlete.grade_level ? `${athlete.grade_level}${athlete.class_group || ''}` : '—'],
                ['Team', teamName],
                ['Position', athlete.position || '—'],
                ['Jersey #', athlete.jersey_number ?? '—'],
                ['Height', athlete.height ? `${athlete.height} cm` : '—'],
                ['Weight', athlete.weight ? `${athlete.weight} kg` : '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{k}</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>
            {athlete.bio_notes && (
              <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{athlete.bio_notes}</p>
              </div>
            )}
            {isStaff && athlete.medical_notes && (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Medical notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-amber-800 dark:text-amber-300">
                  {athlete.medical_notes}
                </p>
              </div>
            )}
          </div>
        ))}

      {/* Performance tab */}
      {tab === 'performance' && (
        <div className="space-y-6">
          {summaries.length === 0 ? (
            <EmptyState
              icon="📊"
              title="No results recorded yet"
              message="Recorded test results will appear here with trends over time."
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {summaries.map((m) => (
                  <button
                    key={m.metric_id}
                    onClick={() => setSelectedMetric(m)}
                    className={`card-hover text-left ${
                      selectedMetric?.metric_id === m.metric_id ? '!border-accent-500 ring-2 ring-accent-500/25' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{m.metric_name}</p>
                      <span
                        className={
                          m.trend === 'improving'
                            ? 'badge-green'
                            : m.trend === 'declining'
                            ? 'badge-red'
                            : 'badge-gray'
                        }
                      >
                        {m.trend === 'improving' ? '▲' : m.trend === 'declining' ? '▼' : '—'}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                      {m.latest_value}
                      <span className="ml-1 text-sm font-medium text-gray-400">{m.unit}</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {m.sport_name} · best {m.best_value}
                      {m.unit ? ` ${m.unit}` : ''} · {m.count} result{m.count === 1 ? '' : 's'}
                    </p>
                  </button>
                ))}
              </div>

              {selectedMetric && (
                <div className="card">
                  <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
                    {selectedMetric.metric_name} over time
                    {selectedMetric.unit ? ` (${selectedMetric.unit})` : ''}
                  </h3>
                  {chartRecords.length < 2 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      At least two results are needed to draw a trend.
                    </p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartRecords} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="currentColor" />
                          <YAxis tick={{ fontSize: 12 }} stroke="currentColor" domain={['auto', 'auto']} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="rgb(var(--accent-500))"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Sessions tab */}
      {tab === 'sessions' &&
        (sessions.length === 0 ? (
          <EmptyState icon="🏃" title="No sessions logged" message="PE lessons and training sessions will appear here." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Session</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>RPE</th>
                  <th>Load</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">{formatDate(s.date)}</td>
                    <td>{s.session_name || '—'}</td>
                    <td>
                      <span className={(SESSION_TYPE_META[s.session_type] || { badge: 'badge-gray' }).badge}>
                        {(SESSION_TYPE_META[s.session_type] || { label: s.session_type }).label}
                      </span>
                    </td>
                    <td>{s.duration_minutes} min</td>
                    <td>{s.perceived_exertion}/10</td>
                    <td>{s.workload_score ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {/* Delete confirmation */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Remove student?">
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">
          This permanently removes{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {athlete.user?.name} {athlete.user?.surname}
          </span>{' '}
          and their account. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleDelete} className="btn-danger flex-1">
            Remove student
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default StudentDetail;
