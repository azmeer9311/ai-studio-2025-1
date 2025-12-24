
import React, { useState, useRef, useEffect } from 'react';
import { generateSoraVideo, getSpecificHistory, fetchVideoAsBlob } from '../services/geminiService';
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
  
  // UGC Wizard States
  const [isWizardLoading, setIsWizardLoading] = useState(false);
  const [wizardGender, setWizardGender] = useState<'lelaki' | 'perempuan'>('perempuan');
  const [wizardPlatform, setWizardPlatform] = useState<'tiktok' | 'facebook'>('tiktok');

  // Progress states
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
        imageFile: selectedFile || undefined,
        userId: userProfile.id
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
      alert("Hampa kena taip sikit pasal produk hampa kat dalam kotak prompt tu dulu, baru saya boleh tolong jana skrip.");
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
      setAspectRatio('portrait'); // UGC auto portrait
    } catch (error: any) {
      alert("Gagal hubungi OpenAI: " + error.message);
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
            UGC <span className="text-cyan-500">STUDIO</span>
          </h2>
          <p className="text-slate-500 max-w-lg text-sm font-medium leading-relaxed">
            Hampa taip je info produk, biar AI kami (GPT-4o) jana prompt video 15 saat gaya influencer.
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-5 space-y-6">
            
            {/* UGC Wizard Interface */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 space-y-5">
              <div className="flex items-center justify-between">
                 <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">AI UGC Wizard</h3>
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                   <span className="text-[8px] font-bold text-slate-500 uppercase">GPT-4o Mini Active</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Karakter</label>
                  <select 
                    value={wizardGender}
                    onChange={(e) => setWizardGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-cyan-500/50 transition-all cursor-pointer"
                  >
                    <option value="perempuan">Wanita (Tudung)</option>
                    <option value="lelaki">Lelaki (Influencer)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-600 uppercase ml-1">Platform</label>
                  <select 
                    value={wizardPlatform}
                    onChange={(e) => setWizardPlatform(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-cyan-500/50 transition-all cursor-pointer"
                  >
                    <option value="tiktok">TikTok Ad</option>
                    <option value="facebook">Facebook Ad</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleMagicGenerate}
                disabled={isWizardLoading || isGenerating}
                className="w-full py-4 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                {isWizardLoading ? (
                  <div className="w-4 h-4 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                )}
                Jana Prompt UGC Pro
              </button>
            </div>

            {/* Main Prompt Area */}
            <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-slate-800/50 p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Upload Gambar (Optional)</label>
                  {!filePreview ? (
                    <div onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
                      <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="text-[9px] font-bold text-slate-600 uppercase">Guna sebagai rujukan</span>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-800">
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button onClick={clearFile} className="absolute top-2 right-2 bg-red-500 p-2 rounded-full text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Video Prompt & Script</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Contoh: 'Pencuci muka organik untuk kulit berminyak'..."
                    className="w-full h-44 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-xs text-slate-200 outline-none focus:border-cyan-500/50 transition-all resize-none custom-scrollbar font-medium leading-relaxed"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-center">
                   <div className="text-[8px] font-black text-slate-600 uppercase mb-1">Duration</div>
                   <div className="text-xs font-black text-white">{duration}S</div>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-center">
                   <div className="text-[8px] font-black text-slate-600 uppercase mb-1">Ratio</div>
                   <div className="text-xs font-black text-white">{aspectRatio === 'portrait' ? '9:16' : '16:9'}</div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full mt-8 bg-white text-slate-950 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-4 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                    <span>Rendering {progress}%</span>
                  </>
                ) : (
                  <span>Synthesize UGC Video</span>
                )}
              </button>
            </div>
          </div>

          <div className="xl:col-span-7">
            <div className={`aspect-video rounded-[2.5rem] overflow-hidden bg-[#0f172a]/40 backdrop-blur-xl border border-slate-800/50 flex items-center justify-center relative shadow-2xl transition-all duration-700 ${aspectRatio === 'portrait' ? 'max-w-[340px] mx-auto aspect-[9/16]' : ''}`}>
              {renderedVideoUrl ? (
                <video src={renderedVideoUrl} className="w-full h-full object-cover" controls autoPlay loop />
              ) : isGenerating ? (
                <div className="text-center space-y-6 flex flex-col items-center p-12">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-white font-black text-lg">{progress}%</div>
                  </div>
                  <p className="text-cyan-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Encoding Scene Transitions</p>
                </div>
              ) : (
                <div className="text-center p-12 opacity-20 group">
                   <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-slate-700 rounded-full flex items-center justify-center group-hover:border-cyan-500/50 transition-all">
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview Output</p>
                </div>
              )}
            </div>
            
            {renderedVideoUrl && (
              <div className="mt-8 flex justify-center">
                <button onClick={() => onViewChange?.(AppView.HISTORY)} className="px-10 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  Simpan Dalam Vault
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
