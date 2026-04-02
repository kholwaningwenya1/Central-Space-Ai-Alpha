import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, X, Loader2, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LiveModeProps {
  onClose: () => void;
  systemInstruction: string;
}

export function LiveMode({ onClose, systemInstruction }: LiveModeProps) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [modelTranscription, setModelTranscription] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueue = useRef<Int16Array[]>([]);
  const isPlaying = useRef(false);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key is missing. Please check your configuration.');
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            startAudioCapture();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              const binaryString = atob(base64Audio);
              const bytes = new Int16Array(binaryString.length / 2);
              for (let i = 0; i < bytes.length; i++) {
                bytes[i] = (binaryString.charCodeAt(i * 2) & 0xFF) | (binaryString.charCodeAt(i * 2 + 1) << 8);
              }
              audioQueue.current.push(bytes);
              if (!isPlaying.current) playNextChunk();
            }

            if (message.serverContent?.interrupted) {
              audioQueue.current = [];
              isPlaying.current = false;
            }

            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
              setModelTranscription(prev => prev + message.serverContent!.modelTurn!.parts[0].text);
            }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (error) => {
            console.error("Live API Error:", error);
            stopSession();
          }
        }
      });
      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to connect to Live API:", error);
      setIsConnecting(false);
    }
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        sessionRef.current?.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=24000' }
        });
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
    } catch (error) {
      console.error("Failed to start audio capture:", error);
    }
  };

  const playNextChunk = () => {
    if (audioQueue.current.length === 0 || !audioContextRef.current) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;
    const chunk = audioQueue.current.shift()!;
    const buffer = audioContextRef.current.createBuffer(1, chunk.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < chunk.length; i++) {
      channelData[i] = chunk[i] / 0x7FFF;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = playNextChunk;
    source.start();
  };

  const stopSession = () => {
    setIsActive(false);
    sessionRef.current?.close();
    sessionRef.current = null;
    
    processorRef.current?.disconnect();
    processorRef.current = null;
    
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    
    audioContextRef.current?.close();
    audioContextRef.current = null;
    
    audioQueue.current = [];
    isPlaying.current = false;
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/95 backdrop-blur-sm p-6"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Live Workspace Mode</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Real-time Voice Interaction</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-12">
          <div className="relative">
            <AnimatePresence>
              {isActive && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 0.2 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                  className="absolute inset-0 bg-zinc-900 rounded-full"
                />
              )}
            </AnimatePresence>
            <button
              onClick={isActive ? stopSession : startSession}
              disabled={isConnecting}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
                isActive ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              {isConnecting ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : isActive ? (
                <MicOff className="w-10 h-10" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>
          </div>

          <div className="text-center space-y-4 w-full">
            <h4 className="text-xl font-bold text-zinc-900">
              {isConnecting ? 'Connecting to Workspace...' : isActive ? 'Listening...' : 'Ready to Talk'}
            </h4>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto">
              {isActive 
                ? 'Speak naturally to your assistant. Your voice is processed in real-time.' 
                : 'Click the microphone to start a live voice session with Central Space AI.'}
            </p>
          </div>

          {isActive && (
            <div className="w-full bg-zinc-50 rounded-2xl p-4 min-h-[100px] max-h-[150px] overflow-y-auto">
              <p className="text-sm text-zinc-600 italic">
                {modelTranscription || 'Waiting for response...'}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 bg-zinc-50 border-t border-zinc-100 text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
            Powered by Gemini 2.5 Flash Native Audio
          </p>
        </div>
      </div>
    </motion.div>
  );
}
