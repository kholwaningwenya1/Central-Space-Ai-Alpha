import React, { useState } from 'react';
import { Search, Loader2, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { queryVectorDb, VectorMatch } from '../services/vectorService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<VectorMatch[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const matches = await queryVectorDb(query);
      setResults(matches);
      if (matches.length === 0) {
        toast.info('No similar items found.');
      }
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.error(error.message || 'Failed to perform semantic search');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
        <h2 className="text-lg font-bold text-zinc-900 mb-1 flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-600" />
          Semantic Search
        </h2>
        <p className="text-sm text-zinc-500 mb-4">Find blueprints and documents using similarity matching.</p>
        
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for 'modern kitchen layout' or 'wooden table dimensions'..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm placeholder:text-zinc-300 dark:placeholder:text-zinc-500"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="popLayout">
          {results.length > 0 ? (
            <div className="grid gap-4">
              {results.map((result, idx) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 rounded-xl border border-zinc-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {result.metadata.type === 'blueprint' ? (
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {result.metadata.type || 'Document'} • Score: {(result.score * 100).toFixed(1)}%
                        </span>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900 truncate">
                        {result.metadata.view ? `${result.metadata.view} View` : 'Research Document'}
                      </h3>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-1 italic">
                        "{result.metadata.text}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            !isSearching && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-12">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">Enter a query to find relevant blueprints and documents.</p>
              </div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
