import React from 'react';

const Dashboard = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-brand-bg-dark">
      <header className="bg-brand-bg-light border-b border-brand-border p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-brand-cyan" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V9H4V18H6V11H8V18H10V9H12V18H14V11H16V18H18V9H20V7L12 2ZM12 4.53L17.11 7H6.89L12 4.53Z" fill="currentColor"/>
            </svg>
            <h1 className="text-2xl font-bold text-white">Athens Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{user?.name} {user?.surname}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
            <button 
              onClick={onLogout}
              className="btn-secondary flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V5.414l7.293 7.293a1 1 0 001.414-1.414L5.414 4H15a1 1 0 100-2H4a1 1 0 00-1 1z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <div className="col-span-full card">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome back, {user?.name}!</h2>
            <p className="text-slate-400">You are logged in as a {user?.role}.</p>
          </div>

          {/* Quick Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Athletes</span>
                <span className="text-2xl font-bold text-white">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pending Wellness</span>
                <span className="text-2xl font-bold text-brand-warning">0</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full btn-secondary text-left p-3">
                View Athletes
              </button>
              <button className="w-full btn-secondary text-left p-3">
                Add New Athlete
              </button>
              <button className="w-full btn-secondary text-left p-3">
                Check Wellness
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">API Connection</span>
                <span className="inline-flex items-center gap-1 text-green-400">
                  <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Database</span>
                <span className="inline-flex items-center gap-1 text-green-400">
                  <span className="h-2 w-2 bg-green-400 rounded-full"></span>
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 card">
          <h2 className="text-xl font-bold text-white mb-4">Getting Started</h2>
          <p className="text-slate-400 mb-4">
            This is Phase 1 of the Athens Sports SAAS application. 
            More features will be added in upcoming phases.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-brand-bg-dark border border-brand-border rounded-lg">
              <h4 className="font-semibold text-brand-cyan mb-2">Phase 1 Complete</h4>
              <p className="text-sm text-slate-400">✓ Backend API<br/>✓ User Authentication<br/>✓ Frontend Setup</p>
            </div>
            <div className="p-4 bg-brand-bg-dark border border-brand-border rounded-lg">
              <h4 className="font-semibold text-slate-300 mb-2">Phase 2 Coming</h4>
              <p className="text-sm text-slate-400">• Athlete Management<br/>• Team Management<br/>• Basic Dashboard</p>
            </div>
            <div className="p-4 bg-brand-bg-dark border border-brand-border rounded-lg">
              <h4 className="font-semibold text-slate-300 mb-2">Phase 3 Planned</h4>
              <p className="text-sm text-slate-400">• Wellness Tracking<br/>• Performance Tests<br/>• Injury Logging</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;