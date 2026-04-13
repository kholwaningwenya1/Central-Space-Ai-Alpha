import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, ConversationType } from '../types';
import { cn, playNotificationSound } from '../lib/utils';
import { User, Bot as BotIcon, Copy, Check, FileText, ExternalLink, Download, FileSpreadsheet, Volume2, Image as ImageIcon, Video, MapPin, Languages, Loader2, Cpu, Sparkles, Share2, Smile, BarChart2, Trash2, Pencil, Youtube, Headphones, FileArchive } from 'lucide-react';
import { useState } from 'react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';

const formatMessageTime = (timestamp: number) => {
  const date = new Date(timestamp);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
};

interface MessageBubbleProps {
  message: Message;
  conversationType?: ConversationType;
  onGenerateImage?: (prompt: string) => void;
  onGenerateVideo?: (prompt: string) => void;
  onTranslate?: (text: string, lang: string) => Promise<void>;
  onReact?: (emoji: string) => void;
  onVote?: (optionId: string) => void;
  onDelete?: () => void;
  onEdit?: (newContent: string) => void;
  onFindYouTubeLinks?: (topic: string) => void;
  onGenerateSpeech?: (text: string) => void;
  currentUserId?: string;
  onExportAudio?: (text: string) => void;
  onExportImageSketch?: (text: string) => void;
  onExportZip?: (text: string) => void;
  onDownload?: (url: string, filename: string) => void;
}

export function MessageBubble({ message, conversationType = 'workspace', onGenerateImage, onGenerateVideo, onTranslate, onReact, onVote, onDelete, onEdit, onFindYouTubeLinks, onGenerateSpeech, currentUserId, onExportAudio, onExportImageSketch, onExportZip, onDownload }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [isFindingLinks, setIsFindingLinks] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isAssistant = message.role === 'assistant';
  const isBot = message.role === 'bot';

  const commonEmojis = ['👍', '❤️', '🔥', '😂', '😮', '😢', '👏', '🚀'];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTranslate = async (lang: string) => {
    if (!onTranslate) return;
    setIsTranslating(true);
    try {
      await onTranslate(message.content, lang);
    } finally {
      setIsTranslating(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(message.content, 180);
    doc.text(splitText, 15, 15);
    doc.save(`CentralSpace_Report_${Date.now()}.pdf`);
  };

  const exportXLSX = () => {
    const lines = message.content.split('\n');
    const tableData: string[][] = [];
    lines.forEach(line => {
      if (line.includes('|')) {
        const row = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
        if (row.length > 0 && !row.every(cell => cell.match(/^[-:]+$/))) {
          tableData.push(row);
        }
      }
    });

    if (tableData.length > 0) {
      const ws = XLSX.utils.aoa_to_sheet(tableData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `CentralSpace_Data_${Date.now()}.xlsx`);
    }
  };

  const speak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleGenerateSpeech = async () => {
    if (!onGenerateSpeech) return;
    setIsGeneratingSpeech(true);
    toast('Your audio is being prepared', {
      duration: 3000,
      position: 'bottom-right',
      icon: '🎧',
    });
    try {
      await onGenerateSpeech(message.content);
      playNotificationSound();
    } finally {
      setIsGeneratingSpeech(false);
    }
  };

  const handleFindLinks = async () => {
    if (!onFindYouTubeLinks) return;
    setIsFindingLinks(true);
    try {
      await onFindYouTubeLinks(message.content.substring(0, 100)); // Use first 100 chars as topic
    } finally {
      setIsFindingLinks(false);
    }
  };

  const hasImagePrompt = message.content.toLowerCase().includes('image prompt:') || 
                        message.content.toLowerCase().includes('prompt designer:') ||
                        message.content.toLowerCase().includes('visual prompt:') ||
                        message.content.toLowerCase().includes('dalle prompt:');
  
  const hasVideoPrompt = message.content.toLowerCase().includes('video prompt:') ||
                        message.content.toLowerCase().includes('scene description:');

  const handleEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(editContent);
    }
    setIsEditing(false);
  };

  if (conversationType === 'direct' || conversationType === 'group' || conversationType === 'channel') {
    const isMe = message.senderId === currentUserId || (!message.senderId && !isAssistant && !isBot);
    const directEmojis = ['😂', '😢', '😊', '👍', '🙏', '⚡', '❌'];
    const workEmojis = ['👍', '✅', '❓', '🚀', '📌'];
    const emojisToUse = conversationType === 'direct' ? directEmojis : workEmojis;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex w-full mb-6 px-4 font-sans", isMe ? "justify-start" : "justify-end")}
      >
        <div className={cn("flex max-w-[85%] md:max-w-[70%] gap-3", isMe ? "flex-row" : "flex-row-reverse")}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            {isAssistant ? (
              <BotIcon className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            ) : isBot ? (
              message.senderPhoto ? (
                <img src={message.senderPhoto} alt={message.senderName} className="w-full h-full object-cover" />
              ) : (
                <BotIcon className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
              )
            ) : message.senderPhoto ? (
              <img src={message.senderPhoto} alt={message.senderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            )}
          </div>
          
          <div className="flex flex-col gap-1 relative group">
            <div className={cn(
              "p-3 md:p-4 rounded-2xl relative shadow-sm transition-colors duration-300",
              isMe ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-sm" : "bg-blue-500 text-white rounded-tr-sm"
            )}>
              {/* Message Content */}
              <div className={cn(
                "prose prose-sm max-w-none mb-2",
                isMe ? "prose-zinc" : "prose-invert"
              )}>
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-white/50 border border-zinc-200/50 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsEditing(false)} className="text-xs px-2 py-1 rounded hover:bg-black/10">Cancel</button>
                      <button onClick={handleEdit} className="text-xs px-2 py-1 bg-zinc-900 text-white rounded hover:bg-zinc-800">Save</button>
                    </div>
                  </div>
                ) : (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                )}
              </div>

              {/* Timestamp */}
              <div 
                className={cn(
                  "text-[10px] text-right italic mt-1",
                  isMe ? "text-zinc-500" : "text-blue-100"
                )}
                aria-label={`Sent at ${formatMessageTime(message.timestamp)}`}
              >
                {formatMessageTime(message.timestamp)}
              </div>

              {/* Hover Actions */}
              <div className={cn(
                "absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-full p-1 z-10",
                isMe ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2"
              )}>
                <div className="relative">
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={cn(
                          "absolute top-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl p-2 flex gap-1 z-50",
                          isMe ? "right-0" : "left-0"
                        )}
                      >
                        {emojisToUse.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              onReact?.(emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {isMe && (
                  <>
                    <button onClick={() => setIsEditing(!isEditing)} className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onDelete} className="p-1.5 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Reactions Display */}
            {message.reactions && message.reactions.length > 0 && (
              <div className={cn("flex flex-wrap gap-1 mt-1", isMe ? "justify-start" : "justify-end")}>
                <AnimatePresence>
                  {message.reactions.map((reaction, i) => {
                    const hasReacted = currentUserId && reaction.uids.includes(currentUserId);
                    return (
                      <motion.button
                        key={`${reaction.emoji}-${i}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => onReact?.(reaction.emoji)}
                        className={cn(
                          "px-2 py-0.5 border rounded-full text-xs shadow-sm flex items-center gap-1 transition-colors",
                          hasReacted ? "bg-blue-50 border-blue-200" : "bg-white border-zinc-200 hover:bg-zinc-50"
                        )}
                      >
                        <span>{reaction.emoji}</span>
                        <span className={cn("font-medium", hasReacted ? "text-blue-600" : "text-zinc-500")}>{reaction.uids.length}</span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex gap-8 p-6 md:p-10 transition-all duration-500 font-sans relative",
        "hover:bg-zinc-50/50"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-500 group-hover:scale-110 overflow-hidden relative",
        isAssistant ? "bg-zinc-950 text-white" : isBot ? "bg-zinc-900 text-white" : "bg-white border border-zinc-100 text-zinc-400"
      )}>
        {isAssistant ? (
          <BotIcon className="w-6 h-6" />
        ) : isBot ? (
          message.senderPhoto ? (
            <img src={message.senderPhoto} alt={message.senderName} className="w-full h-full object-cover" />
          ) : (
            <BotIcon className="w-6 h-6" />
          )
        ) : message.senderPhoto ? (
          <img src={message.senderPhoto} alt={message.senderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <User className="w-6 h-6" />
        )}
        {/* Presence Dot */}
        {message.senderId && !isAssistant && !isBot && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
        )}
      </div>
      
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              {isAssistant ? "Central Space AI" : isBot ? (message.senderName || "Bot") : (message.senderName || "User Session")}
            </span>
            <span 
              className="text-[10px] text-zinc-400 italic"
              aria-label={`Sent at ${formatMessageTime(message.timestamp)}`}
            >
              {formatMessageTime(message.timestamp)}
            </span>
            {isAssistant && (
              <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[9px] font-bold uppercase tracking-wider rounded-md">
                Pro Model
              </span>
            )}
            {isBot && (
              <span className="px-2 py-0.5 bg-zinc-950 text-white text-[9px] font-bold uppercase tracking-wider rounded-md">
                Bot
              </span>
            )}
          </div>
          <div className="absolute right-4 top-10 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-md border border-zinc-100 shadow-xl rounded-2xl p-1.5 z-50">
            {message.senderId === currentUserId && !isAssistant && !isBot && (
              <>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 transition-all"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button 
                  onClick={onDelete}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <div className="relative">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 transition-all"
                title="React"
              >
                <Smile className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute right-full top-0 mr-2 p-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl flex gap-1 z-50"
                  >
                    {commonEmojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onReact?.(emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="p-2 hover:bg-zinc-50 rounded-xl transition-all text-lg active:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {(isAssistant || isBot) && (
              <>
                <button 
                  onClick={handleGenerateSpeech}
                  disabled={isGeneratingSpeech}
                  className={cn("p-2 rounded-lg transition-all hover:bg-zinc-50", isGeneratingSpeech ? "text-emerald-500 bg-emerald-50 animate-pulse" : "text-zinc-400 hover:text-zinc-950")}
                  title="Generate High-Quality Speech"
                >
                  <Headphones className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleFindLinks}
                  disabled={isFindingLinks}
                  className={cn("p-2 rounded-lg transition-all hover:bg-zinc-50", isFindingLinks ? "text-red-500 bg-red-50 animate-pulse" : "text-zinc-400 hover:text-red-500")}
                  title="Find YouTube Links"
                >
                  <Youtube className="w-4 h-4" />
                </button>
                <button 
                  onClick={speak}
                  className={cn("p-2 rounded-lg transition-all hover:bg-zinc-50", isSpeaking ? "text-emerald-500 bg-emerald-50" : "text-zinc-400 hover:text-zinc-950")}
                  title="Read Aloud (Browser)"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={exportPDF}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 transition-all"
                  title="Export as PDF"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button 
                  onClick={exportXLSX}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 transition-all"
                  title="Export as XLSX"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                {hasImagePrompt && onGenerateImage && (
                  <button 
                    onClick={() => onGenerateImage(message.content)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                    title="Generate Image"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                )}
                {conversationType === 'workspace' && (
                  <div className="relative group/export">
                    <button className="p-2 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 transition-all flex items-center gap-1" title="Export Options">
                      <Download className="w-4 h-4" />
                    </button>
                    <div className="absolute right-full top-0 mr-2 w-48 bg-white border border-zinc-200 shadow-xl rounded-xl p-2 opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all z-50">
                      <button onClick={() => onExportAudio?.(message.content)} className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg flex items-center gap-2">
                        <Headphones className="w-3.5 h-3.5" /> Voice Note (WAV)
                      </button>
                      <button onClick={() => onExportAudio?.(message.content)} className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg flex items-center gap-2">
                        <Volume2 className="w-3.5 h-3.5" /> Audio File (MP3)
                      </button>
                      <button onClick={() => onExportImageSketch?.(message.content)} className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg flex items-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5" /> Image Sketch
                      </button>
                      <button onClick={() => onExportZip?.(message.content)} className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg flex items-center gap-2">
                        <FileArchive className="w-3.5 h-3.5" /> All (ZIP)
                      </button>
                    </div>
                  </div>
                )}
                <button 
                  onClick={copyToClipboard}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 transition-all"
                  title="Copy"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
        </div>

        {message.poll && (
          <div className="p-8 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] space-y-6 max-w-xl">
            <div className="flex items-center gap-3 text-zinc-400">
              <BarChart2 className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Interactive Poll</span>
            </div>
            <h3 className="text-xl font-bold text-zinc-950 tracking-tight">{message.poll.question}</h3>
            <div className="space-y-3">
              {message.poll.options.map(option => {
                const totalVotes = message.poll!.options.reduce((acc, opt) => acc + opt.votes.length, 0);
                const percentage = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
                const hasVoted = currentUserId && option.votes.includes(currentUserId);

                return (
                  <button
                    key={option.id}
                    onClick={() => onVote?.(option.id)}
                    disabled={message.poll?.closed}
                    className="w-full relative h-12 rounded-2xl border border-zinc-200 bg-white overflow-hidden group/poll transition-all hover:border-zinc-950 disabled:opacity-80"
                  >
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="absolute inset-y-0 left-0 bg-zinc-950/5 transition-all"
                    />
                    <div className="absolute inset-0 px-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-zinc-900">{option.text}</span>
                        {hasVoted && <Check className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <span className="text-xs font-bold text-zinc-400">{percentage}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-zinc-200/50">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                {message.poll.options.reduce((acc, opt) => acc + opt.votes.length, 0)} votes
              </span>
              {message.poll.closed && (
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Poll Closed</span>
              )}
            </div>
          </div>
        )}

        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {message.files.map((file, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -2 }}
                className="flex items-center gap-3 p-3 bg-white border border-zinc-100 rounded-2xl text-xs font-medium text-zinc-600 shadow-sm hover:shadow-md transition-all"
              >
                {file.type.startsWith('image/') ? (
                  <img src={file.data} alt={file.name} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-zinc-400" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="max-w-[120px] truncate font-bold text-zinc-900">{file.name}</span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{file.type.split('/')[1]}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        {message.agentDiscussion && message.agentDiscussion.length > 0 && (
          <div className="mt-4 p-6 bg-zinc-50/50 border border-zinc-100 rounded-[2rem] space-y-4">
            <div className="flex items-center gap-3 text-zinc-400">
              <Cpu className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Agentic Reasoning Swarm</span>
            </div>
            <div className="space-y-4">
              {message.agentDiscussion.map((step, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-white border border-zinc-100 flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-4 h-4 text-zinc-950" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest mb-1">{step.unitName}</div>
                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">{step.thought}</p>
                    {step.action && (
                      <div className="mt-2 text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50/50 px-3 py-1 rounded-full inline-block border border-emerald-100">
                        {step.action}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="markdown-body prose prose-zinc max-w-none leading-relaxed text-zinc-800 font-medium">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                autoFocus
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all min-h-[100px] resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-zinc-950 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="px-4 py-2 bg-zinc-100 text-zinc-500 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>

        {/* Smart Actions */}
        {isAssistant && (hasImagePrompt || hasVideoPrompt) && (
          <div className="flex gap-2 mt-4">
            {hasImagePrompt && (
              <button
                onClick={() => onGenerateImage?.(message.content)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm group/btn"
              >
                <ImageIcon className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                Generate Visual
              </button>
            )}
            {hasVideoPrompt && (
              <button
                onClick={() => onGenerateVideo?.(message.content)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm group/btn"
              >
                <Video className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                Generate Motion
              </button>
            )}
          </div>
        )}

        {/* Reactions Display */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            <AnimatePresence>
              {message.reactions.map((r, idx) => (
                <motion.button
                  key={`${r.emoji}-${idx}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => onReact?.(r.emoji)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border",
                    r.uids.includes(currentUserId || '') 
                      ? "bg-zinc-950 text-white border-zinc-950 shadow-lg shadow-zinc-950/20" 
                      : "bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-zinc-300"
                  )}
                >
                  <span>{r.emoji}</span>
                  <span>{r.uids.length}</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        {message.translation && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 p-6 bg-emerald-50/30 border border-emerald-100 rounded-[2rem]"
          >
            <div className="flex items-center gap-3 mb-4 text-emerald-700">
              <Languages className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Translation: {message.translation.language}</span>
            </div>
            <div className="prose prose-emerald prose-sm max-w-none text-emerald-900 font-medium leading-relaxed">
              <ReactMarkdown>{message.translation.content}</ReactMarkdown>
            </div>
          </motion.div>
        )}

        {isAssistant && onTranslate && !message.translation && (
          <div className="flex items-center gap-4 mt-4">
            {['Spanish', 'French', 'German', 'Ndebele', 'Shona'].map((lang) => (
              <button
                key={lang}
                onClick={() => handleTranslate(lang)}
                disabled={isTranslating}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-all flex items-center gap-2 disabled:opacity-50 group/btn"
              >
                <Languages className="w-3 h-3 group-hover/btn:rotate-12 transition-transform" />
                {lang}
              </button>
            ))}
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="mt-8 pt-6 border-t border-zinc-100">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">Verified Research Sources</h4>
            <div className="flex flex-wrap gap-3">
              {message.sources.map((source, idx) => (
                <motion.a 
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -2 }}
                  className="flex items-center gap-3 px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-full text-[11px] font-bold text-zinc-600 hover:border-zinc-950 hover:text-zinc-950 transition-all shadow-sm"
                >
                  {source.type === 'maps' ? <MapPin className="w-3 h-3 text-red-500" /> : <ExternalLink className="w-3 h-3" />}
                  <span className="max-w-[180px] truncate">{source.title}</span>
                </motion.a>
              ))}
            </div>
          </div>
        )}

        {message.imageUrl && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 rounded-[2.5rem] overflow-hidden border border-zinc-100 shadow-2xl shadow-zinc-950/5 group relative"
          >
            <img 
              src={message.imageUrl} 
              alt="Generated Content" 
              className="w-full h-auto max-h-[600px] object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-zinc-950/0 group-hover:bg-zinc-950/10 transition-colors duration-500 pointer-events-none" />
            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button 
                onClick={() => onDownload?.(message.imageUrl!, `CentralSpace_Image_${Date.now()}.png`)}
                className="p-3 bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl hover:bg-white transition-all active:scale-95"
                title="Download"
              >
                <Download className="w-5 h-5 text-zinc-950" />
              </button>
            </div>
          </motion.div>
        )}

        {message.videoUrl && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 rounded-[2.5rem] overflow-hidden border border-zinc-100 shadow-2xl shadow-zinc-950/5 group relative"
          >
            <video 
              src={message.videoUrl} 
              controls
              className="w-full h-auto max-h-[600px] object-cover"
            />
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button 
                onClick={() => onDownload?.(message.videoUrl!, `CentralSpace_Video_${Date.now()}.mp4`)}
                className="p-3 bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl hover:bg-white transition-all active:scale-95"
                title="Download"
              >
                <Download className="w-5 h-5 text-zinc-950" />
              </button>
            </div>
          </motion.div>
        )}

        {message.audioUrl && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-[2rem] bg-zinc-50 border border-zinc-100 shadow-sm flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 shadow-inner">
              <Headphones className="w-6 h-6 text-emerald-600" />
            </div>
            <audio src={message.audioUrl} controls className="w-full max-w-md h-12" />
            <button 
              onClick={() => onDownload?.(message.audioUrl!, `CentralSpace_Audio_${Date.now()}.wav`)}
              className="p-3 ml-auto bg-white shadow-sm border border-zinc-100 rounded-xl hover:bg-zinc-50 transition-all active:scale-95"
              title="Download Audio"
            >
              <Download className="w-5 h-5 text-zinc-600" />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
