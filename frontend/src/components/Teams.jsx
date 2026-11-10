import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { athletes, teams } from '../services/athletes';
import { sports } from '../services/sports';
import { PageHeader, PageLoader, EmptyState, Modal, Alert, Avatar } from './ui';

const Teams = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [teamList, setTeamList] = useState([]);
  const [sportList, setSportList] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selected, setSelected] = useState(null); // selected team (with roster)
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', sport: '', season: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addStudentId, setAddStudentId] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [tRes, sRes, aRes] = await Promise.all([teams.getAll(), sports.getAll(), athletes.getAll()]);
      setTeamList(tRes.data?.teams || []);
      setSportList(sRes.data?.sports || []);
      setAllStudents(aRes.data?.athletes || []);
    } catch (err) {
      console.error('Error loading teams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openTeam = async (teamId) => {
    try {
      const res = await teams.getById(teamId);
      if (res.data?.success) setSelected(res.data.team);
    } catch (err) {
      console.error('Error loading team:', err);
    }
  };

  const sportIcon = (name) => sportList.find((s) => s.name === name)?.icon || '🏅';

  const availableStudents = useMemo(() => {
    if (!selected) return [];
    const rosterIds = new Set((selected.athletes || []).map((a) => a.id));
    return allStudents.filter((a) => !rosterIds.has(a.id));
  }, [selected, allStudents]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await teams.create(form);
      if (res.data?.success) {
        setShowCreate(false);
        setForm({ name: '', sport: '', season: '' });
        load();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddToRoster = async () => {
    if (!addStudentId) return;
    try {
      await athletes.update(addStudentId, { team_id: selected.id });
      setAddStudentId('');
      await Promise.all([openTeam(selected.id), load()]);
    } catch (err) {
      console.error('Error adding to roster:', err);
    }
  };

  const handleRemoveFromRoster = async (athleteId) => {
    try {
      await athletes.update(athleteId, { team_id: '' });
      await Promise.all([openTeam(selected.id), load()]);
    } catch (err) {
      console.error('Error removing from roster:', err);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Teams"
        subtitle={
          user.role === 'admin'
            ? 'All sports teams across the school'
            : 'Your sports teams and their rosters'
        }
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + Create team
          </button>
        }
      />

      {teamList.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="No teams yet"
          message="Create a team for each sport department — Football, Rugby, Netball and more."
          action={
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              + Create team
            </button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Team list */}
          <div className="space-y-3 lg:col-span-2">
            {teamList.map((t) => (
              <button
                key={t.id}
                onClick={() => openTeam(t.id)}
                className={`card-hover flex w-full items-center gap-4 text-left !p-5 ${
                  selected?.id === t.id ? '!border-accent-500 ring-2 ring-accent-500/25' : ''
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-xl dark:bg-accent-600/15">
                  {sportIcon(t.sport)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {[t.sport, t.season].filter(Boolean).join(' · ') || 'No sport set'}
                  </p>
                </div>
                <span className="badge-gray shrink-0">
                  {t.athlete_count} player{t.athlete_count === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>

          {/* Roster panel */}
          <div className="lg:col-span-3">
            {!selected ? (
              <EmptyState icon="👈" title="Select a team" message="Choose a team to view and manage its roster." />
            ) : (
              <div className="card">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {sportIcon(selected.sport)} {selected.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {[selected.sport, selected.season].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="badge-accent">{(selected.athletes || []).length} on roster</span>
                </div>

                {/* Add student to roster */}
                <div className="mb-5 flex gap-2">
                  <select
                    value={addStudentId}
                    onChange={(e) => setAddStudentId(e.target.value)}
                    className="input-field flex-1"
                    aria-label="Add student to roster"
                  >
                    <option value="">Add a student to this team…</option>
                    {availableStudents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.user?.name} {a.user?.surname}
                        {a.grade_level ? ` (Grade ${a.grade_level}${a.class_group || ''})` : ''}
                      </option>
                    ))}
                  </select>
                  <button onClick={handleAddToRoster} disabled={!addStudentId} className="btn-primary">
                    Add
                  </button>
                </div>

                {(selected.athletes || []).length === 0 ? (
                  <EmptyState icon="🧑‍🎓" title="Empty roster" message="Add students to this team using the selector above." />
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {selected.athletes.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 py-3">
                        <Avatar name={a.user?.name} surname={a.user?.surname} src={a.user?.avatar_url} size="sm" />
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/dashboard/students/${a.id}`}
                            className="truncate text-sm font-semibold text-gray-900 hover:text-accent-600 dark:text-white dark:hover:text-accent-400"
                          >
                            {a.user?.name} {a.user?.surname}
                          </Link>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {[a.position, a.jersey_number ? `#${a.jersey_number}` : null].filter(Boolean).join(' · ') ||
                              '—'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveFromRoster(a.id)}
                          className="btn-ghost !text-xs !text-red-500"
                          title="Remove from team"
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

      {/* Create team modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create a team">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}
          <div>
            <label className="label">Team name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="input-field"
              placeholder="e.g. U15 Girls Hockey"
              required
            />
          </div>
          <div>
            <label className="label">Sport *</label>
            <select
              value={form.sport}
              onChange={(e) => setForm((p) => ({ ...p, sport: e.target.value }))}
              className="input-field"
              required
            >
              <option value="">Select a sport…</option>
              {sportList.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Season</label>
            <input
              value={form.season}
              onChange={(e) => setForm((p) => ({ ...p, season: e.target.value }))}
              className="input-field"
              placeholder="e.g. 2026 Winter"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Creating…' : 'Create team'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Teams;
