import React, { useState, useEffect } from 'react';
import { dashboard } from '../services/dashboard';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CoachDashboard = ({ user }) => {
  const [teamOverview, setTeamOverview] = useState(null);
  const [teamRiskSummary, setTeamRiskSummary] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'risk', 'workload'

  useEffect(() => {
    loadDashboardData();
  }, [selectedTeam, selectedSport, selectedPosition]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const params = {};
      if (selectedTeam) params.team_id = selectedTeam;
      if (selectedSport !== 'all') params.sport = selectedSport;
      if (selectedPosition !== 'all') params.position = selectedPosition;

      const [overviewResponse, riskResponse] = await Promise.all([
        dashboard.getTeamOverview(params),
        dashboard.getTeamRiskSummary(selectedTeam || '')
      ]);

      if (overviewResponse.data.success) {
        setTeamOverview(overviewResponse.data);
      }

      if (riskResponse.data.success) {
        setTeamRiskSummary(riskResponse.data.risk_summary[0]);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFlagColor = (flag) => {
    switch (flag) {
      case 'red': return '#ef4444';
      case 'yellow': return '#f59e0b';
      case 'green': return '#10b981';
      default: return '#64748b';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#64748b';
    }
  };

  const readinessChartData = () => {
    if (!teamOverview?.teams?.[0]?.athletes) return null;

    const athletes = teamOverview.teams[0].athletes;
    const labels = athletes.map(a => a.name.split(' ')[0]);
    const data = athletes.map(a => a.today_readiness || 0);
    const colors = athletes.map(a => getFlagColor(a.flag));

    return {
      labels: labels,
      datasets: [{
        label: 'Today\'s Readiness',
        data: data,
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('bg-', 'border-')),
        borderWidth: 1
      }]
    };
  };

  const flagDistributionChartData = () => {
    if (!teamOverview?.teams?.[0]?.flag_distribution) return null;

    const distribution = teamOverview.teams[0].flag_distribution;
    return {
      labels: ['Red', 'Yellow', 'Green'],
      datasets: [{
        data: [distribution.red, distribution.yellow, distribution.green],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderWidth: 1
      }]
    };
  };

  const riskDistributionChartData = () => {
    if (!teamRiskSummary) return null;

    return {
      labels: ['High Risk', 'Medium Risk', 'Low Risk'],
      datasets: [{
        data: [
          teamRiskSummary.high_risk_count,
          teamRiskSummary.medium_risk_count,
          teamRiskSummary.low_risk_count
        ],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderWidth: 1
      }]
    };
  };

  const complianceChartData = () => {
    if (!teamOverview?.teams) return null;

    const teamsData = teamOverview.teams;
    return {
      labels: teamsData.map(t => t.team_name),
      datasets: [{
        label: 'Compliance Rate (%)',
        data: teamsData.map(t => t.compliance_rate),
        backgroundColor: 'rgba(34, 211, 238, 0.5)',
        borderColor: '#22d3ee',
        borderWidth: 2
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1',
          font: {
            size: 12
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(100, 116, 139, 0.2)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(100, 116, 139, 0.2)'
        }
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1',
          font: {
            size: 12
          }
        }
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
          <h2 className="text-2xl font-bold text-white">Coach Dashboard</h2>
          <p className="text-slate-400">Monitor team wellness, performance, and injury risk</p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'overview' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('risk')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'risk' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`}
          >
            Risk Assessment
          </button>
          <button
            onClick={() => setViewMode('workload')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'workload' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`}
          >
            Workload
          </button>
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
              <option value="">All Teams</option>
              {teamOverview?.teams?.map((team) => (
                <option key={team.team_id} value={team.team_id}>
                  {team.team_name}
                </option>
              ))}
            </select>
          </div>

          {/* Sport Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Filter by Sport
            </label>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            >
              <option value="all">All Sports</option>
              {teamOverview?.filters?.available_sports?.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
          </div>

          {/* Position Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Filter by Position
            </label>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            >
              <option value="all">All Positions</option>
              {teamOverview?.filters?.available_positions?.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overview View */}
      {viewMode === 'overview' && teamOverview && (
        <>
          {/* Team Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Athletes</p>
                  <p className="text-2xl font-bold text-white">
                    {teamOverview.teams.reduce((sum, team) => sum + team.total_athletes, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-lg flex items-center justify-center">
                  <span className="text-xl">👥</span>
                </div>
              </div>
            </div>
            
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Team Compliance</p>
                  <p className="text-2xl font-bold text-white">
                    {teamOverview.teams.length > 0 
                      ? Math.round(teamOverview.teams.reduce((sum, team) => sum + team.compliance_rate, 0) / teamOverview.teams.length)
                      : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
              </div>
            </div>
            
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Avg Readiness</p>
                  <p className="text-2xl font-bold text-white">
                    {teamOverview.teams[0]?.avg_readiness || 0}/10
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">💪</span>
                </div>
              </div>
            </div>
            
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Active Injuries</p>
                  <p className="text-2xl font-bold text-white">
                    {teamOverview.teams.flatMap(t => t.athletes).reduce((sum, a) => sum + (a.active_injuries || 0), 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">⚠️</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Readiness Chart */}
            <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6">Today's Readiness Scores</h3>
              <div className="h-64">
                {readinessChartData() ? (
                  <Bar data={readinessChartData()} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    No readiness data available
                  </div>
                )}
              </div>
            </div>

            {/* Flag Distribution */}
            <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6">Athlete Flag Distribution</h3>
              <div className="h-64">
                {flagDistributionChartData() ? (
                  <Pie data={flagDistributionChartData()} options={pieChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    No flag data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Athlete Status Table */}
          <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Athlete Status</h3>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                  <span className="text-sm text-slate-400">Green</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
                  <span className="text-sm text-slate-400">Yellow</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                  <span className="text-sm text-slate-400">Red</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Athlete</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Team</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Readiness</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Compliance</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Injuries</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Trend</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamOverview.teams.flatMap(team => 
                    team.athletes.map(athlete => (
                      <tr key={athlete.athlete_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-full flex items-center justify-center text-white font-bold mr-3">
                              {athlete.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-medium text-white">{athlete.name}</p>
                              {athlete.jersey_number && (
                                <p className="text-xs text-slate-400">#{athlete.jersey_number} • {athlete.position}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-slate-800 rounded text-sm text-slate-300">
                            {team.team_name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2`} style={{ backgroundColor: getFlagColor(athlete.flag) }}></div>
                            <span className="font-medium capitalize">{athlete.flag}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-lg font-bold ${
                            (athlete.today_readiness || 0) <= 4 ? 'text-red-400' :
                            (athlete.today_readiness || 0) <= 7 ? 'text-amber-400' : 'text-green-400'
                          }`}>
                            {athlete.today_readiness || '--'}/10
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-16 bg-slate-700 rounded-full h-2 mr-2">
                              <div 
                                className="bg-brand-cyan h-2 rounded-full"
                                style={{ width: `${athlete.compliance_rate || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-white">{athlete.compliance_rate || 0}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-white">{athlete.injury_count || 0}</span>
                            {athlete.active_injuries > 0 && (
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                                {athlete.active_injuries} active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-sm font-medium capitalize ${
                            athlete.trend === 'improving' ? 'bg-green-500/20 text-green-400' :
                            athlete.trend === 'declining' ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {athlete.trend || '--'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => alert('View details coming soon')}
                              className="text-sm px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => alert('Risk assessment coming soon')}
                              className="text-sm px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded transition-colors"
                            >
                              Assess
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Risk Assessment View */}
      {viewMode === 'risk' && teamRiskSummary && (
        <>
          {/* Risk Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">High Risk Athletes</p>
                  <p className="text-2xl font-bold text-white">{teamRiskSummary.high_risk_count}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">⚠️</span>
                </div>
              </div>
            </div>
            
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Medium Risk Athletes</p>
                  <p className="text-2xl font-bold text-white">{teamRiskSummary.medium_risk_count}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
              </div>
            </div>
            
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Low Risk Athletes</p>
                  <p className="text-2xl font-bold text-white">{teamRiskSummary.low_risk_count}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">✅</span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Distribution Chart */}
          <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Risk Distribution</h3>
            <div className="h-64">
              <Pie data={riskDistributionChartData()} options={pieChartOptions} />
            </div>
          </div>

          {/* High Risk Athletes */}
          {teamRiskSummary.high_risk_athletes && teamRiskSummary.high_risk_athletes.length > 0 && (
            <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">High Risk Athletes (Requires Attention)</h3>
                <span className="text-slate-400">{teamRiskSummary.high_risk_athletes.length} athletes</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamRiskSummary.high_risk_athletes.map((athlete) => (
                  <div key={athlete.athlete_id} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          {athlete.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-white">{athlete.name}</p>
                          {athlete.jersey_number && (
                            <p className="text-xs text-slate-400">#{athlete.jersey_number} • {athlete.position}</p>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-red-500/30 text-red-400 rounded text-xs font-bold">
                        HIGH RISK
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Readiness</span>
                        <span className="text-red-400 font-bold">{athlete.readiness || '--'}/10</span>
                      </div>
                      
                      {athlete.concerns && athlete.concerns.length > 0 && (
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Concerns:</p>
                          <ul className="text-sm text-red-300 space-y-1">
                            {athlete.concerns.map((concern, index) => (
                              <li key={index}>• {concern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-red-500/20">
                      <button
                        onClick={() => alert('Detailed assessment coming soon')}
                        className="w-full text-center px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                      >
                        View Detailed Assessment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medium Risk Athletes */}
          {teamRiskSummary.medium_risk_athletes && teamRiskSummary.medium_risk_athletes.length > 0 && (
            <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6">Medium Risk Athletes (Monitor Closely)</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Athlete</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Readiness</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Concerns</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamRiskSummary.medium_risk_athletes.map((athlete) => (
                      <tr key={athlete.athlete_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                              {athlete.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-medium text-white">{athlete.name}</p>
                              {athlete.jersey_number && (
                                <p className="text-xs text-slate-400">#{athlete.jersey_number} • {athlete.position}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-amber-400 font-bold">{athlete.readiness || '--'}/10</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {athlete.concerns?.map((concern, index) => (
                              <p key={index} className="text-sm text-amber-300">• {concern}</p>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => alert('View assessment coming soon')}
                            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
                          >
                            View Assessment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Workload View */}
      {viewMode === 'workload' && (
        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Workload Management</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-bold text-white mb-4">Acute:Chronic Workload Ratio (ACWR)</h4>
              <p className="text-slate-400 mb-4">
                ACWR compares the training load from the last 7 days (acute) to the average weekly load from the last 28 days (chronic).
              </p>
              
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300">Optimal Zone</span>
                    <span className="text-green-400 font-bold">0.8 - 1.2</span>
                  </div>
                  <div className="w-full bg-slate-700 h-4 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500"></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Under-training</span>
                    <span>Optimal</span>
                    <span>Over-training</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <p className="text-sm text-slate-400">ACWR &lt; 0.8</p>
                    <p className="text-lg font-bold text-amber-400">Under-training Risk</p>
                    <p className="text-xs text-slate-500 mt-1">Potential detraining effect</p>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <p className="text-sm text-slate-400">ACWR &gt; 1.5</p>
                    <p className="text-lg font-bold text-red-400">High Injury Risk</p>
                    <p className="text-xs text-slate-500 mt-1">Significant load increase</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-white mb-4">Key Recommendations</h4>
              <div className="space-y-3">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-red-400">⚠️</span>
                    </div>
                    <div>
                      <p className="font-bold text-white">Monitor High-Risk Athletes</p>
                      <p className="text-sm text-slate-400">Regularly check ACWR for athletes with recent injuries or high training loads</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-green-400">📊</span>
                    </div>
                    <div>
                      <p className="font-bold text-white">Gradual Progressions</p>
                      <p className="text-sm text-slate-400">Increase training load by no more than 10-20% per week</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-400">🔄</span>
                    </div>
                    <div>
                      <p className="font-bold text-white">Training Variation</p>
                      <p className="text-sm text-slate-400">Avoid training monotony to reduce injury risk</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-slate-400 text-sm">
              <strong>Note:</strong> Individual athlete workload analysis will be available in Phase 6.
              Coaches can view specific ACWR calculations and recommendations for each athlete.
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!teamOverview?.teams?.length && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">📊</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-3">No Team Data Available</h3>
          <p className="text-slate-400 mb-6">
            {selectedTeam 
              ? 'This team has no athletes or wellness data yet.'
              : 'No teams available or no athletes have submitted wellness checks.'
            }
          </p>
          <button
            onClick={() => {
              setSelectedTeam('');
              loadDashboardData();
            }}
            className="px-6 py-3 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white rounded-lg hover:from-brand-cyan-dark hover:to-brand-cyan transition-all duration-200"
          >
            View All Teams
          </button>
        </div>
      )}
    </div>
  );
};

export default CoachDashboard;