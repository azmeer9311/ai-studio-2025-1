
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { encodeBase64, decodeBase64, decodeAudioData } from '../services/geminiService';

const LiveOmniView: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsActive(false);
  }, []);

  const startSession = async () => {
    try {
      setIsActive(true);
      // Fix: Strictly use process.env.API_KEY for GoogleGenAI initialization as per SDK guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputAudioCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are Gemini Omnis, a highly advanced AI assistant. You are engaged in a real-time audio/video conversation. Be helpful, concise, and friendly.',
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            const source = inputAudioCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encodeBase64(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioCtx.destination);
            
            // Frame streaming
            const interval = setInterval(() => {
              if (videoRef.current && canvasRef.current && sessionRef.current) {
                const canvas = canvasRef.current;
                const video = videoRef.current;
                canvas.width = 320;
                canvas.height = 240;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64Frame = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Frame, mimeType: 'image/jpeg' } }));
              } else if (!sessionRef.current) {
                clearInterval(interval);
              }
            }, 1000);
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.inputTranscription) {
              const text = msg.serverContent.inputTranscription.text;
              setTranscriptions(prev => [...prev, { role: 'user', text }]);
            }
            if (msg.serverContent?.outputTranscription) {
              const text = msg.serverContent.outputTranscription.text;
              setTranscriptions(prev => [...prev, { role: 'model', text }]);
            }

            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const buffer = await decodeAudioData(decodeBase64(audioData), outputAudioCtx, 24000, 1);
              const source = outputAudioCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAudioCtx.destination);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioCtx.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => console.error('Live Error:', e),
          onclose: () => stopSession(),
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsActive(false);
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Omni Live</h2>
          <p className="text-slate-400 text-sm">Real-time multimodal interaction</p>
        </div>
        <button
          onClick={isActive ? stopSession : startSession}
          className={`px-8 py-3 rounded-2xl font-bold transition-all ${
            isActive 
              ? 'bg-red-600/20 text-red-500 border border-red-500/50 hover:bg-red-600/30' 
              : 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500'
          }`}
        >
          {isActive ? 'Disconnect' : 'Start Session'}
        </button>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-20'}`}
          />
          <canvas ref={canvasRef} className="hidden" />
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-700">
              <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {isActive && (
            <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live</span>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl flex flex-col min-h-0 shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Live Transcript</span>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-slate-700"></div>
              <div className="w-1 h-1 rounded-full bg-slate-700"></div>
              <div className="w-1 h-1 rounded-full bg-slate-700"></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {transcriptions.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 italic text-sm text-center px-10">
                Transcriptions will appear here once you start speaking...
              </div>
            ) : (
              transcriptions.map((t, idx) => (
                <div key={idx} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-slate-500 uppercase font-bold mb-1 px-2">{t.role}</span>
                  <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                    t.role === 'user' ? 'bg-blue-600/10 text-blue-200 border border-blue-500/20' : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {t.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <footer className="mt-6 flex items-center justify-center gap-8 text-slate-500">
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-800'}`}></div>
          Audio Sync
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]' : 'bg-slate-800'}`}></div>
          Visual Processing
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`}></div>
          Ultra-Low Latency
        </div>
      </footer>
    </div>
  );
};

export default LiveOmniView;
