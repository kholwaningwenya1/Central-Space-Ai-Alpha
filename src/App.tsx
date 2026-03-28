import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { AppNotification } from './types';
import { subscribeToNotifications, markNotificationAsRead, deleteNotification, createNotification } from './services/notificationService';
import { Bell, BellOff, CheckCircle2, Info, AlertTriangle, XCircle, Bell as BellIcon } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { MessageBubble } from './components/MessageBubble';
import { Canvas } from './components/Canvas';
import { Library } from './components/Library';
import { Units } from './components/Units';
import { DocumentEditor } from './components/DocumentEditor';
import { Directory } from './components/Directory';
import { BotPlatform } from './components/BotPlatform';
import { MediaHub } from './components/MediaHub';
import { Settings } from './components/Settings';
import { Message, Tone, Voice, WorkspaceSession, FileData, SessionMode, Bot, Presence, ConversationType, Reaction, Poll, DocumentVersion, DocumentTemplate, UserProfile, SubscriptionPlan, UserRole, ResultType } from './types';
import { GoogleGenAI } from "@google/genai";
import { generateChatResponse, generateChatResponseStream, generateImageFromPrompt, generateVideoFromPrompt, transcribeAudio, translateText, findYouTubeLinks, generateSpeech } from './services/aiService';
import { LiveMode } from './components/LiveMode';
import { MobileLogin } from './components/MobileLogin';
import { useSocket } from './contexts/SocketContext';
import { Send, Loader2, PlusCircle, Trash2, Paperclip, X, Download, Mic, LogIn, LogOut, AlertCircle, MicOff, Search, FileText, FileSpreadsheet, Shield, Sparkles, Bot as BotIcon, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, db, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, 
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, getDoc, addDoc, User,
  handleFirestoreError, OperationType
} from './firebase';
import { AIModel } from './types';
import { cn, playNotificationSound } from './lib/utils';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-zinc-50 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Something went wrong</h2>
          <p className="text-zinc-500 mb-6 max-w-md">{this.state.error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const TRENDING_QUERIES = [
  "Draft a research outline on quantum computing",
  "Write a Python script for data cleaning",
  "Generate a professional report abstract",
  "Design a prompt for a futuristic city image",
  "Explain the impact of AI on modern healthcare",
  "Create a marketing strategy for a new SaaS product",
  "Summarize the latest advancements in solid-state batteries",
  "Write a React component for a drag-and-drop file uploader",
  "Develop a business plan for a sustainable fashion brand",
  "Analyze the economic effects of universal basic income",
  "Generate a 5-day workout plan for beginners",
  "Write a SQL query to find the top 10 customers by revenue",
  "Explain the concept of zero-knowledge proofs in cryptography",
  "Design a logo concept for an eco-friendly coffee shop",
  "Draft an email to investors providing a Q3 update",
  "Create a comprehensive guide to urban gardening",
  "Write a short sci-fi story about a rogue AI",
  "Explain the differences between GraphQL and REST APIs",
  "Develop a social media content calendar for a bakery",
  "Analyze the pros and cons of remote work for tech companies",
  "Generate a recipe for a vegan, gluten-free chocolate cake",
  "Write a bash script to automate server backups",
  "Explain the physics behind black holes to a 10-year-old",
  "Design a user onboarding flow for a mobile banking app",
  "Draft a press release for a new product launch",
  "Create a study schedule for the MCAT exam",
  "Write a Python script to scrape data from a website",
  "Explain the history and evolution of the internet",
  "Develop a pricing strategy for a subscription box service",
  "Analyze the environmental impact of electric vehicles",
  "Generate a list of 20 engaging blog post ideas for a travel blog",
  "Write a C++ program to implement a binary search tree",
  "Explain the principles of behavioral economics",
  "Design a landing page layout for a fitness app",
  "Draft a cover letter for a software engineering position",
  "Create a packing list for a 2-week trip to Japan",
  "Write a JavaScript function to debounce user input",
  "Explain the mechanics of CRISPR gene editing",
  "Develop a customer retention strategy for an e-commerce store",
  "Analyze the cultural significance of the Renaissance period"
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [sessions, setSessions] = useState<WorkspaceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileData[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isLiveModeOpen, setIsLiveModeOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<{ bot: Bot; command: { command: string; description: string } }[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const randomSuggestions = useMemo(() => {
    const shuffled = [...TRENDING_QUERIES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  }, [currentSessionId]);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const { socket, isConnected } = useSocket();
  const lastNotificationIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Check for API key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  // Socket room joining and presence
  useEffect(() => {
    if (socket && isConnected && currentSessionId && user) {
      socket.emit('join-room', { 
        roomId: currentSessionId, 
        user: { 
          id: user.uid, 
          name: user.displayName || 'Anonymous', 
          avatar: user.photoURL 
        } 
      });

      socket.on('presence-update', (users: any[]) => {
        setActiveUsers(users);
      });

      return () => {
        socket.off('presence-update');
      };
    }
  }, [socket, isConnected, currentSessionId, user]);

  const handleOpenSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success and proceed as per guidelines
      setHasApiKey(true);
    }
  };

  // Get user location for maps grounding
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }, (error) => {
        console.warn("Geolocation access denied or failed:", error);
      });
    }
  }, []);

  // Command suggestions logic
  useEffect(() => {
    if (input.startsWith('/')) {
      const query = input.slice(1).toLowerCase();
      const currentSession = sessions.find(s => s.id === currentSessionId);
      if (currentSession?.agentUnits) {
        const allCommands: { bot: Bot; command: { command: string; description: string } }[] = [];
        currentSession.agentUnits.forEach(bot => {
          bot.commands.forEach(cmd => {
            if (cmd.command.toLowerCase().includes(query)) {
              allCommands.push({ bot, command: cmd });
            }
          });
        });
        setFilteredCommands(allCommands);
        setShowCommandSuggestions(allCommands.length > 0);
      }
    } else {
      setShowCommandSuggestions(false);
    }
  }, [input, currentSessionId, sessions]);

  const handleTyping = useCallback(() => {
    if (!user || !currentSessionId) return;
    
    if (!isTyping) {
      setIsTyping(true);
      updateDoc(doc(db, 'sessions', currentSessionId), {
        [`typing.${user.uid}`]: Date.now()
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateDoc(doc(db, 'sessions', currentSessionId), {
        [`typing.${user.uid}`]: 0
      });
    }, 3000);
  }, [user, currentSessionId, isTyping]);

  const generateSmartSuggestions = async (lastAssistantMessage: string) => {
    if (!lastAssistantMessage) return [];
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on the following AI response, suggest 3 short, relevant follow-up questions or actions the user might want to take. Return ONLY a JSON array of strings.
        
        AI Response: "${lastAssistantMessage}"`,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const suggestions = JSON.parse(response.text || "[]");
      return suggestions.slice(0, 3);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return [];
    }
  };

  // Presence logic
  useEffect(() => {
    if (!user || !currentSessionId) return;

    const presenceRef = doc(db, 'sessions', currentSessionId);
    const updatePresence = async () => {
      const presence: Presence = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        photoURL: user.photoURL || undefined,
        lastActive: Date.now()
      };
      
      await setDoc(presenceRef, {
        presence: {
          [user.uid]: presence
        }
      }, { merge: true });
    };

    const interval = setInterval(updatePresence, 30000); // Update every 30s
    updatePresence();

    return () => clearInterval(interval);
  }, [user, currentSessionId]);

  // Load templates
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'templates'), where('creatorId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentTemplate));
      setTemplates(t);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveTemplate = async (template: Omit<DocumentTemplate, 'id' | 'creatorId' | 'createdAt'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'templates'), {
        ...template,
        creatorId: user.uid,
        createdAt: Date.now()
      });
      toast.success('Template saved successfully');
    } catch (error) {
      console.error('Failed to save template', error);
      toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteDoc(doc(db, 'templates', templateId));
      toast.success('Template deleted');
    } catch (error) {
      console.error('Failed to delete template', error);
      toast.error('Failed to delete template');
    }
  };

  const handleRevertVersion = async (version: DocumentVersion) => {
    if (!currentSessionId || !currentSession) return;
    try {
      await updateSession(currentSessionId, {
        documentData: version.content
      });
      toast.success('Reverted to version from ' + new Date(version.timestamp).toLocaleString());
    } catch (error) {
      console.error('Failed to revert version', error);
      toast.error('Failed to revert version');
    }
  };

  const handleSaveDocument = async (content: string) => {
    if (!currentSessionId || !currentSession || !user) return;
    
    const updates: Partial<WorkspaceSession> = { documentData: content };
    
    // Create a version if content changed and it's been more than 5 minutes since last version
    const lastVersion = currentSession.documentVersions?.[currentSession.documentVersions.length - 1];
    const shouldCreateVersion = !lastVersion || (Date.now() - lastVersion.timestamp > 5 * 60 * 1000);
    
    if (shouldCreateVersion && content !== lastVersion?.content) {
      const newVersion: DocumentVersion = {
        id: Math.random().toString(36).substring(7),
        content,
        timestamp: Date.now(),
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous'
      };
      updates.documentVersions = [...(currentSession.documentVersions || []), newVersion];
    }
    
    await updateSession(currentSessionId, updates);
  };

  const handleDocumentAIAction = async (action: string, context: string) => {
    if (!currentSessionId || !currentSession) return "";
    try {
      // Include library files in context if not in privacy mode
      const libraryContext = !currentSession.privacyMode 
        ? currentSession.files.filter(f => f.type.includes('text') || f.type.includes('csv') || f.type.includes('json')).map(f => {
            try {
              const decoded = atob(f.data.split(',')[1]);
              return `[File: ${f.name}]\n${decoded.slice(0, 2000)}`;
            } catch (e) {
              return `[File: ${f.name}] (Binary/Error)`;
            }
          }).join('\n\n')
        : '';

      const response = await generateChatResponse([{
        role: 'user',
        content: `${action}\n\nContext:\n${context}\n\n${libraryContext ? `Related Library Files:\n${libraryContext}` : ''}`
      }], {
        tone: currentSession.tone || 'Professional',
        voice: currentSession.voice || 'Second person',
        modelId: currentSession.modelId || 'gemini-3-flash-preview',
        libraryContext: "", // Already included in content
        isSuperAdminModeActive: userProfile?.isSuperAdminModeActive
      });
      return response.text;
    } catch (error) {
      console.error('Document AI action error:', error);
      return "Error generating response.";
    }
  };

  const handleGenerateVideo = async (prompt: string) => {
    if (!currentSessionId || isGeneratingVideo) return;
    
    // Check for API key before generating video
    if (window.aistudio?.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setHasApiKey(false);
        return;
      }
    }

    setIsGeneratingVideo(true);
    try {
      const videoUrl = await generateVideoFromPrompt(prompt);
      if (videoUrl) {
        const videoMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Generated video for: "${prompt}"`,
          timestamp: Date.now(),
          videoUrl
        };

        const updatedMessages = [...(currentSession?.messages || []), videoMessage];
        updateSession(currentSessionId, { messages: updatedMessages });

        if (user) {
          createNotification({
            userId: user.uid,
            title: 'Video Generated',
            message: `The AI has finished generating your video for: "${prompt.slice(0, 30)}..."`,
            type: 'bot',
            link: `/sessions/${currentSessionId}`,
            metadata: { sessionId: currentSessionId }
          });
        }
        playNotificationSound();
      }
    } catch (error) {
      console.error('Error generating video:', error);
    } finally {
      setIsGeneratingVideo(false);
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleGenerateImage = async (prompt: string) => {
    if (!currentSessionId || isGeneratingImage) return;
    
    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateImageFromPrompt(prompt);
      const imageMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Generated image for: "${prompt}"`,
        timestamp: Date.now(),
        imageUrl
      };

      const updatedMessages = [...(currentSession?.messages || []), imageMessage];
      updateSession(currentSessionId, { messages: updatedMessages });

      if (user) {
        createNotification({
          userId: user.uid,
          title: 'Image Generated',
          message: `The AI has finished generating your image for: "${prompt.slice(0, 30)}..."`,
          type: 'bot',
          link: `/sessions/${currentSessionId}`,
          metadata: { sessionId: currentSessionId }
        });
      }
      playNotificationSound();
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Auth listener
  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect login error:", error);
      toast.error("Login failed. Please try again.");
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Check if user is using password auth and is NOT verified
      if (user && user.providerData.some(p => p.providerId === 'password') && !user.emailVerified) {
        setUser(null);
        setIsAuthReady(true);
        return;
      }

      setUser(user);
      setIsAuthReady(true);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          
          // Initial fetch and setup
          const userSnap = await getDoc(userRef);
          const isSuperAdmin = user.email === "kholwaningwenya1@gmail.com";
          const whitelistedEmails = ["central46labs@gmail.com", "kholwani141@gmail.com", "centralspace00@gmail.com"];
          const isWhitelisted = whitelistedEmails.includes(user.email || "");

          if (!userSnap.exists()) {
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Anonymous',
              photoURL: user.photoURL || undefined,
              role: isSuperAdmin ? 'super_admin' : 'user',
              plan: isWhitelisted ? 'corporate' : 'free',
              isWhitelisted: isWhitelisted,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            await setDoc(userRef, newProfile);
            setUserProfile(newProfile);
          } else {
            const profile = userSnap.data() as UserProfile;
            let needsUpdate = false;
            
            if (isSuperAdmin && profile.role !== 'super_admin') {
              profile.role = 'super_admin';
              needsUpdate = true;
            }
            if (isWhitelisted && !profile.isWhitelisted) {
              profile.isWhitelisted = true;
              profile.plan = 'corporate';
              needsUpdate = true;
            }
            
            // Ensure required fields exist for older profiles
            if (!profile.plan) {
              profile.plan = isWhitelisted ? 'corporate' : 'free';
              needsUpdate = true;
            }
            if (!profile.createdAt) {
              profile.createdAt = Date.now();
              needsUpdate = true;
            }
            if (!profile.role) {
              profile.role = isSuperAdmin ? 'super_admin' : 'user';
              needsUpdate = true;
            }
            if (!profile.email) {
              profile.email = user.email || '';
              needsUpdate = true;
            }
            if (!profile.uid) {
              profile.uid = user.uid;
              needsUpdate = true;
            }

            if (needsUpdate) {
              profile.updatedAt = Date.now();
              await updateDoc(userRef, { ...profile });
              setUserProfile({ ...profile });
            } else {
              setUserProfile(profile);
            }
          }
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener for profile updates
  useEffect(() => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as UserProfile);
      }
    });
    
    return () => unsubscribeProfile();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const unsubscribe = subscribeToNotifications(user.uid, (newNotifications) => {
      setNotifications(newNotifications);
      
      // Show toast for the latest unread notification if it's new
      const latest = newNotifications[0];
      if (latest && !latest.isRead && latest.id !== lastNotificationIdRef.current) {
        lastNotificationIdRef.current = latest.id;
        
        toast(latest.title, {
          description: latest.message,
          action: latest.link ? {
            label: 'View',
            onClick: () => {
              if (latest.metadata?.sessionId) {
                setCurrentSessionId(latest.metadata.sessionId);
              }
              markNotificationAsRead(latest.id);
            }
          } : undefined,
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Presence tracking
  useEffect(() => {
    if (!user || !currentSessionId) return;

    const updatePresence = async () => {
      const presenceRef = doc(db, 'sessions', currentSessionId);
      const presenceData: Presence = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        photoURL: user.photoURL || undefined,
        lastActive: Date.now(),
        status: 'online'
      };
      
      await updateDoc(presenceRef, {
        [`presence.${user.uid}`]: presenceData
      });
    };

    const interval = setInterval(updatePresence, 30000); // Update every 30s
    updatePresence();

    return () => clearInterval(interval);
  }, [user, currentSessionId]);

  const showAppToast = useCallback((title: string, message: string, avatarUrl?: string, action?: { label: string, onClick: () => void }) => {
    const duration = Math.max(6000, Math.min(8000, message.length * 50));
    toast.custom((t) => (
      <div className="flex items-start gap-3 w-full bg-white border border-zinc-200 shadow-xl rounded-2xl p-4 relative overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
            <BellIcon className="w-5 h-5 text-zinc-400" />
          </div>
        )}
        <div className="flex flex-col gap-1 min-w-0 flex-1 pr-6">
          <span className="text-sm font-semibold text-zinc-900 truncate">{title}</span>
          <span className="text-xs text-zinc-500 line-clamp-2">{message}</span>
          {action && (
            <button 
              onClick={() => {
                action.onClick();
                toast.dismiss(t);
              }}
              className="mt-2 self-start text-xs font-medium text-zinc-900 bg-zinc-100 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
        <button 
          onClick={() => toast.dismiss(t)}
          className="absolute top-3 right-3 p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ), { duration });
  }, []);

  const previousSessionsRef = useRef<WorkspaceSession[]>([]);

  // Load sessions from Firestore
  useEffect(() => {
    if (!isAuthReady || !user) {
      setSessions([]);
      return;
    }

    const q = query(
      collection(db, 'sessions'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => doc.data() as WorkspaceSession)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      
      // Detect new messages for notifications
      if (previousSessionsRef.current.length > 0) {
        docs.forEach(session => {
          const prevSession = previousSessionsRef.current.find(s => s.id === session.id);
          if (prevSession && session.messages.length > prevSession.messages.length) {
            const newMessages = session.messages.slice(prevSession.messages.length);
            newMessages.forEach(msg => {
              // Don't notify for our own messages
              if (msg.senderId !== user.uid) {
                // Only notify if we are not currently looking at this session
                if (currentSessionId !== session.id) {
                  showAppToast(
                    session.title || msg.senderName || 'New Message',
                    msg.content,
                    msg.senderPhoto,
                    { label: 'View', onClick: () => setCurrentSessionId(session.id) }
                  );
                }
              }
            });
          }
        });
      }
      
      previousSessionsRef.current = docs;
      setSessions(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    });

    return () => unsubscribe();
  }, [isAuthReady, user, currentSessionId, showAppToast]);

  // Handle initial session selection
  useEffect(() => {
    if (isAuthReady && user && sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [isAuthReady, user, sessions, currentSessionId]);

  const handleNewSession = useCallback(async (type: ConversationType = 'workspace', title: string = 'New Workspace', members: string[] = [user!.uid]) => {
    if (!user) return;
    const newSession: WorkspaceSession = {
      id: Date.now().toString(),
      title,
      type,
      members,
      messages: [],
      tone: 'Professional',
      voice: 'Second person',
      resultType: 'Text',
      modelId: 'gemini-3-flash-preview',
      mode: 'chat',
      files: [],
      agentUnits: [],
      canvasData: { lines: [], shapes: [] },
      updatedAt: Date.now(),
      uid: user.uid
    };

    try {
      await setDoc(doc(db, 'sessions', newSession.id), newSession);
      setCurrentSessionId(newSession.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `sessions/${newSession.id}`);
    }
  }, [user]);

  const handleStartChat = useCallback(async (userId: string, userName: string, userPhoto?: string) => {
    if (!user) return;
    
    // Check if a direct chat already exists
    const existingChat = sessions.find(s => 
      s.type === 'direct' && 
      s.members.includes(user.uid) && 
      s.members.includes(userId)
    );

    if (existingChat) {
      setCurrentSessionId(existingChat.id);
      setIsSidebarCollapsed(true);
      return;
    }

    // Create new direct chat
    await handleNewSession('direct', `Chat with ${userName}`, [user.uid, userId]);
    setIsSidebarCollapsed(true);
  }, [user, sessions, handleNewSession]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  const handleLogin = async () => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isIframe = window !== window.parent;
      
      if (isMobile && !isIframe) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error('Login failed', error);
      toast.error('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setCurrentSessionId(null);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const updateSession = useCallback(async (id: string, updates: Partial<WorkspaceSession>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'sessions', id), { ...updates, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sessions/${id}`);
    }
  }, [user]);

  useEffect(() => {
    if (scrollRef.current && isAutoScrollEnabled) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentSession?.messages, isAutoScrollEnabled]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAutoScrollEnabled(isAtBottom);
    }
  };

  const handleTranslate = async (messageId: string, text: string, lang: string) => {
    if (!currentSessionId || !currentSession) return;
    try {
      const translatedContent = await translateText(text, lang);
      const updatedMessages = currentSession.messages.map(m => 
        m.id === messageId ? { ...m, translation: { language: lang, content: translatedContent } } : m
      );
      await updateDoc(doc(db, 'sessions', currentSessionId), {
        messages: updatedMessages,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error("Translation error:", error);
    }
  };

  const handleFindYouTubeLinks = async (messageId: string, topic: string) => {
    if (!currentSessionId || !currentSession) return;
    try {
      const linksText = await findYouTubeLinks(topic);
      const updatedMessages = currentSession.messages.map(m => 
        m.id === messageId ? { ...m, content: m.content + '\n\n### YouTube Suggestions\n' + linksText } : m
      );
      await updateDoc(doc(db, 'sessions', currentSessionId), {
        messages: updatedMessages,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error("YouTube search error:", error);
    }
  };

  const handleGenerateSpeech = async (messageId: string, text: string) => {
    if (!currentSessionId || !currentSession) return;
    try {
      const audioUrl = await generateSpeech(text, currentSession.ttsVoice || 'Kore');
      if (audioUrl) {
        const updatedMessages = currentSession.messages.map(m => 
          m.id === messageId ? { ...m, audioUrl } : m
        );
        await updateDoc(doc(db, 'sessions', currentSessionId), {
          messages: updatedMessages,
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      console.error("Speech generation error:", error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsLoading(true);
          try {
            const transcription = await transcribeAudio(base64Audio, 'audio/webm');
            setInput(prev => prev + (prev ? ' ' : '') + transcription);
          } catch (error) {
            console.error("Transcription error:", error);
          } finally {
            setIsLoading(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setPendingFiles(prev => [...prev, {
          id: Math.random().toString(36).substring(2, 11),
          name: file.name,
          type: file.type,
          data: base64,
          size: file.size,
          timestamp: Date.now()
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleToggleBotInSession = useCallback(async (bot: Bot) => {
    if (!currentSessionId || !currentSession) return;
    
    const isAlreadyIn = (currentSession.agentUnits || []).some(b => b.id === bot.id);
    let updatedBots;
    let systemMsgContent;

    if (isAlreadyIn) {
      updatedBots = (currentSession.agentUnits || []).filter(b => b.id !== bot.id);
      systemMsgContent = `${bot.name} (${bot.username}) has been removed from the session.`;
    } else {
      updatedBots = [...(currentSession.agentUnits || []), bot];
      systemMsgContent = `${bot.name} (${bot.username}) has been added to the session.`;
    }

    await updateSession(currentSessionId, { agentUnits: updatedBots });
    
    const systemMsg: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: systemMsgContent,
      timestamp: Date.now()
    };
    await updateDoc(doc(db, 'sessions', currentSessionId), {
      messages: [...currentSession.messages, systemMsg],
      updatedAt: Date.now()
    });
  }, [currentSessionId, currentSession, updateSession]);

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    if (!currentSessionId || !currentSession || !user) return;
    const updatedMessages = currentSession.messages.map(m => {
      if (m.id === messageId) {
        const reactions = [...(m.reactions || [])];
        const existingReaction = reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          if (existingReaction.uids.includes(user.uid)) {
            existingReaction.uids = existingReaction.uids.filter(id => id !== user.uid);
          } else {
            existingReaction.uids.push(user.uid);
          }
        } else {
          reactions.push({ emoji, uids: [user.uid] });
        }
        return { ...m, reactions: reactions.filter(r => r.uids.length > 0) };
      }
      return m;
    });
    await updateSession(currentSessionId, { messages: updatedMessages });
  }, [currentSessionId, currentSession, user, updateSession]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!currentSessionId || !currentSession || !user) return;
    const updatedMessages = currentSession.messages.filter(msg => msg.id !== messageId);
    await updateSession(currentSessionId, { messages: updatedMessages });
  }, [currentSessionId, currentSession, user, updateSession]);

  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!currentSessionId || !currentSession || !user) return;
    const updatedMessages = currentSession.messages.map(msg => 
      msg.id === messageId ? { ...msg, content: newContent, editedAt: new Date().toISOString() } : msg
    );
    await updateSession(currentSessionId, { messages: updatedMessages });
  }, [currentSessionId, currentSession, user, updateSession]);

  const handleVote = useCallback(async (messageId: string, optionId: string) => {
    if (!currentSessionId || !currentSession || !user) return;
    const updatedMessages = currentSession.messages.map(m => {
      if (m.id === messageId && m.poll) {
        const updatedOptions = m.poll.options.map(opt => {
          // Remove user from all options first (if not multiple choice)
          let uids = opt.votes.filter(id => id !== user.uid);
          if (opt.id === optionId) {
            uids.push(user.uid);
          }
          return { ...opt, votes: uids };
        });
        return { ...m, poll: { ...m.poll, options: updatedOptions } };
      }
      return m;
    });
    await updateSession(currentSessionId, { messages: updatedMessages });
  }, [currentSessionId, currentSession, user, updateSession]);

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

    // Add initial empty bot message
    const sessionRef = doc(db, 'sessions', currentSessionId);
    await updateDoc(sessionRef, {
      messages: [...history, botMessage],
      updatedAt: Date.now()
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
        modelId: bot.modelId || 'gemini-3-flash-preview',
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
          // Update local state for immediate feedback
          setSessions(prev => prev.map(s => s.id === currentSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === botMessageId ? { ...m, content: fullText } : m)
          } : s));
        }
      }

      // Final update to Firestore
      const finalBotMessage = { ...botMessage, content: fullText, isStreaming: false };
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const currentMessages = sessionSnap.data().messages || [];
        const updatedMessages = currentMessages.map((m: any) => 
          m.id === botMessageId ? finalBotMessage : m
        );
        await updateDoc(sessionRef, {
          messages: updatedMessages,
          updatedAt: Date.now()
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
          updatedAt: Date.now()
        });
      }
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || isLoading || !currentSessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      senderId: user.uid,
      senderName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      senderPhoto: user.photoURL || undefined,
      content: input,
      timestamp: Date.now(),
      files: pendingFiles,
    };

    const updatedMessages = [...(currentSession?.messages || []), userMessage];
    
    // Update session title if it's the first message
    let title = currentSession?.title || 'New Workspace';
    if (updatedMessages.length === 1) {
      title = input.slice(0, 30) || 'New Workspace';
    }

    // Bot Trigger Logic
    const activeBots = currentSession?.agentUnits || [];
    const botToTrigger = activeBots.find(b => {
      const username = b.username.replace('@', '').toLowerCase();
      const name = b.name.toLowerCase().replace(/\s+/g, '_');
      return input.startsWith(`/${username}`) || 
             input.startsWith(`/${name}`) ||
             input.toLowerCase().includes(`@${username}`) ||
             input.toLowerCase().includes(b.name.toLowerCase());
    });

    // Poll Creation Logic
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
          senderPhoto: user.photoURL || undefined,
          content: `Poll: ${question}`,
          timestamp: Date.now(),
          poll: {
            question,
            options,
            isMultipleChoice: false,
            isAnonymous: false
          }
        };
        await updateDoc(doc(db, 'sessions', currentSessionId), {
          messages: [...(currentSession?.messages || []), pollMsg],
          updatedAt: Date.now()
        });
        setInput('');
        return;
      }
    }

    updateSession(currentSessionId, { messages: updatedMessages, title });
    setInput('');
    setPendingFiles([]);

    // Notify other members
    if (currentSession && currentSession.members.length > 1 && user) {
      currentSession.members.forEach(memberId => {
        if (memberId !== user.uid) {
          createNotification({
            userId: memberId,
            title: 'New Message',
            message: `${user.displayName || 'A collaborator'} sent a message in "${title}"`,
            type: 'collaborator',
            link: `/sessions/${currentSessionId}`,
            metadata: {
              sessionId: currentSessionId,
              senderId: user.uid,
              senderName: user.displayName || 'A collaborator'
            }
          });
        }
      });
    }

    // Bot Response
    if (botToTrigger) {
      handleBotResponse(botToTrigger, input, updatedMessages);
    }

    // AI Response Logic for Business Chat
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
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          files: m.files
        }));

      // Include library files in context if not in privacy mode
      const libraryContext = !currentSession?.privacyMode 
        ? currentSession?.files.map(f => {
            if (f.type.includes('text') || f.type.includes('csv') || f.type.includes('json')) {
              try {
                const decoded = atob(f.data.split(',')[1]);
                const truncated = decoded.length > 5000 ? decoded.slice(0, 5000) + "... [truncated]" : decoded;
                return `[Library File: ${f.name}]\n${truncated}`;
              } catch (e) {
                return `[Library File: ${f.name}]\n(Error decoding file)`;
              }
            }
            return `[Library File: ${f.name}]\n(Binary file)`;
          }).join('\n\n')
        : '';

      const { responseStream, agentDiscussion } = await generateChatResponseStream(chatHistory, { 
        tone: currentSession?.tone || 'Professional', 
        voice: currentSession?.voice || 'Second person',
        modelId: currentSession?.modelId || 'gemini-3-flash-preview',
        searchEnabled: currentSession?.searchEnabled,
        libraryContext,
        agentUnits: currentSession?.agentUnits,
        isSuperAdminModeActive: userProfile?.isSuperAdminModeActive
      }, userLocation || undefined);

      const assistantMessageId = (Date.now() + 1).toString();
      let assistantContent = "";
      
      // Add initial empty assistant message
      const initialAssistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: "",
        timestamp: Date.now(),
        agentDiscussion
      };
      
      const messagesWithAssistant = [...updatedMessages, initialAssistantMessage];
      updateSession(currentSessionId, { messages: messagesWithAssistant });

      for await (const chunk of responseStream) {
        const c = chunk as any;
        if (c.text) {
          assistantContent += c.text;
          // Update local state for immediate feedback
          setSessions(prev => prev.map(s => s.id === currentSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === assistantMessageId ? { ...m, content: assistantContent } : m)
          } : s));
        }

        // Handle tool calls
        if (c.functionCalls) {
          for (const call of c.functionCalls) {
            if (call.name === 'modifyCanvas') {
              const args = call.args as any;
              const session = sessions.find(s => s.id === currentSessionId);
              if (!session) continue;

              const currentCanvasData = session.canvasData || { lines: [], shapes: [] };
              let updatedCanvasData = { ...currentCanvasData };

              if (args.action === 'add_shape') {
                const newShape = {
                  id: Math.random().toString(36).substring(7),
                  type: args.shapeType || 'rect',
                  x: args.position?.x || 100,
                  y: args.position?.y || 100,
                  width: 100,
                  height: 100,
                  radius: 50,
                  fill: 'transparent',
                  stroke: args.color || '#18181b',
                  strokeWidth: 2
                };
                updatedCanvasData.shapes = [...(updatedCanvasData.shapes || []), newShape];
              } else if (args.action === 'add_text') {
                const newText = {
                  id: Math.random().toString(36).substring(7),
                  type: 'text',
                  text: args.text || 'New Text',
                  x: args.position?.x || 100,
                  y: args.position?.y || 100,
                  fontSize: 20,
                  fill: args.color || '#18181b'
                };
                updatedCanvasData.shapes = [...(updatedCanvasData.shapes || []), newText];
              } else if (args.action === 'clear_canvas') {
                updatedCanvasData = { lines: [], shapes: [] };
              }

              updateSession(currentSessionId, { canvasData: updatedCanvasData });
              
              // Switch to canvas mode to show the result
              if (session.mode !== 'canvas') {
                updateSession(currentSessionId, { mode: 'canvas' });
              }
            }
          }
        }
      }

      // Final update to Firestore
      let finalAssistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
        agentDiscussion
      };

      // Handle ResultType
      if (currentSession?.resultType === 'Audio' || currentSession?.resultType === 'Combination') {
        try {
          const audioUrl = await generateSpeech(assistantContent, currentSession.ttsVoice || 'Kore');
          if (audioUrl) {
            finalAssistantMessage.audioUrl = audioUrl;
          }
        } catch (e) {
          console.error("Auto speech generation failed", e);
        }
      }

      if (currentSession?.resultType === 'Image Sketches' || currentSession?.resultType === 'Combination') {
        try {
          // Generate a prompt for the image based on the assistant's response
          const imagePrompt = `A sketch or illustration representing: ${assistantContent.substring(0, 200)}`;
          const imageUrl = await generateImageFromPrompt(imagePrompt);
          if (imageUrl) {
            finalAssistantMessage.imageUrl = imageUrl;
          }
        } catch (e) {
          console.error("Auto image generation failed", e);
        }
      }

      // Auto-generate YouTube links for tutorials or learning requests
      const isLearningRequest = userMessage.content.toLowerCase().includes('teach me') || 
                                userMessage.content.toLowerCase().includes('learn') || 
                                userMessage.content.toLowerCase().includes('tutorial') ||
                                userMessage.content.toLowerCase().includes('how to');
      
      if (isLearningRequest) {
        try {
          const linksText = await findYouTubeLinks(userMessage.content);
          if (linksText) {
            finalAssistantMessage.content += '\n\n### Recommended YouTube Creators & Tutorials\n' + linksText;
          }
        } catch (e) {
          console.error("Auto YouTube links generation failed", e);
        }
      }

      updateSession(currentSessionId, { messages: [...updatedMessages, finalAssistantMessage] });

      // Generate smart suggestions
      const suggestions = await generateSmartSuggestions(assistantContent);
      setSmartSuggestions(suggestions);
      playNotificationSound();

    } catch (error: any) {
      console.error('Error generating response:', error);
      let errorText = "Failed to call the Gemini API. Please try again.";
      
      if (error.message?.includes('max tokens')) {
        errorText = "The conversation or files are too large for the current model. Try starting a new session or removing some files.";
      } else if (error.message?.includes('API key')) {
        errorText = "There was an issue with the AI configuration. Please check your settings.";
      } else if (error.message?.includes('safety')) {
        errorText = "The request was flagged by safety filters. Please try a different prompt.";
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorText,
        timestamp: Date.now(),
      };
      updateSession(currentSessionId, { messages: [...updatedMessages, errorMessage] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLibraryUpload = async (files: FileList) => {
    if (!currentSessionId || !currentSession) return;
    
    const newFiles: FileData[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const fileData = await new Promise<FileData>((resolve) => {
        reader.onload = (e) => {
          resolve({
            id: Math.random().toString(36).substring(7),
            name: file.name,
            type: file.type,
            data: e.target?.result as string,
            size: file.size,
            timestamp: Date.now()
          });
        };
        reader.readAsDataURL(file);
      });
      newFiles.push(fileData);
    }

    updateSession(currentSessionId, { 
      files: [...(currentSession.files || []), ...newFiles] 
    });
  };

  const handleUnitsUpdate = (units: Bot[]) => {
    if (!currentSessionId) return;
    updateSession(currentSessionId, { agentUnits: units });
  };

  const handleLibraryDelete = (fileId: string) => {
    if (!currentSessionId || !currentSession) return;
    const updatedFiles = currentSession.files.filter(f => f.id !== fileId);
    updateSession(currentSessionId, { files: updatedFiles });
  };

  const exportToPDF = () => {
    if (!currentSession) return;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(16);
    doc.text(currentSession.title, 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Exported on ${new Date().toLocaleString()}`, 20, y);
    y += 15;

    currentSession.messages.forEach(msg => {
      doc.setFont("helvetica", "bold");
      doc.text(`${msg.role.toUpperCase()}:`, 20, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(msg.content, 170);
      doc.text(splitText, 20, y);
      y += (splitText.length * 5) + 10;
      
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.save(`${currentSession.title.replace(/\s+/g, '_')}.pdf`);
  };

  const exportToExcel = () => {
    if (!currentSession) return;
    const data = currentSession.messages.map(m => ({
      Role: m.role,
      Content: m.content,
      Timestamp: new Date(m.timestamp).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chat History");
    XLSX.writeFile(wb, `${currentSession.title.replace(/\s+/g, '_')}.xlsx`);
  };

  const clearWorkspace = async () => {
    if (!currentSessionId || !user) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Workspace',
      message: 'Are you sure you want to permanently delete this workspace and all its contents? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'sessions', currentSessionId));
          setCurrentSessionId(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `sessions/${currentSessionId}`);
        }
        setConfirmModal(null);
      }
    });
  };

  const clearChat = async () => {
    if (!currentSessionId || !currentSession) return;
    setConfirmModal({
      isOpen: true,
      title: 'Clear Chat History',
      message: 'Are you sure you want to clear all messages in this workspace? Files and documents will be preserved.',
      onConfirm: async () => {
        await updateSession(currentSessionId, { messages: [] });
        setConfirmModal(null);
      }
    });
  };

  const exportWorkspace = () => {
    if (!currentSession) return;
    const content = currentSession.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSession.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAudio = async (text: string) => {
    try {
      toast.info('Generating audio...');
      const audioUrl = await generateSpeech(text);
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `voice-note-${Date.now()}.wav`;
      a.click();
      toast.success('Audio exported successfully');
    } catch (error) {
      toast.error('Failed to export audio');
    }
  };

  const handleExportImageSketch = async (text: string) => {
    try {
      toast.info('Generating image sketch...');
      const prompt = `Create a simple, clean sketch or diagram summarizing: ${text.substring(0, 200)}`;
      const imageUrl = await generateImageFromPrompt(prompt);
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = `sketch-${Date.now()}.png`;
      a.click();
      toast.success('Image sketch exported successfully');
    } catch (error) {
      toast.error('Failed to export image sketch');
    }
  };

  const handleExportZip = async (text: string) => {
    try {
      toast.info('Generating ZIP bundle...');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Add text
      zip.file('content.txt', text);
      
      // Add audio
      try {
        const audioUrl = await generateSpeech(text);
        const audioBlob = await (await fetch(audioUrl)).blob();
        zip.file('audio.wav', audioBlob);
      } catch (e) {
        console.error('Audio generation failed for zip', e);
      }
      
      // Add image
      try {
        const prompt = `Create a simple, clean sketch summarizing: ${text.substring(0, 200)}`;
        const imageUrl = await generateImageFromPrompt(prompt);
        const imageBlob = await (await fetch(imageUrl)).blob();
        zip.file('sketch.png', imageBlob);
      } catch (e) {
        console.error('Image generation failed for zip', e);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bundle-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('ZIP bundle exported successfully');
    } catch (error) {
      toast.error('Failed to export ZIP bundle');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <MobileLogin onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-zinc-50 overflow-hidden">
        {/* Global Search Overlay */}
      <AnimatePresence>
        {isGlobalSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-24 px-4"
            onClick={() => setIsGlobalSearchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-zinc-100 flex items-center gap-4">
                <Search className="w-6 h-6 text-zinc-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search messages, files, and sessions..."
                  value={globalSearchQuery}
                  onChange={e => setGlobalSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-lg text-zinc-900 focus:outline-none placeholder:text-zinc-400"
                />
                <button 
                  onClick={() => setIsGlobalSearchOpen(false)}
                  className="p-2 hover:bg-zinc-50 rounded-xl text-zinc-400 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {globalSearchQuery.length > 0 ? (
                  <>
                    <div className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sessions</div>
                    {sessions.filter(s => s.title.toLowerCase().includes(globalSearchQuery.toLowerCase())).map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setCurrentSessionId(s.id);
                          setIsGlobalSearchOpen(false);
                        }}
                        className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 rounded-2xl transition-all text-left group"
                      >
                        <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-white transition-all">
                          <FileText className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-900">{s.title}</div>
                          <div className="text-[10px] text-zinc-400 uppercase tracking-widest">{s.type}</div>
                        </div>
                      </button>
                    ))}
                    
                    <div className="px-4 py-2 mt-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Messages</div>
                    {sessions.flatMap(s => s.messages.filter(m => m.content.toLowerCase().includes(globalSearchQuery.toLowerCase())).map(m => ({ ...m, sessionTitle: s.title, sessionId: s.id }))).slice(0, 10).map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setCurrentSessionId(m.sessionId);
                          setIsGlobalSearchOpen(false);
                        }}
                        className="w-full flex flex-col gap-1 p-4 hover:bg-zinc-50 rounded-2xl transition-all text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{m.sessionTitle}</span>
                          <span className="text-[10px] text-zinc-300">{new Date(m.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="text-sm text-zinc-600 line-clamp-2">{m.content}</div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <Search className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
                    <p className="text-zinc-400 text-sm font-medium">Search across all your workspaces and conversations.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar 
          currentTone={currentSession?.tone || 'Professional'} 
          currentVoice={currentSession?.voice || 'Second person'} 
          currentResultType={currentSession?.resultType || 'Text'}
          currentTtsVoice={currentSession?.ttsVoice || 'Kore'}
          currentModel={currentSession?.modelId || 'gemini-3-flash-preview'}
          currentMode={currentSession?.mode || 'chat'}
          privacyMode={currentSession?.privacyMode || false}
          onToneChange={(tone) => currentSessionId && updateSession(currentSessionId, { tone })} 
          onVoiceChange={(voice) => currentSessionId && updateSession(currentSessionId, { voice })}
          onResultTypeChange={(resultType) => currentSessionId && updateSession(currentSessionId, { resultType })}
          onTtsVoiceChange={(ttsVoice) => currentSessionId && updateSession(currentSessionId, { ttsVoice })}
          onModelChange={(modelId) => currentSessionId && updateSession(currentSessionId, { modelId })}
          onModeChange={(mode) => currentSessionId && updateSession(currentSessionId, { mode })}
          onPrivacyToggle={() => currentSessionId && updateSession(currentSessionId, { privacyMode: !currentSession?.privacyMode })}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSelect={setCurrentSessionId}
          onNewSession={handleNewSession}
          user={user}
          presence={currentSession?.presence}
        />

        <main className="flex-1 flex flex-col relative">
          {/* Header */}
          <header className="h-14 border-b border-zinc-200 bg-white flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-semibold text-zinc-900 truncate max-w-[200px]">
                {currentSession?.title || 'No Workspace Selected'}
              </h2>
              <div className="h-4 w-px bg-zinc-200" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Mode:</span>
                <span className="text-xs font-medium text-zinc-600 capitalize">{currentSession?.mode || 'chat'}</span>
              </div>
              
              {/* Presence Indicator */}
              {activeUsers.length > 0 && (
                <>
                  <div className="h-4 w-px bg-zinc-200" />
                  <div className="flex -space-x-2 overflow-hidden">
                    {activeUsers.map((u) => (
                      <div 
                        key={u.id}
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-zinc-100 flex items-center justify-center overflow-hidden"
                        title={u.name}
                      >
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-400">{u.name.charAt(0)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest animate-pulse">
                    {activeUsers.length} Online
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* User Search */}
              <div className="relative">
                <div className="flex items-center bg-zinc-100 rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-zinc-900/20 transition-all">
                  <Search className="w-3.5 h-3.5 text-zinc-400 mr-2" />
                  <input
                    type="text"
                    placeholder="Find active users..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      setIsUserSearchOpen(true);
                    }}
                    onFocus={() => setIsUserSearchOpen(true)}
                    className="bg-transparent border-none text-xs text-zinc-900 focus:outline-none placeholder:text-zinc-400 w-32 md:w-48"
                  />
                </div>
                <AnimatePresence>
                  {isUserSearchOpen && userSearchQuery && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-64 bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-2 border-b border-zinc-100 bg-zinc-50/50">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2">Active Users</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {activeUsers.filter(u => u.name.toLowerCase().includes(userSearchQuery.toLowerCase())).length > 0 ? (
                          activeUsers.filter(u => u.name.toLowerCase().includes(userSearchQuery.toLowerCase())).map(u => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setIsUserSearchOpen(false);
                                setUserSearchQuery('');
                                // Check if direct chat already exists
                                const existingSession = sessions.find(s => s.type === 'direct' && s.members?.includes(u.id));
                                if (existingSession) {
                                  setCurrentSessionId(existingSession.id);
                                } else {
                                  handleNewSession('direct', u.name, [u.id]);
                                }
                              }}
                              className="w-full flex items-center gap-3 p-2 hover:bg-zinc-50 rounded-xl transition-all text-left"
                            >
                              <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden">
                                  {u.avatar ? (
                                    <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <span className="text-xs font-bold text-zinc-400">{u.name.charAt(0)}</span>
                                  )}
                                </div>
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-zinc-900 truncate">{u.name}</span>
                                <span className="text-[10px] text-emerald-500 font-medium">Active now</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-zinc-500">No active users found</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => setIsGlobalSearchOpen(true)}
                className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-md hover:bg-zinc-50"
                title="Global Search"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
                  className={cn(
                    "p-2 transition-all rounded-md hover:bg-zinc-50 relative",
                    isNotificationCenterOpen ? "text-zinc-900 bg-zinc-50" : "text-zinc-400 hover:text-zinc-900"
                  )}
                  title="Notifications"
                >
                  <BellIcon className="w-4 h-4" />
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                  )}
                </button>
                
                <AnimatePresence>
                  {isNotificationCenterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Notifications</span>
                        {notifications.some(n => !n.isRead) && (
                          <button 
                            onClick={() => notifications.filter(n => !n.isRead).forEach(n => markNotificationAsRead(n.id))}
                            className="text-[10px] font-bold text-zinc-900 hover:underline uppercase tracking-widest"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                          notifications.map(notification => (
                            <div 
                              key={notification.id}
                              className={cn(
                                "p-4 border-b border-zinc-50 last:border-0 transition-all hover:bg-zinc-50 group relative",
                                !notification.isRead && "bg-zinc-50/30"
                              )}
                            >
                              <div className="flex gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                  notification.type === 'collaborator' ? "bg-blue-50 text-blue-500" : "bg-amber-50 text-amber-500"
                                )}>
                                  {notification.type === 'collaborator' ? <Info className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold text-zinc-900 mb-0.5">{notification.title}</div>
                                  <div className="text-[11px] text-zinc-500 line-clamp-2 mb-1">{notification.message}</div>
                                  <div className="text-[9px] text-zinc-300 font-medium uppercase tracking-wider">
                                    {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                              <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                {!notification.isRead && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markNotificationAsRead(notification.id);
                                    }}
                                    className="p-1 text-zinc-400 hover:text-zinc-900"
                                    title="Mark as read"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-red-500"
                                  title="Delete"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {notification.link && (
                                <button 
                                  onClick={() => {
                                    if (notification.metadata?.sessionId) {
                                      setCurrentSessionId(notification.metadata.sessionId);
                                    }
                                    markNotificationAsRead(notification.id);
                                    setIsNotificationCenterOpen(false);
                                  }}
                                  className="absolute inset-0 z-0"
                                />
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center">
                            <BellOff className="w-8 h-8 text-zinc-100 mx-auto mb-2" />
                            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">No notifications</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {user ? (
                <div className="flex items-center gap-3 mr-2">
                  <img src={user.photoURL || ''} alt="" className="w-6 h-6 rounded-full border border-zinc-200" />
                  <button onClick={handleLogout} className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors">Logout</button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition-colors mr-2"
                >
                  <LogIn className="w-3 h-3" />
                  Login
                </button>
              )}
              <div className="h-4 w-px bg-zinc-200 mr-2" />
              <button 
                onClick={() => setIsLiveModeOpen(true)}
                className="p-2 text-zinc-400 hover:text-emerald-500 transition-colors rounded-md hover:bg-zinc-50"
                title="Open Live Mode"
              >
                <Mic className="w-4 h-4" />
              </button>
              <div className="relative group">
                <button 
                  className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-md hover:bg-zinc-50"
                  title="Export Options"
                >
                  <Download className="w-4 h-4" />
                </button>
                <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl py-2 w-40 hidden group-hover:block z-50">
                  <button onClick={exportWorkspace} className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-50 flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Export as TXT
                  </button>
                  <button onClick={exportToPDF} className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-50 flex items-center gap-2">
                    <Download className="w-3 h-3" /> Export as PDF
                  </button>
                  <button onClick={exportToExcel} className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-50 flex items-center gap-2">
                    <FileSpreadsheet className="w-3 h-3" /> Export as XLSX
                  </button>
                </div>
              </div>
              <button 
                onClick={clearWorkspace}
                className="p-2 text-zinc-400 hover:text-red-500 transition-colors rounded-md hover:bg-zinc-50"
                title="Delete Workspace"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            {currentSession?.mode === 'document' ? (
              <DocumentEditor 
                data={currentSession.documentData || ''} 
                onSave={handleSaveDocument}
                onAIAction={handleDocumentAIAction}
                presence={currentSession.presence}
                sessionId={currentSessionId || ''}
                versions={currentSession.documentVersions}
                onRevert={handleRevertVersion}
                templates={templates}
                onSaveTemplate={handleSaveTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
            ) : currentSession?.mode === 'media' ? (
              <MediaHub 
                onSaveToLibrary={(file) => {
                  if (!currentSessionId || !currentSession) return;
                  const newFiles = [...(currentSession.files || []), { ...file, id: Math.random().toString(36).substr(2, 9), timestamp: Date.now() }];
                  updateSession(currentSessionId, { files: newFiles });
                }}
              />
            ) : currentSession?.mode === 'canvas' ? (
              <Canvas 
                data={currentSession.canvasData} 
                onSave={(canvasData) => currentSessionId && updateSession(currentSessionId, { canvasData })} 
                sessionId={currentSessionId || ''}
              />
            ) : currentSession?.mode === 'library' ? (
              <Library 
                files={currentSession.files || []} 
                onDelete={handleLibraryDelete}
                onUpload={handleLibraryUpload}
              />
            ) : currentSession?.mode === 'units' ? (
              <Units 
                units={currentSession.agentUnits || []}
                onUpdate={handleUnitsUpdate}
              />
            ) : currentSession?.mode === 'directory' ? (
              <Directory 
                onStartChat={handleStartChat}
                currentUserId={user?.uid || ''}
              />
            ) : currentSession?.mode === 'bots' ? (
              <BotPlatform 
                currentUserId={user?.uid || ''}
                onToggleBotInSession={handleToggleBotInSession}
                activeBotsInSession={currentSession?.agentUnits || []}
              />
            ) : currentSession?.mode === 'settings' ? (
              <Settings 
                user={user} 
                userProfile={userProfile}
                onLogout={handleLogout} 
                session={currentSession}
                onUpdateSession={updateSession}
                onDeleteSession={clearWorkspace}
                onClearChat={clearChat}
                onExportSession={exportWorkspace}
              />
            ) : (
              /* Chat Area */
              <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto scroll-smooth"
              >
            {!currentSession || currentSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center max-w-2xl mx-auto font-sans">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-24 h-24 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-inner overflow-hidden"
              >
                <img src="/logo.png" alt="Central Space Logo" className="w-full h-full object-cover animate-pulse" />
              </motion.div>
              <h1 className="text-4xl font-bold text-zinc-950 mb-6 tracking-tight font-display">
                {currentSession ? "Start Your Workspace" : "Welcome to Central Space"}
              </h1>
              <p className="text-zinc-500 mb-12 text-lg leading-relaxed font-medium">
                {currentSession 
                  ? "Type your first request below to begin your research or project."
                  : "Create a new workspace to start your research, document creation, or coding project."
                }
              </p>
              {!currentSession && (
                <button 
                  onClick={() => handleNewSession('workspace')}
                  className="px-8 py-4 bg-zinc-950 text-white rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-950/10 active:scale-[0.98]"
                >
                  Create New Workspace
                </button>
              )}
              {currentSession && (
                <div className="grid grid-cols-2 gap-4 w-full">
                  {randomSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="p-5 bg-white border border-zinc-100 rounded-2xl text-sm text-zinc-600 hover:border-zinc-950 hover:text-zinc-950 transition-all text-left shadow-sm hover:shadow-md font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-5xl mx-auto divide-y divide-zinc-100">
              <AnimatePresence initial={false}>
                {currentSession.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <MessageBubble 
                      message={message} 
                      conversationType={currentSession?.type}
                      onGenerateImage={handleGenerateImage}
                      onGenerateVideo={handleGenerateVideo}
                      onTranslate={(text, lang) => handleTranslate(message.id, text, lang)}
                      onReact={(emoji) => handleReact(message.id, emoji)}
                      onVote={(optionId) => handleVote(message.id, optionId)}
                      onDelete={() => handleDeleteMessage(message.id)}
                      onEdit={(newContent) => handleEditMessage(message.id, newContent)}
                      onFindYouTubeLinks={(topic) => handleFindYouTubeLinks(message.id, topic)}
                      onGenerateSpeech={(text) => handleGenerateSpeech(message.id, text)}
                      currentUserId={user?.uid}
                      onExportAudio={(text) => handleExportAudio(text)}
                      onExportImageSketch={(text) => handleExportImageSketch(text)}
                      onExportZip={(text) => handleExportZip(text)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <div className="p-10 flex gap-8 bg-white/50 backdrop-blur-sm animate-in">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center shrink-0 shadow-2xl shadow-zinc-950/20 rotate-3 animate-bounce overflow-hidden">
                    <img src="/logo.png" alt="Central Space Logo" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-6 py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-5 bg-zinc-200 rounded-full w-32 animate-pulse" />
                      <div className="h-2 w-2 rounded-full bg-zinc-300" />
                      <div className="h-4 bg-zinc-100 rounded-full w-48 animate-pulse" />
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-6">
                        <div className="h-4 bg-zinc-100 rounded-full col-span-2 animate-pulse" />
                        <div className="h-4 bg-zinc-100 rounded-full col-span-1 animate-pulse" />
                      </div>
                      <div className="h-4 bg-zinc-100 rounded-full w-11/12 animate-pulse" />
                      <div className="h-4 bg-zinc-100 rounded-full w-10/12 animate-pulse" />
                      <div className="grid grid-cols-4 gap-6">
                        <div className="h-4 bg-zinc-100 rounded-full col-span-1 animate-pulse" />
                        <div className="h-4 bg-zinc-100 rounded-full col-span-2 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 animate-pulse" />
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 animate-pulse" />
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
              {isGeneratingImage && (
                <div className="p-6 flex gap-4 bg-white">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div className="flex-1 py-1">
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Generating Image...</div>
                    <div className="h-32 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl animate-pulse" />
                  </div>
                </div>
              )}
              {isGeneratingVideo && (
                <div className="p-6 flex gap-4 bg-white">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div className="flex-1 py-1">
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Generating Video...</div>
                    <div className="h-32 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>

    {/* Input Area */}
        <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-zinc-200 shrink-0 relative">
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Smart Suggestions */}
            <AnimatePresence>
              {smartSuggestions.length > 0 && !isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="flex flex-wrap items-center gap-2 bg-zinc-50/50 p-3 rounded-2xl border border-zinc-100"
                >
                  <div className="flex items-center gap-2 mr-2 px-2 border-r border-zinc-200">
                    <Sparkles className="w-3 h-3 text-zinc-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Suggestions</span>
                  </div>
                  {smartSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(suggestion);
                        setSmartSuggestions([]);
                      }}
                      className="px-4 py-1.5 bg-white border border-zinc-200 rounded-full text-xs font-medium text-zinc-600 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all duration-300 shadow-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                  <button 
                    onClick={() => setSmartSuggestions([])}
                    className="ml-auto p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-all"
                    title="Dismiss Suggestions"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Typing Indicator */}
            <AnimatePresence>
              {currentSession?.typing && Object.entries(currentSession.typing).some(([uid, ts]) => uid !== user?.uid && Date.now() - (ts as number) < 5000) && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute -top-8 left-6 flex items-center gap-2 text-xs text-zinc-400 font-medium"
                >
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  {Object.entries(currentSession.typing)
                    .filter(([uid, ts]) => uid !== user?.uid && Date.now() - (ts as number) < 5000)
                    .map(([uid]) => currentSession.presence?.[uid]?.displayName || 'Someone')
                    .join(', ')} is typing...
                </motion.div>
              )}
            </AnimatePresence>

            {currentSession?.type === 'channel' && currentSession.uid !== user?.uid ? (
              <div className="w-full bg-zinc-50 border border-zinc-100 rounded-[2rem] px-8 py-6 text-center text-zinc-400 font-medium">
                Only administrators can post in this channel
              </div>
            ) : (
              <>
                {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs group relative">
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button 
                      onClick={() => removePendingFile(idx)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="relative group/input">
              <AnimatePresence>
                {showCommandSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 w-full mb-4 bg-white border border-zinc-100 rounded-[2rem] shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-zinc-50 bg-zinc-50/50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2">Bot Commands</span>
                      <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest px-2">Select to use</span>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                      {filteredCommands.map((item, idx) => (
                        <button
                          key={`${item.bot.id}-${item.command.command}-${idx}`}
                          onClick={() => {
                            setInput(`/${item.command.command} `);
                            setShowCommandSuggestions(false);
                          }}
                          className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-all text-left group/item border-b border-zinc-50 last:border-0"
                        >
                          <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center shrink-0 group-hover/item:scale-110 transition-transform">
                            {item.bot.avatar ? (
                              <img src={item.bot.avatar} alt={item.bot.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <BotIcon className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-zinc-950">/{item.command.command}</span>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">via {item.bot.name}</span>
                            </div>
                            <div className="text-xs text-zinc-500 truncate">{item.command.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={!currentSession}
                placeholder={currentSession ? "Ask anything... (Shift+Enter for new line)" : "Create a workspace to start"}
                className="w-full bg-white border border-zinc-100 rounded-[2rem] px-8 py-6 pr-48 text-base focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950/20 resize-none min-h-[80px] max-h-[300px] disabled:opacity-50 shadow-2xl shadow-zinc-950/5 transition-all font-medium placeholder:text-zinc-300"
                rows={1}
              />
              <div className="absolute right-4 bottom-4 flex items-center gap-2">
                <div className="flex items-center gap-1 bg-zinc-50 p-1.5 rounded-2xl border border-zinc-100">
                  <button
                    type="button"
                    onClick={() => currentSessionId && updateSession(currentSessionId, { searchEnabled: !currentSession?.searchEnabled })}
                    className={cn(
                      "p-2.5 rounded-xl transition-all",
                      currentSession?.searchEnabled ? "bg-amber-100 text-amber-600 shadow-sm" : "text-zinc-400 hover:text-zinc-950 hover:bg-white"
                    )}
                    title="Web Search"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                      "p-2.5 rounded-xl transition-all",
                      isRecording ? "bg-red-100 text-red-600 animate-pulse shadow-sm" : "text-zinc-400 hover:text-zinc-950 hover:bg-white"
                    )}
                    title={isRecording ? "Stop Recording" : "Voice Note"}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    multiple
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!currentSession || isLoading}
                    className="p-2.5 text-zinc-400 hover:text-zinc-950 transition-all rounded-xl hover:bg-white disabled:opacity-50"
                    title="Attach Files"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && pendingFiles.length === 0) || isLoading || !currentSession}
                  className="p-3.5 bg-zinc-950 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20 active:scale-95 group/send"
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Send className="w-6 h-6 group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5 transition-transform" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <p className="text-[10px] text-center text-zinc-400 mt-3 uppercase tracking-widest font-bold">
            Central Space AI v5.0 Enterprise Edition • Powered by Gemini 3.1 Pro, GPT-4o & Claude 3.5
          </p>
        </div>
        <AnimatePresence>
          {isLiveModeOpen && (
            <LiveMode 
              onClose={() => setIsLiveModeOpen(false)}
              systemInstruction={`You are Central Space AI, an all‑in‑one workspace assistant. You are currently in LIVE VOICE mode. Be concise, helpful, and natural in your speech. Focus on the user's current request.`}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
      <AnimatePresence>
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-zinc-950 tracking-tight">{confirmModal.title}</h3>
              </div>
              <p className="text-zinc-500 text-sm font-medium mb-8 leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-6 py-3 text-sm font-bold text-zinc-500 hover:text-zinc-950 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-8 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-600 transition-all active:scale-95 shadow-xl shadow-red-500/10"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Toaster position="top-right" />
      
      {/* API Key Selection Overlay */}
      <AnimatePresence>
        {!hasApiKey && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-950 tracking-tight mb-3">API Key Required</h3>
              <p className="text-zinc-500 text-sm font-medium mb-8 leading-relaxed">
                To generate high-quality videos with Veo, you need to select a paid Google Cloud project API key. 
                <br /><br />
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-zinc-950 underline font-bold"
                >
                  Learn more about billing
                </a>
              </p>
              <button
                onClick={handleOpenSelectKey}
                className="w-full py-4 bg-zinc-950 text-white rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all active:scale-95 shadow-xl shadow-zinc-950/10 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Select API Key
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}
