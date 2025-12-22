
import React, { useState } from 'react';
import { AppView } from './types';
import Sidebar from './components/Sidebar';
import SoraStudioView from './components/SoraStudioView';
import HistoryView from './components/HistoryView';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>(AppView.SORA_STUDIO);
  const logoUrl = "https://i.ibb.co/xqgH2MQ4/Untitled-design-18.png";

  const renderView = () => {
    switch (activeView) {
      case AppView.SORA_STUDIO: return <SoraStudioView onViewChange={setActiveView} />;
      case AppView.HISTORY: return <HistoryView />;
      default: return <SoraStudioView onViewChange={setActiveView} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar for Desktop */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        
        {/* Mobile Header with Navigation at the Top */}
        <header className="md:hidden flex flex-col bg-[#020617] border-b border-slate-800/50 z-20">
          {/* Top Branding Bar */}
          <div className="flex items-center justify-between p-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500/20 blur-lg rounded-full animate-pulse"></div>
                <img 
                  src={logoUrl} 
                  alt="Azmeer AI Logo" 
                  className="w-full h-full object-contain relative z-10 logo-glow-animate"
                  loading="eager"
                />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tighter text-white uppercase leading-none">azmeer</h1>
                <p className="text-[8px] font-bold text-cyan-500 tracking-[0.2em] uppercase opacity-80 leading-none">ai studio</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">SORA 2.0</span>
            </div>
          </div>

          {/* New Top Navigation Bar for Mobile */}
          <nav className="flex px-4 pb-3 gap-2">
            <button 
              onClick={() => setActiveView(AppView.SORA_STUDIO)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all border font-black text-[10px] uppercase tracking-widest ${
                activeView === AppView.SORA_STUDIO 
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                : 'bg-slate-900/50 border-slate-800 text-slate-500'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <span>Studio</span>
            </button>
            <button 
              onClick={() => setActiveView(AppView.HISTORY)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all border font-black text-[10px] uppercase tracking-widest ${
                activeView === AppView.HISTORY 
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                : 'bg-slate-900/50 border-slate-800 text-slate-500'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Vault</span>
            </button>
          </nav>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
