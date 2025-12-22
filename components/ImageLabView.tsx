
import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';

const ImageLabView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("1:1");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setResult(null);
    try {
      const url = await generateImage(prompt, aspectRatio);
      setResult(url);
    } catch (error) {
      console.error(error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto w-full">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold gradient-text mb-4">Image Lab</h2>
          <p className="text-slate-400">Transform your imagination into high-quality visual reality.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A futuristic city with flying cars and neon lights, hyper-realistic, 8k..."
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-blue-500/50 transition-colors resize-none"
              />
              
              <div className="mt-6">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["1:1", "16:9", "9:16"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 text-xs rounded-lg border transition-all ${
                        aspectRatio === ratio 
                          ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full mt-8 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 py-4 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Synthesizing...
                  </>
                ) : (
                  'Generate Image'
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="aspect-square bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden relative group">
              {result ? (
                <>
                  <img src={result} alt="Generated" className="w-full h-full object-contain" />
                  <a 
                    href={result} 
                    download="generated-image.png"
                    className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </>
              ) : isGenerating ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-slate-500 animate-pulse">Consulting the canvas of the digital realm...</p>
                </div>
              ) : (
                <div className="text-center space-y-4 px-10">
                  <svg className="w-16 h-16 text-slate-800 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-600 text-sm">Your masterpiece will appear here. Enter a prompt to begin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageLabView;
