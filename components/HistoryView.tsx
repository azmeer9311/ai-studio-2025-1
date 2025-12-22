import React, { useState, useEffect, useCallback } from 'react';
import { getAllHistory } from '../services/geminiService';
import { SoraHistoryItem } from '../types';

const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<SoraHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Reduced from 50 to 20 to avoid potential 400 Bad Request errors from server limits
      const data = await getAllHistory(1, 20);
      
      // Handle various response structures
      const items = data?.result || data?.data || (Array.isArray(data) ? data : []);
      
      if (items && Array.isArray(items)) {
        // Filter for video types or sora models
        const videoHistory = items.filter((item: SoraHistoryItem) => 
          item.type === 'video' || 
          (item.model_name && item.model_name.toLowerCase().includes('sora')) ||
          item.type === 'video_generation'
        );
        setHistory(videoHistory);
      } else {
        setHistory([]);
      }
    } catch (err: any) {
      console.error("Gagal sync history:", err);
      if (err.message.includes('400')) {
        setError("Ralat 400: Permintaan data ditolak oleh server. Parameter mungkin tidak sah atau limit server dicapai.");
      } else if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError("Masalah Rangkaian: Pelayar menyekat akses ke API (CORS) atau talian internet hampa tak stabil.");
      } else {
        setError(`Ralat: ${err.message || 'Sesuatu yang tak dijangka berlaku.'}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 2: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 3: return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-800';
    }
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1: return 'Tengah Render';
      case 2: return 'Dah Siap';
      case 3: return 'Gagal Teruk';
      default: return 'Status Pelik';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] p-4 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.3em]">GeminiGen.AI Sync</p>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase">Vault <span className="text-slate-700">Arkib</span></h2>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-2">Semua video Sora 2.0 hampa ada kat sini</p>
          </div>
          <button 
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-xl shadow-cyan-500/10 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Menghubungi Server</p>
              <p className="text-[10px] text-slate-500 font-bold italic">Tengah sedut data arkib geminigen...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-40 bg-rose-500/5 rounded-[3rem] border border-rose-500/20 flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-rose-950/30 rounded-full flex items-center justify-center text-rose-500">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
            </div>
            <div className="max-w-md px-6">
              <p className="text-rose-500 font-black uppercase tracking-widest">Adoi! Gagal Sedut Data</p>
              <p className="text-xs text-slate-400 mt-4 font-bold leading-relaxed">{error}</p>
              <div className="mt-8 flex flex-col gap-3">
                <button 
                  onClick={fetchHistory}
                  className="px-6 py-3 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-400 transition-all shadow-lg"
                >
                  Cuba Lagi
                </button>
                <p className="text-[9px] text-slate-600 font-bold italic uppercase">Tips: Matikan VPN atau AdBlocker jika ralat berterusan.</p>
              </div>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-40 bg-[#0f172a]/30 rounded-[3rem] border border-slate-800/50 flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-slate-700">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
               </svg>
            </div>
            <div>
              <p className="text-slate-500 font-black uppercase tracking-widest">Arkib Masih Kosong</p>
              <p className="text-xs text-slate-700 mt-2 font-bold italic max-w-xs mx-auto">Nampaknya hampa belum generate video guna Sora 2.0 lagi. Jom pi Studio jap!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {history.map((item) => {
              const videoUrl = item.generated_video?.[0]?.video_url || item.generate_result;
              const hasVideo = item.status === 2 && videoUrl;
              
              return (
                <div key={item.uuid} className="group bg-[#0f172a]/40 border border-slate-800/60 rounded-[2.5rem] overflow-hidden flex flex-col hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative">
                  <div className="aspect-video bg-slate-950 relative overflow-hidden">
                    {hasVideo ? (
                      <video 
                        src={videoUrl || ''} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                        onMouseOver={e => (e.target as HTMLVideoElement).play()}
                        onMouseOut={e => (e.target as HTMLVideoElement).pause()}
                        muted
                        loop
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-900/50">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" alt="Thumbnail" />
                        ) : null}
                        <div className={`relative px-5 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </div>
                        {item.status === 1 && (
                          <div className="relative w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 animate-pulse" style={{ width: `${item.status_percentage || 20}%` }}></div>
                          </div>
                        )}
                        {item.status === 3 && (
                          <p className="text-[9px] text-rose-500 font-bold px-8 text-center line-clamp-2">{item.error_message || "Maaf, sistem ada problem jap."}</p>
                        )}
                      </div>
                    )}
                    
                    <div className="absolute top-4 left-4">
                       <span className="bg-black/60 backdrop-blur-md text-[9px] font-black text-white px-3 py-1.5 rounded-full border border-white/10 uppercase tracking-widest">
                         {item.model_name || 'Sora'}
                       </span>
                    </div>
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        {new Date(item.created_at).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">#{item.id}</span>
                    </div>
                    
                    <p className="text-sm text-slate-300 font-medium line-clamp-3 mb-8 leading-relaxed flex-1 italic">
                      "{item.input_text}"
                    </p>

                    <div className="mt-auto pt-6 border-t border-slate-800/60 flex items-center justify-between">
                      <div className="flex gap-2">
                         <span className="text-[9px] font-black text-slate-400 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 uppercase">
                           {item.generated_video?.[0]?.resolution || '720p'}
                         </span>
                         <span className="text-[9px] font-black text-slate-400 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 uppercase">
                           {item.generated_video?.[0]?.duration || '10'}S
                         </span>
                      </div>
                      
                      {hasVideo && (
                         <div className="flex gap-3">
                           <a 
                             href={videoUrl || '#'} 
                             target="_blank" 
                             rel="noreferrer"
                             className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition-all"
                             title="Tengok Original"
                           >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                             </svg>
                           </a>
                           <a 
                             href={videoUrl || '#'} 
                             download={`sora-video-${item.uuid}.mp4`}
                             className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-950 hover:bg-cyan-400 transition-all shadow-lg active:scale-90"
                             title="Download Video"
                           >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                             </svg>
                           </a>
                         </div>
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