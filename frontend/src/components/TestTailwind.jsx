import React from 'react';

const TestTailwind = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-brand-cyan mb-4">Tailwind Test</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-500 p-4 rounded-lg text-white">Red</div>
        <div className="bg-green-500 p-4 rounded-lg text-white">Green</div>
        <div className="bg-blue-500 p-4 rounded-lg text-white">Blue</div>
      </div>
      
      <button className="btn-primary mr-4">Primary Button</button>
      <button className="btn-secondary">Secondary Button</button>
      
      <div className="card mt-6">
        <h2 className="text-xl font-bold text-white">Card Test</h2>
        <p className="text-slate-300">This should have card styling</p>
      </div>
    </div>
  );
};

export default TestTailwind;