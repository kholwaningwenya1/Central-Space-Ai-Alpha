import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, Download, Loader2, Image as ImageIcon, Ruler, Box, Maximize2, FileDown, Layers, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { generateImageFromPrompt, generateChatResponse } from '../services/aiService';
import { FileData } from '../types';
import JSZip from 'jszip';

interface BlueprintGeneratorProps {
  onAIAction: (action: string, context: string) => Promise<string>;
  onSaveToLibrary?: (file: Omit<FileData, 'id' | 'timestamp'>) => void;
}

interface Blueprint {
  id: string;
  view: string;
  url: string;
  prompt: string;
}

export function BlueprintGenerator({ onAIAction, onSaveToLibrary }: BlueprintGeneratorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<FileData | null>(null);
  const [description, setDescription] = useState('');
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [style, setStyle] = useState<'bw' | 'color' | 'blue' | 'sketch'>('blue');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedImage({
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        data: base64,
        size: file.size,
        timestamp: Date.now()
      });
    };
    reader.readAsDataURL(file);
  };

  const generateBlueprints = async () => {
    if (!uploadedImage && !description) {
      toast.error('Please upload an image or provide a description.');
      return;
    }

    setIsProcessing(true);
    setBlueprints([]);
    
    try {
      // Step 1: Analyze the input to get view descriptions
      const analysisPrompt = `Analyze this ${uploadedImage ? 'image' : 'description'} for a ${description || 'design'}. 
      Generate 6 precise image generation prompts for different blueprint views: Front, Back, Side, Top, Isometric, and Orthographic.
      
      CRITICAL REQUIREMENTS for Blender Reference Images:
      1. Each view must be perfectly centered and orthographic (flat, no perspective for Front/Back/Side/Top).
      2. The scale must be consistent across all views.
      3. Use a clean, solid background.
      4. The style must be ${
        style === 'bw' ? 'clean black and white technical line drawing, high contrast, no shading, professional CAD style' : 
        style === 'blue' ? 'classic architectural blueprint, white lines on deep blue background, traditional engineering style' : 
        style === 'sketch' ? 'hand-drawn architectural sketch, pencil on parchment, artistic concept style' :
        'detailed color technical render, clean lighting, clear materials, modern architectural visualization'
      }.
      5. No text or labels inside the image.
      
      Return the result as a JSON array of objects with "view" and "prompt" fields. Only return the JSON.`;

      const response = await generateChatResponse(
        [{ role: 'user', content: analysisPrompt, files: uploadedImage ? [uploadedImage] : [] }],
        { tone: 'Professional', voice: 'Third person', modelId: 'gpt-4o' }
      );

      let views: { view: string; prompt: string }[] = [];
      try {
        const cleanedResponse = response.text.replace(/```json|```/g, '').trim();
        views = JSON.parse(cleanedResponse);
      } catch (e) {
        console.error('Failed to parse views', e);
        toast.error('Failed to analyze design. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Step 2: Generate images for each view
      const generatedBlueprints: Blueprint[] = [];
      
      // We'll generate them sequentially or in small batches to avoid timeouts
      for (const view of views) {
        try {
          const url = await generateImageFromPrompt(view.prompt, { aspectRatio: "1:1" });
          generatedBlueprints.push({
            id: Math.random().toString(36).substr(2, 9),
            view: view.view,
            url,
            prompt: view.prompt
          });
          // Update UI as they come in
          setBlueprints([...generatedBlueprints]);
        } catch (err) {
          console.error(`Failed to generate ${view.view} view`, err);
        }
      }

      if (generatedBlueprints.length === 0) {
        toast.error('Failed to generate blueprints.');
      } else {
        toast.success(`Generated ${generatedBlueprints.length} blueprint views.`);
      }
    } catch (error) {
      console.error('Blueprint generation failed', error);
      toast.error('An error occurred during generation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadBlueprint = (url: string, view: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `blueprint-${view.toLowerCase()}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = async () => {
    if (blueprints.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("blueprints");
      
      const promises = blueprints.map(async (bp) => {
        const response = await fetch(bp.url);
        const blob = await response.blob();
        folder?.file(`${bp.view.toLowerCase()}.png`, blob);
      });
      
      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `blueprints-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('All blueprints downloaded as ZIP');
    } catch (error) {
      console.error('Failed to create ZIP', error);
      toast.error('Failed to download all blueprints');
    } finally {
      setIsZipping(false);
    }
  };

  const saveToLibrary = async (bp: Blueprint) => {
    if (!onSaveToLibrary) return;
    try {
      const response = await fetch(bp.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        onSaveToLibrary({
          name: `Blueprint - ${bp.view}.png`,
          type: 'image/png',
          data: base64data,
          size: blob.size
        });
        toast.success(`${bp.view} view saved to library`);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Failed to save to library', error);
      toast.error('Failed to save blueprint');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 h-full overflow-hidden font-sans">
      <div className="p-8 max-w-6xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight uppercase mb-2">Blueprint Generator</h2>
          <p className="text-zinc-500 font-medium">Generate professional technical drawings and blueprints from images or descriptions.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
            <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4" /> Input Design
              </h3>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all mb-4 overflow-hidden relative group",
                  uploadedImage ? "border-indigo-500 bg-indigo-50/30" : "border-zinc-200 hover:border-zinc-400 bg-zinc-50"
                )}
              >
                {uploadedImage ? (
                  <>
                    <img src={uploadedImage.data} alt="Uploaded" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-bold uppercase tracking-widest">Change Image</span>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-zinc-300 mb-2" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Upload Measurements</span>
                  </>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Description / Dimensions</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Kitchen layout 4x5m with island, modern cabinets..."
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[100px] resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Blueprint Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setStyle('bw')}
                      className={cn(
                        "py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-1",
                        style === 'bw' ? "bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/20" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                      )}
                    >
                      <span className="text-xs">B&W</span>
                      <span className="opacity-60 font-medium normal-case text-[8px]">Technical Line</span>
                    </button>
                    <button 
                      onClick={() => setStyle('blue')}
                      className={cn(
                        "py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-1",
                        style === 'blue' ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                      )}
                    >
                      <span className="text-xs">Classic</span>
                      <span className="opacity-60 font-medium normal-case text-[8px]">Blue & White</span>
                    </button>
                    <button 
                      onClick={() => setStyle('color')}
                      className={cn(
                        "py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-1",
                        style === 'color' ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                      )}
                    >
                      <span className="text-xs">Color</span>
                      <span className="opacity-60 font-medium normal-case text-[8px]">Detailed Render</span>
                    </button>
                    <button 
                      onClick={() => setStyle('sketch')}
                      className={cn(
                        "py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-1",
                        style === 'sketch' ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                      )}
                    >
                      <span className="text-xs">Sketch</span>
                      <span className="opacity-60 font-medium normal-case text-[8px]">Hand Drawn</span>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={generateBlueprints}
                  disabled={isProcessing || (!uploadedImage && !description)}
                  className="w-full py-4 bg-zinc-950 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-xl shadow-zinc-950/20"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Generate Blueprints
                </button>
              </div>
            </div>

            <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-600/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Box className="w-5 h-5" />
                </div>
                <h4 className="font-bold tracking-tight">Blender Ready</h4>
              </div>
              <p className="text-indigo-100 text-xs leading-relaxed font-medium">
                All generated views maintain consistent scale and resolution, making them perfect as reference images for 3D modeling in Blender.
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 flex flex-col overflow-hidden">
            <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Generated Views
                </h3>
                <div className="flex items-center gap-3">
                  {blueprints.length > 0 && (
                    <>
                      <button 
                        onClick={downloadAll}
                        disabled={isZipping}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        {isZipping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        Download All
                      </button>
                      <span className="text-[10px] font-black bg-zinc-100 px-2 py-1 rounded-full text-zinc-500">{blueprints.length} Views</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isProcessing && blueprints.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                      <Sparkles className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h4 className="font-bold text-zinc-900 mb-2">Analyzing Design...</h4>
                    <p className="text-zinc-400 text-xs max-w-xs mx-auto">Gemini is analyzing your input to generate precise technical views.</p>
                  </div>
                ) : blueprints.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {blueprints.map((bp) => (
                      <motion.div 
                        key={bp.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group relative bg-zinc-50 rounded-3xl border border-zinc-100 overflow-hidden"
                      >
                        <div className="aspect-square relative">
                          <img src={bp.url} alt={bp.view} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button 
                              onClick={() => downloadBlueprint(bp.url, bp.view)}
                              className="p-3 bg-white text-zinc-900 rounded-2xl hover:scale-110 transition-transform shadow-xl"
                              title="Download PNG"
                            >
                              <FileDown className="w-5 h-5" />
                            </button>
                            {onSaveToLibrary && (
                              <button 
                                onClick={() => saveToLibrary(bp)}
                                className="p-3 bg-white text-zinc-900 rounded-2xl hover:scale-110 transition-transform shadow-xl"
                                title="Save to Library"
                              >
                                <PlusCircle className="w-5 h-5" />
                              </button>
                            )}
                            <button 
                              onClick={() => window.open(bp.url, '_blank')}
                              className="p-3 bg-white text-zinc-900 rounded-2xl hover:scale-110 transition-transform shadow-xl"
                              title="View Full Size"
                            >
                              <Maximize2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="p-4 flex items-center justify-between bg-white">
                          <div>
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">View Type</span>
                            <span className="text-sm font-bold text-zinc-900">{bp.view}</span>
                          </div>
                          <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center">
                            <Ruler className="w-4 h-4 text-zinc-300" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-300">
                    <Box className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-sm font-medium">No blueprints generated yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
