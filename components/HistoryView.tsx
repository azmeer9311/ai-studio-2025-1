
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllHistory, getSpecificHistory, prepareAuthenticatedUrl, getProxiedMediaUrl, fetchVideoAsBlob } from '../services/geminiService';
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
    if (item.generated_video && Array.isArray(item.generated_video) && item.generated_video.length > 0) {
      const v = item.generated_video[0];
      return v.video_url || v.video_uri || v.url || '';
    }
    if (item.generate_result) {
      const res = item.generate_result;
      if (typeof res === 'string') {
        if (res.startsWith('http')) return res;
        try {
          const parsed = JSON.parse(res);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0].video_url || parsed[0].video_uri || parsed[0].url || '';
          }
          return parsed.video_url || parsed.video_uri || parsed.url || '';
        } catch (e) {
          if (res.includes('.mp4')) return res;
        }
      } else if (typeof res === 'object') {
        return res.video_url || res.video_uri || res.url || '';
      }
    }
    return item.video_url || item.video_uri || item.url || item.file_download_url || '';
  };

  const fetchHistory = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const response = await getAllHistory(1, 100); 
      const items = response?.result || response?.data || (Array.isArray(response) ? response : []);
      
      if (Array.isArray(items)) {
        // Capture Sora/Video items correctly
        const filteredItems = items.filter((item: any) => {
          const type = (item.type || '').toLowerCase();
          const model = (item.model_name || '').toLowerCase();
          const processing = Number(item.status) === 1;
          return processing || type.includes('video') || model.includes('sora') || model.includes('veo') || item.generated_video;
        });
        
        setHistory(filteredItems);

        // SYNC: Auto-poll if any generation is active (Status 1)
        const hasActiveTasks = filteredItems.some(item => Number(item.status) === 1);
        
        if (pollingTimerRef.current) window.clearTimeout(pollingTimerRef.current);
        
        if (hasActiveTasks) {
          // Poll every 2 seconds for high-fidelity updates
          pollingTimerRef.current = window.setTimeout(() => fetchHistory(false), 2000);
        }
      } else {
        setHistory([]);
      }
    } catch (err: any) {
      console.error("Vault retrieval failed:", err);
      if (showLoading) setError("Connection failed. Sila refresh manual Vault hampa.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(true);
    
    // Background sync safety
    const backgroundInterval = setInterval(() => fetchHistory(false), 20000);
    
    // Global Event Listener for real-time refresh signal from Studio
    const handleSync = () => fetchHistory(false);
    window.addEventListener('sync_vault_signal', handleSync);
    
    return () => {
      if (pollingTimerRef.current) window.clearTimeout(pollingTimerRef.current);
      clearInterval(backgroundInterval);
      window.removeEventListener('sync_vault_signal', handleSync);
    };
  }, [fetchHistory]);

  const handlePlay = async (item: SoraHistoryItem) => {
    const uuid = item.uuid;
    if (activeVideo[uuid]) return;

    setIsProcessing(prev => ({ ...prev, [uuid]: true }));
    try {
      let url = resolveVideoUrl(item);
      
      if (!url) {
        const detailsResponse = await getSpecificHistory(uuid);
        const details = detailsResponse?.data || detailsResponse?.result || detailsResponse;
        url = resolveVideoUrl(details);
        setHistory(prev => prev.map(h => h.uuid === uuid ? { ...h, ...details } : h));
      }

      if (url) {
        const blobUrl = await fetchVideoAsBlob(url);
        setActiveVideo(prev => ({ ...prev, [uuid]: blobUrl }));
      } else {
        throw new Error("Pautan video tidak ditemui.");
      }
    } catch (e: any) {
      alert(`Gagal memuatkan pratonton: ${e.message}`);
    } finally {
      setIsProcessing(prev => ({ ...prev, [uuid]: false }));
    }
  };

  const handleDownload = async (item: SoraHistoryItem) => {
    const uuid = item.uuid;
    setIsProcessing(prev => ({ ...prev, [uuid]: true }));
    try {
      let url = resolveVideoUrl(item);
      if (!url) {
        const details = await getSpecificHistory(uuid);
        url = resolveVideoUrl(details?.data || details?.result || details);
      }
      
      if (url) {
        const blobUrl = await fetchVideoAsBlob(url);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', `SoraVideo_${uuid.substring(0, 8)}.mp4`);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
      } else {
        alert("Video belum sedia.");
      }
    } catch (e: any) {
      alert(`Ralat muat turun.`);
    } finally {
      setIsProcessing(prev => ({ ...prev, [uuid]: false }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] p-4 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-8 md:mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2 md:mb-3">
              <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
              <p className="text-cyan-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em]">vault</p>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
              Vault <span className="text-slate-800">Archive</span>
            </h2>
          </div>
          <button 
            onClick={() => fetchHistory(true)} 
            disabled={loading} 
            className="w-full lg:w-auto px-8 py-4 rounded-2xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Penyelarasan...' : 'Refresh Vault'}
          </button>
        </header>

        {error && (
          <div className="mb-8 p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-500 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
          </div>
        )}

        {history.length === 0 && !loading && !error ? (
          <div className="text-center py-20 md:py-40 border-2 border-dashed border-slate-900 rounded-[2rem] md:rounded-[3rem] bg-slate-900/10">
            <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] md:text-xs">Tiada rekod video dalam Vault hampa.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 pb-32">
            {history.map((item) => {
              const videoSrc = activeVideo[item.uuid];
              const processing = isProcessing[item.uuid];
              const status = Number(item.status);
              
              const progressRaw = (item as any).status_percentage || (item as any).progress || (item as any).percent || (item as any).percentage || 0;
              const progress = Math.floor(Math.min(100, Number(progressRaw)));

              return (
                <div key={item.uuid} className="group bg-[#0f172a]/30 border border-slate-800/50 rounded-[2rem] overflow-hidden hover:border-cyan-500/30 transition-all duration-500 flex flex-col shadow-lg">
                  <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                    {videoSrc ? (
                      <video src={videoSrc} className="w-full h-full object-cover" controls autoPlay playsInline loop />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950">
                        {status === 1 ? (
                           <div className="flex flex-col items-center gap-4">
                             <div className="w-10 h-10 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                             <span className="text-white font-black text-xl">{progress > 0 ? `${progress}%` : 'BAKING...'}</span>
                           </div>
                        ) : status === 3 ? (
                          <div className="text-center p-6 flex flex-col items-center gap-2">
                            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-[9px] text-rose-500 font-black uppercase">Render Gagal</span>
                          </div>
                        ) : item.thumbnail_url ? (
                          <img src={getProxiedMediaUrl(item.thumbnail_url)} className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all duration-700" alt="Thumbnail" />
                        ) : (
                          <svg className="w-10 h-10 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        )}
                      </div>
                    )}

                    {!videoSrc && status === 2 && (
                      <button onClick={() => handlePlay(item)} disabled={processing} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                        <div className="w-14 h-14 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950 shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                          {processing ? <div className="w-5 h-5 border-4 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div> : <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="p-5 md:p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3 md:mb-4">
                      <div className="font-mono text-[8px] md:text-[9px] text-slate-500 tracking-tighter uppercase">{item.uuid.substring(0, 8)}...</div>
                      <div className="text-[8px] md:text-[9px] text-slate-600 font-bold">{new Date(item.created_at).toLocaleDateString()}</div>
                    </div>
                    <p className="text-slate-300 text-[10px] md:text-xs font-medium leading-relaxed line-clamp-3 mb-5 md:mb-6 flex-1 italic">
                      "{item.input_text || 'Tiada prompt.'}"
                    </p>
                    <div className="pt-4 border-t border-slate-800/40 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-widest">{item.status_desc}</span>
                        <span className="text-[7px] text-slate-700 font-bold uppercase">{item.model_name}</span>
                      </div>
                      <button onClick={() => handleDownload(item)} disabled={processing || status !== 2} className="p-2 md:p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all">
                         <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
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
