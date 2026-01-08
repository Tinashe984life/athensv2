import React, { useState, useEffect } from 'react';
import { wellness } from '../services/wellness';
import { athletes } from '../services/athletes';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const WellnessDashboard = ({ user }) => {
  const [wellnessEntries, setWellnessEntries] = useState([]);
  const [wellnessStats, setWellnessStats] = useState(null);
  const [teamOverview, setTeamOverview] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [coachAthletes, setCoachAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7'); // days

  useEffect(() => {
    loadData();
  }, [selectedAthlete, timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (user.role === 'athlete') {
        // Load athlete's own wellness data
        const [entriesResponse, statsResponse] = await Promise.all([
          wellness.getEntries({ limit: parseInt(timeRange) }),
          wellness.getStats({ days: parseInt(timeRange) })
        ]);
        
        if (entriesResponse.data.success) {
          setWellnessEntries(entriesResponse.data.entries);
        }
        
        if (statsResponse.data.success) {
          setWellnessStats(statsResponse.data);
        }
      } else if (user.role === 'coach') {
        // Load coach's team overview
        const overviewResponse = await wellness.getTeamOverview();
        if (overviewResponse.data.success) {
          setTeamOverview(overviewResponse.data.teams);
        }
        
        // Load coach's athletes for filtering
        const athletesResponse = await athletes.getAll();
        if (athletesResponse.data.success) {
          setCoachAthletes(athletesResponse.data.athletes);
        }
        
        // If an athlete is selected, load their wellness data
        if (selectedAthlete) {
          const [entriesResponse, statsResponse] = await Promise.all([
            wellness.getEntries({ athlete_id: selectedAthlete, limit: parseInt(timeRange) }),
            wellness.getStats({ athlete_id: selectedAthlete, days: parseInt(timeRange) })
          ]);
          
          if (entriesResponse.data.success) {
            setWellnessEntries(entriesResponse.data.entries);
          }
          
          if (statsResponse.data.success) {
            setWellnessStats(statsResponse.data);
          }
        }
      }
    } catch (err) {
      console.error('Error loading wellness data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'red': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'yellow': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'green': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getReadinessColor = (score) => {
    if (score <= 4) return 'text-red-400';
    if (score <= 7) return 'text-amber-400';
    return 'text-green-400';
  };

  const readinessChartData = {
    labels: wellnessEntries.slice().reverse().map(entry => 
      new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Readiness Score',
        data: wellnessEntries.slice().reverse().map(entry => entry.readiness_score),
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const sleepChartData = {
    labels: wellnessEntries.slice().reverse().map(entry => 
      new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Sleep Hours',
        data: wellnessEntries.slice().reverse().map(entry => entry.sleep_hours),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const metricsChartData = {
    labels: ['Sleep Quality', 'Stress', 'Soreness', 'Nutrition', 'Mood', 'Energy', 'Motivation'],
    datasets: wellnessEntries.slice(0, 1).map((entry, index) => ({
      label: `Today's Scores`,
      data: [
        entry.sleep_quality,
        entry.stress_level,
        entry.muscle_soreness,
        entry.nutrition_quality,
        entry.mood,
        entry.energy_level,
        entry.motivation_level
      ],
      backgroundColor: 'rgba(34, 211, 238, 0.5)',
      borderColor: '#22d3ee',
      borderWidth: 1
    }))
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1'
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: '#475569',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(100, 116, 139, 0.2)'
        },
        ticks: {
          color: '#94a3b8'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(100, 116, 139, 0.2)'
        },
        ticks: {
          color: '#94a3b8'
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
          <h2 className="text-2xl font-bold text-white">Wellness Dashboard</h2>
          <p className="text-slate-400">
            {user.role === 'athlete' 
              ? 'Track your daily wellness and readiness scores'
              : 'Monitor team wellness and athlete readiness'
            }
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center space-x-3">
          {user.role === 'coach' && coachAthletes.length > 0 && (
            <select
              value={selectedAthlete}
              onChange={(e) => setSelectedAthlete(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            >
              <option value="">All Athletes</option>
              {coachAthletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.user?.name} {athlete.user?.surname}
                </option>
              ))}
            </select>
          )}
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Coach Team Overview */}
      {user.role === 'coach' && !selectedAthlete && (
        <>
          {/* Team Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamOverview.map((team) => (
              <div key={team.team_id} className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 truncate">{team.team_name}</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-400">Compliance Rate</p>
                    <p className="text-2xl font-bold text-white">{team.compliance_rate}%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Athletes</span>
                    <span className="font-semibold text-white">{team.total_athletes}</span>
                  </div>
                  <div className="pt-4 border-t border-slate-800">
                    <button 
                      onClick={() => setSelectedAthlete(team.athletes[0]?.athlete_id || '')}
                      className="w-full text-center text-brand-cyan hover:text-white text-sm transition-colors"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Team Wellness Status */}
          <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Team Wellness Status</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Athlete</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Team</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Today's Status</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Readiness</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">7-day Avg</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {teamOverview.flatMap(team => 
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
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(athlete.status)}`}>
                            {athlete.has_submitted_today ? athlete.status.toUpperCase() : 'NOT SUBMITTED'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-lg font-bold ${getReadinessColor(athlete.today_readiness || 0)}`}>
                            {athlete.today_readiness || '--'}/10
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-white">{athlete.avg_readiness_7d || '--'}/10</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-400 text-sm">
                            {athlete.has_submitted_today ? 'Today' : '--'}
                          </span>
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

      {/* Wellness Stats */}
      {(user.role === 'athlete' || selectedAthlete) && wellnessStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg Readiness</p>
                <p className="text-2xl font-bold text-white">{wellnessStats.stats.avg_readiness}/10</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-lg flex items-center justify-center">
                <span className="text-xl">💪</span>
              </div>
            </div>
          </div>
          
          <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Compliance Rate</p>
                <p className="text-2xl font-bold text-white">{wellnessStats.stats.compliance_rate}%</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
            </div>
          </div>
          
          <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg Sleep Hours</p>
                <p className="text-2xl font-bold text-white">{wellnessStats.stats.avg_sleep_hours}h</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">😴</span>
              </div>
            </div>
          </div>
          
          <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Entries</p>
                <p className="text-2xl font-bold text-white">{wellnessStats.stats.total_entries}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">📝</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {(user.role === 'athlete' || selectedAthlete) && wellnessEntries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Readiness Chart */}
          <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Readiness Score Trend</h3>
            <div className="h-64">
              <Line data={readinessChartData} options={chartOptions} />
            </div>
          </div>

          {/* Sleep Chart */}
          <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Sleep Hours Trend</h3>
            <div className="h-64">
              <Line data={sleepChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Recent Entries */}
      {(user.role === 'athlete' || selectedAthlete) && wellnessEntries.length > 0 && (
        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Recent Wellness Entries</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Sleep</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Stress</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Soreness</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Nutrition</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Readiness</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {wellnessEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4">
                      <p className="font-medium text-white">
                        {new Date(entry.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="text-white font-semibold mr-2">{entry.sleep_hours}h</span>
                        <div className="w-16 bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(entry.sleep_quality || 0) * 20}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        entry.stress_level <= 2 ? 'bg-green-500/20 text-green-400' :
                        entry.stress_level <= 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {entry.stress_level}/5
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        entry.muscle_soreness <= 2 ? 'bg-green-500/20 text-green-400' :
                        entry.muscle_soreness <= 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {entry.muscle_soreness}/5
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        entry.nutrition_quality >= 4 ? 'bg-green-500/20 text-green-400' :
                        entry.nutrition_quality >= 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {entry.nutrition_quality}/5
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-lg font-bold ${getReadinessColor(entry.readiness_score || 0)}`}>
                        {entry.readiness_score || '--'}/10
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-slate-300 truncate max-w-xs">
                        {entry.notes || 'No notes'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(user.role === 'athlete' || selectedAthlete) && wellnessEntries.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">📊</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-3">No Wellness Data Yet</h3>
          <p className="text-slate-400 mb-6">
            {user.role === 'athlete' 
              ? 'Submit your first wellness check to start tracking your readiness.'
              : 'This athlete hasn\'t submitted any wellness checks yet.'
            }
          </p>
          {user.role === 'athlete' && (
            <button
              onClick={() => window.location.hash = 'wellness-check'}
              className="px-6 py-3 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white rounded-lg hover:from-brand-cyan-dark hover:to-brand-cyan transition-all duration-200"
            >
              Submit First Wellness Check
            </button>
          )}
        </div>
      )}

      {/* Coach Empty State */}
      {user.role === 'coach' && teamOverview.length === 0 && !selectedAthlete && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">👥</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-3">No Team Data Available</h3>
          <p className="text-slate-400 mb-6">
            Your athletes haven't submitted any wellness checks yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default WellnessDashboard;