import React, { useState, useEffect, useCallback } from 'react';
import { getAllHistory, fetchVideoAsBlob, prepareAuthenticatedUrl, getProxiedLink } from '../services/geminiService';
import { SoraHistoryItem } from '../types';

const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<SoraHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoSources, setVideoSources] = useState<Record<string, string>>({});
  const [loadStates, setLoadStates] = useState<Record<string, 'loading' | 'ready' | 'error'>>({});

  const resolveVideoUrl = (item: SoraHistoryItem): string => {
    if (item.generated_video && item.generated_video.length > 0) {
      return item.generated_video[0].video_url;
    }
    if (typeof item.generate_result === 'string' && item.generate_result.includes('http')) {
      if (item.generate_result.startsWith('{')) {
        try {
          const parsed = JSON.parse(item.generate_result);
          return parsed.video_url || parsed.url || '';
        } catch (e) {}
      }
      return item.generate_result;
    }
    return '';
  };

  /**
   * Memuatkan video dengan strategi hibrid.
   */
  const handlePlay = async (uuid: string, url: string) => {
    if (videoSources[uuid]) return;

    setLoadStates(prev => ({ ...prev, [uuid]: 'loading' }));
    
    // Strategi 1: Cuba Blob (Terbaik untuk kestabilan)
    const blob = await fetchVideoAsBlob(url);
    if (blob) {
      setVideoSources(prev => ({ ...prev, [uuid]: blob }));
      setLoadStates(prev => ({ ...prev, [uuid]: 'ready' }));
      return;
    }

    // Strategi 2: Fallback ke Proxy Direct Streaming (Terbaik untuk kelajuan jika blob gagal)
    console.warn("Blob gagal, guna streaming proxy...");
    setVideoSources(prev => ({ ...prev, [uuid]: getProxiedLink(url) }));
    setLoadStates(prev => ({ ...prev, [uuid]: 'ready' }));
  };

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllHistory(1);
      const items = response?.result || response?.data || (Array.isArray(response) ? response : []);
      
      if (items && Array.isArray(items)) {
        const videoHistory = items.filter((item: any) => 
          item.type?.toLowerCase().includes('video') || 
          item.model_name?.toLowerCase().includes('sora') ||
          resolveVideoUrl(item) !== ''
        );
        setHistory(videoHistory);
      }
    } catch (err: any) {
      setError("Gagal memuatkan arkib hampa. Sila cuba REFRESH.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    return () => {
      Object.values(videoSources).forEach(src => {
        if (src.startsWith('blob:')) URL.revokeObjectURL(src);
      });
    };
  }, [fetchHistory]);

  const forceDownload = (url: string) => {
    // Membuka pautan dalam tab baru adalah cara paling selamat untuk memintas ralat CORS
    window.open(prepareAuthenticatedUrl(url), '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] p-4 md:p-12 overflow-y-auto custom-scrollbar text-slate-200">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.3em]">Arkib Azmeer AI</p>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase">Vault <span className="text-slate-700">Video</span></h2>
          </div>
          <button 
            onClick={fetchHistory} 
            disabled={loading} 
            className="px-8 py-4 rounded-2xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'SYNCING...' : 'REFRESH ARKIB'}
          </button>
        </header>

        {error && (
          <div className="mb-10 p-6 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-bold text-center uppercase tracking-widest">
            {error}
          </div>
        )}

        {history.length === 0 && !loading ? (
          <div className="text-center py-40 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/20">
            <p className="text-slate-600 font-bold uppercase tracking-widest">Tiada rekod video dalam vault hampa</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {history.map((item) => {
              const src = videoSources[item.uuid];
              const loadState = loadStates[item.uuid];
              const status = Number(item.status);
              const url = resolveVideoUrl(item);

              return (
                <div key={item.uuid} className="group bg-[#0f172a]/40 border border-slate-800/60 rounded-[2.5rem] overflow-hidden flex flex-col hover:border-cyan-500/30 transition-all duration-500 shadow-lg relative">
                  {/* Media Container */}
                  <div className="aspect-video bg-black relative overflow-hidden flex items-center justify-center border-b border-slate-800/60">
                    {src ? (
                      <video 
                        src={src} 
                        className="w-full h-full object-cover" 
                        controls 
                        playsInline 
                        autoPlay
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center gap-6 bg-slate-950/50">
                        <div className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] ${status === 2 ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-amber-500 border-amber-500/20'}`}>
                          {status === 2 ? 'Siap Dihasilkan' : 'Dalam Proses'}
                        </div>
                        
                        {status === 2 && url ? (
                          loadState === 'loading' ? (
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Menyediakan Video...</p>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handlePlay(item.uuid, url)}
                              className="group/play flex flex-col items-center gap-4 transition-transform active:scale-95"
                            >
                              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-cyan-500 flex items-center justify-center group-hover/play:bg-cyan-500 group-hover/play:text-slate-950 transition-all shadow-2xl">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              </div>
                              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest group-hover/play:text-cyan-400 transition-colors">Mainkan Pratinjau</span>
                            </button>
                          )
                        ) : (
                           <svg className="w-12 h-12 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Metadata Area */}
                  <div className="p-8 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString('ms-MY')}</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase font-mono">#{item.uuid.substring(0, 8)}</span>
                    </div>

                    <p className="text-sm text-slate-300 font-medium line-clamp-2 mb-8 flex-1 italic leading-relaxed">
                      "{item.input_text || 'Tiada huraian disediakan'}"
                    </p>

                    <div className="mt-auto pt-6 border-t border-slate-800/60 flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className="text-[9px] font-black text-slate-500 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 uppercase">SORA 2</span>
                        <span className="text-[9px] font-black text-slate-500 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 uppercase">720P</span>
                      </div>

                      {status === 2 && url && (
                        <div className="flex gap-2">
                          {/* Butang Muat Turun Pintar */}
                          <button 
                            onClick={() => {
                              if (src && src.startsWith('blob:')) {
                                const link = document.createElement('a');
                                link.href = src;
                                link.download = `azmeer-ai-${item.uuid.substring(0, 6)}.mp4`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              } else {
                                forceDownload(url);
                              }
                            }}
                            className="w-12 h-12 rounded-2xl bg-white text-slate-950 flex items-center justify-center hover:bg-cyan-400 transition-all active:scale-90 shadow-xl"
                            title="Simpan Video"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          
                          {/* Butang Buka Terus (Failsafe) */}
                          <button 
                            onClick={() => forceDownload(url)}
                            className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center hover:text-cyan-400 transition-all"
                            title="Buka Pautan Asal"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
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