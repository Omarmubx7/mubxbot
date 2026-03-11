"use client";

import { motion } from "framer-motion";

export function ChatMessage({ type, content, timestamp }) {
  const isUser = type === 'user';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 25, 
        mass: 0.8 
      }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-3 sm:px-4 mb-2`}
    >
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[88%] sm:max-w-[80%]`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-md border ${
            isUser
              ? 'bg-gradient-to-br from-red-600 to-red-500 text-white border-red-400/30'
              : 'glass-surface text-[#1C1C1E] dark:text-white dark:border-white/10 border-black/5'
          }`}
        >
          <div className="text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </div>
        </div>
        {timestamp && (
          <span className="text-[11px] text-[#8E8E93] dark:text-[#98989D] mt-1.5 px-2 font-medium tracking-wide">
            {timestamp}
          </span>
        )}
      </div>
    </motion.div>
  );
}
