
import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const navItems = [
    { id: AppView.CHAT, label: 'Omnis Chat', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: AppView.IMAGE_LAB, label: 'Image Lab', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: AppView.VIDEO_STUDIO, label: 'Video Studio', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { id: AppView.LIVE_OMNI, label: 'Live Talk', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      <div className="p-6">
        <h1 className="text-xl font-bold gradient-text tracking-tight flex items-center gap-2">
          <span className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm">G</span>
          Gemini Omnis
        </h1>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
              activeView === item.id 
                ? 'bg-blue-600/10 text-blue-400 ring-1 ring-blue-500/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-2">System Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-slate-300">Omni-Models Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
