
import React, { useState, useEffect } from 'react';
import { AppView, UserProfile } from './types';
import Sidebar from './components/Sidebar';
import SoraStudioView from './components/SoraStudioView';
import HistoryView from './components/HistoryView';
import AuthView from './components/AuthView';
import AdminDashboard from './components/AdminDashboard';
import { supabase } from './lib/supabase';
import { getProfile } from './services/authService';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<AppView>(AppView.SORA_STUDIO);
  const [loading, setLoading] = useState(true);

  const logoUrl = "https://i.ibb.co/xqgH2MQ4/Untitled-design-18.png";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const p = await getProfile(userId);
    setProfile(p);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#020617] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <AuthView onAuthSuccess={() => {}} />;
  }

  if (profile && !profile.is_approved && !profile.is_admin) {
    const displayId = profile.email ? profile.email.split('@')[0] : 'User';
    return (
      <div className="h-screen w-full bg-[#020617] flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <img src={logoUrl} alt="Logo" className="w-20 h-20 mx-auto mb-8 opacity-20 grayscale" />
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-4">Akaun Sedang Diproses</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">ID: {displayId}</p>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            Sabar jap hampa. Admin tengah review akaun hampa. Sekali dah approved, kami akan bagitahu dan hampa boleh mula jana video SORA 2.0.
          </p>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="mt-10 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors"
          >
            Log Out & Cuba ID Lain
          </button>
        </div>
      </div>
    );
  }

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
            <button onClick={() => supabase.auth.signOut()} className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Logout</button>
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
            {profile?.is_admin && (
              <button 
                onClick={() => setActiveView(AppView.ADMIN_DASHBOARD)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all border font-black text-[10px] uppercase tracking-widest ${
                  activeView === AppView.ADMIN_DASHBOARD ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-slate-900/50 border-slate-800 text-slate-500'
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
