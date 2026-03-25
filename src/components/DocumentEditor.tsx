import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sparkles, FileText, Download, Save, Trash2, Wand2, Type, Bold, Italic, List, ListOrdered, Heading1, Heading2, Users, History, Layout, Upload, CheckCircle2, AlertCircle, X, ChevronRight, ChevronLeft, Search, Replace, Languages, FileType, MousePointer2 } from 'lucide-react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import { Presence, DocumentVersion, DocumentTemplate } from '../types';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'motion/react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface RemoteCursor {
  uid: string;
  displayName: string;
  color: string;
  selectionStart: number;
  selectionEnd: number;
  timestamp: number;
}

interface DocumentEditorProps {
  data: string;
  onSave: (data: string) => void;
  onAIAction: (action: string, context: string) => Promise<string>;
  presence?: { [uid: string]: Presence };
  sessionId: string;
  versions?: DocumentVersion[];
  onRevert: (version: DocumentVersion) => void;
  templates?: DocumentTemplate[];
  onSaveTemplate: (template: Omit<DocumentTemplate, 'id' | 'creatorId' | 'createdAt'>) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export function DocumentEditor({ 
  data, 
  onSave, 
  onAIAction, 
  presence, 
  sessionId, 
  versions = [], 
  onRevert, 
  templates = [], 
  onSaveTemplate,
  onDeleteTemplate
}: DocumentEditorProps) {
  const [content, setContent] = useState(data || '');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [grammarSuggestions, setGrammarSuggestions] = useState<{ original: string; suggestion: string; reason: string }[]>([]);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [remoteCursors, setRemoteCursors] = useState<{ [uid: string]: RemoteCursor }>({});
  const [cursorPositions, setCursorPositions] = useState<{ [uid: string]: { x: number; y: number } }>({});
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();
  const grammarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setContent(data || '');
  }, [data]);

  // Real-time Grammar Check (Debounced)
  useEffect(() => {
    if (grammarTimeoutRef.current) clearTimeout(grammarTimeoutRef.current);
    
    if (content.length > 20 && viewMode === 'edit') {
      grammarTimeoutRef.current = setTimeout(async () => {
        setIsCheckingGrammar(true);
        try {
          const response = await onAIAction('Check grammar and spelling. Return a JSON array of objects with "original", "suggestion", and "reason" fields. Only return the JSON.', content);
          try {
            const suggestions = JSON.parse(response.replace(/```json|```/g, '').trim());
            if (Array.isArray(suggestions)) {
              setGrammarSuggestions(suggestions);
            }
          } catch (e) {
            console.error('Failed to parse grammar suggestions', e);
          }
        } catch (error) {
          console.error('Grammar check failed', error);
        } finally {
          setIsCheckingGrammar(false);
        }
      }, 3000);
    }

    return () => {
      if (grammarTimeoutRef.current) clearTimeout(grammarTimeoutRef.current);
    };
  }, [content, viewMode]);

  // Socket listeners
  useEffect(() => {
    if (socket && isConnected) {
      socket.on('doc-sync', (newContent: string) => {
        setContent(newContent);
      });

      socket.on('cursor-update', (cursor: RemoteCursor) => {
        setRemoteCursors(prev => ({
          ...prev,
          [cursor.uid]: cursor
        }));
      });

      return () => {
        socket.off('doc-sync');
        socket.off('cursor-update');
      };
    }
  }, [socket, isConnected]);

  const emitDocUpdate = useCallback((newContent: string) => {
    if (socket && isConnected) {
      socket.emit('doc-update', { roomId: sessionId, content: newContent });
    }
  }, [socket, isConnected, sessionId]);

  const emitCursorUpdate = useCallback(() => {
    if (socket && isConnected && editorRef.current) {
      const { selectionStart, selectionEnd } = editorRef.current;
      socket.emit('cursor-move', {
        roomId: sessionId,
        cursor: {
          selectionStart,
          selectionEnd,
          timestamp: Date.now()
        }
      });
    }
  }, [socket, isConnected, sessionId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemoteCursors(prev => {
        const now = Date.now();
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(uid => {
          if (now - next[uid].timestamp > 10000) {
            delete next[uid];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAIAction = async (action: string) => {
    setIsAIProcessing(true);
    try {
      const result = await onAIAction(action, content);
      if (result) {
        if (action.toLowerCase().includes('summarize')) {
          setSummary(result);
        } else {
          const newContent = content + '\n\n' + result;
          setContent(newContent);
          onSave(newContent);
          emitDocUpdate(newContent);
        }
      }
    } catch (error) {
      console.error('AI Action failed:', error);
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split('.').pop()?.toLowerCase();

    try {
      if (fileType === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await (mammoth as any).convertToMarkdown({ arrayBuffer });
        const text = result.value;
        setContent(text);
        onSave(text);
        emitDocUpdate(text);
      } else if (fileType === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n\n';
        }
        setContent(fullText);
        onSave(fullText);
        emitDocUpdate(fullText);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setContent(text);
          onSave(text);
          emitDocUpdate(text);
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to process file. Please try a different format.');
    }
  };

  const applyTemplate = (template: DocumentTemplate) => {
    setContent(template.content);
    onSave(template.content);
    emitDocUpdate(template.content);
    setShowTemplates(false);
  };

  const saveAsTemplate = () => {
    const title = window.prompt('Enter template title:');
    if (title) {
      onSaveTemplate({
        title,
        description: 'Custom template',
        content,
        category: 'other'
      });
    }
  };

  const insertText = (before: string, after: string = '') => {
    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const text = editorRef.current.value;
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    setContent(newText);
    onSave(newText);
    emitDocUpdate(newText);
    
    // Reset focus and selection
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.setSelectionRange(start + before.length, end + before.length);
      }
    }, 0);
  };

  const exportToMarkdown = () => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `document-${new Date().getTime()}.md`;
    document.body.appendChild(element);
    element.click();
  };

  const getCursorXY = (element: HTMLTextAreaElement, position: number) => {
    const { offsetLeft: left, offsetTop: top } = element;
    const div = document.createElement('div');
    const copyStyle = window.getComputedStyle(element);
    
    for (const prop of copyStyle) {
      div.style[prop] = copyStyle[prop];
    }
    
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.width = `${element.offsetWidth}px`;
    div.style.height = 'auto';
    div.style.top = '0';
    div.style.left = '0';
    
    const textContent = element.value.substring(0, position);
    div.textContent = textContent;
    
    const span = document.createElement('span');
    span.textContent = element.value.substring(position, position + 1) || '.';
    div.appendChild(span);
    
    document.body.appendChild(div);
    const { offsetLeft: spanLeft, offsetTop: spanTop } = span;
    document.body.removeChild(div);
    
    return {
      x: spanLeft,
      y: spanTop
    };
  };

  const updateCursorPositions = useCallback(() => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const newPositions: { [uid: string]: { x: number; y: number } } = {};

    Object.values(remoteCursors).forEach((cursor) => {
      const pos = getCursorXY(textarea, cursor.selectionStart);
      newPositions[cursor.uid] = pos;
    });

    setCursorPositions(newPositions);
  }, [remoteCursors]);

  useEffect(() => {
    updateCursorPositions();
  }, [updateCursorPositions, content]);

  const handleFindReplace = () => {
    if (!findText) return;
    const newContent = content.split(findText).join(replaceText);
    setContent(newContent);
    onSave(newContent);
    emitDocUpdate(newContent);
  };

  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);
  const charCount = content.length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="flex-1 flex flex-col bg-white h-full overflow-hidden font-sans">
      {/* Toolbar */}
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm">
            <button 
              onClick={() => setViewMode('edit')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                viewMode === 'edit' ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
              )}
            >
              Editor
            </button>
            <button 
              onClick={() => setViewMode('preview')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                viewMode === 'preview' ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
              )}
            >
              Preview
            </button>
          </div>
          
          <div className="w-px h-6 bg-zinc-200 mx-2" />
          
          <div className="flex items-center gap-1">
            <button onClick={() => insertText('# ')} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-lg transition-all" title="Heading 1"><Heading1 className="w-4 h-4" /></button>
            <button onClick={() => insertText('## ')} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-lg transition-all" title="Heading 2"><Heading2 className="w-4 h-4" /></button>
            <button onClick={() => insertText('**', '**')} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-lg transition-all" title="Bold"><Bold className="w-4 h-4" /></button>
            <button onClick={() => insertText('_', '_')} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-lg transition-all" title="Italic"><Italic className="w-4 h-4" /></button>
            <button onClick={() => insertText('- ')} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-lg transition-all" title="Bullet List"><List className="w-4 h-4" /></button>
            <button onClick={() => setShowFindReplace(!showFindReplace)} className={cn("p-2 rounded-lg transition-all", showFindReplace ? "bg-zinc-200 text-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-white")} title="Find and Replace"><Search className="w-4 h-4" /></button>
            <button onClick={exportToMarkdown} className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded-lg transition-all" title="Export as Markdown"><Download className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Presence Indicators */}
          {presence && Object.keys(presence).length > 0 && (
            <div className="flex -space-x-2 mr-2">
              {Object.values(presence).map((p, idx) => (
                <div 
                  key={idx} 
                  className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center overflow-hidden group relative shadow-sm"
                  title={p.displayName}
                >
                  {p.photoURL ? (
                    <img src={p.photoURL} alt={p.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-500">{p.displayName?.charAt(0)}</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-1 mr-2">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={cn("p-2 rounded-xl transition-all", showHistory ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-900 hover:bg-white")}
              title="Version History"
            >
              <History className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowTemplates(!showTemplates)}
              className={cn("p-2 rounded-xl transition-all", showTemplates ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-900 hover:bg-white")}
              title="Templates"
            >
              <Layout className="w-5 h-5" />
            </button>
            <label className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-xl transition-all cursor-pointer" title="Upload Document">
              <Upload className="w-5 h-5" />
              <input type="file" accept=".txt,.md,.docx,.pdf" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          <button 
            onClick={() => handleAIAction('Summarize this document')}
            disabled={isAIProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-950/10 disabled:opacity-50"
          >
            {isAIProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Assist
          </button>
          <button 
            onClick={() => onSave(content)}
            className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-xl transition-all"
            title="Save Document"
          >
            <Save className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Editor Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/30 relative">
          {showFindReplace && (
            <div className="max-w-4xl mx-auto mb-4 p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex-1 flex items-center gap-2 bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-100">
                <Search className="w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Find..." 
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="bg-transparent border-none text-sm focus:outline-none w-full"
                />
              </div>
              <div className="flex-1 flex items-center gap-2 bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-100">
                <Replace className="w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Replace with..." 
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="bg-transparent border-none text-sm focus:outline-none w-full"
                />
              </div>
              <button 
                onClick={handleFindReplace}
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all"
              >
                Replace All
              </button>
              <button onClick={() => setShowFindReplace(false)} className="p-2 text-zinc-400 hover:text-zinc-900"><X className="w-4 h-4" /></button>
            </div>
          )}

          <div className="max-w-4xl mx-auto bg-white min-h-full shadow-2xl shadow-zinc-950/5 rounded-3xl border border-zinc-100 overflow-hidden flex flex-col">
            {viewMode === 'edit' ? (
              <div className="flex-1 flex flex-col relative">
                {/* Mirror Div for Highlighting Grammar Errors */}
                <div 
                  ref={mirrorRef}
                  className="absolute inset-0 p-12 text-lg leading-relaxed font-serif text-transparent whitespace-pre-wrap break-words pointer-events-none"
                  aria-hidden="true"
                >
                  {content.split(/(\s+)/).map((part, i) => {
                    const hasSuggestion = grammarSuggestions.some(s => s.original.toLowerCase() === part.toLowerCase().replace(/[.,!?;:]/g, ''));
                    return (
                      <span 
                        key={i} 
                        className={cn(hasSuggestion && "bg-red-200/50 border-b-2 border-red-500")}
                      >
                        {part}
                      </span>
                    );
                  })}
                </div>

                <textarea
                  ref={editorRef}
                  value={content}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    setContent(newContent);
                    onSave(newContent);
                    emitDocUpdate(newContent);
                  }}
                  onKeyUp={emitCursorUpdate}
                  onMouseUp={emitCursorUpdate}
                  onScroll={(e) => {
                    if (mirrorRef.current) {
                      mirrorRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop;
                    }
                  }}
                  placeholder="Start writing your masterpiece..."
                  className="flex-1 w-full p-12 text-lg leading-relaxed focus:outline-none resize-none font-serif text-zinc-800 bg-transparent placeholder:text-zinc-200 z-10"
                />
                
                {/* Remote Cursors */}
                <div className="absolute inset-0 pointer-events-none z-20">
                  {Object.entries(cursorPositions).map(([uid, pos]) => {
                    const cursor = remoteCursors[uid];
                    if (!cursor) return null;
                    return (
                      <motion.div 
                        key={uid}
                        initial={false}
                        animate={{ x: pos.x + 48, y: pos.y + 48 }} // Adjust for padding
                        className="absolute flex flex-col items-start"
                        style={{ pointerEvents: 'none' }}
                      >
                        <div className="w-0.5 h-6" style={{ backgroundColor: cursor.color }} />
                        <div 
                          className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white whitespace-nowrap shadow-sm"
                          style={{ backgroundColor: cursor.color }}
                        >
                          {cursor.displayName}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                
                {/* Grammar Suggestions Overlay */}
                <AnimatePresence>
                  {grammarSuggestions.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden z-30"
                    >
                      <div className="p-4 bg-zinc-900 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold uppercase tracking-widest">Grammar Check</span>
                        </div>
                        <button onClick={() => setGrammarSuggestions([])}><X className="w-4 h-4" /></button>
                      </div>
                      <div className="max-h-60 overflow-y-auto p-2 space-y-2">
                        {grammarSuggestions.map((s, i) => (
                          <div key={i} className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Original</div>
                            <div className="text-sm text-red-500 line-through mb-2">{s.original}</div>
                            <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Suggestion</div>
                            <div className="text-sm text-emerald-600 font-medium mb-2">{s.suggestion}</div>
                            <div className="text-[10px] italic text-zinc-400">{s.reason}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isCheckingGrammar && (
                  <div className="absolute bottom-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-full border border-zinc-100 shadow-sm">
                    <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Checking Grammar...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 p-12 prose prose-zinc max-w-none font-serif">
                <Markdown>{content || '*No content yet. Start writing in the editor!*'}</Markdown>
              </div>
            )}
          </div>
        </div>

        {/* Side Panels */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              className="w-80 border-l border-zinc-100 bg-white flex flex-col"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900">Version History</h3>
                <button onClick={() => setShowHistory(false)}><X className="w-4 h-4 text-zinc-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {versions.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 text-xs">No versions saved yet.</div>
                ) : (
                  versions.map((v) => (
                    <button 
                      key={v.id}
                      onClick={() => onRevert(v)}
                      className="w-full p-4 rounded-2xl border border-zinc-100 hover:border-zinc-900 transition-all text-left group"
                    >
                      <div className="text-xs font-bold text-zinc-900 mb-1">{new Date(v.timestamp).toLocaleString()}</div>
                      <div className="text-[10px] text-zinc-400 mb-2">by {v.authorName}</div>
                      <div className="text-[10px] text-zinc-500 line-clamp-2 italic">"{v.content.substring(0, 100)}..."</div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {showTemplates && (
            <motion.div 
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              className="w-80 border-l border-zinc-100 bg-white flex flex-col"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900">Templates</h3>
                <button onClick={() => setShowTemplates(false)}><X className="w-4 h-4 text-zinc-400" /></button>
              </div>
              <div className="p-4 border-b border-zinc-100">
                <button 
                  onClick={saveAsTemplate}
                  className="w-full py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all"
                >
                  Save Current as Template
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {templates.map((t) => (
                  <div key={t.id} className="relative group">
                    <button 
                      onClick={() => applyTemplate(t)}
                      className="w-full p-4 rounded-2xl border border-zinc-100 hover:border-zinc-900 transition-all text-left"
                    >
                      <div className="text-xs font-bold text-zinc-900 mb-1">{t.title}</div>
                      <div className="text-[10px] text-zinc-400 mb-2 uppercase tracking-widest">{t.category}</div>
                      <div className="text-[10px] text-zinc-500 line-clamp-2">{t.description}</div>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTemplate(t.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {summary && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-24 right-8 w-96 bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden z-50"
            >
              <div className="p-6 bg-zinc-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-bold uppercase tracking-widest">AI Summary</span>
                </div>
                <button onClick={() => setSummary(null)}><X className="w-4 h-4" /></button>
              </div>
              <div className="p-6 text-sm text-zinc-600 leading-relaxed max-h-96 overflow-y-auto">
                <Markdown>{summary}</Markdown>
              </div>
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                <button 
                  onClick={() => {
                    insertText('\n\n### Summary\n' + summary);
                    setSummary(null);
                  }}
                  className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 hover:bg-zinc-50 transition-all"
                >
                  Insert into Document
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Quick Actions & Stats */}
      <div className="p-4 border-t border-zinc-100 bg-white flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-4">
          {[
            { label: 'Summarize', action: 'Summarize this document' },
            { label: 'Improve Style', action: 'Improve the writing style and flow' },
            { label: 'Professional Tone', action: 'Rewrite this document in a professional, corporate tone' },
            { label: 'Creative Tone', action: 'Rewrite this document in a creative, engaging tone' },
            { label: 'Fix Grammar', action: 'Fix any grammar and spelling mistakes' },
            { label: 'Add Outline', action: 'Generate a structured outline for this content' },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={() => handleAIAction(btn.action)}
              disabled={isAIProcessing}
              className="px-4 py-2 rounded-xl border border-zinc-100 text-xs font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 hover:border-zinc-200 transition-all whitespace-nowrap disabled:opacity-50"
            >
              {btn.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-6 px-4 border-l border-zinc-100 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Words</span>
            <span className="text-sm font-bold text-zinc-900">{wordCount}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Chars</span>
            <span className="text-sm font-bold text-zinc-900">{charCount}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Read Time</span>
            <span className="text-sm font-bold text-zinc-900">{readingTime}m</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={cn("animate-spin", className)} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
