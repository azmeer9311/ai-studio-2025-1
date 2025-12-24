
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthViewProps {
  onAuthSuccess: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Menukar ID kepada format emel dalaman untuk Supabase Auth
    const email = userId.includes('@') ? userId : `${userId}@azmeer.ai`;

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              video_limit: 5,
              image_limit: 10
            }
          }
        });
        if (error) throw error;
        alert("Pendaftaran berjaya! Tunggu admin approve akaun hampa.");
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message === "Invalid login credentials" ? "ID atau Kata Laluan salah." : err.message);
    } finally {
      setLoading(false);
    }
  };

  const logoUrl = "https://i.ibb.co/xqgH2MQ4/Untitled-design-18.png";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] p-6">
      <div className="max-w-md w-full bg-[#0f172a]/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl">
        <div className="flex flex-col items-center mb-10">
          <img src={logoUrl} alt="Logo" className="w-16 h-16 mb-6 logo-glow-animate" />
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
            {isLogin ? 'Log Masuk' : 'Daftar Baru'}
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-4">
            Azmeer AI Studio • Secure Access
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-500 text-[10px] font-bold uppercase tracking-widest text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[9px] font-bold text-slate-600 uppercase ml-1">User ID</label>
            <input 
              type="text" 
              value={userId} 
              onChange={(e) => setUserId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyan-500/50 transition-all"
              placeholder="Contoh: azmeerfarhan93"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-cyan-500/50 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {loading ? <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div> : (isLogin ? 'Enter Studio' : 'Create Account')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-cyan-400 transition-colors"
          >
            {isLogin ? "Takda akaun? Daftar sini" : "Dah ada akaun? Log masuk"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
