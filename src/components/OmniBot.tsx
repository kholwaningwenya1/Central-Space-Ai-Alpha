import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Mic, Send, Paperclip, Loader2, Maximize2, Minimize2, Settings } from 'lucide-react';
import { Message } from '../types';
import { generateChatResponseStream } from '../services/aiService';
import { toast } from 'sonner';

interface OmniBotProps {
  onClose: () => void;
}

export function OmniBot({ onClose }: OmniBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<'ask_first' | 'ask_as_needed' | 'auto_decide'>('ask_as_needed');
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: "Hi! I'm your OmniBot. I can help you navigate the app, edit documents, analyze data, and more. How can I assist you today?",
    timestamp: Date.now()
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && !isLoading) return;

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
        tone: 'Professional',
        voice: 'Second person',
        modelId: 'gpt-4o',
        customSystemInstruction: `You are OmniBot, an advanced AI assistant integrated directly into this application. 
Your capabilities include:
1. Navigating the app and automating user desires.
2. Asking for user preferences (e.g., Visual Style, Aspect Ratio) when needed, or deciding for them if they prefer.
3. Controlling the app through text or voice commands.
4. Processing files of all formats (zip, images, documents, csv, txt, word, pdf, xlsx, excel, themes, code, mp3, mp4, contacts).
5. Assisting with document editing, formatting macros, and Excel/Power BI-like data analysis.
6. Generating report templates and business proposals from scratch.
7. Enhancing the visual canvas with next-generation features.

Current User Mode: ${mode}
- If 'ask_first': Ask the user for all necessary information before performing any action.
- If 'ask_as_needed': Perform actions but ask for clarification if something is ambiguous.
- If 'auto_decide': Make decisions on behalf of the user without asking, assuming the most likely preference.

Always be helpful, concise, and proactive. If a user asks you to perform an action in the app, explain how you would do it or simulate the action if possible.`
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
      toast.error('Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListen = () => {
    if (isListening) {
      setIsListening(false);
      // Stop speech recognition (mock implementation for now)
    } else {
      setIsListening(true);
      toast.info('Listening... (Voice recognition simulated)');
      setTimeout(() => {
        setIsListening(false);
        setInput('Can you help me format this document?');
      }, 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      toast.success(`Received ${files.length} file(s). Ready to process.`);
      // In a real implementation, we would read these files and add them to the context
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ x: window.innerWidth - 400, y: 80 }}
      className="fixed z-[9999] flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-zinc-200/50 bg-white/90 backdrop-blur-xl"
      style={{ 
        width: isExpanded ? '600px' : '350px', 
        height: isExpanded ? '800px' : isOpen ? '500px' : 'auto',
        maxHeight: '90vh',
        maxWidth: '90vw'
      }}
    >
      {/* Header (Draggable Area) */}
      <div className="flex items-center justify-between p-3 bg-zinc-950 text-white cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2" onClick={() => !isOpen && setIsOpen(true)}>
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold tracking-tight">OmniBot</span>
        </div>
        <div className="flex items-center gap-1">
          {isOpen && (
            <>
              <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                <Minimize2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="p-2 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium px-2">Mode:</span>
              <div className="flex bg-zinc-200/50 p-0.5 rounded-lg">
                <button 
                  onClick={() => setMode('ask_first')}
                  className={`px-2 py-1 rounded-md transition-all ${mode === 'ask_first' ? 'bg-white shadow-sm text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Ask First
                </button>
                <button 
                  onClick={() => setMode('ask_as_needed')}
                  className={`px-2 py-1 rounded-md transition-all ${mode === 'ask_as_needed' ? 'bg-white shadow-sm text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Ask As Needed
                </button>
                <button 
                  onClick={() => setMode('auto_decide')}
                  className={`px-2 py-1 rounded-md transition-all ${mode === 'auto_decide' ? 'bg-white shadow-sm text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Auto Decide
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-900'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-100 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                    <span className="text-xs font-medium text-zinc-500">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-zinc-100 bg-white">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                  title="Upload files (zip, images, docs, xlsx, etc.)"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple 
                  onChange={handleFileUpload}
                />
                
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask OmniBot to do anything..."
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                
                <button 
                  onClick={toggleListen}
                  className={`p-2 rounded-xl transition-colors ${isListening ? 'bg-red-100 text-red-600' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
                >
                  <Mic className="w-5 h-5" />
                </button>
                
                <button 
                  onClick={handleSend} 
                  disabled={isLoading || !input.trim()} 
                  className="p-2 bg-indigo-600 text-white rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
