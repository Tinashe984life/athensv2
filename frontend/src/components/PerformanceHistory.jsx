import React, { useState, useEffect } from 'react';
import { performance } from '../services/performance';
import { athletes } from '../services/athletes';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const PerformanceHistory = ({ user }) => {
  const [performanceTests, setPerformanceTests] = useState([]);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [athleteSummary, setAthleteSummary] = useState(null);
  const [coachAthletes, setCoachAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table', 'charts', 'summary'

  // Available metrics for charting
  const availableMetrics = [
    { id: 'bench_press_1rm', label: 'Bench Press', unit: 'kg', category: 'strength' },
    { id: 'squat_1rm', label: 'Squat', unit: 'kg', category: 'strength' },
    { id: 'deadlift_1rm', label: 'Deadlift', unit: 'kg', category: 'strength' },
    { id: 'vertical_jump', label: 'Vertical Jump', unit: 'cm', category: 'power' },
    { id: 'broad_jump', label: 'Broad Jump', unit: 'cm', category: 'power' },
    { id: 'sprint_40m', label: '40m Sprint', unit: 's', category: 'speed' },
    { id: 'sprint_20m', label: '20m Sprint', unit: 's', category: 'speed' },
    { id: 'agility_t_test', label: 'T-Test', unit: 's', category: 'agility' },
    { id: 'illinois_agility', label: 'Illinois Agility', unit: 's', category: 'agility' },
    { id: 'yo_yo_test', label: 'Yo-Yo Test', unit: 'm', category: 'endurance' },
    { id: 'sit_and_reach', label: 'Sit & Reach', unit: 'cm', category: 'flexibility' }
  ];

  useEffect(() => {
    if (user.role === 'coach') {
      loadCoachAthletes();
    } else {
      loadAthleteData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAthlete || user.role === 'athlete') {
      loadPerformanceData();
    }
  }, [selectedAthlete, timeRange, user]);

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

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      
      const params = { athlete_id: selectedAthlete };
      if (timeRange !== 'all') {
        const days = parseInt(timeRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        params.start_date = startDate.toISOString().split('T')[0];
      }

      const [testsResponse, statsResponse, summaryResponse] = await Promise.all([
        performance.getTests(params),
        performance.getStats(params),
        performance.getAthleteSummary(selectedAthlete)
      ]);

      if (testsResponse.data.success) {
        setPerformanceTests(testsResponse.data.tests);
      }

      if (statsResponse.data.success) {
        setPerformanceStats(statsResponse.data);
      }

      if (summaryResponse.data.success) {
        setAthleteSummary(summaryResponse.data.summary);
      }
    } catch (err) {
      console.error('Error loading performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMetricValue = (test, metric) => {
    return test[metric] !== null && test[metric] !== undefined ? test[metric] : null;
  };

  const getMetricTests = (metric) => {
    return performanceTests
      .filter(test => getMetricValue(test, metric) !== null)
      .map(test => ({
        date: new Date(test.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: getMetricValue(test, metric),
        test_type: test.test_type
      }));
  };

  const getChartData = (metric) => {
    const metricTests = getMetricTests(metric);
    const metricInfo = availableMetrics.find(m => m.id === metric);
    
    return {
      labels: metricTests.map(test => test.date),
      datasets: [
        {
          label: `${metricInfo?.label || metric} (${metricInfo?.unit || ''})`,
          data: metricTests.map(test => test.value),
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34, 211, 238, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  const getCategoryColor = (category) => {
    const colors = {
      strength: '#ef4444',
      speed: '#3b82f6',
      agility: '#8b5cf6',
      power: '#f59e0b',
      endurance: '#10b981',
      flexibility: '#ec4899'
    };
    return colors[category] || '#6b7280';
  };

  const getImprovementIcon = (trend) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
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
          <h2 className="text-2xl font-bold text-white">Performance History</h2>
          <p className="text-slate-400">
            {user.role === 'athlete' 
              ? 'Track your performance metrics over time'
              : 'View and analyze athlete performance data'
            }
          </p>
        </div>
        
        {/* Filters & Controls */}
        <div className="flex flex-wrap items-center gap-3">
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
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
            <option value="all">All time</option>
          </select>
          
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'summary' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('charts')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'charts' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              Charts
            </button>
          </div>
        </div>
      </div>

      {/* Performance Summary View */}
      {viewMode === 'summary' && athleteSummary && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Tests</p>
                  <p className="text-2xl font-bold text-white">{athleteSummary.total_tests}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-lg flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
              </div>
            </div>
            
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Last Test</p>
                  <p className="text-lg font-bold text-white">
                    {athleteSummary.latest_test_date 
                      ? new Date(athleteSummary.latest_test_date).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📅</span>
                </div>
              </div>
            </div>
            
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Test Categories</p>
                  <p className="text-2xl font-bold text-white">
                    {Object.keys(athleteSummary.performance_by_category || {}).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🏷️</span>
                </div>
              </div>
            </div>
            
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Overall Trend</p>
                  <p className="text-lg font-bold text-white">
                    {(() => {
                      const trends = Object.values(athleteSummary.performance_by_category || {})
                        .map(cat => cat.overall_trend);
                      if (trends.includes('improving')) return 'Improving 📈';
                      if (trends.includes('declining')) return 'Needs Work 📉';
                      return 'Stable ➡️';
                    })()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📈</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(athleteSummary.performance_by_category || {}).map(([category, data]) => (
              <div key={category} className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white capitalize">{category}</h3>
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      data.overall_trend === 'improving' ? 'bg-green-500/20 text-green-400' :
                      data.overall_trend === 'declining' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {data.overall_trend.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {data.metrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-white capitalize">
                          {metric.metric.replace(/_/g, ' ')}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-slate-400">
                            Best: <span className="text-white font-semibold">{metric.best_value} {metric.unit}</span>
                          </span>
                          {metric.latest_value && (
                            <span className="text-sm text-slate-400">
                              Latest: <span className="text-white font-semibold">{metric.latest_value} {metric.unit}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getImprovementIcon(metric.trend)}</span>
                        <span className={`text-sm font-medium ${
                          metric.trend === 'improving' ? 'text-green-400' :
                          metric.trend === 'declining' ? 'text-red-400' :
                          'text-slate-400'
                        }`}>
                          {metric.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Personal Bests */}
          {athleteSummary.personal_bests && Object.keys(athleteSummary.personal_bests).length > 0 && (
            <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-6">Personal Bests</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(athleteSummary.personal_bests).map(([metric, data]) => (
                  <div key={metric} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-white capitalize">
                        {metric.replace(/_/g, ' ')}
                      </p>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        data.higher_is_better ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {data.higher_is_better ? 'Higher is better' : 'Lower is better'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">
                      {data.value} {data.unit}
                    </p>
                    <p className="text-sm text-slate-400">
                      Achieved on {new Date(data.date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Charts View */}
      {viewMode === 'charts' && (
        <div className="space-y-6">
          {/* Metric Selection */}
          <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Select Metric to Chart</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {availableMetrics.map((metric) => (
                <button
                  key={metric.id}
                  onClick={() => setSelectedMetric(metric.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                    selectedMetric === metric.id
                      ? 'bg-gradient-to-br from-brand-cyan to-brand-cyan-dark text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  style={{ borderLeft: `4px solid ${getCategoryColor(metric.category)}` }}
                >
                  <span className="text-lg mb-1">{metric.label}</span>
                  <span className="text-xs text-slate-300">{metric.unit}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chart Display */}
          {selectedMetric && getMetricTests(selectedMetric).length > 0 ? (
            <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {availableMetrics.find(m => m.id === selectedMetric)?.label} Trend
                </h3>
                <span className="text-slate-400">
                  {getMetricTests(selectedMetric).length} data points
                </span>
              </div>
              <div className="h-96">
                <Line 
                  data={getChartData(selectedMetric)} 
                  options={chartOptions} 
                />
              </div>
            </div>
          ) : selectedMetric ? (
            <div className="text-center py-12 bg-brand-bg-light border border-brand-border rounded-2xl">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">No Data Available</h3>
              <p className="text-slate-400">
                No {availableMetrics.find(m => m.id === selectedMetric)?.label} tests recorded for this period.
              </p>
            </div>
          ) : (
            <div className="text-center py-12 bg-brand-bg-light border border-brand-border rounded-2xl">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Select a Metric</h3>
              <p className="text-slate-400">
                Choose a metric from above to view performance trends over time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Performance Table View */}
      {viewMode === 'table' && (
        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Performance Tests</h3>
            <span className="text-slate-400">{performanceTests.length} tests</span>
          </div>
          
          {performanceTests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Type</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Strength</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Speed</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Power</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Notes</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceTests.map((test) => (
                    <tr key={test.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <p className="font-medium text-white">
                          {new Date(test.test_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-slate-800 rounded text-sm text-slate-300 capitalize">
                          {test.test_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {test.bench_press_1rm && (
                            <p className="text-sm text-white">
                              BP: <span className="font-semibold">{test.bench_press_1rm}kg</span>
                            </p>
                          )}
                          {test.squat_1rm && (
                            <p className="text-sm text-white">
                              Squat: <span className="font-semibold">{test.squat_1rm}kg</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {test.sprint_40m && (
                            <p className="text-sm text-white">
                              40m: <span className="font-semibold">{test.sprint_40m}s</span>
                            </p>
                          )}
                          {test.agility_t_test && (
                            <p className="text-sm text-white">
                              T-test: <span className="font-semibold">{test.agility_t_test}s</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {test.vertical_jump && (
                            <p className="text-sm text-white">
                              VJ: <span className="font-semibold">{test.vertical_jump}cm</span>
                            </p>
                          )}
                          {test.broad_jump && (
                            <p className="text-sm text-white">
                              BJ: <span className="font-semibold">{test.broad_jump}cm</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-slate-300 truncate max-w-xs">
                          {test.notes || 'No notes'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => alert('Edit functionality coming soon')}
                            className="text-sm px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                          >
                            View
                          </button>
                          {user.role !== 'athlete' && (
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this test?')) {
                                  // Handle delete
                                  alert('Delete functionality coming in Phase 5');
                                }
                              }}
                              className="text-sm px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">No Performance Tests</h3>
              <p className="text-slate-400 mb-6">
                No performance tests have been recorded for this athlete yet.
              </p>
              {user.role !== 'athlete' && (
                <button
                  onClick={() => alert('Use the "Record Test" button above')}
                  className="px-6 py-3 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white rounded-lg hover:from-brand-cyan-dark hover:to-brand-cyan transition-all duration-200"
                >
                  Record First Test
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Performance Stats */}
      {performanceStats && viewMode !== 'summary' && (
        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Performance Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(performanceStats.stats.latest_values || {}).map(([metric, data]) => (
              <div key={metric} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-2 capitalize">
                  {metric.replace(/_/g, ' ')}
                </p>
                <p className="text-2xl font-bold text-white">
                  {data.value} {data.unit}
                </p>
                <p className="text-xs text-slate-400 mt-1">Latest measurement</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceHistory;