"use client";

import React from "react";
import { motion } from "framer-motion";

export default function MessageBubble({ sender, children, isTyping = false, timestamp }) {
  const isUser = sender === "user";
  
  let timeString = "";
  try {
    if (timestamp instanceof Date) {
      timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    } else if (typeof timestamp === 'string') {
      timeString = timestamp;
    }
  } catch (e) {
    timeString = "";
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} px-4 mb-1`}
    >
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div
          className={`relative px-[16px] py-[10px] shadow-sm transition-all duration-300 ${
            isUser
              ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white rounded-[22px] rounded-tr-[4px]'
              : 'glass-card text-[var(--text-primary)] rounded-[22px] rounded-tl-[4px]'
          }`}
        >
          {isTyping ? (
            <div className="flex gap-1.5 items-center h-5 px-1">
              {[0, 150, 300].map((delay) => (
                <span 
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce" 
                  style={{ animationDelay: `${delay}ms`, animationDuration: '1s' }}
                ></span>
              ))}
            </div>
          ) : (
            <div className="text-[15px] leading-[1.45] font-medium break-words relative z-10">{children}</div>
          )}
        </div>
        {timeString && (
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] mt-1.5 px-2 uppercase tracking-tight opacity-70">
            {timeString}
          </span>
        )}
      </div>
    </motion.div>
  );
}
