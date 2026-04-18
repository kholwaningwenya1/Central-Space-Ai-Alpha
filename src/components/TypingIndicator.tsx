import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface TypingIndicatorProps {
  className?: string;
  label?: string;
  showIcon?: boolean;
}

export function TypingIndicator({ className, label = 'Thinking', showIcon = true }: TypingIndicatorProps) {
  return (
    <div className={cn("flex justify-start items-end gap-2", className)}>
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-bl-sm px-5 py-3 shadow-sm flex items-center gap-3 border border-zinc-200/50 dark:border-zinc-700/50">
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.3, y: 0 }}
              animate={{ 
                opacity: [0.3, 1, 0.3], 
                y: [0, -4, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                duration: 1.2, 
                repeat: Infinity, 
                delay: i * 0.15,
                ease: "easeInOut"
              }}
              className="w-1.5 h-1.5 rounded-full bg-indigo-500"
            />
          ))}
        </div>
        {label && (
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] animate-pulse">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
