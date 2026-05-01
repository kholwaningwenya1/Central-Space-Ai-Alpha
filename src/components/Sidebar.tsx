import React from 'react';
import { 
  MessageSquare, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  PlusCircle, 
  History, 
  Sparkles, 
  Shield, 
  ShieldAlert,
  Layout,
  Library as LibraryIcon,
  Search as SearchIcon,
  Palette,
  Cpu,
  User as UserIcon,
  Search,
  Clock,
  Star,
  LogOut,
  FileText,
  Users,
  Hash,
  Users2,
  UserPlus,
  Bot as BotIcon,
  CreditCard,
  Ruler,
  BookOpen
} from 'lucide-react';
import { Tone, Voice, AIModel, WorkspaceSession, SessionMode, Presence, ConversationType, ResultType } from '../types';
import { cn } from '../lib/utils';
import { User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  currentTone: Tone;
  currentVoice: Voice;
  currentResultType?: ResultType;
  currentTtsVoice?: string;
  currentModel: AIModel;
  currentMode: SessionMode;
  privacyMode: boolean;
  onToneChange: (tone: Tone) => void;
  onVoiceChange: (voice: Voice) => void;
  onResultTypeChange: (resultType: ResultType) => void;
  onTtsVoiceChange: (voice: string) => void;
  onModelChange: (model: AIModel) => void;
  onModeChange: (mode: SessionMode) => void;
  onPrivacyToggle: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  sessions: WorkspaceSession[];
  currentSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onNewSession: (type?: ConversationType, title?: string, members?: string[]) => void;
  user: FirebaseUser | null;
  presence?: { [uid: string]: Presence };
  userProfile?: any;
}

const MODELS: { id: AIModel; name: string; provider: string; description: string; minPlan?: string }[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'High-intelligence flagship model', minPlan: 'standard' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast, affordable small model' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Excellent for coding and nuance', minPlan: 'advanced' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Powerful model for complex tasks', minPlan: 'advanced' },
];

import { toast } from 'sonner';
import { generateText } from '../services/aiService';

export function Sidebar({ 
  currentTone, 
  currentVoice, 
  currentModel,
  currentMode,
  privacyMode,
  currentResultType,
  currentTtsVoice,
  onToneChange, 
  onVoiceChange, 
  onModelChange,
  onModeChange,
  onPrivacyToggle,
  onResultTypeChange,
  onTtsVoiceChange,
  isCollapsed, 
  onToggleCollapse,
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  user,
  presence,
  userProfile
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [summary, setSummary] = React.useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = React.useState(false);

  const checkPlanAccess = (requiredPlan: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'super_admin') return true;
    
    const plans = ['free', 'standard', 'advanced', 'corporate'];
    const userPlanIndex = plans.indexOf(userProfile.plan || 'free');
    const requiredPlanIndex = plans.indexOf(requiredPlan);
    
    return userPlanIndex >= requiredPlanIndex;
  };

  const handleModeClick = (modeId: SessionMode, requiredPlan?: string) => {
    if (requiredPlan && !checkPlanAccess(requiredPlan)) {
      toast.error(`This feature requires the ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} plan or higher.`);
      onModeChange('billing');
      return;
    }
    onModeChange(modeId);
  };

  const handleModelChange = (modelId: AIModel) => {
    const model = MODELS.find(m => m.id === modelId);
    if (model?.minPlan && !checkPlanAccess(model.minPlan)) {
      toast.error(`The ${model.name} model requires the ${model.minPlan.charAt(0).toUpperCase() + model.minPlan.slice(1)} plan or higher.`);
      onModeChange('billing');
      return;
    }
    onModelChange(modelId);
  };

  const filteredSessions = sessions
    .filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const handleSmartSummary = async () => {
    if (!currentSession || currentSession.messages.length === 0) return;
    setIsSummarizing(true);
    
    try {
      const history = currentSession.messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const text = await generateText(
        `Summarize this workspace session in 3-5 bullet points focusing on key decisions and actions:\n\n${history}`,
        'gpt-4o-mini',
        "You are a helpful assistant that provides concise summaries."
      );
      setSummary(text || "Could not generate summary.");
    } catch (error) {
      console.error("Summary failed:", error);
      setSummary("Failed to generate summary. Please try again.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const categories = [
    { id: 'direct', label: 'Direct Chats', icon: UserIcon },
    { id: 'group', label: 'Groups', icon: Users2 },
    { id: 'channel', label: 'Channels', icon: Hash },
    { id: 'workspace', label: 'Workspaces', icon: Layout },
  ];

  return (
    <aside 
      className={cn(
        "bg-zinc-950 border-r border-zinc-800/50 flex flex-col transition-all duration-300 h-screen font-sans",
        "fixed inset-y-0 left-0 z-50 lg:relative lg:z-30",
        isCollapsed 
          ? "-translate-x-full lg:translate-x-0 lg:w-20" 
          : "translate-x-0 w-[280px] sm:w-80"
      )}
    >
      {/* Collapse Toggle */}
      <button 
        onClick={onToggleCollapse}
        className="absolute -right-3 top-24 w-6 h-6 bg-zinc-900 border border-zinc-800 rounded-full hidden lg:flex items-center justify-center text-zinc-500 hover:text-white shadow-xl z-50 transition-all hover:scale-110"
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Header */}
      <div className={cn("p-6 flex flex-col gap-6 shrink-0", isCollapsed && "px-4 items-center")}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-white/5 overflow-hidden">
              <img src="/logo.png" alt="Central Space Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <h1 className="text-base font-bold text-white tracking-tight">Central Space</h1>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">v5.0 Enterprise</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onNewSession('workspace')}
              className="w-full py-3 px-4 bg-white text-zinc-950 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl shadow-white/5"
            >
              <PlusCircle className="w-4 h-4" />
              New Project
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all placeholder:text-zinc-600"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-8 custom-scrollbar">
        {/* Workspace Modes */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-3 mb-2 block">Modes</span>
          )}
          {[
            { id: 'chat', icon: MessageSquare, label: 'Chat & Research' },
            { id: 'search', icon: SearchIcon, label: 'Semantic Search' },
            { id: 'media', icon: Sparkles, label: 'Media Hub' },
            { id: 'directory', icon: UserPlus, label: 'Directory' },
            { id: 'bots', icon: BotIcon, label: 'Bot Platform' },
            { id: 'read_it_for_me', icon: BookOpen, label: 'Read It For Me' },
            { id: 'document', icon: FileText, label: 'Document Editor' },
            { id: 'blueprint', icon: Ruler, label: 'Blueprint Gen' },
            { id: 'canvas', icon: Palette, label: 'Visual Canvas' },
            { id: 'library', icon: LibraryIcon, label: 'File Library' },
            { id: 'settings', icon: Settings, label: 'Settings' },
            { id: 'billing', icon: CreditCard, label: 'Billing & Plans' },
            ...(userProfile?.role === 'super_admin' || userProfile?.role === 'admin' || userProfile?.email === 'kholwaningwenya1@gmail.com' ? [{ id: 'admin', icon: Shield, label: 'Admin Control' }] : []),
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => handleModeClick(mode.id as SessionMode)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                currentMode === mode.id 
                  ? "bg-zinc-900 text-white ring-1 ring-zinc-800 shadow-xl" 
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50"
              )}
              title={isCollapsed ? mode.label : undefined}
            >
              <mode.icon className={cn("w-4 h-4 shrink-0", currentMode === mode.id ? "text-white" : "text-zinc-600 group-hover:text-zinc-400")} />
              {!isCollapsed && <span>{mode.label}</span>}
            </button>
          ))}
        </div>

        {/* Sessions Categorized */}
        {!isCollapsed && categories.map((cat) => (
          <div key={cat.id} className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-2">
              <div className="flex items-center gap-2">
                <cat.icon className="w-3 h-3 text-zinc-600" />
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">{cat.label}</span>
              </div>
              {cat.id !== 'direct' && (
                <button 
                  onClick={() => onNewSession(cat.id as ConversationType, `New ${cat.label.slice(0, -1)}`)}
                  className="p-1 hover:bg-zinc-900 rounded-md text-zinc-700 hover:text-zinc-400 transition-colors"
                >
                  <PlusCircle className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {filteredSessions.filter(s => s.type === cat.id || (!s.type && cat.id === 'workspace')).map((session) => (
                  <motion.button
                    key={session.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => onSessionSelect(session.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all text-left group relative",
                      currentSessionId === session.id 
                        ? "bg-zinc-900 text-white ring-1 ring-zinc-800" 
                        : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50"
                    )}
                  >
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      currentSessionId === session.id ? "bg-white" : (
                        session.type === 'direct' && session.presence && Object.values(session.presence).some(p => p.uid !== user?.uid && Date.now() - p.lastActive < 60000)
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                          : "bg-zinc-800"
                      )
                    )} />
                    <span className="truncate flex-1 font-medium">{session.title || 'Untitled Project'}</span>
                    {session.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}

        {/* Smart Summary Section */}
        {!isCollapsed && currentSession && currentSession.messages.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-zinc-900">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Workspace Insight</span>
              <button 
                onClick={handleSmartSummary}
                disabled={isSummarizing}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all disabled:opacity-50"
                title="Generate Smart Summary"
              >
                <Sparkles className={cn("w-3 h-3", isSummarizing && "animate-spin")} />
              </button>
            </div>
            <div className="px-3">
              {summary ? (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap">
                    {summary}
                  </p>
                  <button 
                    onClick={() => setSummary(null)}
                    className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-600 italic px-1">Generate a summary of this workspace session.</p>
              )}
            </div>
          </div>
        )}

        {/* AI Configuration */}
        {!isCollapsed && currentMode !== 'settings' && (
          <div className="space-y-6 pt-6 border-t border-zinc-900">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] px-3 block">Intelligence</span>
              <div className="px-3 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-medium ml-1">Model</label>
                  <select 
                    value={currentModel}
                    onChange={(e) => onModelChange(e.target.value as AIModel)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-white/10 transition-all appearance-none cursor-pointer"
                  >
                    {['Google', 'OpenAI', 'Anthropic'].map(provider => (
                      <optgroup key={provider} label={provider} className="bg-zinc-950">
                        {MODELS.filter(m => m.provider === provider).map(model => (
                          <option key={model.id} value={model.id}>{model.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-medium ml-1">Tone</label>
                    <select 
                      value={currentTone}
                      onChange={(e) => onToneChange(e.target.value as Tone)}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:ring-2 focus:ring-white/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="Professional">Professional</option>
                      <option value="Formal academic">Academic</option>
                      <option value="Friendly">Friendly</option>
                      <option value="Playful">Playful</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-medium ml-1">Voice</label>
                    <select 
                      value={currentVoice}
                      onChange={(e) => onVoiceChange(e.target.value as Voice)}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:ring-2 focus:ring-white/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="First person">First Person</option>
                      <option value="Second person">Second Person</option>
                      <option value="Third person">Third Person</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-medium ml-1">Result Type</label>
                  <select 
                    value={currentResultType || 'Text'}
                    onChange={(e) => onResultTypeChange(e.target.value as ResultType)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-white/10 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Text">Text</option>
                    <option value="Image Sketches">Image Sketches</option>
                    <option value="Audio">Audio</option>
                    <option value="Combination">Combination</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-medium ml-1">Audio Voice</label>
                  <select 
                    value={currentTtsVoice || 'Kore'}
                    onChange={(e) => onTtsVoiceChange(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-white/10 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Kore">Kore</option>
                    <option value="Puck">Puck</option>
                    <option value="Charon">Charon</option>
                    <option value="Fenrir">Fenrir</option>
                    <option value="Zephyr">Zephyr</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Privacy Toggle */}
            <div className="px-3">
              <button
                onClick={onPrivacyToggle}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all border",
                  privacyMode 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                    : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {privacyMode ? <Shield className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  Privacy
                </div>
                <div className={cn(
                  "w-8 h-4 rounded-full relative transition-all duration-300",
                  privacyMode ? "bg-emerald-500" : "bg-zinc-700"
                )}>
                  <motion.div 
                    animate={{ x: privacyMode ? 18 : 2 }}
                    className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" 
                  />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Presence */}
      {!isCollapsed && presence && Object.keys(presence).length > 0 && (
        <div className="px-6 py-4 border-t border-zinc-900 bg-zinc-950/30">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-3 h-3 text-zinc-600" />
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Active Now</span>
          </div>
          <div className="flex -space-x-2 overflow-hidden">
            {Object.values(presence).map((p) => (
              <div 
                key={p.uid}
                className="inline-block h-8 w-8 rounded-full ring-2 ring-zinc-950 bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white border border-zinc-700 shadow-xl relative"
                title={p.displayName}
              >
                {p.photoURL ? (
                  <img src={p.photoURL} alt={p.displayName} className="h-full w-full rounded-full object-cover" />
                ) : (
                  p.displayName[0].toUpperCase()
                )}
                {/* Online Dot */}
                {Date.now() - (p.lastActive || 0) < 60000 && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {user && (
        <div className={cn("p-4 border-t border-zinc-900 bg-zinc-950/50 backdrop-blur-md", isCollapsed && "px-2")}>
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50",
            isCollapsed && "justify-center"
          )}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white font-bold text-sm border border-zinc-700 shadow-inner shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : (
                user.email?.[0].toUpperCase()
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.displayName || user.email?.split('@')[0]}</p>
                <p className="text-[9px] text-zinc-500 truncate uppercase tracking-wider">Pro Member</p>
              </div>
            )}
            {!isCollapsed && (
              <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
