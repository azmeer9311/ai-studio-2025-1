
import React, { useState, useEffect } from 'react';
import { AppView, UserProfile } from './types';
import Sidebar from './components/Sidebar';
import SoraStudioView from './components/SoraStudioView';
import HistoryView from './components/HistoryView';
import AdminDashboard from './components/AdminDashboard';
import AuthView from './components/AuthView';
import { getCurrentSession } from './services/authService';

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<AppView>(AppView.SORA_STUDIO);
  const logoUrl = "https://i.ibb.co/xqgH2MQ4/Untitled-design-18.png";

  const checkAuth = () => {
    setLoading(true);
    const session = getCurrentSession();
    setProfile(session);
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#020617] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Jika belum login, paparkan skrin Auth
  if (!profile) {
    return <AuthView onAuthSuccess={checkAuth} />;
  }

  const renderView = () => {
    switch (activeView) {
      case AppView.SORA_STUDIO: return <SoraStudioView onViewChange={setActiveView} userProfile={profile} />;
      case AppView.HISTORY: return <HistoryView userProfile={profile} />;
      case AppView.ADMIN_DASHBOARD: return <AdminDashboard />;
      default: return <SoraStudioView onViewChange={setActiveView} userProfile={profile} />;
    }
  };

  const bakiCount = profile.is_admin ? 'UNLIMITED' : (profile.video_limit - profile.videos_used);
  const percentage = profile.is_admin ? 100 : Math.min(100, (Math.max(0, bakiCount as number) / (profile.video_limit || 1)) * 100);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      <Sidebar activeView={activeView} onViewChange={setActiveView} userProfile={profile} />

      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        {/* Mobile & Tablet Header (< 768px) */}
        <header className="md:hidden flex flex-col bg-[#020617] border-b border-slate-800/50 z-20 shadow-2xl">
          <div className="flex items-center justify-between p-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500/20 blur-lg rounded-full animate-pulse"></div>
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain relative z-10 logo-glow-animate" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tighter text-white uppercase leading-none">azmeer</h1>
                <p className="text-[8px] font-bold text-cyan-500 tracking-[0.2em] uppercase opacity-80 leading-none">ai studio</p>
                <div className="mt-1 flex flex-col gap-1">
                  <div className="inline-flex items-center bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded-md shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest whitespace-nowrap">
                      BAKI: {bakiCount} VIDEO
                    </span>
                  </div>
                  {/* Progress bar for mobile visibility */}
                  {!profile.is_admin && (
                    <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 shadow-[0_0_5px_rgba(34,211,238,0.5)] transition-all duration-1000" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('azmeer_studio_session');
                window.location.reload();
              }} 
              className="text-[9px] font-black text-rose-500 uppercase tracking-widest border border-rose-500/20 px-4 py-2 rounded-xl bg-rose-500/5 active:scale-95"
            >
              Exit
            </button>
          </div>

          <nav className="flex px-4 pb-3 gap-2 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveView(AppView.SORA_STUDIO)}
              className={`flex-1 min-w-[80px] py-3 rounded-xl transition-all border font-black text-[10px] uppercase tracking-widest ${
                activeView === AppView.SORA_STUDIO ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'bg-slate-900/50 border-slate-800 text-slate-500'
              }`}
            >
              Studio
            </button>
            <button 
              onClick={() => setActiveView(AppView.HISTORY)}
              className={`flex-1 min-w-[80px] py-3 rounded-xl transition-all border font-black text-[10px] uppercase tracking-widest ${
                activeView === AppView.HISTORY ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'bg-slate-900/50 border-slate-800 text-slate-500'
              }`}
            >
              Vault
            </button>
            {profile.is_admin && (
              <button 
                onClick={() => setActiveView(AppView.ADMIN_DASHBOARD)}
                className={`flex-1 min-w-[80px] py-3 rounded-xl transition-all border font-black text-[10px] uppercase tracking-widest ${
                  activeView === AppView.ADMIN_DASHBOARD ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'bg-slate-900/50 border-slate-800 text-slate-500'
                }`}
              >
                Admin
              </button>
            )}
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
