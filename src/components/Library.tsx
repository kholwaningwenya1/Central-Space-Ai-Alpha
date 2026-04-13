import React, { useState } from 'react';
import { FileData } from '../types';
import { File, FileText, FileSpreadsheet, Image, Video, Trash2, Download, Search, Plus, X, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

interface LibraryProps {
  files: FileData[];
  onDelete: (id: string) => void;
  onUpload: (files: FileList) => void;
  onChatWithLibrary?: () => void;
}

export function Library({ files, onDelete, onUpload, onChatWithLibrary }: LibraryProps) {
  const [search, setSearch] = useState('');

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    if (type.includes('spreadsheet') || type.includes('csv')) return FileSpreadsheet;
    if (type.includes('pdf') || type.includes('text')) return FileText;
    return File;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 p-6 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Workspace Library</h1>
            <p className="text-zinc-500 text-sm">Manage and search all files in this workspace.</p>
          </div>
          <div className="flex items-center gap-4">
            {onChatWithLibrary && files.length > 0 && (
              <button 
                onClick={onChatWithLibrary}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Chat with Library
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent w-64"
              />
            </div>
            <label className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors cursor-pointer">
              <Plus className="w-4 h-4" />
              Upload Files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && onUpload(e.target.files)}
              />
            </label>
          </div>
        </div>

        {/* File Grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white border border-dashed border-zinc-200 rounded-3xl">
              <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4">
                <File className="w-8 h-8 text-zinc-300" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">No files found</h3>
              <p className="text-zinc-500 max-w-xs mx-auto mt-2">
                Upload documents, images, or spreadsheets to start building your workspace library.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file) => {
                const Icon = getFileIcon(file.type);
                return (
                  <div 
                    key={file.id}
                    className="group bg-white border border-zinc-200 rounded-2xl p-4 hover:border-zinc-900 hover:shadow-lg transition-all relative"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-zinc-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-900 truncate pr-6" title={file.name}>
                          {file.name}
                        </h4>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mt-1">
                          {file.type.split('/')[1] || 'FILE'} • {formatSize(file.size)}
                        </p>
                      </div>
                    </div>

                    {file.type.startsWith('image/') && (
                      <div className="aspect-video rounded-lg overflow-hidden bg-zinc-100 mb-4">
                        <img src={file.data} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <a 
                        href={file.data} 
                        download={file.name}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-50 text-zinc-600 rounded-lg text-xs font-medium hover:bg-zinc-100 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                      <button 
                        onClick={() => onDelete(file.id)}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
