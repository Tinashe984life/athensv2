import React, { useState, useEffect } from 'react';
import { admin } from '../services/admin';
import { teams } from '../services/api';

const AdminPanel = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [reports, setReports] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    surname: '',
    email: '',
    role: 'athlete',
    team_id: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadTeams(), loadReports()]);
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

  const resetForm = () => {
    setSelectedUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      surname: '',
      email: '',
      role: 'athlete',
      team_id: ''
    });
    setMessage('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectUser = (userData) => {
    setSelectedUser(userData);
    setFormData({
      username: userData.username || '',
      password: '',
      name: userData.name || '',
      surname: userData.surname || '',
      email: userData.email || '',
      role: userData.role || 'athlete',
      team_id: userData.team_id || ''
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
      team_id: formData.role === 'athlete' ? formData.team_id : undefined
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
          <p className="text-slate-400">Manage users, teams, exports, and platform reports.</p>
        </div>
      </div>

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
                      <td className="py-3 px-4 capitalize">{item.role}</td>
                      <td className="py-3 px-4">{item.email || '—'}</td>
                      <td className="py-3 px-4">{item.team_id ? teamsList.find(team => team.id === item.team_id)?.name || item.team_id : '—'}</td>
                      <td className="py-3 px-4 space-x-2">
                        <button
                          onClick={() => handleSelectUser(item)}
                          className="px-3 py-1 rounded-lg bg-brand-cyan text-white text-sm"
                        >Edit</button>
                        <button
                          onClick={() => handleDeleteUser(item)}
                          className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 text-sm hover:bg-red-500/30"
                        >Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            </div>
          </div>
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
                  <option value="admin">Admin</option>
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
