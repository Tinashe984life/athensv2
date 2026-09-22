import React, { useState, useEffect } from 'react';
import { athletes, teams } from '../services/athletes';
import AddAthleteModal from './AddAthleteModal';
import EditAthleteModal from './EditAthleteModal';
import CreateTeamModal from './CreateTeamModal';

const AthleteList = ({ user }) => {
  const [athleteList, setAthleteList] = useState([]);
  const [teamList, setTeamList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState(null);
  const [showAthleteDetails, setShowAthleteDetails] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTeam !== 'all') {
      loadAthletesForTeam(selectedTeam);
    } else {
      loadAllAthletes();
    }
  }, [selectedTeam]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [athletesResponse, teamsResponse] = await Promise.all([
        athletes.getAll(),
        teams.getAll()
      ]);
      
      if (athletesResponse.data.success) {
        setAthleteList(athletesResponse.data.athletes);
      }
      
      if (teamsResponse.data.success) {
        setTeamList(teamsResponse.data.teams);
      }
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllAthletes = async () => {
    try {
      const response = await athletes.getAll();
      if (response.data.success) {
        setAthleteList(response.data.athletes);
      }
    } catch (err) {
      console.error('Error loading athletes:', err);
    }
  };

  const loadAthletesForTeam = async (teamId) => {
    try {
      const response = await athletes.getAll({ team_id: teamId });
      if (response.data.success) {
        setAthleteList(response.data.athletes);
      }
    } catch (err) {
      console.error('Error loading team athletes:', err);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await athletes.search(searchQuery, selectedTeam !== 'all' ? selectedTeam : '');
      if (response.data.success) {
        setAthleteList(response.data.athletes);
      }
    } catch (err) {
      console.error('Error searching athletes:', err);
    }
  };

  const handleAddAthlete = async (athleteData) => {
    try {
      const response = await athletes.create(athleteData);
      if (response.data.success) {
        alert(`Athlete created! Username: ${response.data.credentials.username}, Password: ${response.data.credentials.password}`);
        loadData();
        setShowAddModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create athlete');
    }
  };

  const handleEditAthlete = async (athleteId, athleteData) => {
    try {
      const response = await athletes.update(athleteId, athleteData);
      if (response.data.success) {
        loadData();
        setEditingAthlete(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update athlete');
    }
  };

  const handleDeleteAthlete = async (athleteId) => {
    if (window.confirm('Are you sure you want to delete this athlete? This action cannot be undone.')) {
      try {
        const response = await athletes.delete(athleteId);
        if (response.data.success) {
          loadData();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete athlete');
      }
    }
  };

  const handleCreateTeam = async (teamData) => {
    try {
      const response = await teams.create(teamData);
      if (response.data.success) {
        loadData();
        setShowCreateTeamModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create team');
    }
  };

  const getStatusColor = (athlete) => {
    // Simple status logic - will be enhanced in Phase 3
    return 'bg-green-500/20 text-green-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Athlete Management</h2>
          <p className="text-slate-400">Manage your athletes and teams</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {user.role === 'coach' && (
            <>
              <button
                onClick={() => setShowCreateTeamModal(true)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                Create Team
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white hover:from-brand-cyan-dark hover:to-brand-cyan rounded-lg transition-all duration-200"
              >
                Add Athlete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Team Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Filter by Team
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            >
              <option value="all">All Teams</option>
              {teamList.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.athlete_count || 0} athletes)
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Search Athletes
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name or position..."
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Athletes</p>
              <p className="text-3xl font-bold text-white">{athleteList.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>
        
        <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Teams</p>
              <p className="text-3xl font-bold text-white">{teamList.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏆</span>
            </div>
          </div>
        </div>
        
        <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Active Today</p>
              <p className="text-3xl font-bold text-white">0</p>
            </div>
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏃</span>
            </div>
          </div>
        </div>
      </div>

      {/* Athletes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {athleteList.map((athlete) => (
          <div
            key={athlete.id}
            className="bg-brand-bg-light border border-brand-border rounded-xl p-6 hover:border-brand-cyan/50 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {athlete.user?.name?.charAt(0)}{athlete.user?.surname?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">
                    {athlete.user?.name} {athlete.user?.surname}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {athlete.position || 'No position set'}
                    {athlete.jersey_number && ` • #${athlete.jersey_number}`}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(athlete)}`}>
                Active
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-slate-500">Position</p>
                  <p className="text-sm text-white">{athlete.position || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Summer code</p>
                  <p className="text-sm text-white">{athlete.summer_sporting_code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Winter code</p>
                  <p className="text-sm text-white">{athlete.winter_sporting_code || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowAthleteDetails(showAthleteDetails === athlete.id ? null : athlete.id)}
                className="text-sm text-brand-cyan hover:text-white transition-colors"
              >
                {showAthleteDetails === athlete.id ? 'Hide Details' : 'View Details'}
              </button>
              
              {user.role === 'coach' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingAthlete(athlete)}
                    className="text-sm px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAthlete(athlete.id)}
                    className="text-sm px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Expanded Details */}
            {showAthleteDetails === athlete.id && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm text-white">{athlete.user?.email || 'No email'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Username</p>
                    <p className="text-sm text-white">{athlete.user?.username || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Bio Notes</p>
                    <p className="text-sm text-white">{athlete.bio_notes || 'No notes'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {athleteList.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">👤</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-3">No Athletes Found</h3>
          <p className="text-slate-400 mb-6">
            {selectedTeam !== 'all' 
              ? 'No athletes in this team yet.' 
              : 'Start by adding your first athlete.'}
          </p>
          {user.role === 'coach' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white rounded-lg hover:from-brand-cyan-dark hover:to-brand-cyan transition-all duration-200"
            >
              Add First Athlete
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddAthleteModal
          teams={teamList}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddAthlete}
        />
      )}

      {showCreateTeamModal && (
        <CreateTeamModal
          onClose={() => setShowCreateTeamModal(false)}
          onSubmit={handleCreateTeam}
        />
      )}

      {editingAthlete && (
        <EditAthleteModal
          athlete={editingAthlete}
          teams={teamList}
          onClose={() => setEditingAthlete(null)}
          onSubmit={handleEditAthlete}
        />
      )}
    </div>
  );
};

export default AthleteList;