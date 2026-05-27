import React, { useState, useEffect } from 'react';
import { admin } from '../services/admin';
import { teams } from '../services/api';

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateTime = (iso) => {
  if (!iso) return 'Never';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const roleLabel = (item) => {
  if (item.role === 'admin') {
    return item.is_super_admin ? 'Super Admin' : 'Team Manager';
  }
  return item.role;
};

const AdminPanel = ({ user }) => {
  const [viewerIsSuperAdmin, setViewerIsSuperAdmin] = useState(user?.is_super_admin === true);
  const isSuperAdmin = viewerIsSuperAdmin;
  const isTeamManager = !isSuperAdmin && (user?.is_team_manager === true || user?.role === 'admin');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [reports, setReports] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    surname: '',
    email: '',
    role: 'athlete',
    team_id: '',
    jersey_number: '',
    age: '',
    height: '',
    weight: '',
    position: '',
    dominant_side: '',
    photo_url: '',
    bio_notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadTeams(), loadReports()]);
    const healthResponse = await admin.getSystemHealth();
    if (healthResponse.success) {
      setSystemHealth(healthResponse.health);
      if (healthResponse.health.viewer_is_super_admin !== undefined) {
        setViewerIsSuperAdmin(healthResponse.health.viewer_is_super_admin);
      }
      if (healthResponse.health.viewer_is_super_admin) {
        await loadBackups();
      }
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    const response = await admin.getUsers();
    if (response.success) {
      setUsers(response.users);
    }
  };

  const loadTeams = async () => {
    const response = await teams.getAll();
    if (response.data?.success) {
      setTeamsList(response.data.teams);
    }
  };

  const loadReports = async () => {
    const response = await admin.getReports();
    if (response.success) {
      setReports(response.summary);
    }
  };

  const loadBackups = async () => {
    const response = await admin.getBackups();
    if (response.success) {
      setBackups(response.backups || []);
    }
  };

  const handleTakeBackup = async () => {
    setBackupLoading(true);
    const response = await admin.createBackup();
    if (response.success) {
      setMessage(`Backup created: ${response.backup.filename}`);
      await loadBackups();
      const healthResponse = await admin.getSystemHealth();
      if (healthResponse.success) {
        setSystemHealth(healthResponse.health);
      }
    } else {
      setMessage(response.message || 'Backup failed.');
    }
    setBackupLoading(false);
  };

  const handleDownloadBackup = async (filename) => {
    const response = await admin.downloadBackup(filename);
    if (!response || response.success === false) {
      setMessage(response.message || 'Failed to download backup.');
      return;
    }
    const blob = new Blob([response.data], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setSelectedUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      surname: '',
      email: '',
      role: 'athlete',
      team_id: '',
      jersey_number: '',
      age: '',
      height: '',
      weight: '',
      position: '',
      dominant_side: '',
      photo_url: '',
      bio_notes: ''
    });
    setMessage('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectUser = (userData) => {
    setSelectedUser(userData);
    let editRole = userData.role || 'athlete';
    if (userData.role === 'admin' && userData.is_team_manager) {
      editRole = 'team_manager';
    }
    setFormData({
      username: userData.username || '',
      password: '',
      name: userData.name || '',
      surname: userData.surname || '',
      email: userData.email || '',
      role: editRole,
      team_id: userData.team_id || '',
      jersey_number: userData.athlete?.jersey_number || '',
      age: userData.athlete?.age || '',
      height: userData.athlete?.height || '',
      weight: userData.athlete?.weight || '',
      position: userData.athlete?.position || '',
      dominant_side: userData.athlete?.dominant_side || '',
      photo_url: userData.athlete?.photo_url || '',
      bio_notes: userData.athlete?.bio_notes || ''
    });
    setMessage('Editing existing user. Leave password blank to keep current password.');
  };

  const handleSaveUser = async () => {
    if (!formData.name || !formData.surname || !formData.role) {
      setMessage('Name, surname, and role are required.');
      return;
    }
    if (formData.role === 'athlete' && !formData.team_id) {
      setMessage('Athletes must be assigned to a team.');
      return;
    }

    setSaving(true);
    const payload = {
      username: formData.username,
      password: formData.password,
      name: formData.name,
      surname: formData.surname,
      email: formData.email,
      role: formData.role,
      team_id: formData.role === 'athlete' ? formData.team_id : undefined,
      jersey_number: formData.jersey_number || undefined,
      age: formData.age || undefined,
      height: formData.height || undefined,
      weight: formData.weight || undefined,
      position: formData.position || undefined,
      dominant_side: formData.dominant_side || undefined,
      photo_url: formData.photo_url || undefined,
      bio_notes: formData.bio_notes || undefined
    };

    let response;
    if (selectedUser) {
      response = await admin.updateUser(selectedUser.id, payload);
    } else {
      response = await admin.createUser(payload);
    }

    if (response.success) {
      await loadUsers();
      setMessage(selectedUser ? 'User updated successfully.' : 'User created successfully.');
      resetForm();
    } else {
      setMessage(response.message || 'Unable to save user.');
    }
    setSaving(false);
  };

  const handleDeleteUser = async (userData) => {
    if (!window.confirm(`Delete ${userData.name} ${userData.surname}? This action cannot be undone.`)) {
      return;
    }
    const response = await admin.deleteUser(userData.id);
    if (response.success) {
      setMessage('User deleted successfully.');
      await loadUsers();
      if (selectedUser?.id === userData.id) resetForm();
    } else {
      setMessage(response.message || 'Failed to delete user.');
    }
  };

  const handleExport = async (type) => {
    const response = await admin.exportCsv(type);
    if (!response || response.success === false) {
      setMessage(response.message || 'Export failed.');
      return;
    }

    const contentDisposition = response.headers['content-disposition'];
    let filename = `${type}.csv`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename=(.*)/);
      if (match) filename = match[1].replace(/"/g, '');
    }

    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadDatabase = async () => {
    const response = await admin.downloadDatabase();
    if (!response || response.success === false) {
      setMessage(response.message || 'Failed to download database.');
      return;
    }

    const contentDisposition = response.headers['content-disposition'];
    let filename = 'athens.db';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename=(.*)/);
      if (match) filename = match[1].replace(/"/g, '');
    }

    const blob = new Blob([response.data], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-slate-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
          <p className="text-slate-400">
            {isSuperAdmin
              ? 'Full platform access: users, backups, exports, and system health.'
              : 'Team manager: manage athletes and coaches (passwords, assignments).'}
          </p>
        </div>
      </div>

      {systemHealth && (
        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Health & Warnings</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <div className="rounded-xl bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Database</p>
              <p className={`text-lg font-semibold ${systemHealth.is_sqlite ? 'text-amber-300' : 'text-emerald-300'}`}>
                {systemHealth.is_sqlite ? 'SQLite' : systemHealth.database_uri_type}
              </p>
            </div>
            <div className="rounded-xl bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Filesystem</p>
              <p className={`text-lg font-semibold ${systemHealth.is_ephemeral_filesystem ? 'text-red-300' : 'text-emerald-300'}`}>
                {systemHealth.is_ephemeral_filesystem ? 'Ephemeral' : 'Persistent'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">Last Backup</p>
              <p className="text-lg font-semibold text-white">{formatDateTime(systemHealth.last_backup_at)}</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 p-4">
              <p className="text-sm text-slate-400">DB Size</p>
              <p className="text-lg font-semibold text-white">{formatBytes(systemHealth.db_size_bytes)}</p>
            </div>
          </div>
          {systemHealth.warnings?.length > 0 ? (
            <div className="space-y-2">
              {systemHealth.warnings.map((warning) => (
                <div
                  key={warning.code}
                  className={`rounded-lg border p-3 text-sm ${
                    warning.level === 'critical'
                      ? 'border-red-500/40 bg-red-500/10 text-red-100'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                  }`}
                >
                  {warning.message}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-emerald-300 text-sm">No critical warnings detected.</p>
          )}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">User Directory</h3>
                <p className="text-sm text-slate-400">View and manage all users across the system.</p>
              </div>
              <button
                onClick={() => resetForm()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
              >
                New User
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-500">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-900/30">
                      <td className="py-3 px-4 text-white">{item.name} {item.surname}</td>
                      <td className="py-3 px-4 capitalize">{roleLabel(item)}</td>
                      <td className="py-3 px-4">{item.email || '—'}</td>
                      <td className="py-3 px-4">{item.team_id ? teamsList.find(team => team.id === item.team_id)?.name || item.team_id : '—'}</td>
                      <td className="py-3 px-4 space-x-2">
                        {(isSuperAdmin || (isTeamManager && ['coach', 'athlete'].includes(item.role))) && (
                          <>
                            <button
                              onClick={() => handleSelectUser(item)}
                              className="px-3 py-1 rounded-lg bg-brand-cyan text-white text-sm"
                            >Edit</button>
                            <button
                              onClick={() => handleDeleteUser(item)}
                              className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 text-sm hover:bg-red-500/30"
                            >Delete</button>
                          </>
                        )}
                        {isTeamManager && !['coach', 'athlete'].includes(item.role) && (
                          <span className="text-xs text-slate-500">Restricted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isSuperAdmin && (
            <>
              <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Database Backups</h3>
                    <p className="text-sm text-slate-400">Timestamped SQLite snapshots before redeploys.</p>
                  </div>
                  <button
                    onClick={handleTakeBackup}
                    disabled={backupLoading}
                    className="px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {backupLoading ? 'Creating backup...' : 'Take Backup Now'}
                  </button>
                </div>
                {backups.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-300">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-500">
                          <th className="py-2 px-3">File</th>
                          <th className="py-2 px-3">Created</th>
                          <th className="py-2 px-3">Size</th>
                          <th className="py-2 px-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups.map((entry) => (
                          <tr key={entry.filename} className="border-b border-slate-800">
                            <td className="py-2 px-3 text-white font-mono text-xs">{entry.filename}</td>
                            <td className="py-2 px-3">{formatDateTime(entry.created_at)}</td>
                            <td className="py-2 px-3">{formatBytes(entry.size_bytes)}</td>
                            <td className="py-2 px-3">
                              <button
                                onClick={() => handleDownloadBackup(entry.filename)}
                                className="px-3 py-1 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600"
                              >
                                Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No backups yet. Take one before your next deploy.</p>
                )}
              </div>

              <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Export Data</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {['users', 'athletes', 'teams'].map((type) => (
                    <button
                      key={type}
                      onClick={() => handleExport(type)}
                      className="px-4 py-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700"
                    >
                      Export {type.charAt(0).toUpperCase() + type.slice(1)} CSV
                    </button>
                  ))}
                  <button
                    onClick={handleDownloadDatabase}
                    className="px-4 py-3 rounded-xl bg-amber-600 text-white hover:bg-amber-500"
                  >
                    Download SQLite DB
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Admin Summary</h3>
            <div className="grid gap-3">
              {reports ? [
                { label: 'Total Users', value: reports.total_users },
                { label: 'Total Athletes', value: reports.total_athletes },
                { label: 'Total Coaches', value: reports.total_coaches },
                { label: 'Total Teams', value: reports.total_teams },
                { label: 'Workload Sessions', value: reports.total_workload_sessions },
                { label: 'Recovery Sessions', value: reports.total_recovery_sessions }
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="text-2xl font-semibold text-white">{item.value}</p>
                </div>
              )) : (
                <p className="text-slate-400">Loading report summary...</p>
              )}
            </div>
          </div>

          <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Create / Edit User</h3>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="First name"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                />
                <input
                  name="surname"
                  value={formData.surname}
                  onChange={handleInputChange}
                  placeholder="Last name"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Username"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                />
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                >
                  {isSuperAdmin && <option value="team_manager">Team Manager</option>}
                  {isSuperAdmin && <option value="admin">Admin (legacy)</option>}
                  <option value="coach">Coach</option>
                  <option value="athlete">Athlete</option>
                </select>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                />
              </div>
              {formData.role === 'athlete' && (
                <>
                  <select
                    name="team_id"
                    value={formData.team_id}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                  >
                    <option value="">Select Team</option>
                    {teamsList.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      name="jersey_number"
                      value={formData.jersey_number}
                      onChange={handleInputChange}
                      placeholder="Jersey number"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                    />
                    <input
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="Age"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      placeholder="Height (cm)"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                    />
                    <input
                      name="weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      placeholder="Weight (kg)"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      placeholder="Position"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                    />
                    <input
                      name="dominant_side"
                      value={formData.dominant_side}
                      onChange={handleInputChange}
                      placeholder="Dominant side"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                    />
                  </div>
                  <input
                    name="photo_url"
                    value={formData.photo_url}
                    onChange={handleInputChange}
                    placeholder="Photo URL"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                  />
                  <textarea
                    name="bio_notes"
                    value={formData.bio_notes}
                    onChange={handleInputChange}
                    placeholder="Bio / notes"
                    className="w-full min-h-[100px] bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                  />
                </>
              )}
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white hover:opacity-90"
              >
                {saving ? 'Saving...' : selectedUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
