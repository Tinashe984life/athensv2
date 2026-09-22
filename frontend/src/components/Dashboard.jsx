import React, { useState, useEffect } from 'react';
import AthleteList from './AthleteList';
import TeamManagement from './TeamManagement';
import AthleteProfile from './AthleteProfile';
import DailyWellnessForm from './DailyWellnessForm';
import WellnessDashboard from './WellnessDashboard';
import PerformanceTestForm from './PerformanceTestForm';
import PerformanceHistory from './PerformanceHistory';
import CoachDashboard from './CoachDashboard';
import InjuryHistory from './InjuryHistory';
import ConcussionDashboard from './ConcussionDashboard';
import InjuryForm from './InjuryForm';
import WorkloadForm from './WorkloadForm';
import RecoveryForm from './RecoveryForm';
import WorkloadDashboard from './WorkloadDashboard'; // We'll create this
import ACWRCalculator from './ACWRCalculator'; // We'll create this
import AdminPanel from './AdminPanel';
import { dashboard } from '../services/dashboard';
import { athletes } from '../services/athletes';

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showInjuryForm, setShowInjuryForm] = useState(false);
  const [showWorkloadForm, setShowWorkloadForm] = useState(false);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [overviewStats, setOverviewStats] = useState({
    totalAthletes: 0,
    totalTeams: 0,
    pendingWellness: 0,
    avgReadiness: '0%',
    totalTests: 0,
    trainingDays: 0,
    goals: 0,
    wellnessScore: '--'
  });
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Navigation tabs based on user role
  const coachTabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'coach-dashboard', label: 'Coach Dashboard', icon: '🎯' },
    { id: 'athletes', label: 'Athletes', icon: '👥' },
    { id: 'teams', label: 'Teams', icon: '🏆' },
    { id: 'wellness', label: 'Wellness', icon: '💪' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'workload', label: 'Workload', icon: '🏋️' }, // New tab
    { id: 'injuries', label: 'Injuries', icon: '🩹' },
    { id: 'concussion', label: 'Concussion', icon: '🧠' },
  ];
  
  const athleteTabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'my-stats', label: 'My Stats', icon: '👤' },
    { id: 'wellness', label: 'Wellness', icon: '💪' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'workload', label: 'Workload', icon: '🏋️' }, // Active if configured
    { id: 'injuries', label: 'Injuries', icon: '🩹' },
  ];
  
  const adminTabs = [
    ...coachTabs,
    { id: 'admin', label: 'Admin', icon: '🛠️' }
  ];

  const tabs = user?.role === 'admin' ? adminTabs : user?.role === 'coach' ? coachTabs : athleteTabs;

  useEffect(() => {
    loadOverviewStats();
  }, [user]);

  const loadOverviewStats = async () => {
    try {
      setLoadingStats(true);
      
      if (user.role === 'coach') {
        // Load coach overview stats
        const [teamsResponse, athletesResponse] = await Promise.all([
          dashboard.getTeamOverview(),
          athletes.getAll()
        ]);

        if (teamsResponse.data.success) {
          const teams = teamsResponse.data.teams || [];
          const totalAthletes = teams.reduce((sum, team) => sum + (team.total_athletes || 0), 0);
          const pendingWellness = teams.reduce((sum, team) => {
            const submittedToday = team.athletes?.filter(a => a.has_submitted_today).length || 0;
            const teamPending = (team.total_athletes || 0) - submittedToday;
            return sum + teamPending;
          }, 0);
          
          const totalReadiness = teams.reduce((sum, team) => sum + (team.avg_readiness || 0), 0);
          const avgReadiness = teams.length > 0 ? Math.round(totalReadiness / teams.length) : 0;

          setOverviewStats({
            totalAthletes,
            totalTeams: teams.length,
            pendingWellness,
            avgReadiness: `${avgReadiness}%`,
            totalTests: 0,
            trainingDays: 0,
            goals: 0,
            wellnessScore: '--'
          });
        }
      } else if (user.role === 'athlete') {
        // Load athlete overview stats
        const athleteResponse = await athletes.getAll();
        if (athleteResponse.data.success) {
          const athleteData = athleteResponse.data.athletes.find(a => a.user_id === user.id);
          if (athleteData) {
            setOverviewStats({
              totalAthletes: 0,
              totalTeams: 0,
              pendingWellness: 0,
              avgReadiness: '--',
              totalTests: 0,
              trainingDays: 0,
              goals: 0,
              wellnessScore: '--'
            });
          }
        }
      }
    } catch (err) {
      console.error('Error loading overview stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'coach-dashboard':
        return <CoachDashboard user={user} />;
      case 'athletes':
        return <AthleteList user={user} />;
      case 'teams':
        return <TeamManagement user={user} />;
      case 'my-stats':
        return <AthleteProfile user={user} />;
      case 'injuries':
        return <InjuryHistory user={user} />;
      case 'concussion':
        return <ConcussionDashboard user={user} />;
      case 'workload':
        // Check if we're on ACWR calculator or workload dashboard
        if (window.location.hash === '#acwr-calculator') {
          return <ACWRCalculator user={user} />;
        }
        return <WorkloadDashboard user={user} />;
      case 'admin':
        return <AdminPanel user={user} />;
      case 'wellness':
        if (window.location.hash === '#wellness-check' && user.role === 'athlete') {
          return <DailyWellnessForm user={user} />;
        }
        return <WellnessDashboard user={user} />;
      case 'performance':
        if (window.location.hash === '#record-test' && user.role !== 'athlete') {
          return <PerformanceTestForm user={user} />;
        }
        return <PerformanceHistory user={user} />;
      case 'overview':
      default:
        return (
          <>
            {/* Welcome Banner */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-brand-bg-light to-brand-bg-light/80 border border-brand-border rounded-2xl p-8">
                <h2 className="text-3xl font-bold text-white mb-3">
                  Welcome back, {user?.role === 'coach' ? 'Coach' : 'Athlete'} {user?.name}! 👋
                </h2>
                <p className="text-slate-300 text-lg">
                  {user?.role === 'coach' 
                    ? 'Monitor your team\'s performance, wellness, and injury tracking. Basic MVP is live and currently in testing.'
                    : 'Track your training load, recovery, and daily wellness. Core athlete workflows are live and being tested.'
                  }
                </p>
                <p className="text-sm text-slate-400 mt-3">
                  Basic MVP is complete: wellness check-ins, profile updates, performance history, injury history, and admin exports are implemented. Goals and advanced planning are still in progress.
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {loadingStats ? (
                Array(4).fill(0).map((_, index) => (
                  <div key={index} className="bg-brand-bg-light border border-brand-border rounded-xl p-6 animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-slate-700 rounded-lg"></div>
                      <div className="h-4 w-8 bg-slate-700 rounded"></div>
                    </div>
                    <div className="h-8 w-20 bg-slate-700 rounded mb-1"></div>
                    <div className="h-4 w-24 bg-slate-700 rounded"></div>
                  </div>
                ))
              ) : (user?.role === 'coach' 
                ? [
                    { 
                      label: 'Total Athletes', 
                      value: overviewStats.totalAthletes, 
                      color: 'from-blue-500 to-blue-600', 
                      change: '+0',
                      icon: '👥'
                    },
                    { 
                      label: 'Teams', 
                      value: overviewStats.totalTeams, 
                      color: 'from-green-500 to-green-600', 
                      change: '+0',
                      icon: '🏆'
                    },
                    { 
                      label: 'Pending Wellness', 
                      value: overviewStats.pendingWellness, 
                      color: 'from-amber-500 to-amber-600', 
                      change: '-0',
                      icon: '⏳'
                    },
                    { 
                      label: 'Avg Readiness', 
                      value: overviewStats.avgReadiness, 
                      color: 'from-purple-500 to-purple-600', 
                      change: '+0%',
                      icon: '📊'
                    },
                  ]
                : [
                    { 
                      label: 'Wellness Score', 
                      value: overviewStats.wellnessScore, 
                      color: 'from-blue-500 to-blue-600', 
                      change: '--',
                      icon: '💪'
                    },
                    { 
                      label: 'Training Load', 
                      value: '--', 
                      color: 'from-amber-500 to-amber-600', 
                      change: '--',
                      icon: '🏋️'
                    },
                    { 
                      label: 'ACWR', 
                      value: '--', 
                      color: 'from-red-500 to-red-600', 
                      change: '--',
                      icon: '📊'
                    },
                    { 
                      label: 'Goals (coming soon)', 
                      value: '--', 
                      color: 'from-purple-500 to-purple-600', 
                      change: '--',
                      icon: '🎯'
                    },
                  ]
              ).map((stat, index) => (
                <div key={index} className="bg-brand-bg-light border border-brand-border rounded-xl p-6 hover:border-brand-cyan/30 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <span className="text-white text-xl">{stat.icon}</span>
                    </div>
                    <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-400' : stat.change.startsWith('-') ? 'text-red-400' : 'text-slate-400'}`}>
                      {stat.change}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quick Actions */}
              <div className="lg:col-span-2">
                <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Quick Actions</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(user?.role === 'coach' 
                      ? [
                          { title: 'Manage Athletes', desc: 'Add or edit athlete profiles', icon: '👥', onClick: () => setActiveTab('athletes') },
                          { title: 'View Teams', desc: 'See team details and stats', icon: '🏆', onClick: () => setActiveTab('teams') },
                          { title: 'Wellness Dashboard', desc: 'Monitor athlete readiness', icon: '💪', onClick: () => setActiveTab('wellness') },
                          { title: 'Record Performance Test', desc: 'Log athlete test results', icon: '📊', onClick: () => {
                            setActiveTab('performance');
                            window.location.hash = 'record-test';
                          }},
                          { title: 'Log Training Session', desc: 'Record workout details', icon: '🏋️', onClick: () => setShowWorkloadForm(true) },
                          { title: 'Log Recovery Session', desc: 'Record recovery activities', icon: '🧘', onClick: () => setShowRecoveryForm(true) },
                          { title: 'View ACWR Calculator', desc: 'Check workload ratios', icon: '📈', onClick: () => {
                            setActiveTab('workload');
                            window.location.hash = 'acwr-calculator';
                          }},
                        ]
                      : [
                          { title: 'My Profile', desc: 'View and edit your profile', icon: '👤', onClick: () => setActiveTab('my-stats') },
                          { title: 'Wellness Check', desc: 'Submit daily wellness', icon: '💪', onClick: () => {
                            setActiveTab('wellness');
                            window.location.hash = 'wellness-check';
                          }},
                          { title: 'Performance History', desc: 'View your test results', icon: '📈', onClick: () => setActiveTab('performance') },
                          { title: 'Log Training', desc: 'Record your workout', icon: '🏋️', onClick: () => setShowWorkloadForm(true) },
                          { title: 'Log Recovery', desc: 'Record recovery activities', icon: '🧘', onClick: () => setShowRecoveryForm(true) },
                          { title: 'Workload Dashboard', desc: 'View training load trends', icon: '📊', onClick: () => setActiveTab('workload') },
                          { title: 'Set Goals', desc: 'Coming soon — not available yet', icon: '🎯', disabled: true },
                          { title: 'Injury History', desc: 'View your injury records', icon: '🩹', onClick: () => setActiveTab('injuries') },
                        ]
                    ).map((action, index) => (
                      <button 
                        key={index}
                        onClick={!action.disabled ? action.onClick : undefined}
                        disabled={action.disabled}
                        className={`bg-brand-bg-dark border rounded-xl p-6 text-left transition-all duration-300 ${action.disabled ? 'border-slate-700 opacity-50 cursor-not-allowed' : 'border-slate-700 hover:border-brand-cyan/50 hover:scale-[1.02]'} group`}
                      >
                        <div className={`text-3xl mb-4 transition-transform ${action.disabled ? 'text-slate-500' : 'group-hover:scale-110'}`}>{action.icon}</div>
                        <h4 className={`font-semibold mb-2 ${action.disabled ? 'text-slate-500' : 'text-white'}`}>{action.title}</h4>
                        <p className={`text-sm ${action.disabled ? 'text-slate-500' : 'text-slate-400'}`}>{action.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6 h-full">
                  <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
                  <div className="space-y-4">
                    {[
                      { user: 'System', action: 'Basic MVP complete and under testing', time: 'Now', type: 'success' },
                      { user: 'Wellness', action: 'Daily check-in and readiness tracking live', time: 'Now', type: 'success' },
                      { user: 'Performance', action: 'Performance history and athlete profile views live', time: 'Now', type: 'success' },
                      { user: 'Injury Tracking', action: 'Injury history and concussion logging available', time: 'Now', type: 'success' },
                      { user: 'Goals', action: 'Goal setting and planning under development', time: 'Coming Soon', type: 'info' },
                      { user: 'Prehab', action: 'Prehab recommendation flow pending', time: 'Coming Soon', type: 'info' },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-brand-bg-dark/50 transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.type === 'success' ? 'bg-green-500/20 text-green-400' :
                          activity.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {activity.type === 'success' && '✓'}
                          {activity.type === 'warning' && '⚠'}
                          {activity.type === 'info' && 'ℹ'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{activity.user}</p>
                          <p className="text-sm text-slate-400">{activity.action}</p>
                          <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-bg-dark via-gray-900 to-brand-bg-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-brand-bg-light/90 backdrop-blur-sm border-b border-brand-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-xl">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7V9H4V18H6V11H8V18H10V9H12V18H14V11H16V18H18V9H20V7L12 2ZM12 4.53L17.11 7H6.89L12 4.53Z" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">HER-PACE Dashboard</h1>
                <p className="text-xs text-slate-400">Performance Monitoring System</p>
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-white">{user?.name} {user?.surname}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-full flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0)}{user?.surname?.charAt(0)}
              </div>
              <button 
                onClick={onLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-bg-light border border-brand-border text-slate-300 hover:text-white hover:bg-brand-border/30 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V5.414l7.293 7.293a1 1 0 001.414-1.414L5.414 4H15a1 1 0 100-2H4a1 1 0 00-1 1z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.disabled) return;
                  setActiveTab(tab.id);
                  if (!((tab.id === 'wellness' && user.role === 'athlete') || 
                        (tab.id === 'performance' && user.role !== 'athlete') ||
                        (tab.id === 'workload' && window.location.hash === '#acwr-calculator'))) {
                    window.location.hash = '';
                  }
                }}
                disabled={tab.disabled}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  tab.disabled
                    ? 'text-slate-600 bg-slate-800 cursor-not-allowed opacity-70'
                    : activeTab === tab.id && window.location.hash === ''
                      ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
            
            {/* Athlete Wellness Check Button */}
            {user?.role === 'athlete' && (
              <button
                onClick={() => {
                  setActiveTab('wellness');
                  window.location.hash = 'wellness-check';
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  window.location.hash === '#wellness-check'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-green-400 hover:text-white hover:bg-green-500/20'
                }`}
              >
                <span>✅</span>
                <span className="font-medium">Check-in</span>
              </button>
            )}
            
            {/* Coach Performance Test Button */}
            {user?.role === 'coach' && (
              <button
                onClick={() => {
                  setActiveTab('performance');
                  window.location.hash = 'record-test';
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  window.location.hash === '#record-test'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-purple-400 hover:text-white hover:bg-purple-500/20'
                }`}
              >
                <span>➕</span>
                <span className="font-medium">Record Test</span>
              </button>
            )}
            
            {/* Coach ACWR Calculator Button */}
            {user?.role === 'coach' && (
              <button
                onClick={() => {
                  setActiveTab('workload');
                  window.location.hash = 'acwr-calculator';
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  window.location.hash === '#acwr-calculator'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-amber-400 hover:text-white hover:bg-amber-500/20'
                }`}
              >
                <span>📊</span>
                <span className="font-medium">ACWR</span>
              </button>
            )}
            
            {/* Coach Workload Logging Button */}
            {user?.role === 'coach' && (
              <button
                onClick={() => setShowWorkloadForm(true)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  showWorkloadForm
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-blue-400 hover:text-white hover:bg-blue-500/20'
                }`}
              >
                <span>🏋️</span>
                <span className="font-medium">Log Training</span>
              </button>
            )}
            
            {/* Coach Recovery Logging Button */}
            {user?.role === 'coach' && (
              <button
                onClick={() => setShowRecoveryForm(true)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  showRecoveryForm
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-green-400 hover:text-white hover:bg-green-500/20'
                }`}
              >
                <span>🧘</span>
                <span className="font-medium">Log Recovery</span>
              </button>
            )}
            
            {/* Coach Injury Logging Button */}
            {user?.role === 'coach' && (
              <button
                onClick={() => setShowInjuryForm(true)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  showInjuryForm
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'text-red-400 hover:text-white hover:bg-red-500/20'
                }`}
              >
                <span>🩹</span>
                <span className="font-medium">Log Injury</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
        
        {/* Phase Progress */}
        <div className="mt-8 bg-brand-bg-light border border-brand-border rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Development Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                phase: 'Phase 1', 
                title: 'Core Infrastructure', 
                status: 'Complete', 
                items: ['✓ Authentication', '✓ Database Setup', '✓ Basic UI'], 
                color: 'from-green-500 to-green-600' 
              },
              { 
                phase: 'Phase 2', 
                title: 'Athlete Management', 
                status: 'Complete', 
                items: ['✓ Athlete Profiles', '✓ Team Management', '✓ Basic Dashboard'], 
                color: 'from-green-500 to-green-600' 
              },
              { 
                phase: 'Phase 3', 
                title: 'Wellness Tracking', 
                status: 'Complete', 
                items: ['✓ Daily Wellness', '✓ Readiness Scores', '✓ Team Overview'], 
                color: 'from-green-500 to-green-600' 
              },
              { 
                phase: 'Phase 4', 
                title: 'Performance Tests', 
                status: 'Complete', 
                items: ['✓ Test Recording', '✓ Performance History', '✓ Trend Analysis'], 
                color: 'from-green-500 to-green-600'
              },
              { 
                phase: 'Phase 5', 
                title: 'Coach Dashboard', 
                status: 'Complete', 
                items: ['✅ Team Overview', '✅ Flagging System', '✅ ACWR Calculator', '✅ Risk Assessment'], 
                color: 'from-green-500 to-green-600'
              },
              { 
                phase: 'Phase 6', 
                title: 'Injury & Concussion', 
                status: 'Complete', 
                items: ['✓ Injury Logging', '✓ Concussion Protocol', '✓ Recovery Tracking'], 
                color: 'from-green-500 to-green-600' 
              },
              { 
                phase: 'Phase 7', 
                title: 'Workload & Recovery', 
                status: 'Complete', 
                items: ['✓ Training Load', '✓ ACWR Calculator', '✓ Prehab System', '✓ Recovery Tracking'], 
                color: 'from-green-500 to-green-600' 
              },
              { 
                phase: 'Phase 8', 
                title: 'Admin Features', 
                status: 'In Progress', 
                items: ['✓ User Management', '✓ Reports', '✓ Data Export', '○ Advanced Permissions'], 
                color: 'from-brand-cyan to-brand-cyan-dark' 
              },
              { 
                phase: 'Phase 9', 
                title: 'Polish & Deployment', 
                status: 'Upcoming', 
                items: ['○ Mobile Responsive', '○ Notifications', '○ Testing'], 
                color: 'from-slate-700 to-slate-800' 
              },
            ].map((phase, index) => (
              <div key={index} className={`bg-gradient-to-br ${phase.color} rounded-xl p-6 hover:scale-[1.02] transition-transform`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-white/80">{phase.phase}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    phase.status === 'Complete' ? 'bg-green-500/20 text-green-300' :
                    phase.status === 'In Progress' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-500/20 text-slate-300'
                  }`}>
                    {phase.status}
                  </span>
                </div>
                <h4 className="text-xl font-bold text-white mb-4">{phase.title}</h4>
                <ul className="space-y-2">
                  {phase.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center text-white/90 text-sm">
                      <span className="mr-2">{item.startsWith('✓') ? '✓' : item.startsWith('✅') ? '✅' : '○'}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-white mb-2">Current Focus</p>
                <p className="text-slate-400 text-sm">Admin Features & Reports</p>
                <p className="text-xs text-slate-500 mt-1">User management, reporting, and data export</p>
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-2">Next Up: Phase 9</p>
                <p className="text-slate-400 text-sm">Polish & Deployment</p>
                <p className="text-xs text-slate-500 mt-1">Mobile responsive UI, notifications, final QA</p>
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-2">Coming in Phase 9</p>
                <p className="text-slate-400 text-sm">Mobile App & Notifications</p>
                <p className="text-xs text-slate-500 mt-1">Push notifications & mobile access</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-brand-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-lg"></div>
              <span className="text-white font-semibold">HER-PACE</span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-sm text-slate-500">
                © {new Date().getFullYear()} HER-PACE.
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-brand-cyan rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-500">Phase 8 In Progress</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Injury Form Modal */}
      {showInjuryForm && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl mt-8 mb-8">
            <InjuryForm
              user={user}
              onSuccess={() => {
                setShowInjuryForm(false);
                loadOverviewStats();
              }}
              onClose={() => setShowInjuryForm(false)}
            />
          </div>
        </div>
      )}

      {/* Workload Form Modal */}
      {showWorkloadForm && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl mt-8 mb-8">
            <WorkloadForm
              user={user}
              onSuccess={() => {
                setShowWorkloadForm(false);
                loadOverviewStats();
              }}
              onClose={() => setShowWorkloadForm(false)}
            />
          </div>
        </div>
      )}

      {/* Recovery Form Modal */}
      {showRecoveryForm && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl mt-8 mb-8">
            <RecoveryForm
              user={user}
              onSuccess={() => {
                setShowRecoveryForm(false);
                loadOverviewStats();
              }}
              onClose={() => setShowRecoveryForm(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;