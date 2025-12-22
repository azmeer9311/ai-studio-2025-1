
import React, { useState, useEffect } from 'react';
import { getAllHistory } from '../services/geminiService';
import { SoraHistoryItem } from '../types';

const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<SoraHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getAllHistory();
        // Docs say results are in 'result' array.
        // We filter for video types to keep the vault clean.
        if (data.success && data.result) {
          const videoHistory = data.result.filter((item: any) => 
            item.type === 'video' || item.media_type === 'video' || item.model_name.includes('sora')
          );
          setHistory(videoHistory);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 2: return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
      case 3: return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1: return 'Tengah Buat';
      case 2: return 'Dah Siap';
      case 3: return 'Failed Bro';
      default: return 'Tah Mana Silap';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] p-4 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase">HISTORY <span className="text-cyan-500">VAULT</span></h2>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Tengok balik video yang hampa dah buat</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
          >
            Refresh List
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Tengah loading jap...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-40 bg-[#0f172a]/30 rounded-[3rem] border border-slate-800/50">
            <p className="text-slate-500 font-black uppercase tracking-widest">Takde video lagi la.</p>
            <p className="text-xs text-slate-700 mt-2 font-bold italic">Jom create video pertama hampa kat sebelah!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {history.map((item) => {
              // Priority: generated_video array, then generate_result URL
              const videoUrl = item.generated_video?.[0]?.video_url || item.generate_result;
              
              return (
                <div key={item.uuid} className="group bg-[#0f172a]/40 border border-slate-800/60 rounded-[2rem] overflow-hidden flex flex-col hover:border-cyan-500/30 transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                  <div className="aspect-video bg-slate-950 relative overflow-hidden">
                    {item.status === 2 && videoUrl ? (
                      <video 
                        src={videoUrl} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        onMouseOver={e => (e.target as HTMLVideoElement).play()}
                        onMouseOut={e => (e.target as HTMLVideoElement).pause()}
                        muted
                        loop
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                        <div className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </div>
                        {item.status === 1 && (
                          <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 animate-pulse" style={{ width: `${item.status_percentage || 20}%` }}></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-[9px] font-black text-cyan-500 uppercase tracking-widest">{item.model_name}</span>
                    </div>
                    
                    <p className="text-xs text-slate-300 font-medium line-clamp-2 mb-6 leading-relaxed flex-1">
                      {item.input_text}
                    </p>

                    <div className="mt-auto pt-4 border-t border-slate-800/60 flex items-center justify-between">
                      <div className="flex gap-2">
                         <span className="text-[8px] font-black text-slate-500 px-2 py-1 rounded bg-slate-900 border border-slate-800">
                           {item.generated_video?.[0]?.resolution || 'HD'}
                         </span>
                         <span className="text-[8px] font-black text-slate-500 px-2 py-1 rounded bg-slate-900 border border-slate-800">
                           {item.generated_video?.[0]?.duration || '10'}S
                         </span>
                      </div>
                      {item.status === 2 && videoUrl && (
                         <a 
                           href={videoUrl} 
                           target="_blank" 
                           rel="noreferrer"
                           className="text-cyan-400 hover:text-white transition-colors"
                           title="Download"
                           download
                         >
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                           </svg>
                         </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
