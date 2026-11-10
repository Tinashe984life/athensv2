import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { athletes } from '../services/athletes';
import { sports } from '../services/sports';
import { PageHeader, PageLoader, EmptyState, Alert, Modal } from './ui';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const Performance = ({ user }) => {
  const isStaff = user.role === 'coach' || user.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [sportList, setSportList] = useState([]);
  const [records, setRecords] = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [filterSport, setFilterSport] = useState('');
  const [message, setMessage] = useState(null);

  // Staff record form
  const [showRecord, setShowRecord] = useState(false);
  const [recSport, setRecSport] = useState('');
  const [recMetric, setRecMetric] = useState('');
  const [recDate, setRecDate] = useState(new Date().toISOString().slice(0, 10));
  const [recNotes, setRecNotes] = useState('');
  const [entries, setEntries] = useState({}); // athleteId -> value string
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Student view
  const [summaries, setSummaries] = useState([]);
  const [myAthleteId, setMyAthleteId] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [chartRecords, setChartRecords] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const [sRes, rRes, aRes] = await Promise.all([
        sports.getAll(),
        sports.getRecords({ limit: 100 }),
        athletes.getAll(),
      ]);
      setSportList(sRes.data?.sports || []);
      setRecords(rRes.data?.records || []);
      const list = aRes.data?.athletes || [];
      setStudentList(list);
      if (!isStaff && list[0]) {
        setMyAthleteId(list[0].id);
        const sumRes = await sports.getAthleteSummary(list[0].id);
        setSummaries(sumRes.data?.summaries || []);
      }
    } catch (err) {
      console.error('Error loading performance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedMetric || !myAthleteId) return undefined;
    let cancelled = false;
    sports
      .getRecords({ athlete_id: myAthleteId, metric_id: selectedMetric.metric_id, limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setChartRecords(
          (res.data?.records || [])
            .slice()
            .reverse()
            .map((r) => ({ date: formatDate(r.date), value: r.value }))
        );
      })
      .catch(() => setChartRecords([]));
    return () => {
      cancelled = true;
    };
  }, [selectedMetric, myAthleteId]);

  const selectedSport = sportList.find((s) => s.id === recSport);
  const metricOptions = selectedSport?.metrics || [];
  const metric = metricOptions.find((m) => m.id === recMetric);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return studentList.filter((a) => !q || `${a.user?.name} ${a.user?.surname}`.toLowerCase().includes(q));
  }, [studentList, search]);

  const visibleRecords = useMemo(
    () => records.filter((r) => !filterSport || r.sport_id === filterSport),
    [records, filterSport]
  );

  const handleRecord = async (e) => {
    e.preventDefault();
    const payloadEntries = Object.entries(entries)
      .filter(([, v]) => v !== '' && v != null && !Number.isNaN(parseFloat(v)))
      .map(([athlete_id, value]) => ({ athlete_id, value: parseFloat(value) }));
    if (!recMetric || payloadEntries.length === 0) {
      setMessage({ type: 'error', text: 'Choose a metric and enter at least one result.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await sports.logRecords({
        metric_id: recMetric,
        date: recDate,
        notes: recNotes || undefined,
        entries: payloadEntries,
      });
      if (res.data?.success) {
        setShowRecord(false);
        setEntries({});
        setRecNotes('');
        setMessage({
          type: 'success',
          text: `Saved ${res.data.count} result${res.data.count === 1 ? '' : 's'} for ${metric?.name}.`,
        });
        load();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save results.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Performance"
        subtitle={
          isStaff
            ? 'Record test results and track progress across every sport.'
            : 'Your recorded results and progress over time.'
        }
        actions={
          isStaff && (
            <button onClick={() => setShowRecord(true)} className="btn-primary">
              + Record results
            </button>
          )
        }
      />

      {message && (
        <Alert type={message.type === 'success' ? 'success' : 'error'} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Student: summary cards + chart */}
      {!isStaff && (
        <div className="mb-8 space-y-6">
          {summaries.length === 0 ? (
            <EmptyState
              icon="📊"
              title="No results yet"
              message="When your teachers record your test results, your personal progress will appear here."
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
                          m.trend === 'improving' ? 'badge-green' : m.trend === 'declining' ? 'badge-red' : 'badge-gray'
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
                      {m.unit ? ` ${m.unit}` : ''}
                    </p>
                  </button>
                ))}
              </div>
              {selectedMetric && (
                <div className="card">
                  <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
                    {selectedMetric.metric_name} over time
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

      {/* Recent results */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Recent results
        </h2>
        <select
          value={filterSport}
          onChange={(e) => setFilterSport(e.target.value)}
          className="input-field !w-auto !py-1.5 text-xs"
          aria-label="Filter results by sport"
        >
          <option value="">All sports</option>
          {sportList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.name}
            </option>
          ))}
        </select>
      </div>

      {visibleRecords.length === 0 ? (
        <EmptyState
          icon="📈"
          title="No results recorded"
          message={isStaff ? 'Record your first test results to start tracking performance.' : 'Results will appear here once recorded.'}
          action={
            isStaff && (
              <button onClick={() => setShowRecord(true)} className="btn-primary">
                + Record results
              </button>
            )
          }
        />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th className="pl-6 pt-5">Date</th>
                {isStaff && <th className="pt-5">Student</th>}
                <th className="pt-5">Metric</th>
                <th className="pt-5">Sport</th>
                <th className="pt-5">Result</th>
                <th className="pr-6 pt-5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap pl-6">{formatDate(r.date)}</td>
                  {isStaff && (
                    <td>
                      <Link
                        to={`/dashboard/students/${r.athlete_id}`}
                        className="font-medium text-gray-900 hover:text-accent-600 dark:text-white dark:hover:text-accent-400"
                      >
                        {r.athlete_name || '—'}
                      </Link>
                    </td>
                  )}
                  <td>{r.metric_name}</td>
                  <td>
                    <span className="badge-gray">{r.sport_name}</span>
                  </td>
                  <td className="font-semibold text-gray-900 dark:text-white">
                    {r.value}
                    {r.unit ? ` ${r.unit}` : ''}
                  </td>
                  <td className="max-w-[16rem] truncate pr-6">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record results modal */}
      <Modal open={showRecord} onClose={() => setShowRecord(false)} title="Record test results" wide>
        <form onSubmit={handleRecord} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Sport *</label>
              <select
                value={recSport}
                onChange={(e) => {
                  setRecSport(e.target.value);
                  setRecMetric('');
                }}
                className="input-field"
                required
              >
                <option value="">Select…</option>
                {sportList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Metric *</label>
              <select
                value={recMetric}
                onChange={(e) => setRecMetric(e.target.value)}
                className="input-field"
                disabled={!recSport}
                required
              >
                <option value="">Select…</option>
                {metricOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.unit ? ` (${m.unit})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                value={recDate}
                onChange={(e) => setRecDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          {metric && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {metric.direction === 'lower' ? '⬇ Lower is better' : '⬆ Higher is better'}
              {metric.description ? ` — ${metric.description}` : ''}
            </p>
          )}

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Enter results {metric?.unit ? `(${metric.unit})` : ''}
            </p>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students…"
              className="input-field mb-3"
            />
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {filteredStudents.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
                    {a.user?.name} {a.user?.surname}
                    {a.grade_level ? (
                      <span className="text-gray-400"> · Gr {a.grade_level}{a.class_group || ''}</span>
                    ) : null}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={entries[a.id] ?? ''}
                    onChange={(e) => setEntries((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    className="input-field !w-28 !py-1.5"
                    placeholder="—"
                    aria-label={`Result for ${a.user?.name} ${a.user?.surname}`}
                  />
                </div>
              ))}
              {filteredStudents.length === 0 && <p className="text-sm text-gray-400">No students found.</p>}
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <input
              value={recNotes}
              onChange={(e) => setRecNotes(e.target.value)}
              className="input-field"
              placeholder="e.g. Term 1 baseline testing"
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving
              ? 'Saving…'
              : `Save ${Object.values(entries).filter((v) => v !== '').length} result${
                  Object.values(entries).filter((v) => v !== '').length === 1 ? '' : 's'
                }`}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Performance;
