"use client";

import React from "react";
import { motion } from "framer-motion";

export default function MessageBubble({ sender, children, isTyping = false, timestamp = new Date() }) {
  const isUser = sender === "user";
  
  const timeString = timestamp.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  }).toLowerCase();

  return (
    <div className={`flex flex-col w-full mb-3 px-4 animate-entrance ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`relative max-w-[75%] px-[14px] py-[10px] bubble-radius text-[15px] leading-[1.4] shadow-bubble
          ${isUser 
            ? "bg-[var(--primary)] text-white bubble-tail-user" 
            : "bg-[var(--msg-bot)] text-[var(--text-primary)] bubble-tail-bot"
          }`}
      >
        {isTyping ? (
          <div className="flex gap-1.5 py-1.5 px-1 items-center justify-center">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  opacity: [0.4, 1, 0.4],
                  scale: [0.8, 1, 0.8]
                }}
                transition={{ 
                  duration: 0.8, 
                  repeat: Infinity, 
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
                className={`w-[6px] h-[6px] rounded-full ${isUser ? "bg-white" : "bg-[var(--text-secondary)]"}`}
              />
            ))}
          </div>
        ) : (
          <div className="relative z-10 break-words">{children}</div>
        )}
      </div>
      <span className={`text-[11px] mt-1 text-[var(--text-secondary)] font-normal px-1 ${isUser ? "text-right" : "text-left"}`}>
        {timeString}
      </span>
    </div>
  );
}
