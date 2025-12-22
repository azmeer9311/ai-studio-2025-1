
import React, { useState, useEffect } from 'react';
import { startVideoGeneration, checkVideoStatus, fetchVideoContent } from '../services/geminiService';

const VideoStudioView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      const ok = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(ok);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasApiKey(true);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setVideoUrl(null);
    setStatusMessage('Initializing Veo Engine...');
    
    try {
      let operation = await startVideoGeneration(prompt);
      
      const poll = async () => {
        const result = await checkVideoStatus(operation);
        if (result.done) {
          setStatusMessage('Processing frames...');
          const uri = result.response?.generatedVideos?.[0]?.video?.uri;
          if (uri) {
            const blobUrl = await fetchVideoContent(uri);
            setVideoUrl(blobUrl);
            setIsGenerating(false);
          } else {
            throw new Error("Video URI not found");
          }
        } else {
          setStatusMessage('Generating cinematic frames (this may take a few minutes)...');
          setTimeout(poll, 10000);
        }
      };
      
      poll();
    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes('Requested entity was not found')) {
        setHasApiKey(false);
      }
      setIsGenerating(false);
      alert("Video generation failed. Please ensure you have a valid paid project key.");
    }
  };

  if (!hasApiKey) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
        <div className="bg-slate-900 border border-slate-800 p-10 rounded-3xl max-w-md">
          <h2 className="text-2xl font-bold mb-4">API Key Required</h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Video generation requires a specific API key from a paid GCP project. Please select your key to proceed to the Video Studio.
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold transition-all shadow-lg"
          >
            Select API Key
          </button>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            className="block mt-6 text-xs text-blue-400 hover:underline"
          >
            Learn more about billing
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto w-full">
        <header className="mb-10 text-center">
          <h2 className="text-3xl font-bold gradient-text mb-4">Video Studio</h2>
          <p className="text-slate-400">Powered by Veo 3.1. Cinematic synthesis from simple prompts.</p>
        </header>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl mb-8">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Directorial Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A drone shot flying through a lush tropical jungle, waterfalls cascading into turquoise pools, cinematic lighting, 4k..."
            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors resize-none"
          />
          <div className="flex justify-between items-center mt-6">
            <div className="text-xs text-slate-500">Resolution: 720p | Aspect: 16:9</div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-8 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 py-3 rounded-xl font-semibold transition-all shadow-lg"
            >
              {isGenerating ? 'Rendering...' : 'Synthesize Video'}
            </button>
          </div>
        </div>

        <div className="aspect-video bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center relative">
          {videoUrl ? (
            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
          ) : isGenerating ? (
            <div className="text-center p-12">
              <div className="mb-6 relative">
                <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-blue-400">VEO</div>
              </div>
              <p className="text-blue-400 font-medium animate-pulse mb-2">{statusMessage}</p>
              <p className="text-xs text-slate-600 italic">This usually takes 2-4 minutes. Grab a coffee!</p>
            </div>
          ) : (
            <div className="text-center p-12 opacity-40">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Video output will be rendered here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoStudioView;
