"use client";

import React from "react";
import { motion } from "framer-motion";

export default function MessageBubble({ sender, children, isTyping = false }) {
  const isUser = sender === "user";

  return (
    <div className={`flex w-full mb-4 px-4 animate-entrance ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[75%] px-[14px] py-[10px] bubble-radius text-[15px] leading-[1.4] shadow-bubble
          ${isUser 
            ? "bg-[var(--primary)] text-white bubble-tail-user" 
            : "bg-[var(--msg-bot)] text-[var(--text-primary)] bubble-tail-bot"
          }`}
      >
        {isTyping ? (
          <div className="flex gap-1 py-1 px-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                className="w-[6px] h-[6px] bg-[var(--text-secondary)] rounded-full"
              />
            ))}
          </div>
        ) : (
          <div className="relative z-10">{children}</div>
        )}
      </div>
    </div>
  );
}
