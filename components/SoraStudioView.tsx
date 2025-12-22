
import React, { useState } from 'react';
import { generateSoraVideo, checkSoraStatus } from '../services/geminiService';

const SoraStudioView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<10 | 15 | 25>(10);
  const [resolution, setResolution] = useState<'small' | 'large'>('small');
  const [aspectRatio, setAspectRatio] = useState<'landscape' | 'portrait'>('landscape');

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
        const result = await checkSoraStatus(uuid);
        if (result.status === 2) { // Completed
          setVideoUrl(result.generated_video?.[0]?.video_url || null);
          setIsGenerating(false);
        } else if (result.status === 3) { // Failed
          throw new Error(result.error_message || "Generation failed");
        } else {
          // Update progress if available
          setProgress(result.status_percentage || progress + (100 - progress) * 0.1);
          setTimeout(poll, 5000);
        }
      };
      
      poll();
    } catch (error: any) {
      console.error(error);
      setIsGenerating(false);
      alert(error.message || "Sora generation failed. Please check your credits.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto w-full">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-4 border border-indigo-500/20">
            Next-Gen Video
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Sora Studio
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Experience state-of-the-art video synthesis with OpenAI Sora. 
            Create realistic scenes with physics-aware motions.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Cinematic Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A stylish woman walks down a Tokyo street filled with warm glowing neon and animated city signage..."
                className="w-full h-40 bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 outline-none focus:border-indigo-500/50 transition-all resize-none placeholder:text-slate-700"
              />
              
              <div className="space-y-6 mt-8">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Duration</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 15, 25].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d as 10 | 15 | 25)}
                        className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                          duration === d 
                            ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quality</label>
                    <select 
                      value={resolution} 
                      onChange={(e) => setResolution(e.target.value as 'small' | 'large')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 outline-none focus:border-indigo-500/50"
                    >
                      <option value="small">720p HD</option>
                      <option value="large">1080p FHD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Format</label>
                    <select 
                      value={aspectRatio} 
                      onChange={(e) => setAspectRatio(e.target.value as 'landscape' | 'portrait')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 outline-none focus:border-indigo-500/50"
                    >
                      <option value="landscape">16:9 Landscape</option>
                      <option value="portrait">9:16 Portrait</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full mt-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-3 group"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <span>Generate Masterpiece</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className={`aspect-video rounded-3xl overflow-hidden bg-slate-900/50 border border-slate-800 flex items-center justify-center relative group shadow-2xl ${aspectRatio === 'portrait' ? 'max-w-sm mx-auto aspect-[9/16]' : ''}`}>
              {videoUrl ? (
                <>
                  <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                  <a 
                    href={videoUrl} 
                    target="_blank"
                    download="sora-video.mp4"
                    className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </>
              ) : isGenerating ? (
                <div className="text-center p-12 space-y-6">
                  <div className="relative w-32 h-32 mx-auto">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-800" />
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" stroke="url(#gradient)" 
                        strokeWidth="4" 
                        strokeDasharray="283" 
                        strokeDashoffset={283 - (283 * progress / 100)} 
                        className="transition-all duration-500 ease-out" 
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">{Math.floor(progress)}%</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest">Sora AI</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-indigo-400 font-medium animate-pulse">Consulting the latent space...</p>
                    <p className="text-xs text-slate-600 italic">Sora creates temporal consistency which takes a moment.</p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 space-y-4 opacity-50">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                    <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-medium">Visual canvas ready.</p>
                  <p className="text-sm text-slate-600 max-w-xs mx-auto">Your high-fidelity AI video will materialize here after generation.</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 grid grid-cols-3 gap-6">
               <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Physics Engine</h4>
                  <p className="text-xs text-slate-400">Advanced awareness of mass and motion.</p>
               </div>
               <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Temporal Flow</h4>
                  <p className="text-xs text-slate-400">Consistent characters across complex shots.</p>
               </div>
               <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Visual Fidelity</h4>
                  <p className="text-xs text-slate-400">Realistic lighting and material textures.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoraStudioView;
