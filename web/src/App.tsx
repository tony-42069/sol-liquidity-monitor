import React from 'react';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">RKIT/SOL Liquidity Monitor</h1>
            <div className="flex items-center space-x-4">
              <button className="btn btn-primary">
                Connect Wallet
              </button>
              <button className="btn btn-danger">
                Stop Monitor
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <Dashboard />
      </main>

      <footer className="bg-gray-800 mt-8">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-gray-400 text-sm">
            RKIT/SOL Liquidity Monitor - Pool ID: 6GHh9d5bZPcDELedq3ZuB1xTJsGHnKqFL142chpNQCox
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
