import React from 'react';
import { WorkspaceSession, UserProfile, DocumentTemplate, DocumentVersion, Bot, FileData, UserSettings } from '../types';
import { DocumentEditor } from './DocumentEditor';
import { MediaHub } from './MediaHub';
import { Canvas } from './Canvas';
import { BlueprintGenerator } from './BlueprintGenerator';
import { ReadItForMe } from './ReadItForMe';
import { Library } from './Library';
import { Units } from './Units';
import { Directory } from './Directory';
import { BotPlatform } from './BotPlatform';
import { AdminPanel } from './AdminPanel';
import { SemanticSearch } from './SemanticSearch';
import { Settings } from './Settings';
import { Billing } from './Billing';
import { MessageBubble } from './MessageBubble';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2, Sparkles, X, Search, Mic, MicOff, Smile, Paperclip, ImageIcon, Folder, Trash2, Download, FileText, FileSpreadsheet, Bot as BotIcon } from 'lucide-react';
import { toast } from 'sonner';
import { TRENDING_QUERIES } from '../constants';
import { cn } from '../lib/utils';
import { AdBanner } from './AdBanner';

interface MainViewProps {
  currentSession: WorkspaceSession | null;
  currentSessionId: string | null;
  user: any;
  userProfile: UserProfile | null;
  roomUsers: any[];
  templates: DocumentTemplate[];
  userSettings: UserSettings;
  isLoading: boolean;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  isMobileView: boolean;
  input: string;
  smartSuggestions: string[];
  showCommandSuggestions: boolean;
  filteredCommands: any[];
  pendingFiles: FileData[];
  isEmojiPickerOpen: boolean;
  isAttachmentMenuOpen: boolean;
  isRecording: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  
  // Actions
  handleSaveDocument: (content: string) => void;
  handleDocumentAIAction: (action: string, context: string) => Promise<string>;
  handleRevertVersion: (version: DocumentVersion) => void;
  handleSaveTemplate: (template: any) => void;
  handleDeleteTemplate: (id: string) => void;
  handleLibraryDelete: (id: string) => void;
  handleLibraryUpload: (files: FileList) => void;
  handleUnitsUpdate: (units: Bot[]) => void;
  handleStartChat: (userId: string) => void;
  handleToggleBotInSession: (bot: Bot) => void;
  handleLogout: () => void;
  updateSession: (id: string, updates: Partial<WorkspaceSession>) => Promise<void>;
  clearWorkspace: () => void;
  clearChat: () => void;
  exportWorkspace: () => void;
  exportToPDF: () => void;
  exportToExcel: () => void;
  handleSend: () => void;
  setInput: (val: string) => void;
  handleTyping: () => void;
  handleGenerateImage: (prompt: string) => void;
  handleGenerateVideo: (prompt: string) => void;
  handleTranslate: (msgId: string, text: string, lang: string) => Promise<void>;
  handleReact: (msgId: string, emoji: string) => void;
  handleVote: (msgId: string, optionId: string) => void;
  handleDeleteMessage: (msgId: string) => void;
  handleEditMessage: (msgId: string, content: string) => void;
  handleFindYouTubeLinks: (msgId: string, topic: string) => void;
  handleGenerateSpeech: (msgId: string, text: string) => void;
  handleExportAudio: (text: string) => void;
  handleExportImageSketch: (text: string) => void;
  handleExportZip: (text: string) => void;
  handleDownload: (url: string, filename: string) => void;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  removePendingFile: (idx: number) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startRecording: () => void;
  stopRecording: () => void;
  setIsEmojiPickerOpen: (val: boolean) => void;
  setIsAttachmentMenuOpen: (val: boolean) => void;
  setIsLibraryModalOpen: (val: boolean) => void;
  handleNewSession: (type: 'workspace' | 'direct' | 'group' | 'channel') => void;
  randomSuggestions: string[];
}

export const MainView: React.FC<MainViewProps> = (props) => {
  const {
    currentSession, currentSessionId, user, userProfile, roomUsers, templates, userSettings,
    isLoading, isGeneratingImage, isGeneratingVideo, isMobileView, input, smartSuggestions,
    showCommandSuggestions, filteredCommands, pendingFiles, isEmojiPickerOpen,
    isAttachmentMenuOpen, isRecording, scrollRef, fileInputRef,
    handleSaveDocument, handleDocumentAIAction, handleRevertVersion, handleSaveTemplate,
    handleDeleteTemplate, handleLibraryDelete, handleLibraryUpload, handleUnitsUpdate,
    handleStartChat, handleToggleBotInSession, handleLogout, updateSession,
    clearWorkspace, clearChat, exportWorkspace, exportToPDF, exportToExcel, handleSend,
    setInput, handleTyping, handleGenerateImage, handleGenerateVideo, handleTranslate,
    handleReact, handleVote, handleDeleteMessage, handleEditMessage, handleFindYouTubeLinks,
    handleGenerateSpeech, handleExportAudio, handleExportImageSketch, handleExportZip,
    handleDownload, handleScroll, removePendingFile, handleFileUpload, startRecording,
    stopRecording, setIsEmojiPickerOpen, setIsAttachmentMenuOpen, setIsLibraryModalOpen,
    handleNewSession, randomSuggestions
  } = props;

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 transition-colors duration-300">
      {/* Header */}
      <header className="h-16 md:h-20 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shrink-0 z-30 transition-colors duration-300">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-950 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-zinc-950/20">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-bold text-zinc-950 dark:text-zinc-50 truncate transition-colors">
              {currentSession?.title || "Central Space"}
            </h2>
            <p className="text-[10px] md:text-xs text-zinc-500 font-medium tracking-tight uppercase">
              {currentSession?.mode || "Research Node"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
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
            presence={roomUsers.reduce((acc, u) => ({...acc, [u.uid || u.id]: { uid: u.uid || u.id, displayName: u.displayName || u.name, photoURL: u.photoURL || u.avatar, lastActive: Date.now(), status: 'online' }}), {})}
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
        ) : currentSession?.mode === 'blueprint' ? (
          <BlueprintGenerator 
            onAIAction={handleDocumentAIAction} 
            onSaveToLibrary={(file) => {
              if (!currentSessionId || !currentSession) return;
              const newFiles = [...(currentSession.files || []), { ...file, id: Math.random().toString(36).substr(2, 9), timestamp: Date.now() }];
              updateSession(currentSessionId, { files: newFiles });
            }}
          />
        ) : currentSession?.mode === 'read_it_for_me' ? (
          <ReadItForMe />
        ) : currentSession?.mode === 'library' ? (
          <Library 
            files={currentSession.files || []} 
            onDelete={handleLibraryDelete}
            onUpload={handleLibraryUpload}
            onChatWithLibrary={() => {
              if (!currentSessionId) return;
              updateSession(currentSessionId, { mode: 'chat' });
              setInput("I want to query the data in my Work Library. What can you tell me about the files stored here?");
            }}
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
            userProfile={userProfile}
          />
        ) : currentSession?.mode === 'admin' ? (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-zinc-50">
            <AdminPanel userProfile={userProfile!} />
          </div>
        ) : currentSession?.mode === 'search' ? (
          <div className="flex-1 overflow-hidden p-6 bg-zinc-50 dark:bg-zinc-950">
            <SemanticSearch />
          </div>
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
            userSettings={userSettings}
            onUpdateUserSettings={(updates) => {}} // This should be handled by App
          />
        ) : currentSession?.mode === 'billing' ? (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-zinc-50">
            <div className="max-w-6xl mx-auto">
              <div className="mb-12">
                <h2 className="text-4xl font-black text-zinc-950 tracking-tighter uppercase mb-2">Plans & Billing</h2>
                <p className="text-zinc-500 font-medium text-lg">Manage your subscription and unlock powerful features.</p>
              </div>
              {userProfile && (
                <Billing 
                  userProfile={userProfile} 
                  onPlanUpdate={(plan) => {
                    toast.success(`Successfully upgraded to ${plan} plan!`);
                  }} 
                />
              )}
            </div>
          </div>
        ) : (
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto scroll-smooth bg-white dark:bg-zinc-950 transition-colors duration-300"
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
                <h1 className="text-4xl font-bold text-zinc-950 dark:text-zinc-50 mb-6 tracking-tight font-display transition-colors">
                  {currentSession ? "Chat & Research" : "Welcome to Central Space"}
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 mb-12 text-lg leading-relaxed font-medium transition-colors">
                  {currentSession 
                    ? "Collaborate with AI, upload files, and research the web in one workspace."
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
                        onDownload={handleDownload}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <div className="p-8 flex gap-6 bg-white/50 backdrop-blur-md animate-in rounded-3xl border border-zinc-100 shadow-sm mx-4 my-2">
                    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center shrink-0 shadow-xl overflow-hidden">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(255,255,255,0.3)_360deg)]"
                      />
                      <img src="/logo.png" alt="Central Space Logo" className="w-8 h-8 object-contain relative z-10 drop-shadow-md" />
                    </div>
                    <div className="flex-1 py-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-black text-zinc-900 uppercase tracking-widest">Processing</span>
                        <motion.div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-zinc-400"
                            />
                          ))}
                        </motion.div>
                      </div>
                      <div className="space-y-2.5">
                        <motion.div 
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="h-1.5 bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-200 rounded-full"
                        />
                        <motion.div 
                          initial={{ width: "0%" }}
                          animate={{ width: "75%" }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                          className="h-1.5 bg-gradient-to-r from-zinc-200 via-zinc-300 to-zinc-200 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {isGeneratingImage && (
                  <div className="p-8 flex gap-6 bg-white/50 backdrop-blur-md animate-in rounded-3xl border border-zinc-100 shadow-sm mx-4 my-2">
                    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shrink-0 shadow-xl overflow-hidden">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(255,255,255,0.3)_360deg)]"
                      />
                      <Loader2 className="w-6 h-6 text-white relative z-10 animate-spin" />
                    </div>
                    <div className="flex-1 py-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Generating Image</span>
                        <motion.div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                            />
                          ))}
                        </motion.div>
                      </div>
                      <div className="relative h-32 bg-zinc-50 border-2 border-dashed border-emerald-200/50 rounded-2xl overflow-hidden">
                        <motion.div 
                          initial={{ y: "-100%" }}
                          animate={{ y: "100%" }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {isGeneratingVideo && (
                  <div className="p-8 flex gap-6 bg-white/50 backdrop-blur-md animate-in rounded-3xl border border-zinc-100 shadow-sm mx-4 my-2">
                    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-xl overflow-hidden">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(255,255,255,0.3)_360deg)]"
                      />
                      <Loader2 className="w-6 h-6 text-white relative z-10 animate-spin" />
                    </div>
                    <div className="flex-1 py-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Generating Video</span>
                        <motion.div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-blue-400"
                            />
                          ))}
                        </motion.div>
                      </div>
                      <div className="relative h-32 bg-zinc-50 border-2 border-dashed border-blue-200/50 rounded-2xl overflow-hidden">
                        <motion.div 
                          initial={{ x: "-100%" }}
                          animate={{ x: "100%" }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 shrink-0 relative transition-colors duration-300">
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
                      // setSmartSuggestions([]); // Handled by App?
                    }}
                    className="px-4 py-1.5 bg-white border border-zinc-200 rounded-full text-xs font-medium text-zinc-600 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all duration-300 shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
                <button 
                  onClick={() => {}} // setSmartSuggestions([]) Handled by App
                  className="ml-auto p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-all"
                  title="Dismiss Suggestions"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Typing Indicator moved back to App or here? Keep here for consistency but pass state */}
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
                              // setShowCommandSuggestions(false); Handled by App
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
                  className={cn(
                    "w-full bg-white dark:bg-zinc-800 border-2 rounded-[2rem] px-6 md:px-8 py-4 md:py-6 text-sm md:text-base resize-none min-h-[60px] md:min-h-[80px] max-h-[400px] disabled:opacity-50 shadow-2xl transition-all font-medium",
                    userProfile?.isSuperAdminModeActive 
                      ? "border-emerald-500/40 ring-8 ring-emerald-500/5 text-emerald-950 dark:text-emerald-50 placeholder:text-emerald-400/50 dark:placeholder:text-emerald-800/70 selection:bg-emerald-200 dark:selection:bg-emerald-800/40 shadow-[0_0_30px_rgba(16,185,129,0.1)]" 
                      : "border-zinc-100 dark:border-zinc-700 text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950/20 shadow-zinc-950/5",
                    isMobileView ? "pr-44" : "pr-56"
                  )}
                  rows={1}
                />
                <div className={cn(
                  "absolute flex items-center gap-2",
                  isMobileView ? "right-3 bottom-3" : "right-4 bottom-4"
                )}>
                  <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => currentSessionId && updateSession(currentSessionId, { searchEnabled: !currentSession?.searchEnabled })}
                      className={cn(
                        "p-2.5 rounded-xl transition-all",
                        currentSession?.searchEnabled ? "bg-amber-100 text-amber-600 shadow-sm" : "text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-white dark:hover:bg-zinc-700"
                      )}
                      title="Web Search"
                    >
                      <Search className={cn(isMobileView ? "w-4 h-4" : "w-5 h-5")} />
                    </button>
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={cn(
                        "p-2.5 rounded-xl transition-all",
                        isRecording ? "bg-red-100 text-red-600 animate-pulse shadow-sm" : "text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-white dark:hover:bg-zinc-700"
                      )}
                      title={isRecording ? "Stop Recording" : "Voice Note"}
                    >
                      {isRecording ? <MicOff className={cn(isMobileView ? "w-4 h-4" : "w-5 h-5")} /> : <Mic className={cn(isMobileView ? "w-4 h-4" : "w-5 h-5")} />}
                    </button>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      multiple
                    />

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                        disabled={!currentSession || isLoading}
                        className="p-2.5 text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 transition-all rounded-xl hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-50"
                        title="Add Emoji"
                      >
                        <Smile className={cn(isMobileView ? "w-4 h-4" : "w-5 h-5")} />
                      </button>
                      <AnimatePresence>
                        {isEmojiPickerOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className={cn(
                               "absolute bottom-full mb-2 z-50",
                               isMobileView ? "right-[-12px]" : "right-0"
                            )}
                          >
                            <EmojiPicker
                              onEmojiClick={(emojiData) => {
                                setInput(input + emojiData.emoji);
                                setIsEmojiPickerOpen(false);
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                        disabled={!currentSession || isLoading}
                        className="p-2.5 text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 transition-all rounded-xl hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-50"
                        title="Attach Files"
                      >
                        <Paperclip className={cn(isMobileView ? "w-4 h-4" : "w-5 h-5")} />
                      </button>
                      <AnimatePresence>
                        {isAttachmentMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className={cn(
                              "absolute bottom-full mb-2 w-48 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700 overflow-hidden z-50",
                              isMobileView ? "right-[-40px]" : "right-0"
                            )}
                          >
                            <button
                              onClick={() => {
                                setIsAttachmentMenuOpen(false);
                                fileInputRef.current?.click();
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors text-left"
                            >
                              <ImageIcon className="w-4 h-4" />
                              From Computer
                            </button>
                            <button
                              onClick={() => {
                                setIsAttachmentMenuOpen(false);
                                setIsLibraryModalOpen(true);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors text-left border-t border-zinc-100 dark:border-zinc-700"
                            >
                              <Folder className="w-4 h-4" />
                              From Library
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={(!input.trim() && pendingFiles.length === 0) || isLoading || !currentSession}
                    className={cn(
                      "bg-zinc-950 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20 active:scale-95 group/send flex items-center justify-center",
                      isMobileView ? "p-2.5" : "p-3.5"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className={cn(isMobileView ? "w-4 h-4" : "w-6 h-6", "animate-spin")} />
                    ) : (
                      <Send className={cn(isMobileView ? "w-4 h-4" : "w-6 h-6", "group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5 transition-transform")} />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="px-6 pb-3">
          <AdBanner />
        </div>
      </div>
    </main>
  );
};

// Add missing CSS for scrollbar if needed
const style = document.createElement('style');
style.textContent = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e4e4e7;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #d4d4d8;
  }
`;
document.head.appendChild(style);

import EmojiPicker from 'emoji-picker-react';
