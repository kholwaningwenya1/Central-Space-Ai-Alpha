import React, { useState } from 'react';
import { Bot, Plus, Trash2, Globe, CheckCircle2, AlertCircle, Loader2, Save, Sparkles, Search, Code, PenTool, BarChart3, Zap } from 'lucide-react';
import { Bot as BotType } from '../types';
import { cn } from '../lib/utils';

const PREBUILT_AGENTS: Partial<BotType>[] = [
  {
    name: 'Research Specialist',
    username: 'researcher',
    description: 'Deep dives into any topic, providing structured summaries and source citations.',
    isActive: true,
    systemInstruction: 'You are a Research Specialist. Your goal is to provide deep, accurate, and well-sourced information on any topic. Always include a "Key Findings" section and a list of "Sources".',
    commands: [{ command: 'research', description: 'Start a deep research task' }]
  },
  {
    name: 'Code Architect',
    username: 'coder',
    description: 'Expert in system design, debugging, and writing clean, performant code across multiple languages.',
    isActive: true,
    systemInstruction: 'You are a Code Architect. You specialize in software engineering, system design, and best practices. Provide code snippets that are clean, documented, and ready for production.',
    commands: [{ command: 'code', description: 'Generate code for a task' }]
  },
  {
    name: 'Creative Copywriter',
    username: 'writer',
    description: 'Specializes in persuasive writing, brand storytelling, and engaging content creation.',
    isActive: true,
    systemInstruction: 'You are a Creative Copywriter. Your tone is engaging, persuasive, and tailored to the audience. Focus on storytelling and brand voice.',
    commands: [{ command: 'write', description: 'Write creative content' }]
  },
  {
    name: 'Data Analyst',
    username: 'analyst',
    description: 'Extracts insights from complex datasets, creates visualizations, and identifies trends.',
    isActive: true,
    systemInstruction: 'You are a Data Analyst. You excel at interpreting data, finding patterns, and explaining complex statistics in simple terms.',
    commands: [{ command: 'analyze', description: 'Analyze data from a file' }]
  }
];

interface UnitsProps {
  units: BotType[];
  onUpdate: (units: BotType[]) => void;
}

export function Units({ units, onUpdate }: UnitsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-units' | 'discover'>('my-units');
  const [newUnit, setNewUnit] = useState<Partial<BotType>>({
    name: '',
    username: '',
    description: '',
    webhookUrl: '',
    isActive: true,
  });

  const handleAdd = (unitData: Partial<BotType>) => {
    if (!unitData.name || !unitData.description || !unitData.username) return;
    const unit: BotType = {
      id: Math.random().toString(36).substring(2, 11),
      name: unitData.name!,
      username: unitData.username!,
      description: unitData.description!,
      webhookUrl: unitData.webhookUrl || '',
      isActive: true,
      systemInstruction: unitData.systemInstruction || '',
      commands: unitData.commands || [],
      creatorId: 'system',
      createdAt: Date.now()
    };
    onUpdate([...units, unit]);
    setIsAdding(false);
    setNewUnit({ name: '', username: '', description: '', webhookUrl: '', isActive: true });
  };

  const handleToggle = (id: string) => {
    onUpdate(units.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
  };

  const handleDelete = (id: string) => {
    onUpdate(units.filter(u => u.id !== id));
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 bg-zinc-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">Agentic Workspace</h1>
            <p className="text-zinc-500 text-sm">Deploy specialized AI units to automate your workflow.</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-950/10"
          >
            <Plus className="w-4 h-4" /> Create Unit
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('my-units')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'my-units' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            My Units
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'discover' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Discover
          </button>
        </div>

        {isAdding && (
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-sm font-semibold text-zinc-900">New Agentic Unit</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Unit Name</label>
                <input
                  type="text"
                  value={newUnit.name}
                  onChange={e => setNewUnit({ ...newUnit, name: e.target.value })}
                  placeholder="e.g., Research Bot"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Username</label>
                <input
                  type="text"
                  value={newUnit.username}
                  onChange={e => setNewUnit({ ...newUnit, username: e.target.value })}
                  placeholder="@research_bot"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Webhook URL (Optional)</label>
              <input
                type="text"
                value={newUnit.webhookUrl}
                onChange={e => setNewUnit({ ...newUnit, webhookUrl: e.target.value })}
                placeholder="https://yourdomain.com/webhook/..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Description & Role</label>
              <textarea
                value={newUnit.description}
                onChange={e => setNewUnit({ ...newUnit, description: e.target.value })}
                placeholder="Describe what this unit does and when it should be used..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-zinc-500 hover:text-zinc-900 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAdd(newUnit)}
                className="px-6 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800"
              >
                Save Unit
              </button>
            </div>
          </div>
        )}

        {activeTab === 'my-units' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {units.map(unit => (
              <div key={unit.id} className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm hover:border-zinc-300 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900">{unit.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                          unit.isActive ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                        )}>
                          {unit.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {unit.webhookUrl && (
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                            <Globe className="w-2 h-2" /> Webhook Connected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleToggle(unit.id)}
                      className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg"
                      title={unit.isActive ? "Deactivate" : "Activate"}
                    >
                      {unit.isActive ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(unit.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-zinc-500 line-clamp-3 mb-4 leading-relaxed">
                  {unit.description}
                </p>
                {unit.webhookUrl && (
                  <div className="text-[10px] font-mono text-zinc-400 truncate bg-zinc-50 p-2 rounded-lg">
                    {unit.webhookUrl}
                  </div>
                )}
              </div>
            ))}
            {units.length === 0 && !isAdding && (
              <div className="col-span-2 py-20 text-center border-2 border-dashed border-zinc-200 rounded-3xl">
                <Bot className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                <h3 className="text-zinc-900 font-semibold">No Agentic Units yet</h3>
                <p className="text-zinc-500 text-sm">Create your first unit to start building your AI swarm.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PREBUILT_AGENTS.map((agent, idx) => (
              <div key={idx} className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm hover:border-zinc-300 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <Sparkles className="w-4 h-4 text-zinc-100" />
                </div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100">
                      <Bot className="w-6 h-6 text-zinc-900" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900">{agent.name}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">@{agent.username}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
                  {agent.description}
                </p>
                <button
                  onClick={() => handleAdd(agent)}
                  className="w-full py-2 bg-zinc-50 text-zinc-900 border border-zinc-100 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all"
                >
                  Deploy Unit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
