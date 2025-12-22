
import React, { useState } from 'react';
import { AppView } from './types';
import Sidebar from './components/Sidebar';
import SoraStudioView from './components/SoraStudioView';
import HistoryView from './components/HistoryView';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>(AppView.SORA_STUDIO);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        {activeView === AppView.SORA_STUDIO ? (
          <SoraStudioView />
        ) : (
          <HistoryView />
        )}
      </main>

      {/* Mobile Bottom Navigation - SORA 2 & HISTORY */}
      <div className="md:hidden flex bg-[#0f172a] border-t border-slate-800/50 p-2 justify-around shadow-2xl">
        <button 
          onClick={() => setActiveView(AppView.SORA_STUDIO)}
          className={`flex flex-col items-center p-3 gap-1 transition-all ${activeView === AppView.SORA_STUDIO ? 'text-cyan-400' : 'text-slate-500'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-widest">SORA 2</span>
        </button>
        <button 
          onClick={() => setActiveView(AppView.HISTORY)}
          className={`flex flex-col items-center p-3 gap-1 transition-all ${activeView === AppView.HISTORY ? 'text-cyan-400' : 'text-slate-500'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-widest">HISTORY</span>
        </button>
      </div>
    </div>
  );
};

export default App;
