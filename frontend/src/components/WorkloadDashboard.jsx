import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { workload } from '../services/workload';
import { recovery } from '../services/recovery';
import { athletes } from '../services/athletes';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

const WorkloadDashboard = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [athletesList, setAthletesList] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [workloadData, setWorkloadData] = useState({});
  const [recoveryBalance, setRecoveryBalance] = useState({});
  const [dateRange, setDateRange] = useState('30');
  const [acwrData, setAcwrData] = useState(null);
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [error, setError] = useState(null);
  const [sportBreakdown, setSportBreakdown] = useState([]);

  // Memoized athlete ID getter
  const getAthleteId = useCallback(() => {
    if (selectedAthlete) return selectedAthlete;
    if (user.role === 'athlete') {
      return athletesList.find(a => a.user_id === user.id)?.id;
    }
    return null;
  }, [selectedAthlete, user, athletesList]);

  useEffect(() => {
    loadAthletes();
  }, []);

  useEffect(() => {
    const athleteId = getAthleteId();
    if (athleteId) {
      loadWorkloadData();
      loadRecoveryBalance();
      loadACWRData();
    }
  }, [getAthleteId, dateRange]);

  const loadAthletes = async () => {
    try {
      const response = await athletes.getAll();
      if (response.data?.success) {
        const athletesData = response.data.athletes;
        setAthletesList(athletesData);
        
        if (user.role === 'athlete') {
          const athlete = athletesData.find(a => a.user_id === user.id);
          if (athlete) {
            setSelectedAthlete(athlete.id);
          }
        } else if (athletesData.length > 0) {
          setSelectedAthlete(athletesData[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading athletes:', err);
      setError('Failed to load athletes. Please try again.');
    }
  };

  const loadWorkloadData = async () => {
    try {
      const athleteId = getAthleteId();
      if (!athleteId) return;

      const response = await workload.getWorkloadTrends(athleteId, {
        days: dateRange
      });

      if (response?.success) {
        setWorkloadData(response);
        calculateSportBreakdown(response.daily_workloads || []);
        setError(null);
      } else {
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
      const athleteId = getAthleteId();
      if (!athleteId) return;

      const response = await recovery.getWorkloadRecoveryBalance(athleteId, {
        days: dateRange
      });

      if (response?.success) {
        setRecoveryBalance(response);
      } else {
        setRecoveryBalance({});
      }
    } catch (err) {
      console.error('Error loading recovery balance:', err);
      setRecoveryBalance({});
    }
  };

  const loadACWRData = async () => {
    try {
      const athleteId = getAthleteId();
      if (!athleteId) return;

      const response = await workload.calculateACWR(athleteId);
      if (response?.success) {
        setAcwrData(response);
      } else {
        setAcwrData(null);
      }
    } catch (err) {
      console.error('Error loading ACWR data:', err);
      setAcwrData(null);
    }
  };

  const calculateSportBreakdown = (dailyWorkloads) => {
    const sportMap = new Map();
    
    dailyWorkloads.forEach(day => {
      day.sessions?.forEach(session => {
        const sport = session.sport_type || 'General';
        const current = sportMap.get(sport) || { count: 0, totalWorkload: 0 };
        sportMap.set(sport, {
          count: current.count + 1,
          totalWorkload: current.totalWorkload + (session.workload_score || 0)
        });
      });
    });

    const breakdown = Array.from(sportMap.entries()).map(([name, data]) => ({
      name,
      sessions: data.count,
      workload: data.totalWorkload,
      percentage: data.totalWorkload > 0 ? (data.totalWorkload / Array.from(sportMap.values()).reduce((sum, d) => sum + d.totalWorkload, 0)) * 100 : 0
    }));

    setSportBreakdown(breakdown);
  };

  const handleAthleteSelect = (e) => {
    setSelectedAthlete(e.target.value);
    setError(null);
    setSelectedSport('');
  };

  const handleSportFilter = (e) => {
    setSelectedSport(e.target.value);
  };

  const renderAthleteSelector = () => {
    if (user.role === 'athlete') {
      const athlete = athletesList.find(a => a.user_id === user.id);
      if (!athlete) return null;
      
      return (
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-full flex items-center justify-center text-white font-bold">
              {athlete.user?.name?.charAt(0)}{athlete.user?.surname?.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{athlete.user?.name} {athlete.user?.surname}</h3>
              <p className="text-slate-400">{athlete.position} • Team: {athlete.team?.name || 'No Team'}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Select Athlete
        </label>
        <select
          value={selectedAthlete || ''}
          onChange={handleAthleteSelect}
          className="w-full max-w-md bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-all duration-200 hover:border-slate-600"
        >
          <option value="">Select an athlete</option>
          {athletesList.map(athlete => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.user?.name} {athlete.user?.surname} - {athlete.team?.name || 'No Team'}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderSportFilter = () => {
    if (sportBreakdown.length === 0) return null;

    return (
      <div className="flex items-center space-x-4 mb-4">
        <label className="text-sm font-medium text-slate-300">Filter by Sport:</label>
        <select
          value={selectedSport}
          onChange={handleSportFilter}
          className="bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent transition-all duration-200 hover:border-slate-600"
        >
          <option value="">All Sports</option>
          {sportBreakdown.map(sport => (
            <option key={sport.name} value={sport.name}>
              {sport.name} ({sport.sessions} sessions)
            </option>
          ))}
        </select>
        {selectedSport && (
          <button
            onClick={() => setSelectedSport('')}
            className="px-3 py-1 text-sm text-slate-400 hover:text-white bg-slate-800/50 rounded-lg transition-colors"
          >
            Clear Filter
          </button>
        )}
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
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              dateRange === days
                ? 'bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white shadow-lg shadow-brand-cyan/20'
                : 'bg-brand-bg-light text-slate-300 hover:bg-slate-800 hover:text-white'
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
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-medium animate-pulse">
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

  const renderWorkloadChart = useMemo(() => {
    if (!workloadData.trends?.dates || workloadData.trends.dates.length === 0) {
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
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Workload Trends</h3>
          <div className="text-sm text-slate-400">
            Showing {workloadData.trends.dates.length} days
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  borderColor: '#374151', 
                  color: '#F9FAFB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value, name) => [value.toFixed(1), name]}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="acute" 
                stroke="#3B82F6" 
                fill="url(#colorAcute)" 
                name="Acute (7-day)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="chronic" 
                stroke="#10B981" 
                fill="url(#colorChronic)" 
                name="Chronic (28-day)" 
                strokeWidth={2}
              />
              <defs>
                <linearGradient id="colorAcute" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorChronic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <Line 
                type="monotone" 
                dataKey="acwr" 
                stroke="#F59E0B" 
                strokeWidth={3} 
                dot={{ r: 4 }} 
                activeDot={{ r: 6 }}
                name="ACWR Ratio"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }, [workloadData]);

  const renderRecoveryBalanceChart = () => {
    if (!recoveryBalance.daily_data || recoveryBalance.daily_data.length === 0) {
      return null;
    }

    const last14Days = recoveryBalance.daily_data.slice(-14);
    const chartData = last14Days.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      workload: day.workload_score || 0,
      recovery: day.recovery_score || 0,
      balance: day.balance_ratio || 0
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
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  borderColor: '#374151', 
                  color: '#F9FAFB',
                  borderRadius: '8px'
                }}
                formatter={(value, name) => [value.toFixed(1), name]}
              />
              <Legend />
              <Bar 
                dataKey="workload" 
                fill="url(#colorWorkload)" 
                name="Workload" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="recovery" 
                fill="url(#colorRecovery)" 
                name="Recovery" 
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="colorWorkload" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="colorRecovery" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {recoveryBalance.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-slate-400 mb-1">Balance Status</p>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                recoveryBalance.summary.balance_color === 'green' ? 'bg-green-500/20 text-green-400' :
                recoveryBalance.summary.balance_color === 'yellow' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {recoveryBalance.summary.balance_status || 'N/A'}
              </div>
              <p className="text-xs text-slate-500">Avg Ratio: {recoveryBalance.summary.avg_balance_ratio?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-slate-400 mb-1">Total Workload</p>
              <p className="text-2xl font-bold text-white">{recoveryBalance.summary.total_workload?.toFixed(0) || '0'}</p>
              <p className="text-xs text-slate-500">{recoveryBalance.summary.avg_daily_workload?.toFixed(1) || '0'} avg/day</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-slate-400 mb-1">Total Recovery</p>
              <p className="text-2xl font-bold text-white">{recoveryBalance.summary.total_recovery?.toFixed(0) || '0'}</p>
              <p className="text-xs text-slate-500">{recoveryBalance.summary.avg_daily_recovery?.toFixed(1) || '0'} avg/day</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-slate-400 mb-1">Training Sessions</p>
              <p className="text-2xl font-bold text-white">{recoveryBalance.summary.workload_sessions_count || '0'}</p>
              <p className="text-xs text-slate-500">{recoveryBalance.summary.recovery_sessions_count || '0'} recovery sessions</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSportBreakdown = () => {
    if (sportBreakdown.length === 0) return null;

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    return (
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Sport Breakdown</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sportBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="workload"
                >
                  {sportBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    `${value.toFixed(1)} (${props.payload.percentage.toFixed(1)}%)`,
                    props.payload.name
                  ]}
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    borderColor: '#374151', 
                    color: '#F9FAFB',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="space-y-4">
              {sportBreakdown.map((sport, index) => (
                <div key={sport.name} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-white font-medium capitalize">{sport.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{sport.sessions} sessions</p>
                    <p className="text-xs text-slate-400">{sport.workload.toFixed(1)} total workload</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRecentSessions = () => {
    if (!workloadData.daily_workloads || workloadData.daily_workloads.length === 0) {
      return null;
    }

    let recentSessions = workloadData.daily_workloads
      .slice()
      .reverse()
      .flatMap(day => 
        day.sessions?.map(session => ({
          ...session,
          date: day.date,
          readiness_score: day.readiness_score
        })) || []
      );

    // Apply sport filter
    if (selectedSport) {
      recentSessions = recentSessions.filter(session => 
        session.sport_type === selectedSport
      );
    }

    // Limit to 10 most recent sessions
    recentSessions = recentSessions.slice(0, 10);

    if (recentSessions.length === 0) {
      return (
        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">🏃‍♂️</div>
          <h3 className="text-lg font-bold text-white mb-2">No Sessions Found</h3>
          <p className="text-slate-400">
            {selectedSport 
              ? `No ${selectedSport} sessions in the selected period.`
              : 'No training sessions recorded.'}
          </p>
        </div>
      );
    }

    return (
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Recent Training Sessions</h3>
          <span className="text-sm text-slate-400">
            Showing {recentSessions.length} sessions
            {selectedSport && ` • Filtered: ${selectedSport}`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Date</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Session</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Sport</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Duration</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">RPE</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Workload</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-slate-400">Readiness</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((session, index) => (
                <tr 
                  key={index} 
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">
                        {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[200px]">{session.session_name || 'Training Session'}</p>
                      <p className="text-xs text-slate-500 capitalize">{session.session_type}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      session.sport_type ? 'bg-slate-800 text-slate-300' : 'bg-slate-900/50 text-slate-500'
                    }`}>
                      {session.sport_type || 'General'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-white">{session.duration_minutes}</span>
                      <span className="text-xs text-slate-500 ml-1">min</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-white mr-2">{session.perceived_exertion}</span>
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-red-500"
                          style={{ width: `${(session.perceived_exertion || 0) * 10}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-bold text-white">
                      {session.workload_score?.toFixed(1) || '0'}
                    </span>
                  </td>
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
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              // Navigate to all sessions view or log new session
              alert('View all sessions or log new session functionality would go here.');
            }}
            className="text-sm text-brand-cyan hover:text-brand-cyan-light transition-colors"
          >
            View All Sessions →
          </button>
        </div>
      </div>
    );
  };

  const renderSessionDetailsModal = () => {
    if (!selectedSession) return null;

    const getSportMetrics = () => {
      if (!selectedSession.sport_type) return null;

      const metrics = {
        soccer: [
          { label: 'Distance', value: selectedSession.distance_km, unit: 'km' },
          { label: 'Sprints', value: selectedSession.sprints_count },
          { label: 'Max Speed', value: selectedSession.max_speed_kmh, unit: 'km/h' },
          { label: 'High-Intensity Runs', value: selectedSession.high_intensity_runs },
          { label: 'Accelerations', value: selectedSession.accelerations_count },
          { label: 'Decelerations', value: selectedSession.decelerations_count }
        ],
        basketball: [
          { label: 'Game Minutes', value: selectedSession.game_minutes, unit: 'min' },
          { label: 'Jumps', value: selectedSession.jumps_count },
          { label: 'Shots Made', value: selectedSession.shots_made },
          { label: 'Assists', value: selectedSession.assists },
          { label: 'Sprints', value: selectedSession.sprints_count },
          { label: 'Distance', value: selectedSession.distance_km, unit: 'km' }
        ],
        running: [
          { label: 'Distance', value: selectedSession.distance_km, unit: 'km' },
          { label: 'Avg Pace', value: selectedSession.avg_pace_min_km, unit: 'min/km' },
          { label: 'Elevation Gain', value: selectedSession.elevation_gain, unit: 'm' },
          { label: 'Avg Heart Rate', value: selectedSession.avg_heart_rate, unit: 'bpm' },
          { label: 'Max Heart Rate', value: selectedSession.max_heart_rate, unit: 'bpm' }
        ],
        swimming: [
          { label: 'Distance', value: selectedSession.distance_m, unit: 'm' },
          { label: 'Lap Count', value: selectedSession.lap_count },
          { label: 'Avg Pace', value: selectedSession.avg_pace_min_100m, unit: 'min/100m' },
          { label: 'Stroke Rate', value: selectedSession.stroke_rate, unit: 'strokes/min' },
          { label: 'Rest Time', value: selectedSession.rest_time_seconds, unit: 's' }
        ],
        cycling: [
          { label: 'Distance', value: selectedSession.distance_km, unit: 'km' },
          { label: 'Avg Speed', value: selectedSession.avg_speed_kmh, unit: 'km/h' },
          { label: 'Elevation Gain', value: selectedSession.elevation_gain, unit: 'm' },
          { label: 'Avg Power', value: selectedSession.avg_power_watts, unit: 'W' },
          { label: 'Max Power', value: selectedSession.max_power_watts, unit: 'W' }
        ],
        strength: [
          { label: 'Total Volume', value: selectedSession.total_volume_kg, unit: 'kg' },
          { label: 'Max Load', value: selectedSession.max_load_kg, unit: 'kg' },
          { label: 'Sets Completed', value: selectedSession.sets_completed },
          { label: 'Reps Completed', value: selectedSession.reps_completed },
          { label: 'Training Density', value: selectedSession.training_density, unit: 'kg/min' }
        ]
      };

      return metrics[selectedSession.sport_type]?.filter(metric => metric.value != null) || [];
    };

    const sportMetrics = getSportMetrics();

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <div 
          className="bg-brand-bg-dark border border-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Session Details</h3>
            <button 
              onClick={() => setSelectedSession(null)}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Session Header */}
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-bold text-white">{selectedSession.session_name || 'Training Session'}</h4>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm text-slate-400">
                      {new Date(selectedSession.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                    <span className="capitalize px-2 py-1 bg-slate-700 rounded text-sm text-slate-300">
                      {selectedSession.session_type}
                    </span>
                    {selectedSession.sport_type && (
                      <span className="capitalize px-2 py-1 bg-brand-cyan/20 text-brand-cyan rounded text-sm">
                        {selectedSession.sport_type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{selectedSession.workload_score?.toFixed(1) || '0'}</div>
                  <div className="text-sm text-slate-400">Workload Score</div>
                </div>
              </div>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/30 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Duration</p>
                <p className="text-lg font-bold text-white">{selectedSession.duration_minutes} min</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">RPE</p>
                <p className="text-lg font-bold text-white">{selectedSession.perceived_exertion}/10</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Fatigue Level</p>
                <p className="text-lg font-bold text-white">{selectedSession.fatigue_level || '--'}/10</p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Readiness</p>
                <p className={`text-lg font-bold ${
                  selectedSession.readiness_score >= 8 ? 'text-green-400' :
                  selectedSession.readiness_score >= 6 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {selectedSession.readiness_score || '--'}/10
                </p>
              </div>
            </div>

            {/* Sport-Specific Metrics */}
            {sportMetrics.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Sport-Specific Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {sportMetrics.map((metric, index) => (
                    <div key={index} className="bg-slate-800/30 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-1">{metric.label}</p>
                      <p className="text-lg font-bold text-white">
                        {metric.value} {metric.unit ? <span className="text-sm text-slate-400">{metric.unit}</span> : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedSession.notes && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Notes</h4>
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <p className="text-slate-300 whitespace-pre-wrap">{selectedSession.notes}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={() => setSelectedSession(null)}
              className="px-4 py-2 text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                // Edit session functionality
                alert('Edit session functionality would go here.');
              }}
              className="px-4 py-2 bg-brand-cyan text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Edit Session
            </button>
          </div>
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
            <div className="grid grid-cols-4 gap-4">
              <div className="h-24 bg-slate-700 rounded"></div>
              <div className="h-24 bg-slate-700 rounded"></div>
              <div className="h-24 bg-slate-700 rounded"></div>
              <div className="h-24 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderAthleteSelector()}
      {renderDateRangeSelector()}
      {renderSportFilter()}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-2xl p-4 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-red-400">
              ⚠️
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  loadWorkloadData();
                  loadRecoveryBalance();
                  loadACWRData();
                }}
                className="text-sm text-red-400 hover:text-red-300 mt-1 transition-colors"
              >
                Click to retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACWR Risk Card */}
      {acwrData && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <h3 className="text-xl font-bold text-white">Acute:Chronic Workload Ratio</h3>
            {renderACWRRiskIndicator(acwrData.acwr)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-slate-400 mb-1">ACWR</p>
              <p className={`text-3xl font-bold ${
                acwrData.acwr > 1.5 ? 'text-red-400' :
                acwrData.acwr > 1.2 ? 'text-amber-400' :
                acwrData.acwr < 0.8 ? 'text-blue-400' : 'text-green-400'
              }`}>
                {acwrData.acwr?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-slate-400 mb-1">Acute (7-day)</p>
              <p className="text-2xl font-bold text-white">{acwrData.acute_average?.toFixed(0) || '0'}</p>
              <p className="text-xs text-slate-500">{acwrData.acute_workload?.toFixed(0) || '0'} total</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-slate-400 mb-1">Chronic (28-day)</p>
              <p className="text-2xl font-bold text-white">{acwrData.chronic_average?.toFixed(0) || '0'}</p>
              <p className="text-xs text-slate-500">{acwrData.chronic_workload?.toFixed(0) || '0'} total</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
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
            <p>Last updated: {acwrData.date ? new Date(acwrData.date).toLocaleDateString() : 'N/A'}</p>
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
      {renderWorkloadChart}

      {/* Sport Breakdown */}
      {renderSportBreakdown()}

      {/* Daily Workload vs Recovery */}
      {renderRecoveryBalanceChart()}

      {/* Recent Sessions */}
      {renderRecentSessions()}

      {/* Session Details Modal */}
      {renderSessionDetailsModal()}

      {/* No Data State */}
      {(!workloadData.daily_workloads || workloadData.daily_workloads.length === 0) && !error && !loading && (
        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-12 text-center animate-fadeIn">
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
                // Open log training form
                window.dispatchEvent(new CustomEvent('openQuickAction', { 
                  detail: { action: 'logTraining' } 
                }));
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