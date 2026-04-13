import React, { useState, useEffect } from 'react';
import { Bot, Message, Tone } from '../types';
import { db, doc, onSnapshot } from '../firebase';
import { generateChatResponseStream } from '../services/aiService';
import { Send, Loader2, Bot as BotIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export function StandaloneBot({ botId }: { botId: string }) {
  const [bot, setBot] = useState<Bot | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'bots', botId), (doc) => {
      if (doc.exists()) {
        const botData = { id: doc.id, ...doc.data() } as Bot;
        setBot(botData);
        if (messages.length === 0) {
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `Hi! I'm ${botData.name}. ${botData.description || 'How can I help you today?'}`,
            timestamp: Date.now()
          }]);
        }
      }
    });
    return () => unsubscribe();
  }, [botId]);

  const handleSend = async () => {
    if (!input.trim() || !bot || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMsg].map(m => ({ 
        role: (m.role === 'user' || m.role === 'assistant') ? m.role : 'user', 
        content: m.content 
      }));
      const { responseStream } = await generateChatResponseStream(chatHistory, {
        tone: (bot.tone as Tone) || 'Professional',
        voice: 'Second person',
        modelId: bot.modelId || 'gpt-4o',
        customSystemInstruction: bot.systemInstruction,
        customPrompt: bot.prompt,
        customWebsiteUrl: bot.websiteUrl,
        customFiles: bot.files,
        customTools: bot.tools
      });

      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMsgId, role: 'assistant', content: '', timestamp: Date.now() }]);

      let fullText = '';
      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: fullText } : m));
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Sorry, I encountered an error.', timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!bot) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>;

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center gap-3 p-4 border-b border-zinc-100 bg-zinc-50/50">
        <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-white overflow-hidden shadow-sm">
          {bot.avatar ? (
            <img src={bot.avatar} alt={bot.name} className="w-full h-full object-cover" />
          ) : (
            <BotIcon className="w-5 h-5" />
          )}
        </div>
        <div>
          <h1 className="font-bold text-zinc-950 tracking-tight">{bot.name}</h1>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{bot.username}</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-900'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-zinc-400"
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Thinking</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-100">
        <div className="flex gap-2 max-w-4xl mx-auto items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/10"
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className="px-4 py-3 bg-zinc-950 text-white rounded-xl disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
