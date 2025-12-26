import React from 'react';
import { Outlet } from 'react-router-dom';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900">
      {children || <Outlet />}
    </div>
  );
};

export default Layout;