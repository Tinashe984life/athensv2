import React, { useEffect, useState } from 'react';
import { sports } from '../services/sports';
import { PageHeader, PageLoader, EmptyState, Modal, Alert } from './ui';

const EMPTY_SPORT = { name: '', description: '', icon: '' };
const EMPTY_METRIC = { name: '', unit: '', description: '', direction: 'higher' };

const SportsManager = ({ user }) => {
  const isAdmin = user.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [sportList, setSportList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState(null);

  const [showAddSport, setShowAddSport] = useState(false);
  const [sportForm, setSportForm] = useState(EMPTY_SPORT);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [metricForm, setMetricForm] = useState(EMPTY_METRIC);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await sports.getAll();
      const list = res.data?.sports || [];
      setSportList(list);
      setSelectedId((prev) => prev || list[0]?.id || null);
    } catch (err) {
      console.error('Error loading sports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = sportList.find((s) => s.id === selectedId);

  const handleAddSport = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await sports.create(sportForm);
      if (res.data?.success) {
        setShowAddSport(false);
        setSportForm(EMPTY_SPORT);
        setMessage({ type: 'success', text: `${res.data.sport.name} added.` });
        setSelectedId(res.data.sport.id);
        load();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add sport.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMetric = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await sports.addMetric(selectedId, metricForm);
      if (res.data?.success) {
        setShowAddMetric(false);
        setMetricForm(EMPTY_METRIC);
        setMessage({ type: 'success', text: `Metric "${res.data.metric.name}" added.` });
        load();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add metric.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMetric = async (metricId) => {
    try {
      await sports.removeMetric(metricId);
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to remove metric.' });
    }
  };

  const handleRemoveSport = async () => {
    try {
      await sports.remove(selectedId);
      setSelectedId(null);
      setMessage({ type: 'success', text: 'Sport removed.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to remove sport.' });
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Sports & Metrics"
        subtitle="The sport departments your school runs and the metrics each one measures."
        actions={
          <button onClick={() => setShowAddSport(true)} className="btn-primary">
            + Add sport
          </button>
        }
      />

      {message && (
        <Alert type={message.type === 'success' ? 'success' : 'error'} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {sportList.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No sports configured"
          message="Add your first sport department to define what gets measured."
          action={
            <button onClick={() => setShowAddSport(true)} className="btn-primary">
              + Add sport
            </button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Sport list */}
          <div className="space-y-2 lg:col-span-2">
            {sportList.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  selectedId === s.id
                    ? 'border-accent-500 bg-accent-50 ring-2 ring-accent-500/25 dark:bg-accent-600/10'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700'
                }`}
              >
                <span className="text-xl">{s.icon || '🏅'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{s.name}</p>
                  {s.description && (
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{s.description}</p>
                  )}
                </div>
                <span className="badge-gray shrink-0">{(s.metrics || []).length}</span>
              </button>
            ))}
          </div>

          {/* Metrics panel */}
          <div className="lg:col-span-3">
            {selected && (
              <div className="card">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {selected.icon} {selected.name} metrics
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddMetric(true)} className="btn-secondary !px-3 !py-1.5 !text-xs">
                      + Add metric
                    </button>
                    {isAdmin && (
                      <button
                        onClick={handleRemoveSport}
                        className="btn-ghost !px-3 !py-1.5 !text-xs !text-red-500"
                        title="Remove sport"
                      >
                        Remove sport
                      </button>
                    )}
                  </div>
                </div>

                {(selected.metrics || []).length === 0 ? (
                  <EmptyState
                    icon="📏"
                    title="No metrics yet"
                    message="Add the metrics coaches should measure for this sport."
                  />
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {selected.metrics.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {m.name}
                            {m.unit && <span className="ml-1.5 font-normal text-gray-400">({m.unit})</span>}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {m.direction === 'lower' ? '⬇ Lower is better' : '⬆ Higher is better'}
                            {m.description ? ` · ${m.description}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveMetric(m.id)}
                          className="btn-ghost !px-2 !py-1 !text-xs !text-red-500"
                          title="Remove metric"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add sport modal */}
      <Modal
        open={showAddSport}
        onClose={() => {
          setShowAddSport(false);
          setError('');
        }}
        title="Add a sport"
      >
        <form onSubmit={handleAddSport} className="space-y-4">
          {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}
          <div>
            <label className="label">Sport name *</label>
            <input
              value={sportForm.name}
              onChange={(e) => setSportForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              placeholder="e.g. Tennis"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Icon (emoji)</label>
              <input
                value={sportForm.icon}
                onChange={(e) => setSportForm((p) => ({ ...p, icon: e.target.value }))}
                className="input-field"
                placeholder="🎾"
                maxLength={4}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <input
                value={sportForm.description}
                onChange={(e) => setSportForm((p) => ({ ...p, description: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Adding…' : 'Add sport'}
          </button>
        </form>
      </Modal>

      {/* Add metric modal */}
      <Modal
        open={showAddMetric}
        onClose={() => {
          setShowAddMetric(false);
          setError('');
        }}
        title={`Add metric to ${selected?.name || ''}`}
      >
        <form onSubmit={handleAddMetric} className="space-y-4">
          {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}
          <div>
            <label className="label">Metric name *</label>
            <input
              value={metricForm.name}
              onChange={(e) => setMetricForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              placeholder="e.g. Serve Speed"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unit</label>
              <input
                value={metricForm.unit}
                onChange={(e) => setMetricForm((p) => ({ ...p, unit: e.target.value }))}
                className="input-field"
                placeholder="e.g. km/h"
              />
            </div>
            <div>
              <label className="label">Better result is…</label>
              <select
                value={metricForm.direction}
                onChange={(e) => setMetricForm((p) => ({ ...p, direction: e.target.value }))}
                className="input-field"
              >
                <option value="higher">Higher</option>
                <option value="lower">Lower</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input
              value={metricForm.description}
              onChange={(e) => setMetricForm((p) => ({ ...p, description: e.target.value }))}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Adding…' : 'Add metric'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default SportsManager;
