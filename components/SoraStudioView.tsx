
import React, { useState } from 'react';
import { generateSoraVideo, checkGeminiGenHistory } from '../services/geminiService';

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
        const result = await checkGeminiGenHistory(uuid);
        if (result.status === 2) { // Completed
          setVideoUrl(result.generated_video?.[0]?.video_url || null);
          setIsGenerating(false);
          setProgress(100);
        } else if (result.status === 3) { // Failed
          throw new Error(result.error_message || "Generation failed. Please check your credit balance.");
        } else {
          // Update progress if available
          setProgress(result.status_percentage || progress + (100 - progress) * 0.05);
          setTimeout(poll, 4000);
        }
      };
      
      poll();
    } catch (error: any) {
      console.error(error);
      setIsGenerating(false);
      alert(error.message || "Sora generation failed. Ensure your prompt is detailed and you have sufficient credits.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto w-full">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-4 border border-indigo-500/20">
            Advanced Video Synthesis
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Sora 2.0 Studio
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Leverage OpenAI's Sora model to create physics-aware, cinematic videos from text descriptions.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Cinematic Description</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A gorgeous, detailed drone shot of a hidden emerald lagoon surrounded by jagged limestone cliffs, crystal clear water revealing ancient corals below..."
                className="w-full h-40 bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 outline-none focus:border-indigo-500/50 transition-all resize-none placeholder:text-slate-700"
              />
              
              <div className="space-y-6 mt-8">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Duration & Model</label>
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
                        {d}s {d === 25 ? '(Pro)' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 italic">25s requires sora-2-pro model.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Resolution</label>
                    <select 
                      value={resolution} 
                      onChange={(e) => setResolution(e.target.value as 'small' | 'large')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 outline-none focus:border-indigo-500/50"
                    >
                      <option value="small">720p (Fast)</option>
                      <option value="large">1080p (HQ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Aspect Ratio</label>
                    <select 
                      value={aspectRatio} 
                      onChange={(e) => setAspectRatio(e.target.value as 'landscape' | 'portrait')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-300 outline-none focus:border-indigo-500/50"
                    >
                      <option value="landscape">16:9 Cinema</option>
                      <option value="portrait">9:16 Mobile</option>
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
                    <span>Synthesizing...</span>
                  </div>
                ) : (
                  <>
                    <span>Generate Video</span>
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
                  <div className="absolute top-4 right-4 flex gap-2">
                    <a 
                      href={videoUrl} 
                      target="_blank"
                      download="sora-video.mp4"
                      className="bg-black/60 backdrop-blur-md p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      title="Download"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                </>
              ) : isGenerating ? (
                <div className="text-center p-12 space-y-6">
                  <div className="relative w-32 h-32 mx-auto">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-800" />
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" stroke="url(#soraGradient)" 
                        strokeWidth="4" 
                        strokeDasharray="283" 
                        strokeDashoffset={283 - (283 * progress / 100)} 
                        className="transition-all duration-500 ease-out" 
                      />
                      <defs>
                        <linearGradient id="soraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">{Math.floor(progress)}%</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest">Latent Space</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-indigo-400 font-medium animate-pulse">Consulting the diffusion model...</p>
                    <p className="text-xs text-slate-600">Sora is rendering complex physics interactions.</p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 space-y-4 opacity-50">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                    <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-medium">Ready for Generation</p>
                  <p className="text-sm text-slate-600 max-w-xs mx-auto">Describe your vision on the left to materialize a high-fidelity video here.</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 grid grid-cols-3 gap-6">
               <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Temporal Consistency</h4>
                  <p className="text-xs text-slate-400">Maintains character and object identity across frames.</p>
               </div>
               <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Visual Logic</h4>
                  <p className="text-xs text-slate-400">Deep understanding of real-world physics and light.</p>
               </div>
               <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Detailed Rendering</h4>
                  <p className="text-xs text-slate-400">Rich textures and realistic skin/fur/fluid dynamics.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoraStudioView;
