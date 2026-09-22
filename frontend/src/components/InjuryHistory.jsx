import React, { useState, useEffect } from 'react';
import { injuries } from '../services/injuries';
import { athletes } from '../services/athletes';
import InjuryForm from './InjuryForm';

const InjuryHistory = ({ user }) => {
  const [injuryRecords, setInjuryRecords] = useState([]);
  const [injuryStats, setInjuryStats] = useState(null);
  const [coachAthletes, setCoachAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInjuryForm, setShowInjuryForm] = useState(false);
  const [editingInjury, setEditingInjury] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    body_part: 'all'
  });

  useEffect(() => {
    if (user.role === 'coach') {
      loadCoachAthletes();
    } else {
      loadAthleteData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAthlete || user.role === 'athlete') {
      loadInjuryData();
    }
  }, [selectedAthlete, filters]);

  const loadCoachAthletes = async () => {
    try {
      const response = await athletes.getAll();
      if (response.data.success) {
        setCoachAthletes(response.data.athletes);
        if (response.data.athletes.length > 0) {
          setSelectedAthlete(response.data.athletes[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading athletes:', err);
    }
  };

  const loadAthleteData = async () => {
    try {
      const response = await athletes.getAll();
      if (response.data.success) {
        const athlete = response.data.athletes.find(a => a.user_id === user.id);
        if (athlete) {
          setSelectedAthlete(athlete.id);
        }
      }
    } catch (err) {
      console.error('Error loading athlete data:', err);
    }
  };

  const loadInjuryData = async () => {
    try {
      setLoading(true);
      
      const params = { athlete_id: selectedAthlete, ...filters };
      Object.keys(params).forEach(key => {
        if (params[key] === 'all') delete params[key];
      });

      const [injuriesResponse, statsResponse] = await Promise.all([
        injuries.getAll(params),
        injuries.getAthleteStats(selectedAthlete)
      ]);

      if (injuriesResponse.data.success) {
        setInjuryRecords(injuriesResponse.data.injuries);
      }

      if (statsResponse.data.success) {
        setInjuryStats(statsResponse.data.stats);
      }
    } catch (err) {
      console.error('Error loading injury data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (injuryId) => {
    if (window.confirm('Are you sure you want to delete this injury record?')) {
      try {
        await injuries.delete(injuryId);
        loadInjuryData();
      } catch (err) {
        alert('Failed to delete injury record');
      }
    }
  };

  const handleRecover = async (injury) => {
    try {
      await injuries.update(injury.id, {
        ...injury,
        status: 'recovered',
        clearance_date: new Date().toISOString().split('T')[0]
      });
      loadInjuryData();
    } catch (err) {
      alert('Failed to update injury status');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'mild': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'moderate': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'severe': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-red-500/20 text-red-400';
      case 'recovered': return 'bg-green-500/20 text-green-400';
      case 'chronic': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getDaysSince = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRecoveryProgress = (injury) => {
    if (injury.status === 'recovered') return 100;
    if (!injury.estimated_recovery_time || !injury.date_occurred) return 0;
    
    const daysSince = getDaysSince(injury.date_occurred);
    const progress = Math.min((daysSince / injury.estimated_recovery_time) * 100, 95);
    return Math.round(progress);
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
          <h2 className="text-2xl font-bold text-white">Injury History</h2>
          <p className="text-slate-400">
            {user.role === 'athlete' 
              ? 'Track and manage your injury history'
              : 'Monitor and manage athlete injuries'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {user.role === 'coach' && coachAthletes.length > 0 && (
            <select
              value={selectedAthlete}
              onChange={(e) => setSelectedAthlete(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            >
              {coachAthletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.user?.name} {athlete.user?.surname}
                </option>
              ))}
            </select>
          )}
          
          <button
            onClick={() => setShowInjuryForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white hover:from-brand-cyan-dark hover:to-brand-cyan rounded-lg transition-all duration-200"
          >
            Log New Injury
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="recovered">Recovered</option>
              <option value="chronic">Chronic</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Severity
            </label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            >
              <option value="all">All Severity</option>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Body Part
            </label>
            <select
              value={filters.body_part}
              onChange={(e) => setFilters(prev => ({ ...prev, body_part: e.target.value }))}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            >
              <option value="all">All Body Parts</option>
              {Array.from(new Set(injuryRecords.map(i => i.body_part))).map(part => (
                <option key={part} value={part}>{part}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Injury Stats */}
      {injuryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Injuries</p>
                <p className="text-2xl font-bold text-white">{injuryStats.total_injuries}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">🩹</span>
              </div>
            </div>
          </div>
          
          <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active</p>
                <p className="text-2xl font-bold text-white">{injuryStats.active_injuries}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">⚠️</span>
              </div>
            </div>
          </div>
          
          <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Recovered</p>
                <p className="text-2xl font-bold text-white">{injuryStats.recovered_injuries}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
            </div>
          </div>
          
          <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Recovery Rate</p>
                <p className="text-2xl font-bold text-white">{injuryStats.recovery_rate}%</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">📈</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Injury Records */}
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Injury Records</h3>
          <span className="text-slate-400">{injuryRecords.length} records</span>
        </div>
        
        {injuryRecords.length > 0 ? (
          <div className="space-y-4">
            {injuryRecords.map((injury) => (
              <div key={injury.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Injury Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-white">{injury.injury_type}</h4>
                        <div className="flex items-center space-x-3 mt-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(injury.severity)}`}>
                            {injury.severity.toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(injury.status)}`}>
                            {injury.status.toUpperCase()}
                          </span>
                          <span className="text-slate-400 text-sm">
                            {injury.body_part} {injury.side && `(${injury.side})`}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Reported</p>
                        <p className="text-white font-semibold">
                          {new Date(injury.date_reported).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Recovery Progress */}
                    {injury.status === 'active' && injury.estimated_recovery_time && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-400">Recovery Progress</span>
                          <span className="text-sm text-white font-semibold">
                            {getRecoveryProgress(injury)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${getRecoveryProgress(injury)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                          {injury.date_occurred ? `${getDaysSince(injury.date_occurred)} of ${injury.estimated_recovery_time} days` : 'No occurrence date'}
                        </p>
                      </div>
                    )}
                    
                    {/* Injury Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {injury.mechanism && (
                        <div>
                          <p className="text-sm text-slate-500">Mechanism</p>
                          <p className="text-white text-sm">{injury.mechanism}</p>
                        </div>
                      )}
                      
                      {injury.symptoms && (
                        <div>
                          <p className="text-sm text-slate-500">Symptoms</p>
                          <p className="text-white text-sm">{injury.symptoms}</p>
                        </div>
                      )}
                      
                      {injury.diagnosis && (
                        <div>
                          <p className="text-sm text-slate-500">Diagnosis</p>
                          <p className="text-white text-sm">{injury.diagnosis}</p>
                        </div>
                      )}
                      
                      {injury.treatment_plan && (
                        <div>
                          <p className="text-sm text-slate-500">Treatment</p>
                          <p className="text-white text-sm">{injury.treatment_plan}</p>
                        </div>
                      )}
                    </div>
                    
                    {injury.notes && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <p className="text-sm text-slate-500">Notes</p>
                        <p className="text-white text-sm">{injury.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col space-y-2 md:w-48">
                    {injury.status === 'active' && (
                      <button
                        onClick={() => handleRecover(injury)}
                        className="w-full px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                      >
                        Mark as Recovered
                      </button>
                    )}
                    
                    <button
                      onClick={() => setEditingInjury(injury)}
                      className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      Edit Record
                    </button>
                    
                    {user.role !== 'athlete' && (
                      <button
                        onClick={() => handleDelete(injury.id)}
                        className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                      >
                        Delete Record
                      </button>
                    )}
                    
                    {injury.clearance_date && (
                      <div className="mt-4 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                        <p className="text-sm text-green-400 font-semibold">Cleared on</p>
                        <p className="text-white text-sm">
                          {new Date(injury.clearance_date).toLocaleDateString()}
                        </p>
                        {injury.clearance_notes && (
                          <p className="text-xs text-green-400 mt-1">{injury.clearance_notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🩹</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">No Injury Records</h3>
            <p className="text-slate-400 mb-6">
              {user.role === 'athlete' 
                ? 'You haven\'t recorded any injuries yet.'
                : 'This athlete doesn\'t have any recorded injuries.'
              }
            </p>
            <button
              onClick={() => setShowInjuryForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white rounded-lg hover:from-brand-cyan-dark hover:to-brand-cyan transition-all duration-200"
            >
              Log First Injury
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showInjuryForm && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl mt-8 mb-8">
            <InjuryForm
              user={user}
              onSuccess={() => {
                setShowInjuryForm(false);
                loadInjuryData();
                if (user.role === 'athlete') {
                  alert('Thank you for reporting your injury, however you must visit the medical office for an injury assessment and final reporting which happens every day at first break.');
                }
              }}
              onClose={() => setShowInjuryForm(false)}
            />
          </div>
        </div>
      )}

      {editingInjury && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl mt-8 mb-8">
            <InjuryForm
              user={user}
              injuryToEdit={editingInjury}
              onSuccess={() => {
                setEditingInjury(null);
                loadInjuryData();
              }}
              onClose={() => setEditingInjury(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InjuryHistory;