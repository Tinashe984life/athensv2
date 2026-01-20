import React, { useState, useEffect } from 'react';
import { workload } from '../services/workload';
import { recovery } from '../services/recovery';
import { athletes } from '../services/athletes';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const WorkloadDashboard = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [athletesList, setAthletesList] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [workloadData, setWorkloadData] = useState({});
  const [recoveryBalance, setRecoveryBalance] = useState({});
  const [dateRange, setDateRange] = useState('30');
  const [acwrData, setAcwrData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAthletes();
  }, []);

  useEffect(() => {
    if (selectedAthlete || user.role === 'athlete') {
      loadWorkloadData();
      loadRecoveryBalance();
      loadACWRData();
    }
  }, [selectedAthlete, dateRange]);

  const loadAthletes = async () => {
    try {
      const response = await athletes.getAll();
      if (response.data && response.data.success) {
        setAthletesList(response.data.athletes);
        
        // If user is athlete, auto-select their profile
        if (user.role === 'athlete') {
          const athlete = response.data.athletes.find(a => a.user_id === user.id);
          if (athlete) {
            setSelectedAthlete(athlete.id);
          }
        } else if (response.data.athletes.length > 0) {
          setSelectedAthlete(response.data.athletes[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading athletes:', err);
      setError('Failed to load athletes. Please try again.');
    }
  };

  const loadWorkloadData = async () => {
    try {
      const athleteId = selectedAthlete || (user.role === 'athlete' ? athletesList.find(a => a.user_id === user.id)?.id : null);
      if (!athleteId) return;

      const response = await workload.getWorkloadTrends(athleteId, {
        days: dateRange
      });

      if (response && response.success) {
        setWorkloadData(response);
        setError(null);
      } else {
        console.error('Failed to load workload data:', response?.message);
        setWorkloadData({});
        setError(response?.message || 'Failed to load workload data');
      }
    } catch (err) {
      console.error('Error loading workload data:', err);
      setWorkloadData({});
      setError('Error loading workload data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadRecoveryBalance = async () => {
    try {
      const athleteId = selectedAthlete || (user.role === 'athlete' ? athletesList.find(a => a.user_id === user.id)?.id : null);
      if (!athleteId) return;

      const response = await recovery.getWorkloadRecoveryBalance(athleteId, {
        days: dateRange
      });

      if (response && response.success) {
        setRecoveryBalance(response);
      } else {
        console.error('Failed to load recovery balance:', response?.message);
        setRecoveryBalance({});
      }
    } catch (err) {
      console.error('Error loading recovery balance:', err);
      setRecoveryBalance({});
    }
  };

  const loadACWRData = async () => {
    try {
      const athleteId = selectedAthlete || (user.role === 'athlete' ? athletesList.find(a => a.user_id === user.id)?.id : null);
      if (!athleteId) return;

      const response = await workload.calculateACWR(athleteId);
      if (response && response.success) {
        setAcwrData(response);
      } else {
        console.error('Failed to load ACWR data:', response?.message);
        setAcwrData(null);
      }
    } catch (err) {
      console.error('Error loading ACWR data:', err);
      setAcwrData(null);
    }
  };

  const handleAthleteSelect = (e) => {
    setSelectedAthlete(e.target.value);
    setError(null);
  };

  const renderAthleteSelector = () => {
    if (user.role === 'athlete') {
      const athlete = athletesList.find(a => a.user_id === user.id);
      if (athlete) {
        return (
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-full flex items-center justify-center text-white font-bold">
                {athlete.user.name.charAt(0)}{athlete.user.surname.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{athlete.user.name} {athlete.user.surname}</h3>
                <p className="text-slate-400">{athlete.position} • Team: {athlete.team?.name || 'No Team'}</p>
              </div>
            </div>
          </div>
        );
      }
    }

    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Select Athlete
        </label>
        <select
          value={selectedAthlete || ''}
          onChange={handleAthleteSelect}
          className="w-full max-w-md bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
        >
          <option value="">Select an athlete</option>
          {athletesList.map(athlete => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.user.name} {athlete.user.surname} - {athlete.team?.name || 'No Team'}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderDateRangeSelector = () => (
    <div className="flex items-center space-x-4 mb-6">
      <label className="text-sm font-medium text-slate-300">Date Range:</label>
      <div className="flex space-x-2">
        {['7', '14', '30', '90'].map(days => (
          <button
            key={days}
            onClick={() => setDateRange(days)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              dateRange === days
                ? 'bg-brand-cyan text-white'
                : 'bg-brand-bg-light text-slate-300 hover:bg-slate-800'
            }`}
          >
            {days} days
          </button>
        ))}
      </div>
    </div>
  );

  const renderACWRRiskIndicator = (acwr) => {
    if (!acwr) return null;
    
    if (acwr > 1.5) {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
          ⚠️ High Risk (Injury)
        </div>
      );
    } else if (acwr > 1.2) {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium">
          ⚠️ Moderate Risk
        </div>
      );
    } else if (acwr < 0.8) {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
          ⬇️ Detraining Risk
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
          ✅ Optimal Range
        </div>
      );
    }
  };

  const renderWorkloadChart = () => {
    if (!workloadData.trends || !workloadData.trends.dates || workloadData.trends.dates.length === 0) {
      return (
        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-white mb-2">No Workload Data</h3>
          <p className="text-slate-400 mb-6">
            No training sessions recorded for the selected period.
          </p>
        </div>
      );
    }

    const chartData = workloadData.trends.dates.map((date, index) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      acute: workloadData.trends.acute_workload[index] || 0,
      chronic: workloadData.trends.chronic_workload[index] || 0,
      acwr: workloadData.trends.acwr_values[index] || 0
    }));

    return (
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Workload Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F9FAFB' }}
              />
              <Legend />
              <Area type="monotone" dataKey="acute" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Acute (7-day)" />
              <Area type="monotone" dataKey="chronic" stroke="#10B981" fill="#10B981" fillOpacity={0.3} name="Chronic (28-day)" />
              <Line type="monotone" dataKey="acwr" stroke="#F59E0B" strokeWidth={2} dot={false} name="ACWR" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderRecoveryBalanceChart = () => {
    if (!recoveryBalance.daily_data || recoveryBalance.daily_data.length === 0) {
      return null;
    }

    const last14Days = recoveryBalance.daily_data.slice(-14);
    const chartData = last14Days.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      workload: day.workload_score || 0,
      recovery: day.recovery_score || 0,
    }));

    return (
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Workload vs Recovery Balance</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F9FAFB' }}
              />
              <Legend />
              <Bar dataKey="workload" fill="#3B82F6" name="Workload" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recovery" fill="#10B981" name="Recovery" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {recoveryBalance.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Balance Status</p>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                recoveryBalance.summary.balance_color === 'green' ? 'bg-green-500/20 text-green-400' :
                recoveryBalance.summary.balance_color === 'yellow' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {recoveryBalance.summary.balance_status || 'N/A'}
              </div>
              <p className="text-xs text-slate-500">Avg Ratio: {recoveryBalance.summary.avg_balance_ratio || '0.00'}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Total Workload</p>
              <p className="text-2xl font-bold text-white">{recoveryBalance.summary.total_workload?.toFixed(0) || '0'}</p>
              <p className="text-xs text-slate-500">{recoveryBalance.summary.avg_daily_workload?.toFixed(1) || '0'} avg/day</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Total Recovery</p>
              <p className="text-2xl font-bold text-white">{recoveryBalance.summary.total_recovery?.toFixed(0) || '0'}</p>
              <p className="text-xs text-slate-500">{recoveryBalance.summary.avg_daily_recovery?.toFixed(1) || '0'} avg/day</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Training Sessions</p>
              <p className="text-2xl font-bold text-white">{recoveryBalance.summary.workload_sessions_count || '0'}</p>
              <p className="text-xs text-slate-500">{recoveryBalance.summary.recovery_sessions_count || '0'} recovery sessions</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRecentSessions = () => {
    if (!workloadData.daily_workloads || workloadData.daily_workloads.length === 0) {
      return null;
    }

    const recentSessions = workloadData.daily_workloads
      .slice(0, 7)
      .flatMap(day => 
        day.sessions?.map(session => ({
          ...session,
          date: day.date,
          readiness_score: day.readiness_score
        })) || []
      )
      .slice(0, 10); // Limit to 10 most recent sessions

    if (recentSessions.length === 0) {
      return null;
    }

    return (
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Recent Training Sessions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Date</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Session</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Duration</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">RPE</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Workload</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Readiness</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((session, index) => (
                <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-sm text-slate-300">
                    {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-white">{session.session_name || 'Training Session'}</p>
                      <p className="text-xs text-slate-500 capitalize">{session.session_type}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-300">{session.duration_minutes} min</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-white mr-2">{session.perceived_exertion}</span>
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                          style={{ width: `${(session.perceived_exertion || 0) * 10}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-white">{session.workload_score || '0'}</td>
                  <td className="py-3 px-4">
                    {session.readiness_score ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.readiness_score >= 8 ? 'bg-green-500/20 text-green-400' :
                        session.readiness_score >= 6 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {session.readiness_score}/10
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {renderAthleteSelector()}
        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-slate-700 rounded mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {renderAthleteSelector()}
        {renderDateRangeSelector()}
        <div className="bg-red-900/20 border border-red-700 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-white mb-2">Error Loading Data</h3>
          <p className="text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadWorkloadData();
              loadRecoveryBalance();
              loadACWRData();
            }}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Retry Loading Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderAthleteSelector()}
      {renderDateRangeSelector()}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-2xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-red-400">
              ⚠️
            </div>
            <div>
              <p className="font-medium text-white">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  loadWorkloadData();
                  loadRecoveryBalance();
                  loadACWRData();
                }}
                className="text-sm text-red-400 hover:text-red-300 mt-1"
              >
                Click to retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACWR Risk Card */}
      {acwrData && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Acute:Chronic Workload Ratio</h3>
            {renderACWRRiskIndicator(acwrData.acwr)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">ACWR</p>
              <p className={`text-3xl font-bold ${
                acwrData.acwr > 1.5 ? 'text-red-400' :
                acwrData.acwr > 1.2 ? 'text-amber-400' :
                acwrData.acwr < 0.8 ? 'text-blue-400' : 'text-green-400'
              }`}>
                {acwrData.acwr?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Acute (7-day)</p>
              <p className="text-2xl font-bold text-white">{acwrData.acute_average?.toFixed(0) || '0'}</p>
              <p className="text-xs text-slate-500">{acwrData.acute_workload?.toFixed(0) || '0'} total</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Chronic (28-day)</p>
              <p className="text-2xl font-bold text-white">{acwrData.chronic_average?.toFixed(0) || '0'}</p>
              <p className="text-xs text-slate-500">{acwrData.chronic_workload?.toFixed(0) || '0'} total</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">Monotony</p>
              <p className={`text-2xl font-bold ${
                acwrData.monotony > 2 ? 'text-red-400' :
                acwrData.monotony > 1.5 ? 'text-amber-400' : 'text-green-400'
              }`}>
                {acwrData.monotony?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-slate-500">Lower = More Varied</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-400">
            <p>Last updated: {acwrData.date || 'N/A'}</p>
            <p className="mt-2">
              {acwrData.acwr > 1.5 ? 'High injury risk - consider reducing training load' :
               acwrData.acwr > 1.2 ? 'Moderate risk - monitor closely' :
               acwrData.acwr < 0.8 ? 'Detraining risk - consider increasing load' :
               'Optimal training zone - maintain current progression'}
            </p>
          </div>
        </div>
      )}

      {/* Workload Trends Chart */}
      {renderWorkloadChart()}

      {/* Daily Workload vs Recovery */}
      {renderRecoveryBalanceChart()}

      {/* Recent Sessions */}
      {renderRecentSessions()}

      {/* No Data State */}
      {(!workloadData.daily_workloads || workloadData.daily_workloads.length === 0) && !error && (
        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🏋️</div>
          <h3 className="text-xl font-bold text-white mb-2">No Workload Data Yet</h3>
          <p className="text-slate-400 mb-6">
            Start logging training sessions to see workload analytics and ACWR calculations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.hash = '#acwr-calculator'}
              className="px-6 py-3 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Calculate ACWR
            </button>
            <button
              onClick={() => {
                // This would open the workload form
                // In a real app, you might use a modal or navigate
                alert('Open the "Log Training" quick action button to add training sessions.');
              }}
              className="px-6 py-3 border border-brand-cyan text-brand-cyan hover:bg-brand-cyan/10 font-semibold rounded-lg transition-colors"
            >
              Log First Training Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkloadDashboard;