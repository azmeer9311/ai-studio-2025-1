
import React, { useState, useRef, useEffect } from 'react';
import { generateText } from '../services/geminiService';
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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <h2 className="text-sm font-semibold text-slate-300">Gemini 3 Flash Pro</h2>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'bg-slate-900 border border-slate-800 text-slate-200'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
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
