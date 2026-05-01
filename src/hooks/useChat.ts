import { useState, useCallback, useRef } from 'react';
import { Message, Bot, WorkspaceSession, UserProfile, FileData, UserSettings } from '../types';
import { generateChatResponseStream, generateSpeech, generateImageFromPrompt, findYouTubeLinks } from '../services/aiService';
import { db, updateDoc, doc, getDoc } from '../firebase';
import { toast } from 'sonner';
import { trackQuery } from '../lib/adTracking';
import { createNotification } from '../services/notificationService';
import { playNotificationSound } from '../lib/utils';
import { useSocket } from '../contexts/SocketContext';

export const useChat = (
  user: any,
  userProfile: UserProfile | null,
  currentSession: WorkspaceSession | null,
  currentSessionId: string | null,
  updateSession: (id: string, updates: Partial<WorkspaceSession>) => Promise<void>,
  setSessions: React.Dispatch<React.SetStateAction<WorkspaceSession[]>>,
  userLocation?: { latitude: number; longitude: number } | null
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<FileData[]>([]);
  
  const generateSmartSuggestions = async (lastAssistantMessage: string) => {
    if (!lastAssistantMessage) return [];
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Based on the following AI response, suggest 3 short, relevant follow-up questions or actions the user might want to take. Return ONLY a JSON array of strings.\n\nAI Response: "${lastAssistantMessage}"` }],
          settings: { modelId: 'gpt-4o-mini', customSystemInstruction: "You are a helpful assistant that returns ONLY a JSON array of strings." },
          modelId: 'gpt-4o-mini',
          searchEnabled: false
        })
      });
      if (!response.ok) throw new Error('Suggestions failed');
      const data = await response.json();
      let text = data.text || "[]";
      if (text.includes('```')) {
        text = text.replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, '$1').trim();
      }
      const suggestions = JSON.parse(text);
      return Array.isArray(suggestions) ? suggestions.slice(0, 3) : [];
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return [];
    }
  };

  const handleBotResponse = async (bot: Bot, userMessage: string, history: Message[]) => {
    if (!currentSessionId) return;
    
    const botMessageId = `bot-${Date.now()}`;
    const botMessage: Message = {
      id: botMessageId,
      role: 'bot',
      senderId: bot.id,
      senderName: bot.name,
      senderPhoto: bot.avatar,
      botId: bot.id,
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    };

    const sessionRef = doc(db, 'sessions', currentSessionId);
    await updateDoc(sessionRef, {
      messages: [...history, botMessage],
      updatedAt: Date.now(),
      id: currentSessionId
    });

    try {
      const chatHistory = history.map(m => ({
        role: (m.role === 'bot' || m.role === 'assistant') ? 'assistant' as const : 'user' as const,
        content: m.content,
        files: m.files
      }));

      const { responseStream } = await generateChatResponseStream(chatHistory, {
        tone: currentSession?.tone || 'Professional',
        voice: currentSession?.voice || 'First person',
        modelId: bot.modelId || 'gpt-4o',
        libraryContext: '',
        agentUnits: [],
        customSystemInstruction: bot.systemInstruction,
        customTools: bot.tools,
        isSuperAdminModeActive: userProfile?.isSuperAdminModeActive
      });

      let fullText = '';
      for await (const chunk of responseStream) {
        const c = chunk as any;
        if (c.text) {
          fullText += c.text;
          setSessions(prev => prev.map(s => s.id === currentSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === botMessageId ? { ...m, content: fullText } : m)
          } : s));
        }
      }

      const finalBotMessage = { ...botMessage, content: fullText, isStreaming: false };
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const currentMessages = sessionSnap.data().messages || [];
        const updatedMessages = currentMessages.map((m: any) => 
          m.id === botMessageId ? finalBotMessage : m
        );
        await updateDoc(sessionRef, {
          messages: updatedMessages,
          updatedAt: Date.now(),
          id: currentSessionId
        });
      }
    } catch (error) {
      console.error(`Error from bot ${bot.name}:`, error);
      const errorMsg = { ...botMessage, content: "I'm sorry, I encountered an error.", isStreaming: false };
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const currentMessages = sessionSnap.data().messages || [];
        const updatedMessages = currentMessages.map((m: any) => 
          m.id === botMessageId ? errorMsg : m
        );
        await updateDoc(sessionRef, {
          messages: updatedMessages,
          updatedAt: Date.now(),
          id: currentSessionId
        });
      }
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || isLoading || !currentSessionId || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      senderId: user.uid,
      senderName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      senderPhoto: user.photoURL || null,
      content: input,
      timestamp: Date.now(),
      files: pendingFiles,
    };

    trackQuery(input);
    const updatedMessages = [...(currentSession?.messages || []), userMessage];
    
    let title = currentSession?.title || 'New Workspace';
    if (updatedMessages.length === 1) {
      title = input.slice(0, 30) || 'New Workspace';
    }

    const activeBots = currentSession?.agentUnits || [];
    const botToTrigger = activeBots.find(b => {
      const username = b.username.replace('@', '').toLowerCase();
      const name = b.name.toLowerCase().replace(/\s+/g, '_');
      return input.startsWith(`/${username}`) || 
             input.startsWith(`/${name}`) ||
             input.toLowerCase().includes(`@${username}`) ||
             input.toLowerCase().includes(b.name.toLowerCase());
    });

    if (input.startsWith('/poll')) {
      const parts = input.split('\n');
      const question = parts[0].replace('/poll', '').trim();
      const options = parts.slice(1).map((opt, idx) => ({
        id: `opt_${idx}`,
        text: opt.trim(),
        votes: []
      }));

      if (question && options.length >= 2) {
        const pollMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          senderId: user.uid,
          senderName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
          senderPhoto: user.photoURL || null,
          content: `Poll: ${question}`,
          timestamp: Date.now(),
          poll: { question, options, isMultipleChoice: false, isAnonymous: false }
        };
        await updateDoc(doc(db, 'sessions', currentSessionId), {
          messages: [...(currentSession?.messages || []), pollMsg],
          updatedAt: Date.now(),
          id: currentSessionId
        });
        setInput('');
        return;
      }
    }

    await updateSession(currentSessionId, { messages: updatedMessages, title });
    setInput('');
    setPendingFiles([]);

    if (currentSession && currentSession.members.length > 1) {
      currentSession.members.forEach(memberId => {
        if (memberId !== user.uid) {
          createNotification({
            userId: memberId,
            title: 'New Message',
            message: `${user.displayName || 'A collaborator'} sent a message in "${title}"`,
            type: 'collaborator',
            link: `/sessions/${currentSessionId}`,
            metadata: { sessionId: currentSessionId, senderId: user.uid, senderName: user.displayName || 'A collaborator' }
          });
        }
      });
    }

    if (botToTrigger) {
      handleBotResponse(botToTrigger, input, updatedMessages);
    }

    const isWorkspace = currentSession?.type === 'workspace' || !currentSession?.type;
    const isMentioned = input.toLowerCase().includes('@ai') || input.toLowerCase().includes('assistant');
    
    if (!isWorkspace && !isMentioned) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const chatHistory = updatedMessages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content, files: m.files }));

      const libraryContext = !currentSession?.privacyMode 
        ? currentSession?.files.map(f => {
            if (f.type.includes('text') || f.type.includes('csv') || f.type.includes('json')) {
              try {
                const decoded = atob(f.data.split(',')[1]);
                return `[Library File: ${f.name}]\n${decoded.slice(0, 5000)}`;
              } catch (e) { return `[Library File: ${f.name}]\n(Error decoding)`; }
            }
            return `[Library File: ${f.name}]\n(Binary file)`;
          }).join('\n\n')
        : '';

      const { responseStream, agentDiscussion } = await generateChatResponseStream(chatHistory, { 
        tone: currentSession?.tone || 'Professional', 
        voice: currentSession?.voice || 'Second person',
        modelId: currentSession?.modelId || 'gpt-4o',
        searchEnabled: currentSession?.searchEnabled,
        libraryContext,
        agentUnits: currentSession?.agentUnits,
        isSuperAdminModeActive: userProfile?.isSuperAdminModeActive
      }, userLocation || undefined);

      const assistantMessageId = (Date.now() + 1).toString();
      let assistantContent = "";
      
      const initialAssistantMessage: Message = { id: assistantMessageId, role: 'assistant', content: "", timestamp: Date.now(), agentDiscussion };
      const messagesWithAssistant = [...updatedMessages, initialAssistantMessage];
      await updateSession(currentSessionId, { messages: messagesWithAssistant });

      for await (const chunk of responseStream) {
        const c = chunk as any;
        if (c.text) {
          assistantContent += c.text;
          setSessions(prev => prev.map(s => s.id === currentSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === assistantMessageId ? { ...m, content: assistantContent } : m)
          } : s));
        }
      }

      let finalAssistantMessage: Message = { id: assistantMessageId, role: 'assistant', content: assistantContent, timestamp: Date.now(), agentDiscussion };
      
      // Auto-features
      if (currentSession?.resultType === 'Audio' || currentSession?.resultType === 'Combination') {
        try { finalAssistantMessage.audioUrl = await generateSpeech(assistantContent, currentSession.ttsVoice || 'Kore'); } catch (e) {}
      }
      if (currentSession?.resultType === 'Image Sketches' || currentSession?.resultType === 'Combination') {
        try { finalAssistantMessage.imageUrl = await generateImageFromPrompt(`Sketch: ${assistantContent.substring(0, 200)}`); } catch (e) {}
      }

      await updateSession(currentSessionId, { messages: [...updatedMessages, finalAssistantMessage] });
      const suggestions = await generateSmartSuggestions(assistantContent);
      setSmartSuggestions(suggestions);
      playNotificationSound();
    } catch (error: any) {
      console.error('Error generating response:', error);
      const errorMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: "Failed to generate response.", timestamp: Date.now() };
      await updateSession(currentSessionId, { messages: [...updatedMessages, errorMessage] });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading, setIsLoading,
    isGeneratingImage, setIsGeneratingImage,
    isGeneratingVideo, setIsGeneratingVideo,
    smartSuggestions, setSmartSuggestions,
    input, setInput,
    pendingFiles, setPendingFiles,
    handleSend
  };
};
