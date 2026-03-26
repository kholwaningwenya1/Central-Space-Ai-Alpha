import React, { useState } from 'react';
import { User, Mail, Shield, Camera, Save, Loader2, LogOut, Trash2, Settings as SettingsIcon, Search, Download, Globe, Lock, Bell, Moon, Sun, Cpu, Key, Info, CreditCard, Zap, MessageSquare, Volume2, Eye, EyeOff } from 'lucide-react';
import { auth, db, doc, updateDoc } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { cn } from '../lib/utils';
import { WorkspaceSession, Tone, Voice, AIModel, UserSettings, UserProfile, SubscriptionPlan, UserRole } from '../types';
import { Billing } from './Billing';
import { AdminPanel } from './AdminPanel';

interface SettingsProps {
  user: any;
  userProfile: UserProfile | null;
  onLogout: () => void;
  session?: WorkspaceSession;
  onUpdateSession?: (id: string, updates: Partial<WorkspaceSession>) => void;
  onDeleteSession?: (id: string) => void;
  onClearChat?: () => void;
  onExportSession?: () => void;
  userSettings?: UserSettings;
  onUpdateUserSettings?: (updates: Partial<UserSettings>) => void;
}

export function Settings({ 
  user, 
  userProfile,
  onLogout, 
  session, 
  onUpdateSession, 
  onDeleteSession, 
  onClearChat, 
  onExportSession,
  userSettings,
  onUpdateUserSettings
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'preferences' | 'security' | 'about' | 'billing' | 'admin'>(session ? 'workspace' : 'profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    setMessage(null);

    try {
      await updateProfile(auth.currentUser, { displayName, photoURL });
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { displayName, photoURL, updatedAt: Date.now() });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    ...(session ? [{ id: 'workspace', label: 'Workspace', icon: SettingsIcon }] : []),
    { id: 'preferences', label: 'Preferences', icon: Cpu },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    ...(userProfile?.role === 'super_admin' ? [{ id: 'admin', label: 'Admin', icon: Lock }] : []),
    { id: 'about', label: 'About', icon: Info },
  ] as const;

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50 font-sans">
      <div className="max-w-5xl mx-auto p-12 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-zinc-950 tracking-tight mb-2 uppercase italic">Settings</h1>
            <p className="text-zinc-500 text-sm font-medium">Configure your personal experience and workspace environment.</p>
          </div>
          
          <div className="flex bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-sm overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  activeTab === tab.id ? "bg-zinc-950 text-white shadow-lg" : "text-zinc-500 hover:bg-zinc-50"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Profile Section */}
            <div className="bg-white border border-zinc-200 rounded-[2rem] p-10 shadow-sm space-y-10">
              <div className="flex items-center gap-8">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-zinc-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-2xl group-hover:border-zinc-950 transition-all duration-500 rotate-3 group-hover:rotate-0">
                    {photoURL ? (
                      <img src={photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-12 h-12 text-zinc-300" />
                    )}
                  </div>
                  <button className="absolute -bottom-2 -right-2 p-3 bg-zinc-950 text-white rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-zinc-950 tracking-tight">{displayName || 'Anonymous User'}</h3>
                  <p className="text-zinc-500 font-medium">{user?.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-md border border-emerald-100">Verified</span>
                    <span className={cn(
                      "px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-md border",
                      userProfile?.plan === 'free' ? "bg-zinc-100 text-zinc-500 border-zinc-200" :
                      userProfile?.plan === 'standard' ? "bg-blue-50 text-blue-600 border-blue-100" :
                      userProfile?.plan === 'advanced' ? "bg-purple-50 text-purple-600 border-purple-100" :
                      "bg-amber-50 text-amber-600 border-amber-100"
                    )}>
                      {userProfile?.plan || 'Free'} Plan
                    </span>
                    {userProfile?.role !== 'user' && (
                      <span className="px-2 py-0.5 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest rounded-md">
                        {userProfile?.role.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Display Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-950 transition-colors" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:bg-white focus:border-zinc-950 transition-all font-medium"
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Avatar URL</label>
                  <div className="relative group">
                    <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-950 transition-colors" />
                    <input
                      type="text"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-5 text-sm text-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:bg-white focus:border-zinc-950 transition-all font-medium"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>
              </div>

              {message && (
                <div className={cn(
                  "p-5 rounded-2xl text-sm font-bold animate-in fade-in slide-in-from-top-2 flex items-center gap-3",
                  message.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                )}>
                  {message.type === 'success' ? <Zap className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  {message.text}
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center gap-3 px-10 py-4 bg-zinc-950 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50 active:scale-95 shadow-2xl shadow-zinc-950/20"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile
                </button>
              </div>
            </div>

            {/* Account Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Workspaces', value: '12', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'AI Messages', value: '1.2k', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Files Stored', value: '84', icon: Download, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{stat.label}</p>
                    <p className="text-xl font-black text-zinc-950">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'workspace' && session && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Workspace Config */}
            <div className="bg-white border border-zinc-200 rounded-[2rem] p-10 shadow-sm space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Workspace Title</label>
                  <input
                    type="text"
                    value={session.title}
                    onChange={(e) => onUpdateSession?.(session.id, { title: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-5 text-sm text-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:bg-white focus:border-zinc-950 transition-all font-medium"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Workspace Icon (Emoji)</label>
                  <input
                    type="text"
                    value={session.avatar || '📁'}
                    onChange={(e) => onUpdateSession?.(session.id, { avatar: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-5 text-sm text-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:bg-white focus:border-zinc-950 transition-all font-medium"
                    placeholder="Enter an emoji"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">AI Model</label>
                  <select
                    value={session.modelId}
                    onChange={(e) => onUpdateSession?.(session.id, { modelId: e.target.value as AIModel })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-5 text-sm text-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:bg-white focus:border-zinc-950 transition-all font-bold appearance-none cursor-pointer"
                  >
                    <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">AI Tone</label>
                  <select
                    value={session.tone}
                    onChange={(e) => onUpdateSession?.(session.id, { tone: e.target.value as Tone })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-5 text-sm text-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:bg-white focus:border-zinc-950 transition-all font-bold appearance-none cursor-pointer"
                  >
                    <option value="Formal academic">Formal Academic</option>
                    <option value="Professional">Professional</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Playful">Playful</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">AI Voice</label>
                  <select
                    value={session.voice}
                    onChange={(e) => onUpdateSession?.(session.id, { voice: e.target.value as Voice })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-5 text-sm text-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:bg-white focus:border-zinc-950 transition-all font-bold appearance-none cursor-pointer"
                  >
                    <option value="First person">First Person</option>
                    <option value="Second person">Second Person</option>
                    <option value="Third person">Third Person</option>
                  </select>
                </div>
              </div>

              <div className="h-px bg-zinc-100" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100 group hover:bg-white hover:border-zinc-950 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <Lock className="w-6 h-6 text-emerald-600 group-hover:text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Privacy Mode</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Isolate library files from AI</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateSession?.(session.id, { privacyMode: !session.privacyMode })}
                    className={cn(
                      "w-14 h-7 rounded-full relative transition-all",
                      session.privacyMode ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-zinc-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                      session.privacyMode ? "left-8" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100 group hover:bg-white hover:border-zinc-950 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                      <Globe className="w-6 h-6 text-amber-600 group-hover:text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Web Search</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Enable default web search</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateSession?.(session.id, { searchEnabled: !session.searchEnabled })}
                    className={cn(
                      "w-14 h-7 rounded-full relative transition-all",
                      session.searchEnabled ? "bg-amber-500 shadow-lg shadow-amber-500/20" : "bg-zinc-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                      session.searchEnabled ? "left-8" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-4">
                <button
                  onClick={onExportSession}
                  className="flex-1 min-w-[180px] flex items-center justify-center gap-3 py-4 bg-zinc-950 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-950/20"
                >
                  <Download className="w-4 h-4" /> Export Data
                </button>
                <button
                  onClick={onClearChat}
                  className="flex-1 min-w-[180px] flex items-center justify-center gap-3 py-4 bg-white border border-zinc-200 text-zinc-950 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-zinc-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Clear Chat
                </button>
                <button
                  onClick={() => onDeleteSession?.(session.id)}
                  className="flex-1 min-w-[180px] flex items-center justify-center gap-3 py-4 bg-red-50 text-red-600 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-red-100 transition-all border border-red-100"
                >
                  <Trash2 className="w-4 h-4" /> Delete Workspace
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-zinc-200 rounded-[2rem] p-10 shadow-sm space-y-10">
              <div className="space-y-8">
                <h3 className="text-lg font-black text-zinc-950 uppercase tracking-tight">Global AI Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Default AI Tone</label>
                    <select
                      value={userSettings?.tone || 'Professional'}
                      onChange={(e) => onUpdateUserSettings?.({ tone: e.target.value as Tone })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-5 text-sm text-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:bg-white focus:border-zinc-950 transition-all font-bold appearance-none cursor-pointer"
                    >
                      <option value="Formal academic">Formal Academic</option>
                      <option value="Professional">Professional</option>
                      <option value="Friendly">Friendly</option>
                      <option value="Playful">Playful</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Default AI Voice</label>
                    <select
                      value={userSettings?.voice || 'First person'}
                      onChange={(e) => onUpdateUserSettings?.({ voice: e.target.value as Voice })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 px-5 text-sm text-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:bg-white focus:border-zinc-950 transition-all font-bold appearance-none cursor-pointer"
                    >
                      <option value="First person">First Person</option>
                      <option value="Second person">Second Person</option>
                      <option value="Third person">Third Person</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="h-px bg-zinc-100" />

              <div className="space-y-8">
                <h3 className="text-lg font-black text-zinc-950 uppercase tracking-tight">Appearance & UI</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-200 rounded-2xl flex items-center justify-center">
                        <Moon className="w-6 h-6 text-zinc-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Dark Mode</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Switch to dark interface</p>
                      </div>
                    </div>
                    <button className="w-14 h-7 rounded-full relative transition-all bg-zinc-300">
                      <div className="absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm left-1" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                        <Bell className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Notifications</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Enable desktop alerts</p>
                      </div>
                    </div>
                    <button className="w-14 h-7 rounded-full relative transition-all bg-blue-500 shadow-lg shadow-blue-500/20">
                      <div className="absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm left-8" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                        <Volume2 className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Sound Effects</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Play UI interaction sounds</p>
                      </div>
                    </div>
                    <button className="w-14 h-7 rounded-full relative transition-all bg-purple-500 shadow-lg shadow-purple-500/20">
                      <div className="absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm left-8" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-zinc-200 rounded-[2rem] p-10 shadow-sm space-y-10">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-zinc-950 uppercase tracking-tight">API Key Management</h3>
                  <button 
                    onClick={() => window.aistudio?.openSelectKey?.()}
                    className="px-4 py-2 bg-zinc-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
                  >
                    Change Key
                  </button>
                </div>
                <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-zinc-400" />
                      <span className="text-sm font-bold text-zinc-600">Gemini API Key</span>
                    </div>
                    <button 
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-zinc-400 hover:text-zinc-950 transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-3 font-mono text-xs text-zinc-500 overflow-hidden text-ellipsis">
                    {showApiKey ? process.env.GEMINI_API_KEY || '••••••••••••••••••••••••••••••' : '••••••••••••••••••••••••••••••'}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium">Your API key is stored securely and never exposed to the public.</p>
                </div>
              </div>

              <div className="h-px bg-zinc-100" />

              <div className="space-y-8">
                <h3 className="text-lg font-black text-zinc-950 uppercase tracking-tight">Account Security</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-200 rounded-2xl flex items-center justify-center">
                        <Lock className="w-6 h-6 text-zinc-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Two-Factor Auth</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Managed via Google Account</p>
                      </div>
                    </div>
                    <button className="px-6 py-2 bg-white border border-zinc-200 text-zinc-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all">
                      Configure
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-200 rounded-2xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-zinc-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Billing & Subscription</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Manage your payment methods</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('billing')}
                      className="px-6 py-2 bg-white border border-zinc-200 text-zinc-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-px bg-zinc-100" />

              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Danger Zone</h3>
                <div className="bg-red-50/50 border border-red-100 rounded-[2rem] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-zinc-950 uppercase tracking-tight">Sign Out</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Log out of your current session</p>
                    </div>
                    <button
                      onClick={onLogout}
                      className="flex items-center gap-2 px-8 py-3 bg-white border border-red-200 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all active:scale-95 shadow-lg shadow-red-500/5"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                  <div className="h-px bg-red-100" />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-red-600 uppercase tracking-tight">Delete Account</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Permanently delete all your data</p>
                    </div>
                    <button className="px-8 py-3 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && userProfile && (
          <Billing 
            userProfile={userProfile} 
            onPlanUpdate={(plan) => {
              // App.tsx handles the update via onSnapshot
            }} 
          />
        )}

        {activeTab === 'admin' && userProfile?.role === 'super_admin' && (
          <AdminPanel />
        )}

        {activeTab === 'about' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-zinc-200 rounded-[2rem] p-10 shadow-sm space-y-10 text-center">
              <div className="space-y-6">
                <div className="w-24 h-24 bg-zinc-950 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl rotate-12">
                  <Zap className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-zinc-950 tracking-tighter uppercase italic">Workspace OS</h2>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Version 2.4.0 (Stable)</p>
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <p className="text-sm text-zinc-600 leading-relaxed font-medium">
                  The ultimate AI-powered workspace for modern teams. Built with precision, speed, and intelligence to help you achieve more.
                </p>
                <div className="flex items-center justify-center gap-6 pt-4">
                  <a href="#" className="text-xs font-black text-zinc-400 hover:text-zinc-950 uppercase tracking-widest transition-colors">Docs</a>
                  <a href="#" className="text-xs font-black text-zinc-400 hover:text-zinc-950 uppercase tracking-widest transition-colors">Support</a>
                  <a href="#" className="text-xs font-black text-zinc-400 hover:text-zinc-950 uppercase tracking-widest transition-colors">Terms</a>
                  <a href="#" className="text-xs font-black text-zinc-400 hover:text-zinc-950 uppercase tracking-widest transition-colors">Privacy</a>
                </div>
              </div>

              <div className="h-px bg-zinc-100" />

              <div className="space-y-4">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Built with</p>
                <div className="flex items-center justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" alt="React" className="h-6" referrerPolicy="no-referrer" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Tailwind_CSS_Logo.svg" alt="Tailwind" className="h-4" referrerPolicy="no-referrer" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/37/Firebase_Logo.svg" alt="Firebase" className="h-6" referrerPolicy="no-referrer" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
