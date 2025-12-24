
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllHistory, getSpecificHistory, fetchVideoAsBlob } from '../services/geminiService';
import { SoraHistoryItem, UserProfile } from '../types';

interface HistoryViewProps {
  userProfile: UserProfile;
}

const HistoryView: React.FC<HistoryViewProps> = ({ userProfile }) => {
  const [history, setHistory] = useState<SoraHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const pollingTimerRef = useRef<number | null>(null);

  const resolveVideoUrl = (item: any): string => {
    if (!item) return '';
    if (item.generated_video && item.generated_video.length > 0) {
      const vid = item.generated_video[0];
      return vid.video_url || vid.video_uri || '';
    }
    if (item.generate_result && typeof item.generate_result === 'string') {
      if (item.generate_result.startsWith('http') || !item.generate_result.includes('{')) {
        return item.generate_result;
      }
      try {
        const parsed = JSON.parse(item.generate_result);
        if (Array.isArray(parsed) && parsed[0]?.video_url) return parsed[0].video_url;
        if (parsed.video_url) return parsed.video_url;
      } catch (e) {}
    }
    return '';
  };

  const fetchHistory = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const response = await getAllHistory(1, 100); // Ambil lebih banyak untuk filtering
      const items = response?.result || response?.data || (Array.isArray(response) ? response : []);
      
      if (Array.isArray(items)) {
        const now = Date.now();
        const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

        // FILTER LOGIC:
        // 1. Mesti jenis video/sora.
        // 2. Mesti user_id yang sama dengan userProfile.id (Self-only).
        // 3. Mesti dijana kurang dari 3 jam yang lepas.
        const filteredItems = items.filter((item: any) => {
          const isVideo = item.type?.toLowerCase().includes('video') || 
                          item.model_name?.toLowerCase().includes('sora');
          
          // Pastikan perbandingan ID adalah string-safe
          const isMine = item.user_id?.toString() === userProfile.id.toString();
          
          const createdTime = new Date(item.created_at).getTime();
          const isRecent = (now - createdTime) < THREE_HOURS_MS;

          return isVideo && isMine && isRecent;
        });
        
        setHistory(filteredItems);

        // Sentiasa poll jika ada video tengah "Rendering"
        const hasActiveTasks = filteredItems.some(item => Number(item.status) === 1);
        if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = window.setTimeout(() => fetchHistory(false), 5000);
      } else {
        setHistory([]);
      }
    } catch (err: any) {
      console.error("Gagal sync vault:", err);
      if (showLoading) setError("Gagal memuatkan rekod arkib dari Geminigen.ai.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [userProfile.id]);

  useEffect(() => {
    fetchHistory(true);
    const retryInitial = setTimeout(() => fetchHistory(false), 2000);
    return () => {
      clearTimeout(retryInitial);
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    };
  }, [fetchHistory]);

  const handlePlay = async (item: SoraHistoryItem) => {
    const uuid = item.uuid;
    if (activeVideo[uuid]) return;

    setIsProcessing(prev => ({ ...prev, [uuid]: true }));
    try {
      let url = resolveVideoUrl(item);

      if (!url || !url.startsWith('http')) {
        const detailsResponse = await getSpecificHistory(uuid);
        const details = detailsResponse?.data || detailsResponse?.result || detailsResponse;
        url = resolveVideoUrl(details);
        setHistory(prev => prev.map(h => h.uuid === uuid ? { ...h, ...details } : h));
      }

      if (url) {
        const blobUrl = await fetchVideoAsBlob(url);
        setActiveVideo(prev => ({ ...prev, [uuid]: blobUrl }));
      } else {
        throw new Error("Punca media tidak dijumpai.");
      }
    } catch (e: any) {
      console.error("Gagal memuatkan video:", e);
      alert(`Gagal memuatkan video: ${e.message}`);
    } finally {
      setIsProcessing(prev => ({ ...prev, [uuid]: false }));
    }
  };

  const handleDownload = async (item: SoraHistoryItem) => {
    const uuid = item.uuid;
    setIsProcessing(prev => ({ ...prev, [uuid]: true }));
    
    try {
      let url = resolveVideoUrl(item);
      if (!url || !url.startsWith('http')) {
        const details = await getSpecificHistory(uuid);
        url = resolveVideoUrl(details?.data || details?.result || details);
      }

      if (url) {
        const blobUrl = await fetchVideoAsBlob(url);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `azmeer-studio-${uuid}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        throw new Error("Punca media tidak dijumpai.");
      }
    } catch (e: any) {
      console.error("Gagal muat turun:", e);
      alert(`Proses muat turun gagal: ${e.message}`);
    } finally {
      setIsProcessing(prev => ({ ...prev, [uuid]: false }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] p-6 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
              <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.5em]">azmeer ai</p>
            </div>
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">
              Vault <span className="text-slate-800">History</span>
            </h2>
            <p className="mt-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Media akan dipadam secara automatik selepas 3 jam.
            </p>
          </div>
          
          <button 
            onClick={() => fetchHistory(true)} 
            disabled={loading} 
            className="group px-8 py-4 rounded-2xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 shadow-xl"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Syncing...' : 'Refresh Vault'}
          </button>
        </header>

        {error && (
          <div className="mb-12 p-8 rounded-3xl bg-rose-500/5 border border-rose-500/20 text-rose-500 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
          </div>
        )}

        {history.length === 0 && !loading ? (
          <div className="text-center py-40 border-2 border-dashed border-slate-900 rounded-[3rem] bg-slate-900/10">
            <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Tiada media dalam 3 jam terakhir.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-32">
            {history.map((item) => {
              const videoSrc = activeVideo[item.uuid];
              const processing = isProcessing[item.uuid];
              const status = Number(item.status);
              const progress = item.status_percentage || 0;

              return (
                <div key={item.uuid} className="group bg-[#0f172a]/30 border border-slate-800/50 rounded-[2.5rem] overflow-hidden hover:border-cyan-500/30 transition-all duration-500 flex flex-col">
                  {/* Media Viewport */}
                  <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                    {videoSrc ? (
                      <video src={videoSrc} className="w-full h-full object-cover" controls autoPlay playsInline loop />
                    ) : item.thumbnail_url ? (
                      <img src={item.thumbnail_url} className="w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 transition-all duration-700" alt="Thumbnail" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950">
                        {status === 1 ? (
                           <div className="flex flex-col items-center gap-4">
                             <div className="w-12 h-12 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                             <div className="flex flex-col items-center">
                               <span className="text-white font-black text-xl leading-none">{progress}%</span>
                               <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest mt-1 animate-pulse">Rendering</span>
                             </div>
                           </div>
                        ) : (
                          <svg className="w-12 h-12 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        )}
                      </div>
                    )}

                    {!videoSrc && status === 2 && (
                      <button 
                        onClick={() => handlePlay(item)}
                        disabled={processing}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]"
                      >
                        <div className="w-16 h-16 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.5)] transform scale-90 group-hover:scale-100 transition-transform duration-300">
                          {processing ? (
                            <div className="w-6 h-6 border-4 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          )}
                        </div>
                      </button>
                    )}

                    <div className="absolute top-4 right-4 flex gap-2">
                       {status === 1 && (
                         <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-widest border border-amber-500/20 animate-pulse">
                           Progress {progress}%
                         </span>
                       )}
                       {status === 3 && (
                         <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-500 text-[8px] font-black uppercase tracking-widest border border-rose-500/20">Error</span>
                       )}
                       <span className="px-3 py-1 rounded-full bg-slate-950/80 text-white text-[8px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md">
                         {item.model_name || 'SORA 2.0'}
                       </span>
                    </div>
                  </div>

                  {/* Metadata Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className="font-mono text-[9px] text-slate-500 tracking-tighter uppercase">{item.uuid.substring(0, 13)}...</div>
                      <div className="text-[9px] text-slate-600 font-bold">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    
                    <p className="text-slate-300 text-xs font-medium leading-relaxed line-clamp-3 mb-6 flex-1 italic">
                      "{item.input_text || 'No prompt.'}"
                    </p>

                    <div className="pt-4 border-t border-slate-800/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${status === 2 ? 'bg-cyan-500' : status === 1 ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`}></div>
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{item.status_desc}</span>
                      </div>
                      
                      <button 
                        onClick={() => handleDownload(item)}
                        disabled={processing || status !== 2}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-20"
                        title="Download MP4"
                      >
                        {processing ? (
                          <div className="w-4 h-4 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        )}
                      </button>
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
