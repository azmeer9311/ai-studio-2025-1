
import React, { useState, useEffect } from 'react';
import { AppView, UserProfile } from './types';
import Sidebar from './components/Sidebar';
import SoraStudioView from './components/SoraStudioView';
import HistoryView from './components/HistoryView';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  // Hardcoded profile untuk akses terus tanpa login
  const [profile] = useState<UserProfile>({
    id: 'master-admin',
    email: 'azmeer93@azmeer.ai',
    is_approved: true,
    is_admin: true,
    video_limit: 9999,
    image_limit: 9999,
    videos_used: 0,
    images_used: 0,
    created_at: new Date().toISOString()
  });
  
  const [activeView, setActiveView] = useState<AppView>(AppView.SORA_STUDIO);
  const logoUrl = "https://i.ibb.co/xqgH2MQ4/Untitled-design-18.png";

  const renderView = () => {
    switch (activeView) {
      case AppView.SORA_STUDIO: return <SoraStudioView onViewChange={setActiveView} />;
      case AppView.HISTORY: return <HistoryView />;
      case AppView.ADMIN_DASHBOARD: return <AdminDashboard />;
      default: return <SoraStudioView onViewChange={setActiveView} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar for Desktop */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} userProfile={profile} />

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        
        {/* Mobile Header */}
        <header className="md:hidden flex flex-col bg-[#020617] border-b border-slate-800/50 z-20">
          <div className="flex items-center justify-between p-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500/20 blur-lg rounded-full animate-pulse"></div>
                <img 
                  src={logoUrl} 
                  alt="Azmeer AI Logo" 
                  className="w-full h-full object-contain relative z-10 logo-glow-animate"
                />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tighter text-white uppercase leading-none">azmeer</h1>
                <p className="text-[8px] font-bold text-cyan-500 tracking-[0.2em] uppercase opacity-80 leading-none">ai studio</p>
              </div>
            </div>
          </div>

          <nav className="flex px-4 pb-3 gap-2">
            <button 
              onClick={() => setActiveView(AppView.SORA_STUDIO)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all border font-black text-[10px] uppercase tracking-widest ${
                activeView === AppView.SORA_STUDIO ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'bg-slate-900/50 border-slate-800 text-slate-500'
              }`}
            >
              Studio
            </button>
            <button 
              onClick={() => setActiveView(AppView.HISTORY)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all border font-black text-[10px] uppercase tracking-widest ${
                activeView === AppView.HISTORY ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'bg-slate-900/50 border-slate-800 text-slate-500'
              }`}
            >
              Vault
            </button>
            <button 
              onClick={() => setActiveView(AppView.ADMIN_DASHBOARD)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all border font-black text-[10px] uppercase tracking-widest ${
                activeView === AppView.ADMIN_DASHBOARD ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-slate-900/50 border-slate-800 text-slate-500'
              }`}
            >
              Admin
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
