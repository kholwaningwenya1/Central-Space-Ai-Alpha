import React, { useState, useEffect } from 'react';
import { 
  Bot as BotIcon, 
  Plus, 
  Trash2, 
  Save, 
  Play, 
  Code, 
  Terminal, 
  Globe, 
  Shield, 
  Zap,
  Search,
  Check,
  X,
  Loader2,
  Settings,
  Info,
  Image as ImageIcon,
  Video,
  MapPin,
  Upload,
  UserPlus,
  User,
  Ticket,
  Link as LinkIcon,
  FileText,
  Music,
  Users as UsersIcon,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { Bot, Message, AIModel } from '../types';
import { db, collection, onSnapshot, query, where, doc, setDoc, deleteDoc } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { generateChatResponseStream } from '../services/aiService';
import Editor from 'react-simple-code-editor';
import prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markdown';
import 'prismjs/themes/prism-tomorrow.css';

import { toast } from 'sonner';

interface BotPlatformProps {
  currentUserId: string;
  onToggleBotInSession: (bot: Bot) => void;
  activeBotsInSession: Bot[];
  userProfile?: any;
}

export function BotPlatform({ currentUserId, onToggleBotInSession, activeBotsInSession, userProfile }: BotPlatformProps) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [viewingBot, setViewingBot] = useState<Bot | null>(null);
  const [deployingBot, setDeployingBot] = useState<Bot | null>(null);
  const [botToDelete, setBotToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'my-bots'>('discover');
  const [modalTab, setModalTab] = useState<'config' | 'test'>('config');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Test Lab State
  const [testMessages, setTestMessages] = useState<Message[]>([]);
  const [testInput, setTestInput] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);
  
  const [newBot, setNewBot] = useState<Partial<Bot>>({
    name: '',
    username: '',
    description: '',
    systemInstruction: '',
    prompt: '',
    websiteUrl: '',
    files: [],
    modelId: 'gpt-4o',
    commands: [{ command: 'start', description: 'Start the bot' }],
    tools: [],
    webhookUrl: '',
    avatar: '',
    isActive: true,
    tags: [],
    exampleInteractions: [{ user: 'Hello', bot: 'Hi there! How can I help you today?' }],
    category: '',
    tone: ''
  });

  const availableTools = [
    { id: 'image_generation', name: 'Image Generation', icon: ImageIcon, description: 'Generate high-quality visuals' },
    { id: 'web_search', name: 'Web Search', icon: Globe, description: 'Access real-time information' },
    { id: 'maps', name: 'Google Maps', icon: MapPin, description: 'Location and place data' },
    { id: 'video_generation', name: 'Video Generation', icon: Video, description: 'Create short cinematic clips' },
    { id: 'fetch_tickets', name: 'Fetch Tickets', icon: Ticket, description: 'Access support ticket database' }
  ];

  const botTemplates: Bot[] = [
    {
      id: 'template_support',
      name: 'Customer Support Pro',
      username: '@support_pro',
      description: 'Automated customer support specialist with empathy and problem-solving skills.',
      systemInstruction: 'You are a helpful and empathetic customer support representative. Your goal is to resolve user issues efficiently while maintaining a professional and friendly tone. Always ask clarifying questions if the problem is unclear. If you cannot solve a problem, offer to escalate it to a human agent.',
      tools: ['web_search', 'fetch_tickets'],
      commands: [
        { command: 'status', description: 'Check ticket status', action: 'Fetch ticket status from database' },
        { command: 'faq', description: 'Search frequent questions', action: 'Search knowledge base' }
      ],
      creatorId: 'system',
      isActive: true,
      createdAt: Date.now(),
      avatar: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=200&h=200&fit=crop',
      tags: ['Support', 'Service', 'Help'],
      rating: 4.8,
      reviewsCount: 1240,
      exampleInteractions: [
        { user: "My order hasn't arrived yet.", bot: "I'm sorry to hear that! Let me check the status for you. Could you please provide your order number?" }
      ]
    },
    {
      id: 'template_summarizer',
      name: 'Content Summarizer',
      username: '@summarizer_bot',
      description: 'Expert at distilling long articles and documents into concise summaries.',
      systemInstruction: 'You are a professional summarizer. Your task is to extract the key points and main arguments from any text or URL provided. Provide summaries in three formats: a one-sentence TL;DR, a bulleted list of key points, and a brief concluding paragraph.',
      tools: ['web_search'],
      commands: [
        { command: 'tl_dr', description: 'Get a quick one-sentence summary', action: 'Extract main thesis' },
        { command: 'bullets', description: 'Get key points in a list', action: 'Identify main arguments' }
      ],
      creatorId: 'system',
      isActive: true,
      createdAt: Date.now(),
      avatar: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=200&fit=crop',
      tags: ['Productivity', 'Reading', 'Tools'],
      rating: 4.9,
      reviewsCount: 850,
      exampleInteractions: [
        { user: "Summarize this article: https://example.com/long-read", bot: "Here is a summary of the article:\n\n**TL;DR:** The article explores the impact of AI on modern journalism.\n\n**Key Points:**\n- AI tools are increasing efficiency in newsrooms.\n- Ethical concerns regarding deepfakes are rising.\n- Human oversight remains critical for fact-checking." }
      ]
    },
    {
      id: 'template_writer',
      name: 'Creative Writer',
      username: '@creative_writer',
      description: 'Your partner for storytelling, poetry, and creative brainstorming.',
      systemInstruction: 'You are a creative writing companion. You help users brainstorm ideas, write stories, compose poems, and refine their writing. You have a rich vocabulary and a deep understanding of narrative structure and poetic devices. Be encouraging and imaginative.',
      tools: ['image_generation'],
      commands: [
        { command: 'prompt', description: 'Get a writing prompt', action: 'Generate a creative scenario' },
        { command: 'critique', description: 'Get feedback on your writing', action: 'Analyze style and structure' }
      ],
      creatorId: 'system',
      isActive: true,
      createdAt: Date.now(),
      avatar: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=200&h=200&fit=crop',
      tags: ['Creative', 'Writing', 'Art'],
      rating: 4.7,
      reviewsCount: 620,
      exampleInteractions: [
        { user: "Give me a prompt for a sci-fi story.", bot: "Imagine a world where memories can be traded as a currency. A young woman discovers a memory that doesn't belong to her, but it holds the key to a forgotten revolution." }
      ]
    },
    {
      id: 'template_researcher',
      name: 'Research Pro',
      username: '@research_pro',
      description: 'Expert at deep analysis and web research.',
      systemInstruction: 'You are a professional research assistant. Your goal is to provide deep, well-cited analysis on any topic. Always use web search to find the latest information. Structure your responses with clear headings, bullet points, and a "Key Takeaways" section.',
      tools: ['web_search'],
      commands: [
        { command: 'analyze', description: 'Deeply analyze a topic' },
        { command: 'summarize', description: 'Summarize a long text or URL' }
      ],
      creatorId: 'system',
      isActive: true,
      createdAt: 1711284600000,
      avatar: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&h=200&fit=crop'
    },
    {
      id: 'template_designer',
      name: 'Creative Designer',
      username: '@creative_designer',
      description: 'Specialist in visual asset generation.',
      systemInstruction: 'You are a creative design assistant. You help users visualize ideas by generating high-quality image and video prompts. When asked to create something, first describe the visual concept in detail, then use your tools to generate the asset.',
      tools: ['image_generation', 'video_generation'],
      commands: [
        { command: 'visualize', description: 'Create a visual concept' },
        { command: 'animate', description: 'Generate a short video clip' }
      ],
      creatorId: 'system',
      isActive: true,
      createdAt: 1711284600000,
      avatar: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&h=200&fit=crop'
    },
    {
      id: 'template_architect',
      name: 'Code Architect',
      username: '@code_architect',
      description: 'Technical expert for software development.',
      systemInstruction: 'You are a senior software architect. You provide clean, efficient, and well-documented code solutions. Focus on best practices, performance, and security. Always explain the logic behind your technical decisions.',
      tools: ['web_search'],
      commands: [
        { command: 'refactor', description: 'Suggest code improvements' },
        { command: 'debug', description: 'Help find and fix a bug' }
      ],
      creatorId: 'system',
      isActive: true,
      createdAt: 1711284600000,
      avatar: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200&h=200&fit=crop'
    },
    {
      id: 'template_openai_video',
      name: 'OpenAI Video Architect',
      username: '@openai_video',
      description: 'GPT-4o powered cinematic structure expert.',
      systemInstruction: 'You are the OpenAI Video Architect. You specialize in high-level cinematic structure and visual storytelling. You are collaborating with the Anthropic Video Nuance bot to generate the best possible video clips. When a user asks for a video, you should first outline the cinematic vision, then ask Anthropic for nuanced details, and finally use your video_generation tool to create the clip. Always maintain a professional, visionary tone.',
      tools: ['video_generation'],
      modelId: 'gpt-4o',
      commands: [
        { command: 'direct', description: 'Direct a new cinematic scene' }
      ],
      creatorId: 'system',
      isActive: true,
      createdAt: Date.now(),
      avatar: 'https://images.unsplash.com/photo-1675271591211-126ad94e495d?w=200&h=200&fit=crop'
    },
    {
      id: 'template_anthropic_video',
      name: 'Anthropic Video Nuance',
      username: '@anthropic_video',
      description: 'Claude 3.5 powered technical precision expert.',
      systemInstruction: 'You are the Anthropic Video Nuance bot. You specialize in fine details, emotional depth, and technical precision. You are collaborating with the OpenAI Video Architect to generate the best possible video clips. When OpenAI outlines a vision, you should provide specific technical details (lighting, camera movement, texture) to enhance the prompt before the video is generated. Always maintain a thoughtful, precise tone.',
      tools: ['video_generation'],
      modelId: 'claude-3-5-sonnet',
      commands: [
        { command: 'refine', description: 'Refine visual details for a scene' }
      ],
      creatorId: 'system',
      isActive: true,
      createdAt: Date.now(),
      avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4628c9757?w=200&h=200&fit=crop'
    }
  ];

  useEffect(() => {
    const q = query(collection(db, 'bots'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const botList = snapshot.docs.map(doc => doc.data() as Bot);
      setBots(botList);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateBot = async () => {
    // Check bot limits
    if (!editingBotId && userProfile?.role !== 'super_admin') {
      const myBotsCount = bots.filter(b => b.creatorId === currentUserId).length;
      const plan = userProfile?.plan || 'free';
      
      if (plan === 'free' && myBotsCount >= 1) {
        toast.error('Free plan is limited to 1 bot. Please upgrade to create more.');
        return;
      }
      
      if (plan === 'standard' && myBotsCount >= 3) {
        toast.error('Standard plan is limited to 3 bots. Please upgrade to create more.');
        return;
      }
    }

    const newErrors: { [key: string]: string } = {};
    if (!newBot.name) newErrors.name = 'Bot name is required';
    if (!newBot.username) newErrors.username = 'Username is required';
    if (!newBot.systemInstruction) newErrors.systemInstruction = 'System instruction is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const botId = editingBotId || `bot_${Date.now()}`;
    const bot: Bot = {
      id: botId,
      name: newBot.name!,
      username: newBot.username!.startsWith('@') ? newBot.username! : `@${newBot.username}`,
      description: newBot.description || '',
      systemInstruction: newBot.systemInstruction!,
      prompt: newBot.prompt || '',
      websiteUrl: newBot.websiteUrl || '',
      files: newBot.files || [],
      commands: newBot.commands || [],
      tools: newBot.tools || [],
      modelId: newBot.modelId || 'gpt-4o',
      webhookUrl: newBot.webhookUrl || '',
      avatar: newBot.avatar || '',
      creatorId: currentUserId,
      isActive: true,
      createdAt: editingBotId ? (bots.find(b => b.id === editingBotId)?.createdAt || Date.now()) : Date.now(),
      tags: newBot.tags || [],
      exampleInteractions: newBot.exampleInteractions || [],
      category: newBot.category || '',
      tone: newBot.tone || ''
    };

    try {
      await setDoc(doc(db, 'bots', botId), bot);
      setIsCreating(false);
      setEditingBotId(null);
      setNewBot({
        name: '',
        username: '',
        description: '',
        systemInstruction: '',
        modelId: 'gpt-4o',
        commands: [{ command: 'start', description: 'Start the bot' }],
        tools: [],
        webhookUrl: '',
        avatar: '',
        isActive: true,
        tags: [],
        exampleInteractions: [{ user: 'Hello', bot: 'Hi there! How can I help you today?' }],
        category: '',
        tone: ''
      });
    } catch (error) {
      console.error("Error saving bot:", error);
    }
  };

  const handleEditBot = (bot: Bot) => {
    setNewBot({
      name: bot.name || '',
      username: (bot.username || '').replace('@', ''),
      description: bot.description || '',
      systemInstruction: bot.systemInstruction || '',
      prompt: bot.prompt || '',
      websiteUrl: bot.websiteUrl || '',
      files: bot.files || [],
      modelId: bot.modelId || 'gpt-4o',
      commands: bot.commands || [],
      tools: bot.tools || [],
      webhookUrl: bot.webhookUrl || '',
      avatar: bot.avatar || '',
      isActive: bot.isActive ?? true,
      tags: bot.tags || [],
      exampleInteractions: bot.exampleInteractions || [],
      category: bot.category || '',
      tone: bot.tone || ''
    });
    setEditingBotId(bot.id);
    setIsCreating(true);
    setModalTab('config');
  };

  const handleApplyTemplate = (template: Bot) => {
    setNewBot({
      ...newBot,
      name: template.name,
      username: template.username,
      description: template.description,
      systemInstruction: template.systemInstruction,
      prompt: template.prompt || '',
      websiteUrl: template.websiteUrl || '',
      files: template.files || [],
      modelId: template.modelId || 'gpt-4o',
      tools: template.tools,
      commands: template.commands,
      avatar: template.avatar,
      tags: template.tags || [],
      exampleInteractions: template.exampleInteractions || [],
      category: template.category || '',
      tone: template.tone || ''
    });
  };

  const handleTestBot = async () => {
    if (!testInput.trim() || isTestLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: testInput,
      timestamp: Date.now()
    };

    setTestMessages(prev => [...prev, userMsg]);
    setTestInput('');
    setIsTestLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    };
    setTestMessages(prev => [...prev, assistantMsg]);

    try {
      const { responseStream } = await generateChatResponseStream(
        [...testMessages, userMsg].map(m => ({ role: m.role as any, content: m.content })),
        {
          tone: 'Professional',
          voice: 'First person',
          modelId: newBot.modelId || 'gpt-4o',
          customSystemInstruction: newBot.systemInstruction,
          customPrompt: newBot.prompt,
          customWebsiteUrl: newBot.websiteUrl,
          customFiles: newBot.files,
          customTools: newBot.tools
        }
      );

      let fullText = '';
      for await (const chunk of responseStream) {
        const c = chunk as any;
        if (c.text) {
          fullText += c.text;
          setTestMessages(prev => prev.map(m => 
            m.id === assistantMsgId ? { ...m, content: fullText } : m
          ));
        }
        
        if (c.functionCalls) {
          for (const call of c.functionCalls) {
            if (call.name === 'fetchTickets') {
              const args = call.args as any;
              const statusFilter = args.status;
              const ticketId = args.ticketId;
              
              const mockTickets = [
                { id: 'TKT-101', title: 'Login Issue', status: 'open', date: '2026-03-29', link: 'https://support.example.com/tickets/TKT-101' },
                { id: 'TKT-102', title: 'Billing Question', status: 'closed', date: '2026-03-28', link: 'https://support.example.com/tickets/TKT-102' },
                { id: 'TKT-103', title: 'Feature Request', status: 'pending', date: '2026-03-30', link: 'https://support.example.com/tickets/TKT-103' }
              ];
              
              let filteredTickets = mockTickets;
              if (statusFilter) {
                filteredTickets = mockTickets.filter(t => t.status === statusFilter.toLowerCase());
              }
              if (ticketId) {
                filteredTickets = mockTickets.filter(t => t.id === ticketId);
              }
              
              const ticketInfo = filteredTickets.length > 0 
                ? filteredTickets.map(t => `- [${t.id}](${t.link}) ${t.title} (Status: ${t.status})`).join('\n')
                : 'No tickets found matching the criteria.';
                
              fullText += `\n\n**Ticket System Response:**\n${ticketInfo}`;
              setTestMessages(prev => prev.map(m => 
                m.id === assistantMsgId ? { ...m, content: fullText } : m
              ));
            }
          }
        }
      }

      setTestMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, isStreaming: false } : m
      ));
    } catch (error) {
      console.error("Test Lab Error:", error);
      setTestMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, content: "Failed to generate response. Please try again.", isStreaming: false } : m
      ));
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file.");
      return;
    }

    if (file.size > 500000) { // 500KB limit for base64 avatars
      toast.error("Avatar image is too large. Please choose a file under 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewBot({ ...newBot, avatar: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleBotFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    const plan = userProfile?.plan || 'free';
    const maxFiles = plan === 'free' ? 5 : plan === 'standard' ? 20 : plan === 'advanced' ? 50 : 200;
    const currentFiles = newBot.files || [];

    if (currentFiles.length + uploadedFiles.length > maxFiles) {
      toast.error(`Your ${plan} plan is limited to ${maxFiles} files per bot.`);
      return;
    }

    // 500KB limit per file to avoid Firestore 1MB document limit
    const MAX_FILE_SIZE = 500 * 1024; 

    Array.from(uploadedFiles).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File ${file.name} is too large. Maximum size is 500KB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const fileData: any = {
          id: Math.random().toString(36).substring(7),
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result as string,
          timestamp: Date.now()
        };
        setNewBot(prev => ({
          ...prev,
          files: [...(prev.files || []), fileData]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteBot = async (botId: string) => {
    setBotToDelete(botId);
  };

  const confirmDeleteBot = async () => {
    if (!botToDelete) return;
    try {
      await deleteDoc(doc(db, 'bots', botToDelete));
      setBotToDelete(null);
    } catch (error) {
      console.error("Error deleting bot:", error);
    }
  };

  const filteredBots = [
    ...(activeTab === 'discover' ? botTemplates : []),
    ...bots.filter(b => activeTab === 'discover' || b.creatorId === currentUserId)
  ].filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col bg-white h-full overflow-hidden font-sans">
      {/* Header */}
      <div className="p-8 border-b border-zinc-100 bg-zinc-50/30 shrink-0">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-zinc-950 mb-2 tracking-tight flex items-center gap-3">
                <BotIcon className="w-8 h-8 text-zinc-950" />
                Bot Platform
              </h1>
              <p className="text-zinc-500 text-sm font-medium">Develop, deploy, and discover powerful AI bots for your organization.</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-zinc-950 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all active:scale-95 shadow-xl shadow-zinc-950/10"
            >
              <Plus className="w-5 h-5" />
              Create New Bot
            </button>
          </div>

          <div className="flex items-center gap-8 border-b border-zinc-200">
            <button
              onClick={() => setActiveTab('discover')}
              className={cn(
                "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
                activeTab === 'discover' ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              Discover
              {activeTab === 'discover' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950" />}
            </button>
            <button
              onClick={() => setActiveTab('my-bots')}
              className={cn(
                "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
                activeTab === 'my-bots' ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              My Bots
              {activeTab === 'my-bots' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950" />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search bots by name or @username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredBots.map((bot) => {
                const isActiveInSession = activeBotsInSession.some(b => b.id === bot.id);
                return (
                  <motion.div
                    key={bot.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group bg-white border border-zinc-100 rounded-[2.5rem] p-6 hover:border-zinc-950 hover:shadow-2xl hover:shadow-zinc-950/5 transition-all duration-500 flex flex-col relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 overflow-hidden relative">
                        {bot.avatar ? (
                          <img src={bot.avatar} alt={bot.name} className="w-full h-full object-cover" />
                        ) : (
                          <BotIcon className="w-8 h-8 text-zinc-400" />
                        )}
                        {bot.creatorId === 'system' && (
                          <div className="absolute top-0 right-0 p-1 bg-zinc-950 text-white">
                            <Zap className="w-2 h-2" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        {/* Session Toggle Switch */}
                        <div className="flex items-center gap-3 px-3 py-2 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest transition-colors",
                            isActiveInSession ? "text-emerald-600" : "text-zinc-400"
                          )}>
                            {isActiveInSession ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => onToggleBotInSession(bot)}
                            className={cn(
                              "w-10 h-5 rounded-full relative transition-all duration-300",
                              isActiveInSession ? "bg-emerald-500" : "bg-zinc-200"
                            )}
                          >
                            <motion.div
                              animate={{ x: isActiveInSession ? 22 : 2 }}
                              className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                            />
                          </button>
                        </div>

                        {bot.creatorId === currentUserId && (
                          <button 
                            onClick={() => handleDeleteBot(bot.id)}
                            className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setViewingBot(bot)}
                    >
                      <h3 className="text-xl font-bold text-zinc-950 mb-1 tracking-tight group-hover:text-zinc-600 transition-colors">{bot.name}</h3>
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{bot.username}</p>
                        {bot.rating && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                            <span className="text-[10px] font-bold">{bot.rating}</span>
                            <Zap className="w-2 h-2 fill-current" />
                          </div>
                        )}
                        {bot.category && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-wider rounded-md border border-blue-100">
                            {bot.category}
                          </span>
                        )}
                        {bot.tone && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-bold uppercase tracking-wider rounded-md border border-purple-100">
                            {bot.tone}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-zinc-500 leading-relaxed mb-4 font-medium line-clamp-2">
                        {bot.description || "No description provided."}
                      </p>

                      {bot.tags && bot.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          {bot.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-zinc-50 text-zinc-400 text-[9px] font-bold uppercase tracking-wider rounded-md border border-zinc-100">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {bot.exampleInteractions && bot.exampleInteractions.length > 0 && (
                        <div className="mb-6 p-3 bg-zinc-50 rounded-2xl border border-zinc-100 italic text-[11px] text-zinc-400 line-clamp-2">
                          "{bot.exampleInteractions[0].user.substring(0, 40)}..."
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 pt-6 border-t border-zinc-50">
                      <div className="flex flex-wrap gap-2">
                        {bot.commands.slice(0, 3).map((cmd, idx) => (
                          <span key={idx} className="px-3 py-1 bg-zinc-50 text-zinc-500 text-[10px] font-bold rounded-full border border-zinc-100">
                            /{cmd.command}
                          </span>
                        ))}
                        {bot.commands.length > 3 && (
                          <span className="px-3 py-1 bg-zinc-50 text-zinc-400 text-[10px] font-bold rounded-full border border-zinc-100">
                            +{bot.commands.length - 3} more
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => onToggleBotInSession(bot)}
                          className={cn(
                            "flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                            isActiveInSession 
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                              : "bg-zinc-950 text-white hover:bg-zinc-800 shadow-xl shadow-zinc-950/10"
                          )}
                        >
                          {isActiveInSession ? (
                            <>
                              <Check className="w-4 h-4" />
                              Active in Session
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Add to Session
                            </>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeployingBot(bot);
                          }}
                          className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl border border-blue-100 transition-all shadow-sm"
                          title="Deploy & Share"
                        >
                          <Globe className="w-4 h-4" />
                        </button>
                        {bot.creatorId === currentUserId && (
                          <button
                            onClick={() => handleEditBot(bot)}
                            className="p-3 bg-zinc-50 text-zinc-500 hover:bg-zinc-950 hover:text-white rounded-2xl border border-zinc-100 transition-all shadow-sm"
                            title="Edit Bot"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Create Bot Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center">
                    <Terminal className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
                      {editingBotId ? 'Edit Bot Configuration' : 'Bot Developer Studio'}
                    </h2>
                    <p className="text-xs text-zinc-500 font-medium">Configure your AI agent's identity and logic.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsCreating(false);
                    setEditingBotId(null);
                    setNewBot({
                      name: '',
                      username: '',
                      description: '',
                      systemInstruction: '',
                      commands: [{ command: 'start', description: 'Start the bot' }],
                      tools: [],
                      avatar: '',
                      isActive: true
                    });
                  }}
                  className="p-2 hover:bg-zinc-50 rounded-xl text-zinc-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="px-8 border-b border-zinc-100 flex items-center gap-8 shrink-0">
                <button
                  onClick={() => setModalTab('config')}
                  className={cn(
                    "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
                    modalTab === 'config' ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  Configuration
                  {modalTab === 'config' && <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950" />}
                </button>
                <button
                  onClick={() => setModalTab('test')}
                  className={cn(
                    "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
                    modalTab === 'test' ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  Test Lab
                  {modalTab === 'test' && <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950" />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {modalTab === 'config' ? (
                  <>
                    {!editingBotId && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Quick Start Templates</label>
                        <div className="grid grid-cols-3 gap-4">
                          {botTemplates.map(template => {
                            return (
                              <button
                                key={template.id}
                                onClick={() => handleApplyTemplate(template as any)}
                                className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl hover:border-zinc-950 transition-all text-left group"
                              >
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm overflow-hidden">
                                  {template.avatar ? (
                                    <img src={template.avatar} alt={template.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <BotIcon className="w-5 h-5 text-zinc-950" />
                                  )}
                                </div>
                                <div className="text-xs font-bold text-zinc-950 mb-1">{template.name}</div>
                                <div className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{template.description}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-6 mb-4">
                  <div className="group relative w-24 h-24 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    {newBot.avatar ? (
                      <>
                        <img src={newBot.avatar} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setNewBot({ ...newBot, avatar: '' })}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </>
                    ) : (
                      <BotIcon className="w-10 h-10 text-zinc-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Avatar</label>
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer">
                          <div className="w-full bg-zinc-50 border border-zinc-100 hover:border-zinc-300 rounded-2xl px-4 py-3 text-sm text-zinc-500 flex items-center gap-2 transition-all">
                            <Upload className="w-4 h-4" />
                            <span>Upload Image</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                          />
                        </label>
                        <div className="flex-[2] relative">
                          <input
                            type="text"
                            placeholder="Or enter image URL..."
                            value={newBot.avatar || ''}
                            onChange={(e) => setNewBot({ ...newBot, avatar: e.target.value })}
                            className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-400 px-1 italic">Recommended: Square image, max 500KB.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Bot Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Research Assistant"
                        value={newBot.name || ''}
                        onChange={(e) => {
                          setNewBot({ ...newBot, name: e.target.value });
                          if (errors.name) setErrors({ ...errors, name: '' });
                        }}
                        className={cn(
                          "w-full bg-zinc-50 border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all",
                          errors.name ? "border-red-500" : "border-zinc-100"
                        )}
                      />
                      {errors.name && <p className="text-[10px] text-red-500 px-1">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Username</label>
                      <input
                        type="text"
                        placeholder="e.g. @research_bot"
                        value={newBot.username || ''}
                        onChange={(e) => {
                          setNewBot({ ...newBot, username: e.target.value });
                          if (errors.username) setErrors({ ...errors, username: '' });
                        }}
                        className={cn(
                          "w-full bg-zinc-50 border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all",
                          errors.username ? "border-red-500" : "border-zinc-100"
                        )}
                      />
                      {errors.username && <p className="text-[10px] text-red-500 px-1">{errors.username}</p>}
                    </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">AI Model</label>
                  <select 
                    value={newBot.modelId}
                    onChange={(e) => setNewBot({ ...newBot, modelId: e.target.value as AIModel })}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all appearance-none cursor-pointer"
                  >
                    <optgroup label="OpenAI" className="bg-white">
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                    </optgroup>
                    <optgroup label="Anthropic" className="bg-white">
                      <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                    </optgroup>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Category / Niche</label>
                    <select 
                      value={newBot.category || ''}
                      onChange={(e) => setNewBot({ ...newBot, category: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select Category</option>
                      <option value="Development">Development & Coding</option>
                      <option value="Education">Education & Learning</option>
                      <option value="Marketing">Marketing & SEO</option>
                      <option value="Productivity">Productivity & Planning</option>
                      <option value="Support">Customer Support</option>
                      <option value="Entertainment">Entertainment & Fun</option>
                      <option value="Writing">Writing & Editing</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Tone of Voice</label>
                    <select 
                      value={newBot.tone || ''}
                      onChange={(e) => setNewBot({ ...newBot, tone: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select Tone</option>
                      <option value="Professional">Professional</option>
                      <option value="Friendly">Friendly & Casual</option>
                      <option value="Academic">Academic & Formal</option>
                      <option value="Humorous">Humorous & Witty</option>
                      <option value="Direct">Direct & Concise</option>
                      <option value="Empathetic">Empathetic & Supportive</option>
                      <option value="Sarcastic">Sarcastic & Edgy</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Description</label>
                  <textarea
                    placeholder="What does this bot do?"
                    value={newBot.description || ''}
                    onChange={(e) => setNewBot({ ...newBot, description: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tags</label>
                    <button 
                      onClick={() => setNewBot({ ...newBot, tags: [...(newBot.tags || []), ''] })}
                      className="text-[10px] font-bold text-zinc-950 hover:underline uppercase tracking-widest"
                    >
                      + Add Tag
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newBot.tags?.map((tag, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-zinc-100 rounded-full pl-3 pr-1 py-1">
                        <input
                          type="text"
                          value={tag}
                          onChange={(e) => {
                            const updated = [...(newBot.tags || [])];
                            updated[idx] = e.target.value;
                            setNewBot({ ...newBot, tags: updated });
                          }}
                          className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest focus:outline-none w-20"
                          placeholder="TAG"
                        />
                        <button 
                          onClick={() => {
                            const updated = newBot.tags?.filter((_, i) => i !== idx);
                            setNewBot({ ...newBot, tags: updated });
                          }}
                          className="p-1 text-zinc-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Example Interactions</label>
                    <button 
                      onClick={() => setNewBot({ ...newBot, exampleInteractions: [...(newBot.exampleInteractions || []), { user: '', bot: '' }] })}
                      className="text-[10px] font-bold text-zinc-950 hover:underline uppercase tracking-widest"
                    >
                      + Add Example
                    </button>
                  </div>
                  <div className="space-y-3">
                    {newBot.exampleInteractions?.map((interaction, idx) => (
                      <div key={idx} className="space-y-2 p-4 bg-zinc-50 border border-zinc-100 rounded-2xl relative group">
                        <button 
                          onClick={() => {
                            const updated = newBot.exampleInteractions?.filter((_, i) => i !== idx);
                            setNewBot({ ...newBot, exampleInteractions: updated });
                          }}
                          className="absolute top-4 right-4 p-2 text-zinc-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest px-1">User Input</label>
                            <input
                              type="text"
                              value={interaction.user}
                              onChange={(e) => {
                                const updated = [...(newBot.exampleInteractions || [])];
                                updated[idx].user = e.target.value;
                                setNewBot({ ...newBot, exampleInteractions: updated });
                              }}
                              className="w-full bg-white border border-zinc-100 rounded-xl px-3 py-2 text-xs"
                              placeholder="e.g. Hello"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest px-1">Bot Response</label>
                            <textarea
                              value={interaction.bot}
                              onChange={(e) => {
                                const updated = [...(newBot.exampleInteractions || [])];
                                updated[idx].bot = e.target.value;
                                setNewBot({ ...newBot, exampleInteractions: updated });
                              }}
                              className="w-full bg-white border border-zinc-100 rounded-xl px-3 py-2 text-xs min-h-[60px] resize-none"
                              placeholder="e.g. Hi! How can I help?"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    <LinkIcon className="w-3 h-3" />
                    Website Link (Knowledge Base)
                  </label>
                  <input
                    type="text"
                    placeholder="https://yourwebsite.com"
                    value={newBot.websiteUrl || ''}
                    onChange={(e) => setNewBot({ ...newBot, websiteUrl: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Knowledge Base Files</label>
                    <label className="text-[10px] font-bold text-zinc-950 hover:underline uppercase tracking-widest cursor-pointer">
                      + Upload Files
                      <input
                        type="file"
                        multiple
                        onChange={handleBotFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {newBot.files?.map((file, idx) => (
                      <div key={file.id} className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-100 rounded-xl group relative">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                          {file.type.includes('image') ? <ImageIcon className="w-4 h-4 text-zinc-400" /> :
                           file.type.includes('audio') ? <Music className="w-4 h-4 text-zinc-400" /> :
                           file.type.includes('contact') ? <UsersIcon className="w-4 h-4 text-zinc-400" /> :
                           <FileText className="w-4 h-4 text-zinc-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-zinc-900 truncate">{file.name}</div>
                          <div className="text-[8px] text-zinc-400">{(file.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <button 
                          onClick={() => {
                            const updated = newBot.files?.filter((_, i) => i !== idx);
                            setNewBot({ ...newBot, files: updated });
                          }}
                          className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(!newBot.files || newBot.files.length === 0) && (
                      <div className="col-span-2 py-8 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl">
                        <p className="text-[10px] text-zinc-400 font-medium">No files uploaded yet. Add documents, images, or audio.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" />
                    Task Prompt / Instructions
                  </label>
                  <textarea
                    placeholder="Give the bot specific data or instructions to use when performing tasks..."
                    value={newBot.prompt || ''}
                    onChange={(e) => setNewBot({ ...newBot, prompt: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all min-h-[100px] resize-none"
                  />
                  <p className="text-[10px] text-zinc-400 px-1 italic">This data will be used by the bot to perform its assigned tasks.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">System Instructions</label>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                      <Zap className="w-3 h-3" />
                      AI Powered
                    </div>
                  </div>
                  <div className={cn(
                    "w-full bg-zinc-950 border rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-white/10 transition-all min-h-[200px]",
                    errors.systemInstruction ? "border-red-500" : "border-zinc-800"
                  )}>
                    <Editor
                      value={newBot.systemInstruction || ''}
                      onValueChange={code => {
                        setNewBot({ ...newBot, systemInstruction: code });
                        if (errors.systemInstruction) setErrors({ ...errors, systemInstruction: '' });
                      }}
                      highlight={code => prism.highlight(code, prism.languages.markdown, 'markdown')}
                      padding={16}
                      placeholder="Define the bot's personality, knowledge, and constraints..."
                      className="font-mono text-xs text-zinc-300 leading-relaxed min-h-[200px]"
                      style={{
                        fontFamily: '"Fira code", "Fira Mono", monospace',
                        fontSize: 12,
                      }}
                    />
                  </div>
                  {errors.systemInstruction && <p className="text-[10px] text-red-500 px-1">{errors.systemInstruction}</p>}
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Bot Capabilities</label>
                  <div className="grid grid-cols-2 gap-4">
                    {availableTools.map(tool => {
                      const isSelected = newBot.tools?.includes(tool.id);
                      const Icon = tool.icon;
                      
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => {
                            const currentTools = newBot.tools || [];
                            const nextTools = isSelected 
                              ? currentTools.filter(id => id !== tool.id)
                              : [...currentTools, tool.id];
                            setNewBot({ ...newBot, tools: nextTools });
                          }}
                          className={cn(
                            "flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group",
                            isSelected 
                              ? "bg-zinc-950 border-zinc-950 text-white shadow-xl shadow-zinc-950/10" 
                              : "bg-zinc-50 border-zinc-100 text-zinc-600 hover:border-zinc-200"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-white/10 text-white" : "bg-white text-zinc-400 group-hover:text-zinc-950"
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold mb-0.5">{tool.name}</div>
                            <div className={cn(
                              "text-[10px] leading-relaxed",
                              isSelected ? "text-zinc-400" : "text-zinc-500"
                            )}>
                              {tool.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Bot Commands</label>
                    <button 
                      onClick={() => setNewBot({ ...newBot, commands: [...(newBot.commands || []), { command: '', description: '' }] })}
                      className="text-[10px] font-bold text-zinc-950 hover:underline uppercase tracking-widest"
                    >
                      + Add Command
                    </button>
                  </div>
                  <div className="space-y-3">
                    {newBot.commands?.map((cmd, idx) => (
                      <div key={idx} className="space-y-2 p-4 bg-zinc-50 border border-zinc-100 rounded-2xl relative group">
                        <button 
                          onClick={() => {
                            const updated = newBot.commands?.filter((_, i) => i !== idx);
                            setNewBot({ ...newBot, commands: updated });
                          }}
                          className="absolute top-4 right-4 p-2 text-zinc-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest px-1">Command</label>
                            <input
                              type="text"
                              placeholder="e.g. start"
                              value={cmd.command || ''}
                              onChange={(e) => {
                                const updated = [...(newBot.commands || [])];
                                updated[idx].command = e.target.value;
                                setNewBot({ ...newBot, commands: updated });
                              }}
                              className="w-full bg-white border border-zinc-100 rounded-xl px-3 py-2 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest px-1">Description</label>
                            <input
                              type="text"
                              placeholder="What does it do?"
                              value={cmd.description || ''}
                              onChange={(e) => {
                                const updated = [...(newBot.commands || [])];
                                updated[idx].description = e.target.value;
                                setNewBot({ ...newBot, commands: updated });
                              }}
                              className="w-full bg-white border border-zinc-100 rounded-xl px-3 py-2 text-xs"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest px-1">Action / Workflow</label>
                          <div className="bg-zinc-950 rounded-xl overflow-hidden">
                            <Editor
                              value={cmd.action || ''}
                              onValueChange={code => {
                                const updated = [...(newBot.commands || [])];
                                updated[idx].action = code;
                                setNewBot({ ...newBot, commands: updated });
                              }}
                              highlight={code => prism.highlight(code, prism.languages.javascript, 'javascript')}
                              padding={12}
                              placeholder="Define the command's logic or workflow..."
                              className="font-mono text-[10px] text-zinc-400 leading-relaxed min-h-[60px]"
                              style={{
                                fontFamily: '"Fira code", "Fira Mono", monospace',
                                fontSize: 10,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1 flex items-center gap-2">
                      <Globe className="w-3 h-3" />
                      Webhook URL (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="https://api.yourdomain.com/webhook"
                      value={newBot.webhookUrl || ''}
                      onChange={(e) => setNewBot({ ...newBot, webhookUrl: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all"
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col h-full min-h-[400px]">
                  <div className="flex-1 space-y-6 mb-6">
                    {testMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-zinc-50 rounded-[2rem] border border-dashed border-zinc-200">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                          <Play className="w-10 h-10 text-zinc-300" />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-950 mb-2 tracking-tight">Bot Test Lab</h3>
                        <p className="text-sm text-zinc-500 max-w-[320px] leading-relaxed">
                          Test your bot's personality and logic in real-time. Changes to configuration are applied instantly.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {testMessages.map((msg) => (
                          <div 
                            key={msg.id}
                            className={cn(
                              "flex gap-4",
                              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                              msg.role === 'user' ? "bg-zinc-950 text-white" : "bg-white text-zinc-500 border border-zinc-100"
                            )}>
                              {msg.role === 'user' ? <UserPlus className="w-5 h-5" /> : (
                                newBot.avatar ? <img src={newBot.avatar} className="w-full h-full object-cover rounded-xl" /> : <BotIcon className="w-5 h-5" />
                              )}
                            </div>
                            <div className={cn(
                              "max-w-[85%] p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm",
                              msg.role === 'user' ? "bg-zinc-950 text-white rounded-tr-none" : "bg-white text-zinc-900 border border-zinc-100 rounded-tl-none"
                            )}>
                              {msg.content || (isTestLoading && msg.role === 'assistant' ? (
                                <div className="flex gap-1 py-1">
                                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
                                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
                                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
                                </div>
                              ) : '')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="sticky bottom-0 bg-white pt-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type a message to test..."
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTestBot()}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-5 pl-5 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all shadow-inner"
                      />
                      <button
                        onClick={handleTestBot}
                        disabled={!testInput.trim() || isTestLoading}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-3 bg-zinc-950 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-lg shadow-zinc-950/20"
                      >
                        {isTestLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-4 px-1">
                      <button 
                        onClick={() => setTestMessages([])}
                        className="text-[10px] font-bold text-zinc-400 hover:text-zinc-950 uppercase tracking-widest transition-colors"
                      >
                        Clear History
                      </button>
                      <div className="text-[10px] text-zinc-400 font-medium italic">
                        Testing as {newBot.name || 'Untitled Bot'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-zinc-100 bg-zinc-50/50 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                <Info className="w-3.5 h-3.5" />
                Changes are saved to the cloud
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setEditingBotId(null);
                  }}
                  className="px-6 py-3 text-sm font-bold text-zinc-500 hover:text-zinc-950 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBot}
                  disabled={!newBot.name || !newBot.username}
                  className="px-8 py-3 bg-zinc-950 text-white rounded-2xl text-sm font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-xl shadow-zinc-950/10 flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {editingBotId ? 'Update Bot' : 'Deploy Bot'}
                </button>
              </div>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bot Detail Modal */}
      <AnimatePresence>
        {viewingBot && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingBot(null)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    {viewingBot.avatar ? (
                      <img src={viewingBot.avatar} alt={viewingBot.name} className="w-full h-full object-cover" />
                    ) : (
                      <BotIcon className="w-10 h-10 text-zinc-300" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">{viewingBot.name}</h2>
                    <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest">{viewingBot.username}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingBot(null)}
                  className="p-2 hover:bg-zinc-50 rounded-xl text-zinc-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">About this Bot</label>
                  <p className="text-zinc-600 leading-relaxed font-medium">
                    {viewingBot.description || "No description provided."}
                  </p>
                  {viewingBot.tags && viewingBot.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {viewingBot.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-zinc-50 text-zinc-400 text-[9px] font-bold uppercase tracking-wider rounded-md border border-zinc-100">
                          {tag}
                        </span>
                      ))}
                      {viewingBot.category && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-wider rounded-md border border-blue-100">
                          {viewingBot.category}
                        </span>
                      )}
                      {viewingBot.tone && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-bold uppercase tracking-wider rounded-md border border-purple-100">
                          {viewingBot.tone}
                        </span>
                      )}
                    </div>
                  )}
                  {(!viewingBot.tags || viewingBot.tags.length === 0) && (viewingBot.category || viewingBot.tone) && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {viewingBot.category && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-wider rounded-md border border-blue-100">
                          {viewingBot.category}
                        </span>
                      )}
                      {viewingBot.tone && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-bold uppercase tracking-wider rounded-md border border-purple-100">
                          {viewingBot.tone}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {viewingBot.exampleInteractions && viewingBot.exampleInteractions.length > 0 && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Example Interactions</label>
                    <div className="space-y-3">
                      {viewingBot.exampleInteractions.map((interaction, idx) => (
                        <div key={idx} className="space-y-3 p-5 bg-zinc-50 rounded-[2rem] border border-zinc-100">
                          <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                              <User className="w-3.5 h-3.5 text-zinc-500" />
                            </div>
                            <div className="text-xs text-zinc-600 font-medium leading-relaxed">
                              {interaction.user}
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-zinc-950 flex items-center justify-center shrink-0">
                              <BotIcon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="text-xs text-zinc-950 font-bold leading-relaxed">
                              {interaction.bot}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewingBot.tools && viewingBot.tools.length > 0 && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Capabilities</label>
                    <div className="grid grid-cols-2 gap-4">
                      {viewingBot.tools.map(toolId => {
                        const tool = availableTools.find(t => t.id === toolId);
                        if (!tool) return null;
                        const Icon = tool.icon;
                        return (
                          <div key={toolId} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-950 shadow-sm">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="text-xs font-bold text-zinc-950">{tool.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Available Commands</label>
                  <div className="space-y-3">
                    {viewingBot.commands.map((cmd, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <div className="px-3 py-1 bg-zinc-950 text-white text-[10px] font-mono font-bold rounded-lg shrink-0">
                          /{cmd.command}
                        </div>
                        <div className="text-xs text-zinc-500 font-medium leading-relaxed">
                          {cmd.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {viewingBot.webhookUrl && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Integration</label>
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <Globe className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700">External Webhook Connected</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-end gap-4 shrink-0">
                <button
                  onClick={() => {
                    onToggleBotInSession(viewingBot);
                    setViewingBot(null);
                  }}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl",
                    activeBotsInSession.some(b => b.id === viewingBot.id)
                      ? "bg-emerald-500 text-white shadow-emerald-500/20"
                      : "bg-zinc-950 text-white hover:bg-zinc-800 shadow-zinc-950/20"
                  )}
                >
                  {activeBotsInSession.some(b => b.id === viewingBot.id) ? (
                    <>
                      <Trash2 className="w-5 h-5" />
                      Remove from Session
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add to Session
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deploy Bot Modal */}
      <AnimatePresence>
        {deployingBot && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
              onClick={() => setDeployingBot(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-zinc-100 bg-zinc-50/50">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">Deploy & Share</h2>
                  <p className="text-sm text-zinc-500 mt-1">Share {deployingBot.name} with the world</p>
                </div>
                <button
                  onClick={() => setDeployingBot(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                {/* Direct Link */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    Direct Link
                  </h3>
                  <p className="text-sm text-zinc-500">Share this link for users to chat directly with your bot.</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}/bot/${deployingBot.id}`}
                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-600 font-mono focus:outline-none"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/bot/${deployingBot.id}`);
                        toast.success('Link copied to clipboard!');
                      }}
                      className="px-6 py-3 bg-zinc-950 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Embed Code */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
                    <Code className="w-4 h-4 text-emerald-500" />
                    Embed on Website
                  </h3>
                  <p className="text-sm text-zinc-500">Paste this HTML snippet to embed the bot on your website.</p>
                  <div className="relative">
                    <textarea 
                      readOnly 
                      rows={4}
                      value={`<iframe src="${window.location.origin}/bot/${deployingBot.id}?embed=true" width="100%" height="600px" frameborder="0" style="border-radius: 12px; border: 1px solid #e4e4e7;"></iframe>`}
                      className="w-full bg-zinc-950 text-emerald-400 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none resize-none"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`<iframe src="${window.location.origin}/bot/${deployingBot.id}?embed=true" width="100%" height="600px" frameborder="0" style="border-radius: 12px; border: 1px solid #e4e4e7;"></iframe>`);
                        toast.success('Embed code copied!');
                      }}
                      className="absolute top-3 right-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors backdrop-blur-sm"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>

                {/* Directory Publication */}
                <div className="space-y-3 pt-6 border-t border-zinc-100">
                  <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-500" />
                    Publish to Directory
                  </h3>
                  <p className="text-sm text-zinc-500">Make your bot discoverable to other users in the workspace directory.</p>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <div>
                      <p className="text-sm font-bold text-purple-900">Workspace Directory</p>
                      <p className="text-xs text-purple-700 mt-0.5">Currently {deployingBot.isActive ? 'published' : 'private'}</p>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await setDoc(doc(db, 'bots', deployingBot.id), {
                            ...deployingBot,
                            isActive: !deployingBot.isActive
                          }, { merge: true });
                          setDeployingBot({ ...deployingBot, isActive: !deployingBot.isActive });
                          toast.success(deployingBot.isActive ? 'Bot removed from directory' : 'Bot published to directory!');
                        } catch (error) {
                          toast.error('Failed to update visibility');
                        }
                      }}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-bold transition-colors",
                        deployingBot.isActive 
                          ? "bg-white text-purple-600 border border-purple-200 hover:bg-purple-100"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      )}
                    >
                      {deployingBot.isActive ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {botToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-2">Delete Bot</h2>
                <p className="text-zinc-500 text-sm mb-6">
                  Are you sure you want to delete this bot? This action cannot be undone and will permanently remove the bot and all its data.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setBotToDelete(null)}
                    className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteBot}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                  >
                    Delete Bot
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
