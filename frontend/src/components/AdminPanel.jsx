import React, { useEffect, useState } from 'react';
import { admin } from '../services/admin';
import { PageHeader, PageLoader, EmptyState, Modal, Alert, Avatar } from './ui';

const EMPTY_FORM = { name: '', surname: '', username: '', email: '', password: '', role: 'coach' };

const ROLE_BADGES = {
  admin: 'badge-amber',
  coach: 'badge-accent',
  athlete: 'badge-gray',
};

const ROLE_LABELS = { admin: 'Admin', coach: 'Teacher / Coach', athlete: 'Student' };

const AdminPanel = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [exporting, setExporting] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await admin.getUsers();
    if (res.success) setUsers(res.users || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || `${u.name} ${u.surname}`.toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q);
    return matchesQuery && (!roleFilter || u.role === roleFilter);
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    const res = await admin.createUser(payload);
    setSaving(false);
    if (res.success) {
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setMessage({ type: 'success', text: `Account created for ${payload.name} ${payload.surname}.` });
      load();
    } else {
      setError(res.message || 'Failed to create user.');
    }
  };

  const handleDelete = async () => {
    const res = await admin.deleteUser(confirmDeleteUser.id);
    setConfirmDeleteUser(null);
    if (res.success) {
      setMessage({ type: 'success', text: 'User removed.' });
      load();
    } else {
      setMessage({ type: 'error', text: res.message || 'Failed to remove user.' });
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const res = await admin.exportCsv(type);
      if (res.data) downloadBlob(res.data, `${type}-export.csv`);
    } finally {
      setExporting('');
    }
  };

  const handleDbDownload = async () => {
    setExporting('db');
    try {
      const res = await admin.downloadDatabase();
      if (res.data) downloadBlob(res.data, 'herpace-backup.db');
    } finally {
      setExporting('');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Admin"
        subtitle="Manage user accounts and export school data."
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + Create account
          </button>
        }
      />

      {message && (
        <Alert type={message.type === 'success' ? 'success' : 'error'} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Users */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or username…"
          className="input-field sm:max-w-xs"
          aria-label="Search users"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input-field sm:max-w-[12rem]"
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="admin">Admins</option>
          <option value="coach">Teachers / Coaches</option>
          <option value="athlete">Students</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="👤" title="No users found" message="Try a different search or filter." />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th className="pl-6 pt-5">User</th>
                <th className="pt-5">Username</th>
                <th className="pt-5">Email</th>
                <th className="pt-5">Role</th>
                <th className="pr-6 pt-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} surname={u.surname} src={u.avatar_url} size="sm" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {u.name} {u.surname}
                      </span>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{u.username}</td>
                  <td>{u.email || '—'}</td>
                  <td>
                    <span className={ROLE_BADGES[u.role] || 'badge-gray'}>{ROLE_LABELS[u.role] || u.role}</span>
                  </td>
                  <td className="pr-6 text-right">
                    {u.id !== user.id && (
                      <button
                        onClick={() => setConfirmDeleteUser(u)}
                        className="btn-ghost !px-2 !py-1 !text-xs !text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Data export */}
      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Data export
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['users', '👤 Users CSV'],
          ['athletes', '🧑‍🎓 Students CSV'],
          ['teams', '🏆 Teams CSV'],
        ].map(([type, label]) => (
          <button key={type} onClick={() => handleExport(type)} disabled={exporting === type} className="btn-secondary">
            {exporting === type ? 'Exporting…' : label}
          </button>
        ))}
        <button onClick={handleDbDownload} disabled={exporting === 'db'} className="btn-secondary">
          {exporting === 'db' ? 'Preparing…' : '💾 Database backup'}
        </button>
      </div>

      {/* Create user modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setError('');
        }}
        title="Create an account"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}
          <div>
            <label className="label">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className="input-field"
            >
              <option value="coach">Teacher / Coach</option>
              <option value="athlete">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Surname *</label>
              <input
                value={form.surname}
                onChange={(e) => setForm((p) => ({ ...p, surname: e.target.value }))}
                className="input-field"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                Username <span className="font-normal text-gray-400">(auto if blank)</span>
              </label>
              <input
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">
                Password <span className="font-normal text-gray-400">(default if blank)</span>
              </label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!confirmDeleteUser} onClose={() => setConfirmDeleteUser(null)} title="Remove user?">
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">
          This permanently removes{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {confirmDeleteUser?.name} {confirmDeleteUser?.surname}
          </span>{' '}
          and their account. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmDeleteUser(null)} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleDelete} className="btn-danger flex-1">
            Remove user
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPanel;
