import React, { useState } from 'react';
import { Activity, Shield, Wallet, AreaChart, Settings, RadioTower, Globe } from 'lucide-react';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold tracking-tighter flex items-center gap-2 text-red-500">
            <Shield className="w-6 h-6" />
            DARK EMPIRE
          </h1>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-mono">Treasury Engine v1.0</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'overview' ? 'bg-red-950/30 text-red-400 border border-red-900/50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}
          >
            <Activity className="w-4 h-4" />
            Command Center
          </button>
          <button 
            onClick={() => setActiveTab('assets')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'assets' ? 'bg-red-950/30 text-red-400 border border-red-900/50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}
          >
            <Wallet className="w-4 h-4" />
            Asset Matrix
          </button>
          <button 
            onClick={() => setActiveTab('markets')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'markets' ? 'bg-red-950/30 text-red-400 border border-red-900/50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}
          >
            <Globe className="w-4 h-4" />
            Global Markets
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-emerald-500 font-mono">
            <RadioTower className="w-4 h-4" />
            HQ LINK ENCRYPTED
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="px-8 py-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
          <div>
            <h2 className="text-2xl font-bold font-mono uppercase">
              {activeTab === 'overview' && 'Command Center'}
              {activeTab === 'assets' && 'Asset Matrix'}
              {activeTab === 'markets' && 'Global Markets'}
            </h2>
            <p className="text-sm text-zinc-500">Live telemetry and capital allocation.</p>
          </div>
          <button className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </header>

        <div className="p-8">
          {activeTab === 'overview' && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                 <div className="text-sm text-zinc-500 font-mono uppercase mb-2">Total Value Locked</div>
                 <div className="text-3xl font-bold tracking-tight text-zinc-100">---</div>
                 <div className="text-xs text-zinc-600 mt-2">Awaiting data stream integration...</div>
               </div>
               <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                 <div className="text-sm text-zinc-500 font-mono uppercase mb-2">Active Deployments</div>
                 <div className="text-3xl font-bold tracking-tight text-zinc-100">0</div>
                 <div className="text-xs text-zinc-600 mt-2">No active strategies running.</div>
               </div>
               <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                 <div className="text-sm text-zinc-500 font-mono uppercase mb-2">System Status</div>
                 <div className="text-xl font-bold tracking-tight text-emerald-400 flex items-center gap-2 mt-1">
                   <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                   NOMINAL
                 </div>
                 <div className="text-xs text-zinc-600 mt-2">All core systems online.</div>
               </div>
             </div>
          )}

          {activeTab === 'markets' && (
            <div className="h-[600px] border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50">
               <AdvancedRealTimeChart theme="dark" symbol="BINANCE:BTCUSDT" width="100%" height="100%" />
            </div>
          )}
          
          {activeTab === 'assets' && (
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50 flex items-center justify-center h-64">
               <div className="text-center">
                 <Wallet className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                 <p className="text-zinc-400 font-mono text-sm">No wallets connected.</p>
                 <button className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium rounded transition-colors">
                   Initialize Connection
                 </button>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
