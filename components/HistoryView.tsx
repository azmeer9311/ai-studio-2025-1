import React, { useState, useEffect, useCallback } from 'react';
import { getAllHistory, getSpecificHistory, prepareAuthenticatedUrl, getProxiedLink } from '../services/geminiService';
import { SoraHistoryItem } from '../types';

const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<SoraHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<Record<string, string>>({});
  const [fetchingDetails, setFetchingDetails] = useState<Record<string, boolean>>({});

  /**
   * Strategi Resolusi URL Video mengikut dokumentasi:
   * 1. generate_result (Direct URL)
   * 2. generated_video[0].video_url (Detail URL)
   */
  const resolveVideoUrl = (item: any): string => {
    if (item.generate_result && typeof item.generate_result === 'string' && item.generate_result.startsWith('http')) {
      return item.generate_result;
    }
    if (item.generated_video && item.generated_video.length > 0) {
      return item.generated_video[0].video_url || item.generated_video[0].video_uri || '';
    }
    return '';
  };

  /**
   * Memainkan video. Jika URL tidak lengkap, kita tarik butiran khusus (Specific History).
   */
  const handlePlay = async (item: SoraHistoryItem) => {
    const uuid = item.uuid;
    let url = resolveVideoUrl(item);

    if (!url && Number(item.status) === 2) {
      setFetchingDetails(prev => ({ ...prev, [uuid]: true }));
      try {
        const details = await getSpecificHistory(uuid);
        url = resolveVideoUrl(details);
      } catch (e) {
        console.error("Gagal menarik butiran video:", e);
      } finally {
        setFetchingDetails(prev => ({ ...prev, [uuid]: false }));
      }
    }

    if (url) {
      // Gunakan proxied link untuk bypass CORS pada <video> tag
      setActiveVideo(prev => ({ ...prev, [uuid]: getProxiedLink(url) }));
    } else {
      alert("Maaf, pautan video tidak ditemui. Sila cuba refresh arkib.");
    }
  };

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllHistory(1);
      // Ikut format: response.result
      const items = response?.result || response?.data || [];
      
      if (Array.isArray(items)) {
        // Tapis hanya video atau sora models
        const videoHistory = items.filter((item: any) => 
          item.type?.toLowerCase().includes('video') || 
          item.model_name?.toLowerCase().includes('sora') ||
          item.model_name?.toLowerCase().includes('veo')
        );
        setHistory(videoHistory);
      }
    } catch (err: any) {
      setError("Gagal memuatkan Vault. Sila periksa sambungan internet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDownload = async (item: SoraHistoryItem) => {
    let url = resolveVideoUrl(item);
    
    // Jika tiada URL, tarik dari detail API
    if (!url) {
      try {
        const details = await getSpecificHistory(item.uuid);
        url = resolveVideoUrl(details);
      } catch (e) {}
    }

    if (url) {
      const authUrl = prepareAuthenticatedUrl(url);
      window.open(authUrl, '_blank');
    } else {
      alert("Pautan muat turun tidak tersedia.");
    }
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
          <div className="mb-10 p-6 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-black text-center uppercase tracking-widest">
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
              const src = activeVideo[item.uuid];
              const isFetching = fetchingDetails[item.uuid];
              const status = Number(item.status);

              return (
                <div key={item.uuid} className="group bg-[#0f172a]/40 border border-slate-800/60 rounded-[2.5rem] overflow-hidden flex flex-col hover:border-cyan-500/30 transition-all duration-500 shadow-2xl">
                  {/* Media Preview Area */}
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
                        <div className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] ${status === 2 ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' : 'text-amber-500 border-amber-500/20 bg-amber-500/10'}`}>
                          {status === 2 ? 'Siap' : status === 3 ? 'Gagal' : 'Rendering'}
                        </div>
                        
                        {status === 2 ? (
                          <button 
                            onClick={() => handlePlay(item)}
                            disabled={isFetching}
                            className="group/play flex flex-col items-center gap-4 transition-transform active:scale-95 disabled:opacity-50"
                          >
                            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-cyan-500 flex items-center justify-center group-hover/play:bg-cyan-500 group-hover/play:text-slate-950 transition-all shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                              {isFetching ? (
                                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest group-hover/play:text-cyan-400 transition-colors">
                              {isFetching ? 'Fetching Link...' : 'Tonton Video'}
                            </span>
                          </button>
                        ) : (
                          <svg className="w-12 h-12 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info Area */}
                  <div className="p-8 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        {new Date(item.created_at).toLocaleDateString('ms-MY')}
                      </span>
                      <span className="text-[10px] font-black text-slate-500 uppercase font-mono">#{item.uuid.substring(0, 8)}</span>
                    </div>

                    <p className="text-sm text-slate-300 font-medium line-clamp-2 mb-8 flex-1 italic leading-relaxed">
                      "{item.input_text || 'Tiada huraian disediakan'}"
                    </p>

                    <div className="mt-auto pt-6 border-t border-slate-800/60 flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className="text-[9px] font-black text-slate-500 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 uppercase">SORA 2</span>
                        <span className="text-[9px] font-black text-slate-500 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 uppercase">HD</span>
                      </div>

                      {status === 2 && (
                        <button 
                          onClick={() => handleDownload(item)}
                          className="px-6 h-12 rounded-2xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all active:scale-95 shadow-xl"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
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