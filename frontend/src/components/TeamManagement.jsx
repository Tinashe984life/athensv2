import React, { useState, useEffect } from 'react';
import { teams, athletes } from '../services/athletes';

const averageMetric = (athleteList, field) => {
  const values = athleteList
    .map(athlete => athlete[field])
    .filter(value => value !== null && value !== undefined && value !== '');
  return values.length > 0
    ? (values.reduce((sum, value) => sum + Number(value), 0) / values.length).toFixed(1)
    : '—';
};

const TeamManagement = ({ user }) => {
  const [teamList, setTeamList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamAthletes, setTeamAthletes] = useState([]);
  const [showTeamDetails, setShowTeamDetails] = useState(null);

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamAthletes(selectedTeam);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await teams.getAll();
      if (response.data.success) {
        setTeamList(response.data.teams);
        if (response.data.teams.length > 0 && !selectedTeam) {
          setSelectedTeam(response.data.teams[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamAthletes = async (teamId) => {
    try {
      const response = await athletes.getAll({ team_id: teamId });
      if (response.data.success) {
        setTeamAthletes(response.data.athletes);
      }
    } catch (err) {
      console.error('Error loading team athletes:', err);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (window.confirm('Are you sure you want to delete this team? This will remove all athletes from the team.')) {
      try {
        // Note: We'll need to add a DELETE endpoint for teams
        alert('Team deletion endpoint will be implemented in Phase 3');
        // loadTeams(); // Reload teams after deletion
      } catch (err) {
        alert('Failed to delete team');
      }
    }
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
          <h2 className="text-2xl font-bold text-white">Team Management</h2>
          <p className="text-slate-400">Manage your teams and view team details</p>
        </div>
      </div>

      {/* Team Selection */}
      {teamList.length > 0 && (
        <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
          <label className="block text-sm font-medium text-slate-300 mb-4">
            Select Team to View Details
          </label>
          <div className="flex flex-wrap gap-3">
            {teamList.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team.id)}
                className={`px-4 py-3 rounded-lg transition-all ${selectedTeam === team.id
                    ? 'bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                <div className="text-left">
                  <p className="font-semibold">{team.name}</p>
                  <p className="text-sm opacity-80">{team.sport || 'No sport specified'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Team Details */}
      {selectedTeam && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Info Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Team Information</h3>
              {teamList.find(t => t.id === selectedTeam) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Team Name</p>
                      <p className="text-lg font-semibold text-white">
                        {teamList.find(t => t.id === selectedTeam).name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Sport</p>
                      <p className="text-lg font-semibold text-white">
                        {teamList.find(t => t.id === selectedTeam).sport || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Season</p>
                      <p className="text-lg font-semibold text-white">
                        {teamList.find(t => t.id === selectedTeam).season || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Total Athletes</p>
                      <p className="text-lg font-semibold text-white">{teamAthletes.length}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800">
                    <button
                      onClick={() => alert('Team editing will be implemented in Phase 3')}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      Edit Team Details
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(selectedTeam)}
                      className="ml-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      Delete Team
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Team Athletes */}
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Team Athletes</h3>
                <span className="text-slate-400">{teamAthletes.length} athletes</span>
              </div>
              
              {teamAthletes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Name</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Position</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Jersey</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Age</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamAthletes.map((athlete) => (
                        <tr key={athlete.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-full flex items-center justify-center text-white font-bold mr-3">
                                {athlete.user?.name?.charAt(0)}{athlete.user?.surname?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-white">
                                  {athlete.user?.name} {athlete.user?.surname}
                                </p>
                                <p className="text-xs text-slate-400">{athlete.user?.email || 'No email'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-slate-800 rounded text-sm text-slate-300">
                              {athlete.position || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {athlete.jersey_number ? (
                              <span className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded text-white">
                                #{athlete.jersey_number}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-white">{athlete.age || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">👤</span>
                  </div>
                  <p className="text-slate-400">No athletes in this team yet.</p>
                  <p className="text-sm text-slate-500 mt-1">Add athletes from the Athletes tab</p>
                </div>
              )}
            </div>
          </div>

          {/* Team Stats */}
          <div className="space-y-6">
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Team Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Average Bleep Score</span>
                  <span className="text-2xl font-bold text-white">{averageMetric(teamAthletes, 'bleep_score')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Average Sport Attendance</span>
                  <span className="text-2xl font-bold text-white">{averageMetric(teamAthletes, 'sport_attendance')}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Average Gym Attendance</span>
                  <span className="text-2xl font-bold text-white">{averageMetric(teamAthletes, 'gym_attendance')}%</span>
                </div>
              </div>
            </div>

            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Position Distribution</h3>
              <div className="space-y-3">
                {(() => {
                  const positions = {};
                  teamAthletes.forEach(athlete => {
                    const pos = athlete.position || 'Unknown';
                    positions[pos] = (positions[pos] || 0) + 1;
                  });
                  
                  return Object.entries(positions).map(([position, count]) => (
                    <div key={position} className="flex items-center justify-between">
                      <span className="text-slate-300">{position}</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-slate-800 rounded-full h-2 mr-3">
                          <div 
                            className="bg-brand-cyan h-2 rounded-full"
                            style={{ width: `${(count / teamAthletes.length) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-white font-semibold">{count}</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {teamList.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🏆</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-3">No Teams Yet</h3>
          <p className="text-slate-400 mb-6">
            Create your first team to start managing athletes.
          </p>
          <button
            onClick={() => alert('Use the "Create Team" button in the Athletes tab')}
            className="px-6 py-3 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white rounded-lg hover:from-brand-cyan-dark hover:to-brand-cyan transition-all duration-200"
          >
            Create First Team
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;