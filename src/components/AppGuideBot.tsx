import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { generateChatResponse } from '../services/aiService';

export function AppGuideBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: "Hi there! I'm the Central Space Guide. I can help you navigate the app, explain features, or assist with your tasks. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const chatMessages = [...messages, { role: 'user' as const, content: userMessage }];
      
      const systemInstruction = `You are the Central Space App Guide Bot. Your job is to help users understand how to use this application.
The app features:
- Chat & Research: AI chat with multiple models (OpenAI, Anthropic), web search, and file uploads.
- Canvas: A visual workspace for diagrams and notes.
- Document Editor: A rich text editor for reports and articles.
- Library: A place to store and organize files and assets.
- Media Hub: Generate images and videos using AI.
- Bot Platform: Create and manage custom AI agents.
- Settings & Billing: Manage account, API keys, and subscription.

Be concise, helpful, and friendly. If the user asks you to perform a task, you can guide them to the right tab or provide the answer directly if it's a general question.`;

      const response = await generateChatResponse(chatMessages, {
        tone: 'Friendly',
        voice: 'First person',
        modelId: 'gpt-4o',
        customSystemInstruction: systemInstruction,
        searchEnabled: false
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
    } catch (error) {
      console.error("Guide Bot Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 p-4 bg-zinc-900 text-white rounded-full shadow-lg hover:bg-zinc-800 transition-colors z-50 flex items-center justify-center group"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="absolute right-full mr-4 bg-zinc-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              App Guide
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 text-sm">App Guide</h3>
                  <p className="text-xs text-zinc-500">Always here to help</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-zinc-200' : 'bg-zinc-900'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-zinc-600" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
                    msg.role === 'user'
                      ? 'bg-zinc-900 text-white rounded-tr-sm'
                      : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-white border border-zinc-200 rounded-tl-sm shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                    <span className="text-xs text-zinc-500">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-zinc-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
