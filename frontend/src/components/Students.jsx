import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { athletes, teams } from '../services/athletes';
import { PageHeader, PageLoader, EmptyState, Modal, Alert, Avatar } from './ui';

const EMPTY_FORM = {
  name: '',
  surname: '',
  email: '',
  date_of_birth: '',
  sex: '',
  grade_level: '',
  class_group: '',
  team_id: '',
  position: '',
};

const Students = () => {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [teamList, setTeamList] = useState([]);
  const [query, setQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [athletesRes, teamsRes] = await Promise.all([athletes.getAll(), teams.getAll()]);
      setList(athletesRes.data?.athletes || []);
      setTeamList(teamsRes.data?.teams || []);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const teamName = (id) => teamList.find((t) => t.id === id)?.name;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((a) => {
      const name = `${a.user?.name || ''} ${a.user?.surname || ''}`.toLowerCase();
      const matchesQuery = !q || name.includes(q) || (a.position || '').toLowerCase().includes(q);
      const matchesTeam = !teamFilter || a.team_id === teamFilter;
      return matchesQuery && matchesTeam;
    });
  }, [list, query, teamFilter]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      if (payload.grade_level) payload.grade_level = parseInt(payload.grade_level, 10);
      const res = await athletes.create(payload);
      if (res.data?.success) {
        setCredentials(res.data.credentials);
        setForm(EMPTY_FORM);
        load();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add student.');
    } finally {
      setSaving(false);
    }
  };

  const closeAdd = () => {
    setShowAdd(false);
    setCredentials(null);
    setError('');
    setForm(EMPTY_FORM);
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${list.length} student${list.length === 1 ? '' : 's'} across your school`}
        actions={
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            + Add student
          </button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or position…"
          className="input-field sm:max-w-xs"
          aria-label="Search students"
        />
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="input-field sm:max-w-[14rem]"
          aria-label="Filter by team"
        >
          <option value="">All teams</option>
          {teamList.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          <option value="__none__">No team</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🧑‍🎓"
          title={list.length === 0 ? 'No students yet' : 'No students match your search'}
          message={
            list.length === 0
              ? 'Add your first student to start logging sessions and results.'
              : 'Try a different search or filter.'
          }
          action={
            list.length === 0 && (
              <button onClick={() => setShowAdd(true)} className="btn-primary">
                + Add student
              </button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered
            .filter((a) => teamFilter !== '__none__' || !a.team_id)
            .map((a) => (
              <Link key={a.id} to={`/dashboard/students/${a.id}`} className="card-hover flex items-center gap-4 !p-5">
                <Avatar name={a.user?.name} surname={a.user?.surname} src={a.user?.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900 dark:text-white">
                    {a.user?.name} {a.user?.surname}
                  </p>
                  <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                    {[
                      a.grade_level ? `Grade ${a.grade_level}${a.class_group || ''}` : null,
                      a.position,
                      teamName(a.team_id),
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'No details yet'}
                  </p>
                </div>
                <span className="text-gray-300 dark:text-gray-600">→</span>
              </Link>
            ))}
        </div>
      )}

      {/* Add student modal */}
      <Modal open={showAdd} onClose={closeAdd} title={credentials ? 'Student added 🎉' : 'Add a student'}>
        {credentials ? (
          <div>
            <Alert type="success">Account created. Share these sign-in details with the student:</Alert>
            <div className="mb-5 rounded-xl bg-gray-50 p-4 font-mono text-sm dark:bg-gray-800">
              <p>
                <span className="text-gray-500">username:</span>{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{credentials.username}</span>
              </p>
              <p>
                <span className="text-gray-500">password:</span>{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{credentials.password}</span>
              </p>
            </div>
            <p className="mb-5 text-xs text-gray-500 dark:text-gray-400">
              The student should change their password after first sign-in.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCredentials(null)} className="btn-secondary flex-1">
                Add another
              </button>
              <button onClick={closeAdd} className="btn-primary flex-1">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAdd} className="space-y-4">
            {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First name *</label>
                <input name="name" value={form.name} onChange={handleChange} className="input-field" required />
              </div>
              <div>
                <label className="label">Surname *</label>
                <input name="surname" value={form.surname} onChange={handleChange} className="input-field" required />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date of birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={form.date_of_birth}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Sex</label>
                <select name="sex" value={form.sex} onChange={handleChange} className="input-field">
                  <option value="">—</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Grade</label>
                <input
                  type="number"
                  min="1"
                  max="13"
                  name="grade_level"
                  value={form.grade_level}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g. 9"
                />
              </div>
              <div>
                <label className="label">Class</label>
                <input
                  name="class_group"
                  value={form.class_group}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g. A"
                  maxLength={10}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Team</label>
                <select name="team_id" value={form.team_id} onChange={handleChange} className="input-field">
                  <option value="">No team</option>
                  {teamList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Position</label>
                <input name="position" value={form.position} onChange={handleChange} className="input-field" />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'Adding…' : 'Add student'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Students;
