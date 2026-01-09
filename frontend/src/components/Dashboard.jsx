import React, { useState } from 'react';
import AthleteList from './AthleteList';
import TeamManagement from './TeamManagement';
import AthleteProfile from './AthleteProfile';
import DailyWellnessForm from './DailyWellnessForm';
import WellnessDashboard from './WellnessDashboard';
import PerformanceTestForm from './PerformanceTestForm';
import PerformanceHistory from './PerformanceHistory';
import CoachDashboard from './CoachDashboard';

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Navigation tabs based on user role
  const coachTabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'coach-dashboard', label: 'Coach Dashboard', icon: '🎯' },
    { id: 'athletes', label: 'Athletes', icon: '👥' },
    { id: 'teams', label: 'Teams', icon: '🏆' },
    { id: 'wellness', label: 'Wellness', icon: '💪' },
    { id: 'performance', label: 'Performance', icon: '📈' },
  ];
  
  const athleteTabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'my-stats', label: 'My Stats', icon: '👤' },
    { id: 'wellness', label: 'Wellness', icon: '💪' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'goals', label: 'Goals', icon: '🎯' },
  ];
  
  const tabs = user?.role === 'coach' ? coachTabs : athleteTabs;

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
      case 'wellness':
        // Check if we're on the wellness check form or dashboard
        if (window.location.hash === '#wellness-check' && user.role === 'athlete') {
          return <DailyWellnessForm user={user} />;
        }
        return <WellnessDashboard user={user} />;
      case 'performance':
        // Check if we're on the performance test form or history
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
                    ? 'Monitor your team\'s performance and wellness metrics in real-time.'
                    : 'Track your progress and submit daily wellness checks.'
                  }
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {(user?.role === 'coach' 
                ? [
                    { label: 'Total Athletes', value: '0', color: 'from-blue-500 to-blue-600', change: '+0' },
                    { label: 'Teams', value: '0', color: 'from-green-500 to-green-600', change: '+0' },
                    { label: 'Pending Wellness', value: '0', color: 'from-amber-500 to-amber-600', change: '-0' },
                    { label: 'Avg Readiness', value: '0%', color: 'from-purple-500 to-purple-600', change: '+0%' },
                  ]
                : [
                    { label: 'Wellness Score', value: '--', color: 'from-blue-500 to-blue-600', change: '--' },
                    { label: 'Performance Tests', value: '0', color: 'from-green-500 to-green-600', change: '+0' },
                    { label: 'Training Days', value: '0', color: 'from-amber-500 to-amber-600', change: '+0' },
                    { label: 'Goals', value: '0', color: 'from-purple-500 to-purple-600', change: '+0' },
                  ]
              ).map((stat, index) => (
                <div key={index} className="bg-brand-bg-light border border-brand-border rounded-xl p-6 hover:border-brand-cyan/30 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">{stat.value.charAt(0)}</span>
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
                        ]
                      : [
                          { title: 'My Profile', desc: 'View and edit your profile', icon: '👤', onClick: () => setActiveTab('my-stats') },
                          { title: 'Wellness Check', desc: 'Submit daily wellness', icon: '💪', onClick: () => {
                            setActiveTab('wellness');
                            window.location.hash = 'wellness-check';
                          }},
                          { title: 'Performance History', desc: 'View your test results', icon: '📈', onClick: () => setActiveTab('performance') },
                          { title: 'Set Goals', desc: 'Define your training goals', icon: '🎯', onClick: () => alert('Coming in Phase 6') },
                        ]
                    ).map((action, index) => (
                      <button 
                        key={index}
                        onClick={action.onClick}
                        className="bg-brand-bg-dark border border-slate-700 hover:border-brand-cyan/50 rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02]"
                      >
                        <div className="text-3xl mb-4">{action.icon}</div>
                        <h4 className="font-semibold text-white mb-2">{action.title}</h4>
                        <p className="text-sm text-slate-400">{action.desc}</p>
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
                      { user: 'System', action: 'Phase 4 features available', time: 'Today', type: 'success' },
                      { user: 'Performance Tracking', action: 'Test recording now active', time: 'Phase 4', type: 'info' },
                      { user: 'Wellness', action: 'Daily checks are working', time: 'Phase 3', type: 'success' },
                      { user: 'Upcoming', action: 'Coach dashboard improvements', time: 'Phase 5', type: 'info' },
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
                <h1 className="text-xl font-bold text-white">Athens Dashboard</h1>
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
                  setActiveTab(tab.id);
                  // Clear hash when switching tabs (except when going to specific forms)
                  if (!((tab.id === 'wellness' && user.role === 'athlete') || 
                        (tab.id === 'performance' && user.role !== 'athlete'))) {
                    window.location.hash = '';
                  }
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id && window.location.hash === ''
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
        
        {/* Phase Progress */}
        <div className="mt-8 bg-brand-bg-light border border-brand-border rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Development Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                status: 'In Progress', 
                items: ['✅ Team Overview', '✅ Flagging System', '🔄 ACWR Calculator', '🔄 Risk Assessment'], 
                color: 'from-brand-cyan to-brand-cyan-dark' 
              },
            ].map((phase, index) => (
              <div key={index} className={`bg-gradient-to-br ${phase.color} rounded-xl p-6`}>
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
                    <li key={itemIndex} className="flex items-center text-white/90">
                      <span className="mr-2">{item.startsWith('✓') ? '✓' : '○'}</span>
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
                <p className="text-slate-400 text-sm">Performance Testing System</p>
                <p className="text-xs text-slate-500 mt-1">Recording, tracking & analytics</p>
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-2">Next Up: Phase 5</p>
                <p className="text-slate-400 text-sm">Coach Dashboard & Flagging</p>
                <p className="text-xs text-slate-500 mt-1">Risk assessment & alerts</p>
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-2">Coming Later</p>
                <p className="text-slate-400 text-sm">Injury Logging & Reports</p>
                <p className="text-xs text-slate-500 mt-1">Comprehensive tracking</p>
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
              <span className="text-white font-semibold">Athens Sports</span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-sm text-slate-500">
                © {new Date().getFullYear()} Athens Sports SAAS.
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-500">Phase 4 Active</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;