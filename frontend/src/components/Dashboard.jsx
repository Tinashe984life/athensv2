import React from 'react';

const Dashboard = ({ user, onLogout }) => {
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          {[
            { label: 'Total Athletes', value: '24', color: 'from-blue-500 to-blue-600', change: '+3' },
            { label: 'Active Sessions', value: '18', color: 'from-green-500 to-green-600', change: '+5' },
            { label: 'Pending Wellness', value: '6', color: 'from-amber-500 to-amber-600', change: '-2' },
            { label: 'Avg Readiness', value: '84%', color: 'from-purple-500 to-purple-600', change: '+4%' },
          ].map((stat, index) => (
            <div key={index} className="bg-brand-bg-light border border-brand-border rounded-xl p-6 hover:border-brand-cyan/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{stat.value.charAt(0)}</span>
                </div>
                <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
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
                <span className="text-sm text-brand-cyan hover:text-white cursor-pointer">View all →</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: 'Manage Athletes', desc: 'Add or edit athlete profiles', icon: '👥', color: 'border-blue-500/30 hover:border-blue-500' },
                  { title: 'Record Session', desc: 'Log training metrics', icon: '📊', color: 'border-green-500/30 hover:border-green-500' },
                  { title: 'Wellness Check', desc: 'Review athlete status', icon: '💪', color: 'border-amber-500/30 hover:border-amber-500' },
                  { title: 'View Reports', desc: 'Generate performance reports', icon: '📈', color: 'border-purple-500/30 hover:border-purple-500' },
                ].map((action, index) => (
                  <button 
                    key={index}
                    className={`bg-brand-bg-dark border ${action.color} rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02]`}
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
                  { user: 'Michael Johnson', action: 'Completed wellness check', time: '10 min ago', type: 'success' },
                  { user: 'Sarah Williams', action: 'Recorded new PB in sprint', time: '45 min ago', type: 'performance' },
                  { user: 'Team Meeting', action: 'Weekly coach briefing', time: '2 hours ago', type: 'info' },
                  { user: 'David Chen', action: 'Reported minor injury', time: 'Yesterday', type: 'warning' },
                ].map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-brand-bg-dark/50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'success' ? 'bg-green-500/20 text-green-400' :
                      activity.type === 'performance' ? 'bg-blue-500/20 text-blue-400' :
                      activity.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {activity.type === 'success' && '✓'}
                      {activity.type === 'performance' && '🏃'}
                      {activity.type === 'warning' && '⚠'}
                      {activity.type === 'info' && '👥'}
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

        {/* Phase Progress */}
        <div className="mt-8 bg-brand-bg-light border border-brand-border rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Development Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { phase: 'Phase 1', title: 'Core Infrastructure', status: 'Complete', items: ['✓ Authentication', '✓ Database Setup', '✓ Basic UI'], color: 'from-green-500 to-green-600' },
              { phase: 'Phase 2', title: 'Athlete Management', status: 'In Progress', items: ['Athlete Profiles', 'Team Management', 'Basic Dashboard'], color: 'from-brand-cyan to-brand-cyan-dark' },
              { phase: 'Phase 3', title: 'Performance Tracking', status: 'Upcoming', items: ['Wellness Checks', 'Test Results', 'Injury Logging'], color: 'from-slate-600 to-slate-700' },
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
            <div className="text-sm text-slate-500">
              © {new Date().getFullYear()} Athens Sports SAAS.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;