
import React, { useState, useRef, useEffect } from 'react';
import { generateSoraVideo, getSpecificHistory, fetchVideoAsBlob, getAllHistory } from '../services/geminiService';
import { generateUGCPrompt } from '../services/openaiService';
import { AppView, UserProfile } from '../types';

interface SoraStudioViewProps {
  onViewChange?: (view: AppView) => void;
  userProfile: UserProfile;
}

const SoraStudioView: React.FC<SoraStudioViewProps> = ({ onViewChange, userProfile }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [duration, setDuration] = useState<10 | 15>(15);
  const [aspectRatio, setAspectRatio] = useState<'landscape' | 'portrait'>('portrait');
  
  const [isWizardLoading, setIsWizardLoading] = useState(false);
  const [wizardGender, setWizardGender] = useState<'lelaki' | 'perempuan'>('perempuan');
  const [wizardPlatform, setWizardPlatform] = useState<'tiktok' | 'facebook'>('tiktok');

  const [progress, setProgress] = useState<number>(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [activeUuid, setActiveUuid] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<number | null>(null);
  const logoUrl = "https://i.ibb.co/xqgH2MQ4/Untitled-design-18.png";

  const isLocked = !userProfile.is_admin && (!userProfile.is_approved || userProfile.video_limit <= 0);

  // Track the most recent active job from the API to prevent "hilang" status
  useEffect(() => {
    const resumeTracking = async () => {
      try {
        const historyData = await getAllHistory(1, 10);
        const items = historyData?.result || historyData?.data || [];
        const bakingItem = items.find((i: any) => Number(i.status) === 1);
        
        if (bakingItem && !isGenerating) {
          setIsGenerating(true);
          setActiveUuid(bakingItem.uuid);
          pollStatus(bakingItem.uuid);
        }
      } catch (e) {
        console.error("Tracking recovery failed:", e);
      }
    };
    resumeTracking();

    return () => {
      if (pollingRef.current) window.clearTimeout(pollingRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const pollStatus = async (uuid: string) => {
    try {
      const response = await getSpecificHistory(uuid);
      const data = response?.data || response?.result || (response?.uuid ? response : null);
      
      if (data) {
        const currentStatus = Number(data.status);
        
        const apiProgress = Number(data.status_percentage) || 
                           Number(data.progress) || 
                           Number(data.percent) || 
                           Number(data.percentage) || 0;
        
        // Stabilize progress rendering
        const currentProgress = apiProgress > 0 ? apiProgress : (currentStatus === 1 ? Math.min(99, progress + 1) : 0);
        setProgress(Math.floor(currentProgress));

        // Sync signal to Vault
        window.dispatchEvent(new CustomEvent('sync_vault_signal'));

        if (currentStatus === 1) {
          pollingRef.current = window.setTimeout(() => pollStatus(uuid), 2500);
        } else if (currentStatus === 2) {
          setIsGenerating(false);
          setActiveUuid(null);
          setProgress(100);
          
          let videoUrl = '';
          if (data.generated_video && data.generated_video.length > 0) {
            videoUrl = data.generated_video[0].video_url || data.generated_video[0].video_uri;
          } else if (data.generate_result) {
            try {
              const parsed = typeof data.generate_result === 'string' ? JSON.parse(data.generate_result) : data.generate_result;
              videoUrl = parsed.video_url || (Array.isArray(parsed) ? parsed[0]?.video_url : '');
            } catch (e) {}
          }
          
          if (videoUrl) {
            const blob = await fetchVideoAsBlob(videoUrl);
            setRenderedVideoUrl(blob);
          }
          window.dispatchEvent(new CustomEvent('sync_vault_signal'));
        } else if (currentStatus === 3) {
          setIsGenerating(false);
          setActiveUuid(null);
          alert("Janaan video gagal di server. Sila cuba lagi.");
          window.dispatchEvent(new CustomEvent('sync_vault_signal'));
        }
      } else {
         // Data momentary null, retry faster
         pollingRef.current = window.setTimeout(() => pollStatus(uuid), 1500);
      }
    } catch (e) {
      // API momentary error, wait and retry
      pollingRef.current = window.setTimeout(() => pollStatus(uuid), 3000);
    }
  };

  const handleGenerate = async () => {
    if (isLocked || !prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setProgress(1); 
    setRenderedVideoUrl(null);
    try {
      const response = await generateSoraVideo({
        prompt,
        duration,
        aspect_ratio: aspectRatio,
        imageFile: selectedFile || undefined,
        userId: userProfile.id
      });
      
      const uuid = response?.data?.uuid || 
                   response?.uuid || 
                   response?.result?.uuid || 
                   response?.result?.data?.uuid || 
                   response?.data?.data?.uuid;

      if (uuid) {
        setActiveUuid(uuid);
        window.dispatchEvent(new CustomEvent('sync_vault_signal'));
        pollStatus(uuid);
      } else {
        alert("Enjin Sora tidak memulangkan UUID. Cuba refresh page.");
        setIsGenerating(false);
      }
    } catch (error: any) {
      setIsGenerating(false);
      alert(error.message || "Sora generation request failed.");
    }
  };

  const handleMagicGenerate = async () => {
    if (isLocked) return;
    if (!prompt.trim()) {
      alert("Masukkan huraian produk hampa dulu.");
      return;
    }
    setIsWizardLoading(true);
    try {
      const ugcPrompt = await generateUGCPrompt({
        productDescription: prompt,
        gender: wizardGender,
        platform: wizardPlatform
      });
      setPrompt(ugcPrompt);
      setDuration(15);
      if (wizardPlatform === 'tiktok') setAspectRatio('portrait');
    } catch (error: any) {
      alert("Ralat OpenAI: " + error.message);
    } finally {
      setIsWizardLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] p-4 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full">
        <header className="mb-6 md:mb-10 flex flex-col items-center text-center">
          <div className="mb-4 md:mb-6 flex items-center gap-3 px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
            <img src={logoUrl} alt="Logo" className="w-4 h-4 md:w-5 md:h-5 object-contain logo-glow-animate" />
            <span>Azmeer AI • Sora 2.0 Studio</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-2 md:mb-4 uppercase">
            UGC <span className="text-cyan-500">STUDIO</span>
          </h2>
          <p className="text-slate-500 max-w-lg text-[10px] md:text-sm font-medium leading-relaxed px-2">
            Pilih config dan taip prompt produk hampa untuk jana video iklan kualiti tinggi.
          </p>
        </header>

        {isLocked && (
          <div className="mb-6 p-4 md:p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl md:rounded-3xl text-center">
            <p className="text-[8px] md:text-[10px] font-black text-rose-500 uppercase tracking-widest">
              AKSES TERHAD: Sila tunggu kelulusan Admin.
            </p>
          </div>
        )}

        <div className={`grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 items-start ${isLocked ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <div className="xl:col-span-5 space-y-5 md:space-y-6">
            
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-5 md:p-6 space-y-4 md:space-y-5">
              <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-1">AI UGC Config</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Watak</label>
                  <select 
                    value={wizardGender}
                    onChange={(e) => setWizardGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-3 text-[10px] font-bold text-slate-300 uppercase outline-none focus:border-cyan-500/50"
                  >
                    <option value="perempuan">Perempuan</option>
                    <option value="lelaki">Lelaki</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Platform</label>
                  <select 
                    value={wizardPlatform}
                    onChange={(e) => setWizardPlatform(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-3 text-[10px] font-bold text-slate-300 uppercase outline-none focus:border-cyan-500/50"
                  >
                    <option value="tiktok">TikTok</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Tempoh</label>
                  <div className="flex gap-2">
                    {[10, 15].map(d => (
                      <button 
                        key={d}
                        onClick={() => setDuration(d as any)}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border ${duration === d ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                      >
                        {d}S
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Nisbah</label>
                  <div className="flex gap-2">
                    {['portrait', 'landscape'].map(r => (
                      <button 
                        key={r}
                        onClick={() => setAspectRatio(r as any)}
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${aspectRatio === r ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                      >
                        {r === 'portrait' ? '9:16' : '16:9'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-slate-800/50 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative">
              <div className="space-y-5 md:space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 md:mb-4 ml-1">Rujukan Gambar (Optional)</label>
                  {!filePreview ? (
                    <div onClick={() => !isLocked && fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-800 rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
                      <svg className="w-6 h-6 md:w-8 md:h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                      <span className="text-[8px] md:text-[9px] font-bold text-slate-600 uppercase tracking-wider">Tap to upload</span>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-800 group">
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button onClick={clearFile} className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full text-white shadow-xl group-hover:scale-110 transition-transform"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={isLocked} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 md:mb-4 ml-1">Video Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isLocked || isGenerating}
                    placeholder="Describe your product here..."
                    className="w-full h-32 md:h-44 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 md:p-5 text-[11px] md:text-xs text-slate-200 outline-none focus:border-cyan-500/50 transition-all resize-none custom-scrollbar font-medium leading-relaxed"
                  />
                </div>
              </div>

              <div className="mt-6 md:mt-8 space-y-3">
                <button 
                  onClick={handleMagicGenerate}
                  disabled={isLocked || isWizardLoading || isGenerating}
                  className="w-full py-3.5 md:py-4 bg-slate-900 border border-slate-800 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg"
                >
                  {isWizardLoading ? <div className="w-4 h-4 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" /></svg>}
                  {isWizardLoading ? 'Menyusun Skrip...' : 'Generate UGC Script'}
                </button>

                <button
                  onClick={handleGenerate}
                  disabled={isLocked || isGenerating || !prompt.trim()}
                  className="w-full bg-white text-slate-950 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 py-4 md:py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-4 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                      <span>Jana Video {progress}%</span>
                    </>
                  ) : (
                    <span>Mula Jana Video</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="xl:col-span-7 flex flex-col items-center">
            <div className={`w-full aspect-video rounded-[2rem] md:rounded-[2.5rem] overflow-hidden bg-[#0f172a]/40 backdrop-blur-xl border border-slate-800/50 flex items-center justify-center relative shadow-2xl transition-all duration-700 ${aspectRatio === 'portrait' ? 'max-w-[320px] md:max-w-[360px] aspect-[9/16]' : 'w-full'}`}>
              {renderedVideoUrl ? (
                <video src={renderedVideoUrl} className="w-full h-full object-cover" controls autoPlay loop playsInline />
              ) : isGenerating ? (
                <div className="text-center space-y-4 md:space-y-6 flex flex-col items-center p-8 md:p-12">
                  <div className="relative">
                    <div className="w-20 h-20 md:w-24 md:h-24 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-white font-black text-2xl">{progress}%</div>
                  </div>
                  <p className="text-cyan-500 font-black uppercase tracking-[0.3em] text-[10px] md:text-xs animate-pulse">Sora Engine Baking Video...</p>
                </div>
              ) : (
                <div className="text-center p-8 md:p-12 opacity-20">
                   <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 border-2 border-dashed border-slate-700 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Pratonton Hasil Video</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoraStudioView;
