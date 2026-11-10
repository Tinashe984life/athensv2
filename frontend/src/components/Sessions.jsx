import React, { useEffect, useMemo, useState } from 'react';
import { athletes, teams } from '../services/athletes';
import { workload } from '../services/workload';
import { PageHeader, PageLoader, EmptyState, Alert, Modal, SESSION_TYPE_META } from './ui';

const SESSION_TYPES = [
  { id: 'pe', label: 'PE Lesson', icon: '🏫' },
  { id: 'training', label: 'Training', icon: '🏋️' },
  { id: 'match', label: 'Match', icon: '🏆' },
];

const EMPTY_FORM = {
  session_type: 'pe',
  session_name: '',
  date: new Date().toISOString().slice(0, 10),
  duration_minutes: '',
  perceived_exertion: '5',
  distance_km: '',
  average_hr: '',
  sprints_count: '',
  notes: '',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const Sessions = ({ user }) => {
  const isStaff = user.role === 'coach' || user.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [teamList, setTeamList] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [teamPick, setTeamPick] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const requests = [workload.listSessions({ limit: 50 })];
      if (isStaff) requests.push(athletes.getAll(), teams.getAll());
      else requests.push(athletes.getAll());
      const [sessRes, aRes, tRes] = await Promise.all(requests);
      setSessions(sessRes.success ? sessRes.sessions || [] : []);
      setStudentList(aRes?.data?.athletes || []);
      setTeamList(tRes?.data?.teams || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTeam = (teamId) => {
    setTeamPick(teamId);
    if (teamId) {
      setSelectedIds(studentList.filter((a) => a.team_id === teamId).map((a) => a.id));
    }
  };

  const toggleStudent = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return studentList.filter((a) => !q || `${a.user?.name} ${a.user?.surname}`.toLowerCase().includes(q));
  }, [studentList, search]);

  const visibleSessions = useMemo(
    () => sessions.filter((s) => !typeFilter || s.session_type === typeFilter),
    [sessions, typeFilter]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetIds = isStaff ? selectedIds : studentList[0] ? [studentList[0].id] : [];
    if (targetIds.length === 0) {
      setMessage({ type: 'error', text: isStaff ? 'Select at least one student.' : 'No athlete profile found for your account.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const base = {
        session_type: form.session_type,
        session_name: form.session_name || undefined,
        date: form.date,
        duration_minutes: parseInt(form.duration_minutes, 10),
        perceived_exertion: parseInt(form.perceived_exertion, 10),
        notes: form.notes || undefined,
      };
      if (form.distance_km) base.distance_km = parseFloat(form.distance_km);
      if (form.average_hr) base.average_hr = parseFloat(form.average_hr);
      if (form.sprints_count) base.sprints_count = parseInt(form.sprints_count, 10);

      const results = await Promise.all(
        targetIds.map((athlete_id) => workload.createWorkloadSession({ ...base, athlete_id }))
      );
      const failed = results.filter((r) => !r.success).length;
      if (failed > 0) {
        setMessage({ type: 'error', text: `${failed} of ${targetIds.length} entries failed to save.` });
      } else {
        setShowLog(false);
        setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
        setSelectedIds([]);
        setTeamPick('');
        setMessage({
          type: 'success',
          text: `Session logged for ${targetIds.length} student${targetIds.length === 1 ? '' : 's'}.`,
        });
        load();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to log session.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Sessions"
        subtitle={
          isStaff
            ? 'Log PE lessons, team training and matches for your students.'
            : 'Your logged PE lessons and training sessions.'
        }
        actions={
          <button onClick={() => setShowLog(true)} className="btn-primary">
            + Log session
          </button>
        }
      />

      {message && (
        <Alert type={message.type === 'success' ? 'success' : 'error'} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <div className="mb-5 flex gap-6 border-b border-gray-200 dark:border-gray-800">
        {[{ id: '', label: 'All' }, ...SESSION_TYPES].map((t) => (
          <button
            key={t.id}
            onClick={() => setTypeFilter(t.id)}
            className={`-mb-px border-b-2 pb-2.5 text-sm transition-colors ${
              typeFilter === t.id
                ? 'border-accent-500 font-semibold text-gray-900 dark:text-white'
                : 'border-transparent font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visibleSessions.length === 0 ? (
        <EmptyState
          icon="🏃"
          title="No sessions here yet"
          message={isStaff ? 'Log your first session to start building workload history.' : 'Sessions logged by you or your teachers will appear here.'}
          action={
            <button onClick={() => setShowLog(true)} className="btn-primary">
              + Log session
            </button>
          }
        />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th className="pl-6 pt-5">Date</th>
                {isStaff && <th className="pt-5">Student</th>}
                <th className="pt-5">Session</th>
                <th className="pt-5">Type</th>
                <th className="pt-5">Duration</th>
                <th className="pt-5">RPE</th>
                <th className="pr-6 pt-5">Load</th>
              </tr>
            </thead>
            <tbody>
              {visibleSessions.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap pl-6">{formatDate(s.date)}</td>
                  {isStaff && <td>{s.athlete_name || '—'}</td>}
                  <td>{s.session_name || '—'}</td>
                  <td>
                    <span className={(SESSION_TYPE_META[s.session_type] || { badge: 'badge-gray' }).badge}>
                      {(SESSION_TYPE_META[s.session_type] || { label: s.session_type }).label}
                    </span>
                  </td>
                  <td>{s.duration_minutes} min</td>
                  <td>{s.perceived_exertion}/10</td>
                  <td className="pr-6">{s.workload_score ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log session modal */}
      <Modal open={showLog} onClose={() => setShowLog(false)} title="Log a session" wide={isStaff}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type */}
          <div className="grid grid-cols-3 gap-3">
            {SESSION_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm((p) => ({ ...p, session_type: t.id }))}
                className={`rounded-xl border p-3 text-center transition ${
                  form.session_type === t.id
                    ? 'border-accent-500 bg-accent-50 ring-2 ring-accent-500/25 dark:bg-accent-600/10'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <div className="text-lg">{t.icon}</div>
                <p className="mt-1 text-xs font-semibold text-gray-900 dark:text-white">{t.label}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Session name</label>
              <input
                value={form.session_name}
                onChange={(e) => setForm((p) => ({ ...p, session_name: e.target.value }))}
                className="input-field"
                placeholder={form.session_type === 'pe' ? 'e.g. Grade 9 Fitness Circuit' : 'e.g. Passing drills'}
              />
            </div>
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Duration (minutes) *</label>
              <input
                type="number"
                min="1"
                max="600"
                value={form.duration_minutes}
                onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">
                Intensity (RPE): <span className="font-bold text-accent-600 dark:text-accent-400">{form.perceived_exertion}</span>/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={form.perceived_exertion}
                onChange={(e) => setForm((p) => ({ ...p, perceived_exertion: e.target.value }))}
                className="mt-3 w-full accent-[rgb(var(--accent-600))]"
              />
            </div>
          </div>

          {/* Optional telemetry */}
          <details className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300">
              Optional telemetry
            </summary>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Distance (km)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.distance_km}
                  onChange={(e) => setForm((p) => ({ ...p, distance_km: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Avg heart rate</label>
                <input
                  type="number"
                  min="0"
                  max="250"
                  value={form.average_hr}
                  onChange={(e) => setForm((p) => ({ ...p, average_hr: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Sprints</label>
                <input
                  type="number"
                  min="0"
                  value={form.sprints_count}
                  onChange={(e) => setForm((p) => ({ ...p, sprints_count: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>
          </details>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="input-field"
              rows={2}
            />
          </div>

          {/* Student selection (staff only) */}
          {isStaff && (
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Students ({selectedIds.length} selected)
                </p>
                <div className="flex gap-2">
                  <select
                    value={teamPick}
                    onChange={(e) => applyTeam(e.target.value)}
                    className="input-field !py-1.5 text-xs"
                    aria-label="Select whole team"
                  >
                    <option value="">Pick a whole team…</option>
                    {teamList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setSelectedIds([])} className="btn-ghost !py-1.5 !text-xs">
                    Clear
                  </button>
                </div>
              </div>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students…"
                className="input-field mb-3"
              />
              <div className="max-h-44 space-y-1 overflow-y-auto">
                {filteredStudents.map((a) => (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a.id)}
                      onChange={() => toggleStudent(a.id)}
                      className="h-4 w-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {a.user?.name} {a.user?.surname}
                      {a.grade_level ? (
                        <span className="text-gray-400"> · Grade {a.grade_level}{a.class_group || ''}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="px-2 py-1.5 text-sm text-gray-400">No students found.</p>
                )}
              </div>
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving
              ? 'Saving…'
              : isStaff
              ? `Log session for ${selectedIds.length || 'selected'} student${selectedIds.length === 1 ? '' : 's'}`
              : 'Log my session'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Sessions;
