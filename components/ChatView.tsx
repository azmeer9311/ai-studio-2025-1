
import React, { useState, useRef, useEffect } from 'react';
import { generateText, generateTTS, checkSoraStatus } from '../services/geminiService';
import { ChatMessage } from '../types';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      content: "Hello! I'm Gemini Omnis. I can help you with creative writing, complex reasoning, and code. How can I assist you today?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const result = await generateText(input);
      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: result || 'I encountered an error generating a response.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTTS = async (message: ChatMessage) => {
    if (playingId === message.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    try {
      setPlayingId(message.id);
      const uuid = await generateTTS(message.content);
      
      // Poll for audio URL
      const poll = async () => {
        const history = await checkSoraStatus(uuid);
        if (history.status === 2 && history.generated_audio?.[0]?.audio_url) {
          const audioUrl = history.generated_audio[0].audio_url;
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play();
          }
        } else if (history.status === 1) {
          setTimeout(poll, 2000);
        } else {
          setPlayingId(null);
        }
      };
      poll();
    } catch (error) {
      console.error("TTS failed:", error);
      setPlayingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <h2 className="text-sm font-semibold text-slate-300">Gemini 3 Flash Pro</h2>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`group relative max-w-[80%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'bg-slate-900 border border-slate-800 text-slate-200'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              
              {msg.role === 'model' && (
                <button 
                  onClick={() => handleTTS(msg)}
                  className={`absolute -right-10 top-2 p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 ${
                    playingId === msg.id ? 'bg-blue-600/20 text-blue-400 opacity-100' : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                  title="Speak message"
                >
                  {playingId === msg.id ? (
                    <div className="flex gap-0.5 items-center h-4">
                      <span className="w-0.5 bg-blue-400 animate-[bounce_0.6s_infinite_0s]"></span>
                      <span className="w-0.5 bg-blue-400 animate-[bounce_0.6s_infinite_0.2s]"></span>
                      <span className="w-0.5 bg-blue-400 animate-[bounce_0.6s_infinite_0.4s]"></span>
                    </div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
      </div>

      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingId(null)} 
        className="hidden" 
      />

      <div className="p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-2xl py-4 pl-6 pr-14 text-sm text-slate-200 outline-none transition-all group-hover:border-slate-700 focus:ring-4 focus:ring-blue-500/10"
          />
          <button
            disabled={isTyping || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 p-2 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-500 mt-4 uppercase tracking-widest">
          Gemini Omnis can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
};

export default ChatView;
