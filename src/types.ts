export type Tone = 'Formal academic' | 'Professional' | 'Friendly' | 'Playful';
export type Voice = 'First person' | 'Second person' | 'Third person';
export type AIModel = 
  | 'gemini-3-flash-preview' 
  | 'gemini-3.1-pro-preview' 
  | 'gemini-2.5-flash'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-5-sonnet'
  | 'claude-3-opus';

export type SessionMode = 'chat' | 'canvas' | 'library' | 'settings' | 'units' | 'document' | 'directory' | 'bots' | 'media' | 'billing' | 'admin';
export type ConversationType = 'direct' | 'group' | 'channel' | 'workspace';

export type UserRole = 'super_admin' | 'admin' | 'support' | 'user';
export type SubscriptionPlan = 'free' | 'standard' | 'advanced' | 'corporate';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  plan: SubscriptionPlan;
  isWhitelisted: boolean;
  isSuperAdminModeActive?: boolean;
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
  photoURL?: string;
  lastActive: number;
  status?: 'online' | 'away' | 'busy' | 'offline';
  cursor?: { x: number; y: number };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'bot';
  senderId?: string;
  senderName?: string;
  senderPhoto?: string;
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
