export type Tone = 'Formal academic' | 'Professional' | 'Friendly' | 'Playful';
export type Voice = 'First person' | 'Second person' | 'Third person';
export type AIModel = 
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-5-sonnet'
  | 'claude-3-opus';

export type SessionMode = 'chat' | 'search' | 'canvas' | 'library' | 'settings' | 'units' | 'document' | 'directory' | 'bots' | 'media' | 'billing' | 'admin' | 'blueprint' | 'read_it_for_me' | 'calendar';
export type ConversationType = 'direct' | 'group' | 'channel' | 'workspace';

export type UserRole = 'super_admin' | 'admin' | 'support' | 'user';
export type SubscriptionPlan = 'free' | 'standard' | 'advanced' | 'corporate';

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  translations: number;
  audios: number;
  readouts: number;
  sketching: number;
  exports: number;
  downloads: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: UserRole;
  plan: SubscriptionPlan;
  isWhitelisted: boolean;
  isSuperAdminModeActive?: boolean;
  dailyUsage?: DailyUsage;
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  plan: SubscriptionPlan;
  paypalOrderId: string;
  systemFee: number;
  timestamp: number;
}

export interface FileData {
  id: string;
  name: string;
  type: string;
  data: string; // base64
  size: number;
  timestamp: number;
}

export interface Bot {
  id: string;
  name: string;
  username: string;
  description: string;
  avatar?: string;
  systemInstruction: string;
  prompt?: string; // New prompt field for instructions/data
  websiteUrl?: string; // New website link field
  files?: FileData[]; // New files field for docs, images, contacts, audios
  commands: { command: string; description: string; action?: string }[];
  webhookUrl?: string;
  creatorId: string;
  isActive: boolean;
  createdAt: number;
  tools?: string[];
  modelId?: AIModel;
  tags?: string[];
  rating?: number;
  reviewsCount?: number;
  exampleInteractions?: { user: string; bot: string }[];
  category?: string;
  tone?: string;
}

export interface Poll {
  question: string;
  options: { id: string; text: string; votes: string[] }[];
  isMultipleChoice: boolean;
  isAnonymous: boolean;
  closed?: boolean;
}

export interface Reaction {
  emoji: string;
  uids: string[];
}

export interface Presence {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  lastActive: number;
  status?: 'online' | 'away' | 'busy' | 'offline';
  cursor?: { x: number; y: number };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'bot';
  senderId?: string;
  senderName?: string;
  senderPhoto?: string | null;
  botId?: string;
  content: string;
  timestamp: number;
  files?: FileData[];
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  poll?: Poll;
  reactions?: Reaction[];
  sources?: { uri: string; title: string; type?: 'web' | 'maps' }[];
  translation?: {
    language: string;
    content: string;
  };
  agentDiscussion?: {
    unitName: string;
    thought: string;
    action?: string;
  }[];
  isStreaming?: boolean;
  dueDate?: number;
}

export interface DocumentVersion {
  id: string;
  content: string;
  timestamp: number;
  authorId: string;
  authorName: string;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  category: 'report' | 'meeting' | 'research' | 'other';
  creatorId: string;
  createdAt: number;
}

export type ResultType = 'Text' | 'Image Sketches' | 'Audio' | 'Combination';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  type: 'meeting' | 'deadline' | 'task' | 'general';
  createdBy: string;
  relatedSessionId?: string;
}

export interface WorkspaceSession {
  id: string;
  title: string;
  type: ConversationType;
  members: string[];
  messages: Message[];
  tone: Tone;
  voice: Voice;
  resultType?: ResultType;
  ttsVoice?: string;
  modelId: AIModel;
  searchEnabled?: boolean;
  privacyMode?: boolean;
  isFavorite?: boolean;
  mode: SessionMode;
  canvasData?: any;
  documentData?: string; // HTML or Markdown for the document mode
  documentVersions?: DocumentVersion[];
  files: FileData[];
  agentUnits?: Bot[]; // Renamed from AgentUnit to Bot
  presence?: { [uid: string]: Presence };
  typing?: { [uid: string]: number }; // Timestamp of last typing event
  updatedAt: number;
  uid?: string; // Creator UID
  description?: string;
  avatar?: string;
}

export interface UserSettings {
  tone: Tone;
  voice: Voice;
  sidebarCollapsed: boolean;
  omniBotEnabled?: boolean;
  autoReadOutLoud?: boolean;
  autoGenerateAudio?: boolean;
  darkMode?: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'collaborator' | 'bot';
  link?: string;
  isRead: boolean;
  timestamp: number;
  metadata?: {
    sessionId?: string;
    botId?: string;
    senderId?: string;
    senderName?: string;
  };
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
