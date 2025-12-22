
import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const navItems = [
    { view: AppView.SORA_STUDIO, label: 'SORA 2.0', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { view: AppView.HISTORY, label: 'HISTORY', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  return (
    <aside className="hidden md:flex w-72 bg-[#020617] border-r border-slate-800/50 flex-col h-full shrink-0">
      <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-white uppercase leading-none mb-1">azmeer</h1>
            <p className="text-[10px] font-bold text-cyan-500 tracking-[0.2em] uppercase opacity-80 leading-none">ai studio</p>
          </div>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 group ${
                activeView === item.view 
                  ? 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
              }`}
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-[11px] font-bold tracking-[0.1em] uppercase">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-8">
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sora Core</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full w-[100%]"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
