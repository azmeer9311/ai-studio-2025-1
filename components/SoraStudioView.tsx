
import React, { useState, useEffect } from 'react';
import { generateSoraVideo, getSpecificHistory } from '../services/geminiService';

const SoraStudioView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<10 | 15 | 25>(10);
  const [resolution, setResolution] = useState<'small' | 'large'>('small');
  const [aspectRatio, setAspectRatio] = useState<'landscape' | 'portrait'>('landscape');

  // Specs: sora-2 (10/15s small), sora-2-pro (25s small), sora-2-pro-hd (15s large)
  // We automatically adjust resolution based on duration/user input to match API requirements
  useEffect(() => {
    if (duration === 25) {
      setResolution('small');
    }
  }, [duration]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setVideoUrl(null);
    setProgress(0);
    
    try {
      const { uuid } = await generateSoraVideo({
        prompt,
        duration,
        resolution,
        aspect_ratio: aspectRatio
      });
      
      const poll = async () => {
        try {
          const result = await getSpecificHistory(uuid);
          // Docs: status 1: processing, 2: completed, 3: failed
          if (result.status === 2) { 
            const url = result.generated_video?.[0]?.video_url || result.generate_result;
            setVideoUrl(url || null);
            setIsGenerating(false);
            setProgress(100);
          } else if (result.status === 3) {
            throw new Error(result.error_message || "Adoi, generation gagal. Cuba prompt lain jap.");
          } else {
            setProgress(result.status_percentage || progress + 1);
            setTimeout(poll, 5000);
          }
        } catch (e: any) {
          setIsGenerating(false);
          alert(e.message || "Something went wrong.");
        }
      };
      
      poll();
    } catch (error: any) {
      console.error(error);
      setIsGenerating(false);
      alert(error.message || "Sora generation failed. Sila check credit atau prompt.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] p-4 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full">
        <header className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em] border border-cyan-500/20">
            Jom Buat Video Padu
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">
            SORA <span className="text-cyan-500">2.0</span>
          </h2>
          <p className="text-slate-500 max-w-lg text-sm font-medium leading-relaxed">
            Tulis je apa hampa nak, biar azmeer ai buatkan video realistik guna teknologi Sora 2.0 yang paling power.
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-5 space-y-6">
            <div className="bg-[#0f172a]/60 backdrop-blur-xl border border-slate-800/50 p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"></div>
              
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Prompt Directorial</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Contoh: Drone shot terbang kat tengah bandar Kuala Lumpur tahun 2077, penuh lampu neon..."
                className="w-full h-48 bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-sm text-slate-200 outline-none focus:border-cyan-500/50 transition-all resize-none placeholder:text-slate-700 leading-relaxed font-medium"
              />
              
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Duration</label>
                  <div className="flex bg-slate-950 rounded-xl p-1 gap-1 border border-slate-800">
                    {[10, 15, 25].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d as any)}
                        className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${
                          duration === d ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {d}S
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Aspect Ratio</label>
                  <div className="flex bg-slate-950 rounded-xl p-1 gap-1 border border-slate-800">
                    <button
                      onClick={() => setAspectRatio('landscape')}
                      className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${
                        aspectRatio === 'landscape' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      16:9
                    </button>
                    <button
                      onClick={() => setAspectRatio('portrait')}
                      className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${
                        aspectRatio === 'portrait' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      9:16
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Resolution</label>
                <div className="flex bg-slate-950 rounded-xl p-1 gap-1 border border-slate-800">
                  <button
                    onClick={() => setResolution('small')}
                    className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${
                      resolution === 'small' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    720P
                  </button>
                  <button
                    disabled={duration === 25}
                    onClick={() => setResolution('large')}
                    className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all disabled:opacity-20 ${
                      resolution === 'large' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    1080P
                  </button>
                </div>
                {duration === 25 && <p className="text-[9px] text-yellow-500/50 mt-2 font-bold uppercase tracking-wider text-center">Note: 25s only supports 720p</p>}
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full mt-10 bg-white text-slate-950 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
                    <span>Sat ya, tengah render...</span>
                  </div>
                ) : (
                  <>
                    <span>Generate Video</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="xl:col-span-7">
            <div className={`aspect-video rounded-[2.5rem] overflow-hidden bg-[#0f172a]/60 backdrop-blur-xl border border-slate-800/50 flex items-center justify-center relative shadow-2xl ${aspectRatio === 'portrait' ? 'max-w-md mx-auto aspect-[9/16]' : ''}`}>
              {videoUrl ? (
                <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
              ) : isGenerating ? (
                <div className="text-center p-12 space-y-8">
                  <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="48" fill="none" stroke="#1e293b" strokeWidth="4" />
                      <circle 
                        cx="50" cy="50" r="48" 
                        fill="none" stroke="url(#studioGradient)" 
                        strokeWidth="4" 
                        strokeDasharray="301.59" 
                        strokeDashoffset={301.59 - (301.59 * progress / 100)} 
                        className="transition-all duration-700 ease-out" 
                      />
                      <defs>
                        <linearGradient id="studioGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="text-center">
                      <span className="text-4xl font-black text-white">{Math.floor(progress)}%</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-cyan-400 font-black uppercase tracking-[0.2em] animate-pulse text-xs">Tengah Synthesize Frame</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Azmeer AI tengah render fizik video hampa</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6 opacity-40 group">
                  <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800 group-hover:scale-110 transition-transform">
                    <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-black uppercase tracking-widest text-sm mb-1">Preview Kat Sini</p>
                    <p className="text-xs text-slate-500 font-bold">Tulis prompt kat sebelah pastu klik generate k!</p>
                  </div>
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
