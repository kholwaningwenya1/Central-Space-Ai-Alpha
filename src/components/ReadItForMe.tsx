import React, { useState, useRef } from 'react';
import { 
  BookOpen, 
  Upload, 
  Search, 
  Loader2, 
  Play, 
  Download, 
  Volume2, 
  FileText, 
  AlignLeft, 
  MessageSquare,
  ChevronRight,
  Book as BookIcon,
  Headphones,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { generateChatResponse, generateSpeech } from '../services/aiService';
import { FileData } from '../types';

import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

interface Chapter {
  title: string;
  content: string;
  audioUrl?: string;
}

interface BookInfo {
  title: string;
  author: string;
  description: string;
  coverUrl?: string;
  chapters: Chapter[];
}

export function ReadItForMe() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [mode, setMode] = useState<'straight' | 'summary' | 'descriptive'>('descriptive');
  const [voice, setVoice] = useState('alloy');
  const [speed, setSpeed] = useState(1.0);
  const [progress, setProgress] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<FileData | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const voices = [
    { id: 'alloy', name: 'Alloy (Neutral)' },
    { id: 'echo', name: 'Echo (Male)' },
    { id: 'fable', name: 'Fable (British)' },
    { id: 'onyx', name: 'Onyx (Deep Male)' },
    { id: 'nova', name: 'Nova (Female)' },
    { id: 'shimmer', name: 'Shimmer (Soft Female)' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedImage({
        id: Math.random().toString(36).substring(2, 11),
        name: file.name,
        type: file.type,
        data: base64,
        size: file.size,
        timestamp: Date.now()
      });
      // Automatically trigger processing when image is uploaded
      processInput(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const processInput = async (imageData?: string, mimeType?: string) => {
    if (!input && !imageData) {
      toast.error('Please provide a book title, topic, or upload a cover image.');
      return;
    }

    setIsProcessing(true);
    setBookInfo(null);
    setProgress(0);

    try {
      const prompt = imageData 
        ? "Analyze this book cover and identify the title and author. Then, provide a detailed overview of the book, its main themes, and a structured breakdown of its key chapters or sections. If it's a topic, provide a comprehensive guide."
        : `Provide a detailed overview of "${input}", its main themes, and a structured breakdown of its key chapters or sections. If it's a topic, provide a comprehensive guide.`;

      const response = await generateChatResponse(
        [{ role: 'user', content: prompt, files: uploadedImage ? [uploadedImage] : [] }],
        { 
          tone: 'Professional', 
          voice: 'Third person', 
          modelId: 'gpt-4o',
          customSystemInstruction: "You are a book narrator and researcher AI. Your goal is to identify books or topics and provide structured content for audio narration. Return the result in a structured format with Title, Author, Description, and a list of Chapters/Sections with their content."
        }
      );

      // Parse the AI response into a structured format
      // In a real app, we'd use function calling or a stricter schema
      // For this prototype, we'll use Gemini to format it as JSON
      const jsonResponse = await generateChatResponse(
        [{ role: 'user', content: `Convert the following book information into a JSON object with the fields: title, author, description, and chapters (an array of objects with title and content fields). Content should be substantial enough for a 2-3 minute reading per chapter.\n\n${response.text}` }],
        { tone: 'Professional', voice: 'Third person', modelId: 'gpt-4o-mini' }
      );

      const cleanedJson = jsonResponse.text.replace(/```json|```/g, '').trim();
      const parsedData = JSON.parse(cleanedJson);
      
      setBookInfo({
        ...parsedData,
        coverUrl: imageData
      });
      setSelectedChapters(parsedData.chapters.map((_: any, i: number) => i));
      toast.success('Book content identified and processed!');
    } catch (error) {
      console.error('Processing failed:', error);
      toast.error('Failed to process book information. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateAudio = async () => {
    if (!bookInfo) return;
    if (selectedChapters.length === 0) {
      toast.error('Please select at least one chapter to narrate.');
      return;
    }
    
    setIsGeneratingAudio(true);
    setProgress(0);

    try {
      const updatedChapters = [...bookInfo.chapters];
      for (let i = 0; i < selectedChapters.length; i++) {
        const chapterIdx = selectedChapters[i];
        const chapter = updatedChapters[chapterIdx];
        let textToRead = '';

        if (mode === 'straight') {
          textToRead = chapter.content;
        } else if (mode === 'summary') {
          const summaryResponse = await generateChatResponse(
            [{ role: 'user', content: `Summarize this chapter concisely for audio narration. Focus on the main plot points and key information:\n\n${chapter.content}` }],
            { tone: 'Professional', voice: 'Third person', modelId: 'gpt-4o-mini' }
          );
          textToRead = summaryResponse.text;
        } else {
          const descriptiveResponse = await generateChatResponse(
            [{ role: 'user', content: `Read this chapter and provide a descriptive narration. Include the main content followed by 2-3 key takeaways, insights, and helpful comments for the listener:\n\n${chapter.content}` }],
            { tone: 'Professional', voice: 'Third person', modelId: 'gpt-4o-mini' }
          );
          textToRead = descriptiveResponse.text;
        }

        // OpenAI TTS limit is 4096 characters. We'll truncate for now to ensure it works.
        // In a production app, we would chunk and concatenate.
        const truncatedText = textToRead.substring(0, 4000);

        const audioUrl = await generateSpeech(truncatedText, voice);
        if (audioUrl) {
          updatedChapters[chapterIdx] = { ...chapter, audioUrl };
          setBookInfo({ ...bookInfo, chapters: updatedChapters });
        }
        setProgress(((i + 1) / selectedChapters.length) * 100);
      }
      toast.success('Audio narration generated successfully!');
    } catch (error) {
      console.error('Audio generation failed:', error);
      toast.error('Failed to generate audio. Please try again.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const playPreview = async (text: string) => {
    try {
      const truncatedText = text.substring(0, 500); // Short preview
      const audioUrl = await generateSpeech(truncatedText, voice);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (error) {
      toast.error('Failed to play preview');
    }
  };

  const toggleChapterSelection = (idx: number) => {
    setSelectedChapters(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const toggleAllChapters = () => {
    if (!bookInfo) return;
    if (selectedChapters.length === bookInfo.chapters.length) {
      setSelectedChapters([]);
    } else {
      setSelectedChapters(bookInfo.chapters.map((_, i) => i));
    }
  };

  const downloadAll = async () => {
    if (!bookInfo) return;
    const zip = new JSZip();
    const folder = zip.folder(bookInfo.title.replace(/\s+/g, '_'));
    
    if (!folder) return;

    for (let i = 0; i < bookInfo.chapters.length; i++) {
      const chapter = bookInfo.chapters[i];
      if (chapter.audioUrl) {
        const response = await fetch(chapter.audioUrl);
        const blob = await response.blob();
        folder.file(`${i + 1}_${chapter.title.replace(/\s+/g, '_')}.mp3`, blob);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bookInfo.title.replace(/\s+/g, '_')}_narrations.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAudio = (url: string, title: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 overflow-hidden">
      <div className="max-w-5xl mx-auto w-full p-6 space-y-8 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <BookOpen className="w-6 h-6" />
              </div>
              Read It For Me
            </h1>
            <p className="text-zinc-500 mt-1">AI-powered audio narrations for books, novels, and research.</p>
          </div>
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter book title, novel name, or topic..."
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
                <button
                  onClick={() => processInput()}
                  disabled={isProcessing || (!input && !uploadedImage)}
                  className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  Search
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-zinc-100" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">OR</span>
                <div className="flex-1 h-px bg-zinc-100" />
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                {uploadedImage ? (
                  <div className="flex items-center gap-4 w-full">
                    <img src={uploadedImage.data} alt="Cover" className="w-16 h-20 object-cover rounded-lg shadow-md" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zinc-900">{uploadedImage.name}</p>
                      <p className="text-xs text-zinc-500">Image uploaded successfully</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setUploadedImage(null); }}
                      className="p-2 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-zinc-400 group-hover:text-indigo-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-zinc-900">Upload Book Cover</p>
                      <p className="text-xs text-zinc-500 mt-1">Drag and drop or click to browse</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Start Suggestions */}
            <div className="flex flex-wrap gap-2">
              {['The Great Gatsby', 'Atomic Habits', 'One Piece Manga', 'Quantum Physics', 'AI Ethics'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-[10px] font-bold text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Options Section */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <AlignLeft className="w-3 h-3" />
                  Narration Mode
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'straight', label: 'Straight Reading', icon: FileText },
                    { id: 'summary', label: 'Chapter Summaries', icon: AlignLeft },
                    { id: 'descriptive', label: 'Descriptive (Takeaways)', icon: MessageSquare },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id as any)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border",
                        mode === m.id 
                          ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                          : "bg-zinc-50 border-zinc-100 text-zinc-500 hover:bg-zinc-100"
                      )}
                    >
                      <m.icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Volume2 className="w-3 h-3" />
                  Voice Options
                </label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                    <span>Speed</span>
                    <span>{speed}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
                <button
                  onClick={() => playPreview("This is a preview of the selected voice and speed.")}
                  className="w-full py-2 bg-zinc-100 text-zinc-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-3 h-3" />
                  Play Preview
                </button>
              </div>

              <button
                onClick={generateAudio}
                disabled={!bookInfo || isGeneratingAudio}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                {isGeneratingAudio ? <Loader2 className="w-5 h-5 animate-spin" /> : <Headphones className="w-5 h-5" />}
                Generate Audio
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {bookInfo ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 pb-12"
            >
              <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-8 flex flex-col md:flex-row gap-8 items-start">
                  {bookInfo.coverUrl ? (
                    <img src={bookInfo.coverUrl} alt="Cover" className="w-48 h-64 object-cover rounded-2xl shadow-xl" />
                  ) : (
                    <div className="w-48 h-64 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-300">
                      <BookIcon className="w-16 h-16" />
                    </div>
                  )}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-3xl font-bold text-zinc-900">{bookInfo.title}</h2>
                      <p className="text-lg text-indigo-600 font-medium">{bookInfo.author}</p>
                    </div>
                    <p className="text-zinc-600 leading-relaxed">{bookInfo.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {selectedChapters.length} / {bookInfo.chapters.length} Selected
                      </span>
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {mode.toUpperCase()} MODE
                      </span>
                      <button 
                        onClick={toggleAllChapters}
                        className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
                      >
                        {selectedChapters.length === bookInfo.chapters.length ? 'Deselect All' : 'Select All'}
                      </button>
                      {bookInfo.chapters.some(c => c.audioUrl) && (
                        <button 
                          onClick={downloadAll}
                          className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-100 transition-colors flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download All (ZIP)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isGeneratingAudio && (
                  <div className="px-8 pb-8">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-zinc-500">
                        <span>Generating Audio Narrations...</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-indigo-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-zinc-100">
                  <div className="divide-y divide-zinc-100">
                    {bookInfo.chapters.map((chapter, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-6 flex items-center justify-between hover:bg-zinc-50/50 transition-colors group cursor-pointer",
                          !selectedChapters.includes(idx) && "opacity-60"
                        )}
                        onClick={() => toggleChapterSelection(idx)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            selectedChapters.includes(idx) 
                              ? "bg-indigo-100 text-indigo-600" 
                              : "bg-zinc-100 text-zinc-400"
                          )}>
                            <span className="text-xs font-bold">{idx + 1}</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-zinc-900">{chapter.title}</h4>
                            <p className="text-xs text-zinc-500 truncate max-w-md">{chapter.content.substring(0, 100)}...</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          {chapter.audioUrl ? (
                            <>
                              <audio src={chapter.audioUrl} className="hidden" id={`audio-${idx}`} />
                              <button 
                                onClick={() => {
                                  const audio = document.getElementById(`audio-${idx}`) as HTMLAudioElement;
                                  if (audio.paused) audio.play();
                                  else audio.pause();
                                }}
                                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => downloadAudio(chapter.audioUrl!, chapter.title)}
                                className="p-3 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-all"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                              {isGeneratingAudio ? 'Queued...' : 'Ready'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            !isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[400px] flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center text-zinc-300">
                  <Sparkles className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Your AI Narrator Awaits</h3>
                  <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                    Identify a book or topic to start generating high-quality audio narrations.
                  </p>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
