import React, { useState, useRef, useEffect } from 'react';
import { generateSoraVideo, getSpecificHistory, fetchVideoAsBlob } from '../services/geminiService';
import { generateUGCPrompt } from '../services/openaiService';
import { AppView } from '../types';

interface SoraStudioViewProps {
  onViewChange?: (view: AppView) => void;
}

const SoraStudioView: React.FC<SoraStudioViewProps> = ({ onViewChange }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [duration, setDuration] = useState<10 | 15>(15); // Default to 15s as requested
  const [aspectRatio, setAspectRatio] = useState<'landscape' | 'portrait'>('portrait'); // UGC usually portrait
  
  // UGC Wizard States
  const [isWizardLoading, setIsWizardLoading] = useState(false);
  const [wizardGender, setWizardGender] = useState<'lelaki' | 'perempuan'>('perempuan');
  const [wizardPlatform, setWizardPlatform] = useState<'tiktok' | 'facebook'>('tiktok');

  // Progress states
  const [generatingUuid, setGeneratingUuid] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<number | null>(null);
  const logoUrl = "https://i.ibb.co/xqgH2MQ4/Untitled-design-18.png";

  useEffect(() => {
    return () => {
      if (pollingRef.current) window.clearTimeout(pollingRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const data = response?.data || response?.result || response;
      if (data) {
        const currentStatus = Number(data.status);
        setProgress(data.status_percentage || 0);
        if (currentStatus === 1) {
          pollingRef.current = window.setTimeout(() => pollStatus(uuid), 4000);
        } else if (currentStatus === 2) {
          setIsGenerating(false);
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
        } else if (currentStatus === 3) {
          setIsGenerating(false);
          alert("Render gagal.");
        }
      }
    } catch (e) {
      pollingRef.current = window.setTimeout(() => pollStatus(uuid), 5000);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setProgress(0);
    setRenderedVideoUrl(null);
    try {
      const response = await generateSoraVideo({
        prompt,
        duration,
        aspect_ratio: aspectRatio,
        imageFile: selectedFile || undefined
      });
      const uuid = response?.data?.uuid || response?.uuid || response?.result?.uuid;
      if (uuid) pollStatus(uuid);
      else if (onViewChange) onViewChange(AppView.HISTORY);
    } catch (error: any) {
      setIsGenerating(false);
      alert(error.message || "Sora generation failed.");
    }
  };

  const handleMagicGenerate = async () => {
    if (!prompt.trim()) {
      alert("Sila masukkan penerangan produk ringkas dalam kotak prompt dahulu.");
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
    } catch (error: any) {
      alert("Gagal menjana prompt: " + error.message);
    } finally {
      setIsWizardLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] p-4 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full">
        <header className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 flex items-center gap-3 px-5 py-2 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em] border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
            <img src={logoUrl} alt="Logo" className="w-5 h-5 object-contain logo-glow-animate" />
            <span>Azmeer AI • Sora 2.0 Studio</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">
            SORA <span className="text-cyan-500">2.0</span>
          </h2>
          <p className="text-slate-500 max-w-lg text-sm font-medium leading-relaxed">
            Hampa boleh buat T2V atau upload gambar untuk I2V. Kini dengan <strong>UGC AI Wizard</strong>.
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-5 space-y-6">
            {/* UGC Wizard Control Panel */}
            <div className="bg-cyan-500/5 border border-cyan-500/20 p-6 rounded-[2rem] space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">UGC AI Wizard (GPT-4o)</span>
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Watak</label>
                  <select 
                    value={wizardGender} 
                    onChange={(e) => setWizardGender(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-[10px] text-white outline-none focus:border-cyan-500"
                  >
                    <option value="perempuan">Wanita (Hijab)</option>
                    <option value="lelaki">Lelaki (Sopan)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Platform</label>
                  <select 
                    value={wizardPlatform} 
                    onChange={(e) => setWizardPlatform(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-[10px] text-white outline-none focus:border-cyan-500"
                  >
                    <option value="tiktok">TikTok (Beg Kuning)</option>
                    <option value="facebook">FB (Learn More)</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleMagicGenerate}
                disabled={isWizardLoading || isGenerating}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                {isWizardLoading ? (
                   <div className="w-3 h-3 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                )}
                Jana Prompt UGC Pro
              </button>
            </div>

            <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-slate-800/50 p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Upload Gambar (I2V)</label>
                  {!filePreview ? (
                    <div onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all">
                      <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="text-xs font-bold text-slate-500">Pilih gambar...</span>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-800 group/preview">
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={() => fileInputRef.current?.click()} className="bg-white/10 p-3 rounded-full"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                        <button onClick={clearFile} className="bg-red-500/20 p-3 rounded-full"><svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Video Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Masukkan info produk kat sini dan tekan Jana Prompt UGC Pro..."
                    className="w-full h-40 bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-sm text-slate-200 outline-none focus:border-cyan-500/50 transition-all resize-none placeholder:text-slate-700 leading-relaxed font-medium"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Durasi</label>
                  <div className="flex bg-slate-950 rounded-xl p-1 gap-1 border border-slate-800">
                    {[10, 15].map((d) => (
                      <button key={d} onClick={() => setDuration(d as any)} disabled={isGenerating} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${duration === d ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>{d}S</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Ratio</label>
                  <div className="flex bg-slate-950 rounded-xl p-1 gap-1 border border-slate-800">
                    <button onClick={() => setAspectRatio('landscape')} disabled={isGenerating} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${aspectRatio === 'landscape' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-slate-500'}`}>16:9</button>
                    <button onClick={() => setAspectRatio('portrait')} disabled={isGenerating} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${aspectRatio === 'portrait' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-slate-500'}`}>9:16</button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full mt-8 bg-white text-slate-950 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
                    <span>Rendering... {progress}%</span>
                  </div>
                ) : (
                  <span>Generate Video</span>
                )}
              </button>
            </div>
          </div>

          <div className="xl:col-span-7">
            <div className={`aspect-video rounded-[2.5rem] overflow-hidden bg-[#0f172a]/60 backdrop-blur-xl border border-slate-800/50 flex items-center justify-center relative shadow-2xl transition-all duration-500 ${aspectRatio === 'portrait' ? 'max-w-md mx-auto aspect-[9/16]' : ''}`}>
              {renderedVideoUrl ? (
                <div className="w-full h-full relative group">
                  <video src={renderedVideoUrl} className="w-full h-full object-cover" controls autoPlay loop />
                </div>
              ) : isGenerating ? (
                <div className="text-center space-y-8 flex flex-col items-center">
                  <div className="relative">
                    <div className="w-32 h-32 border-8 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-black text-2xl tracking-tighter">{progress}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-white font-black uppercase tracking-[0.3em] text-sm animate-pulse">Tengah Render Video</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest max-w-[280px] mx-auto leading-relaxed">Sora 2.0 sedang menyusun bingkai cinematik hampa...</p>
                  </div>
                  <div className="w-64 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800/50">
                    <div className="h-full bg-cyan-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6 opacity-30">
                  <div className="w-20 h-20 mx-auto border-2 border-dashed border-slate-700 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-white font-black uppercase tracking-widest text-sm">Preview Viewport</p>
                </div>
              )}
            </div>
            
            {renderedVideoUrl && (
              <div className="mt-8 flex justify-center">
                <button 
                  onClick={() => onViewChange && onViewChange(AppView.HISTORY)}
                  className="px-8 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Lihat Dalam History Vault
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoraStudioView;