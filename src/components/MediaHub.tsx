import React, { useState } from 'react';
import { Image, Video, Sparkles, Download, Loader2, Maximize2, RefreshCw, Palette, Layout, Settings2, ArrowRight, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { enhancePrompt, generateImageFromPrompt, generateVideoFromPrompt } from '../services/aiService';

interface MediaHubProps {
  onSaveToLibrary: (file: { name: string; type: string; data: string; size: number }) => void;
}

export function MediaHub({ onSaveToLibrary }: MediaHubProps) {
  const [type, setType] = useState<'image' | 'video'>('image');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [collaborate, setCollaborate] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Advanced Controls
  const [style, setStyle] = useState('Cinematic');
  const [aspectRatio, setAspectRatio] = useState<any>('1:1');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');

  const styles = [
    'Cinematic', 'Digital Art', 'Photorealistic', 'Anime', 'Oil Painting', 
    '3D Render', 'Cyberpunk', 'Minimalist', 'Vaporwave', 'Surrealism'
  ];

  const aspectRatios = [
    { label: '1:1 Square', value: '1:1' },
    { label: '16:9 Wide', value: '16:9' },
    { label: '9:16 Vertical', value: '9:16' },
    { label: '4:3 Classic', value: '4:3' },
    { label: '3:4 Portrait', value: '3:4' }
  ];

  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(prompt, type);
      setPrompt(enhanced);
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setResult(null);
    setError(null);
    try {
      const fullPrompt = `${prompt}. Style: ${style}.`;
      if (type === 'image') {
        const url = await generateImageFromPrompt(fullPrompt, { aspectRatio });
        setResult(url);
      } else {
        const url = await generateVideoFromPrompt(fullPrompt, { resolution, aspectRatio });
        setResult(url);
      }
    } catch (err: any) {
      console.error('Generation failed:', err);
      let msg = err.message || 'Generation failed. Please try again.';
      try {
        // Try to parse if it's a JSON string from the API
        const parsed = JSON.parse(msg);
        if (parsed.error?.message) msg = parsed.error.message;
      } catch (e) {
        // Not JSON, keep original
      }
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    const name = `${type}-${Date.now()}.${type === 'image' ? 'png' : 'mp4'}`;
    onSaveToLibrary({
      name,
      type: type === 'image' ? 'image/png' : 'video/mp4',
      data: result,
      size: 0 // In a real app, we'd calculate this
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 font-sans overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Controls */}
        <div className="w-96 bg-white border-r border-zinc-200 p-8 overflow-y-auto space-y-8 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-zinc-950" />
              Media Hub
            </h2>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed">
              Create high-quality AI visual assets with advanced controls.
            </p>
          </div>

          {/* Type Selector */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Content Type</label>
            <div className="flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
              <button
                onClick={() => setType('image')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all",
                  type === 'image' ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"
                )}
              >
                <Image className="w-4 h-4" /> Image
              </button>
              <button
                onClick={() => setType('video')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all",
                  type === 'video' ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"
                )}
              >
                <Video className="w-4 h-4" /> Video
              </button>
            </div>
          </div>

          {/* Prompt Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Prompt Engineering</label>
              <button
                onClick={handleEnhance}
                disabled={isEnhancing || !prompt.trim()}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-950 hover:text-zinc-600 transition-colors disabled:opacity-50"
              >
                {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                Enhance
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe your ${type}...`}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all min-h-[120px] resize-none leading-relaxed"
            />
          </div>

          {/* Style Selector */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Palette className="w-3 h-3" /> Visual Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {styles.map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={cn(
                    "py-2 px-3 rounded-xl text-[11px] font-bold border transition-all truncate",
                    style === s ? "bg-zinc-950 text-white border-zinc-950 shadow-md" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-950"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Layout className="w-3 h-3" /> Aspect Ratio
            </label>
            <div className="space-y-2">
              {aspectRatios.map(ar => (
                <button
                  key={ar.value}
                  onClick={() => setAspectRatio(ar.value)}
                  className={cn(
                    "w-full flex items-center justify-between py-2.5 px-4 rounded-xl text-xs font-bold border transition-all",
                    aspectRatio === ar.value ? "bg-zinc-950 text-white border-zinc-950 shadow-md" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-950"
                  )}
                >
                  {ar.label}
                  <div className={cn(
                    "w-4 h-4 border-2 rounded-sm",
                    aspectRatio === ar.value ? "border-white" : "border-zinc-200"
                  )} style={{ 
                    aspectRatio: ar.value.replace(':', '/'),
                    width: ar.value === '16:9' ? '20px' : '16px'
                  }} />
                </button>
              ))}
            </div>
          </div>

          {/* Video Specific Controls */}
          {type === 'video' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Settings2 className="w-3 h-3" /> Video Resolution
                </label>
                <div className="flex gap-2">
                  {(['720p', '1080p'] as const).map(res => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all",
                        resolution === res ? "bg-zinc-950 text-white border-zinc-950 shadow-md" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-950"
                      )}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Intelligence Mode
                </label>
                <button
                  onClick={() => setCollaborate(!collaborate)}
                  className={cn(
                    "w-full flex items-center justify-between py-3 px-4 rounded-xl text-xs font-bold border transition-all",
                    collaborate ? "bg-zinc-950 text-white border-zinc-950 shadow-md" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-950"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4" />
                    AI Collaboration
                  </div>
                  <div className={cn(
                    "w-8 h-4 rounded-full relative transition-all duration-300",
                    collaborate ? "bg-emerald-500" : "bg-zinc-200"
                  )}>
                    <motion.div 
                      animate={{ x: collaborate ? 18 : 2 }}
                      className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" 
                    />
                  </div>
                </button>
                <p className="text-[9px] text-zinc-400 font-medium px-1">
                  Enables OpenAI & Anthropic to collaborate on the prompt for maximum quality.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-4 bg-zinc-950 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/20 disabled:opacity-50 active:scale-95"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate {type === 'image' ? 'Image' : 'Video'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 p-12 flex flex-col items-center justify-center relative bg-zinc-100/50">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center relative">
                  <div className="absolute inset-0 border-4 border-zinc-950 border-t-transparent rounded-[2rem] animate-spin" />
                  <Sparkles className="w-10 h-10 text-zinc-950" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-bold text-zinc-950">Creating your masterpiece...</p>
                  <p className="text-sm text-zinc-500">
                    {collaborate ? "OpenAI & Anthropic are collaborating on your vision..." : "This usually takes 10-30 seconds"}
                  </p>
                </div>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-6 text-center max-w-md"
              >
                <div className="w-20 h-20 bg-red-50 rounded-3xl shadow-xl flex items-center justify-center text-red-500">
                  <Settings2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-950">Generation Error</h3>
                  <p className="text-sm text-red-500 leading-relaxed font-medium">
                    {error}
                  </p>
                  <button 
                    onClick={handleGenerate}
                    className="mt-4 px-6 py-2 bg-zinc-950 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all"
                  >
                    Try Again
                  </button>
                </div>
              </motion.div>
            ) : result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-4xl space-y-6"
              >
                <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl border border-zinc-200 overflow-hidden group relative">
                  {type === 'image' ? (
                    <img src={result} alt="Generated" className="w-full h-auto rounded-2xl shadow-inner" referrerPolicy="no-referrer" />
                  ) : (
                    <video src={result} controls autoPlay loop className="w-full h-auto rounded-2xl shadow-inner" />
                  )}
                  
                  <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => window.open(result, '_blank')}
                      className="p-3 bg-white/90 backdrop-blur-md text-zinc-950 rounded-xl shadow-xl hover:bg-white transition-all"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleSave}
                      className="p-3 bg-zinc-950 text-white rounded-xl shadow-xl hover:bg-zinc-800 transition-all"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-2 text-sm font-bold text-zinc-950 hover:text-zinc-600 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" /> Regenerate
                    </button>
                    <div className="h-4 w-px bg-zinc-300" />
                    <p className="text-xs text-zinc-500 font-medium">
                      {type === 'image' ? 'Image' : 'Video'} • {aspectRatio} • {style}
                    </p>
                  </div>
                  <button
                    onClick={handleSave}
                    className="px-8 py-3 bg-zinc-950 text-white rounded-2xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/10"
                  >
                    Save to Library
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-6 text-center max-w-md"
              >
                <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center text-zinc-300">
                  {type === 'image' ? <Image className="w-10 h-10" /> : <Video className="w-10 h-10" />}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-950">Ready to Visualize?</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Enter a prompt on the left and adjust the settings to generate your custom AI media.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
