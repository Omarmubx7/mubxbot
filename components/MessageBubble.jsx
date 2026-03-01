"use client";

import React from "react";
import { motion } from "framer-motion";

export default function MessageBubble({ sender, children, isTyping = false, timestamp }) {
  const isUser = sender === "user";
  
  // FIX: Bulletproof date handling
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
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} px-4 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <div
          className={`relative px-[14px] py-[10px] text-[15px] shadow-sm ${
            isUser
              ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white rounded-[18px] rounded-tr-[4px]'
              : 'bg-[#E9ECEF] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white rounded-[18px] rounded-tl-[4px]'
          }`}
        >
          {isTyping ? (
            <div className="flex gap-1 items-center h-5">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${delay}ms` }}></span>
              ))}
            </div>
          ) : (
            <div className="leading-[1.4] break-words">{children}</div>
          )}
        </div>
        {timeString && (
          <span className="text-[11px] text-[#8E8E93] dark:text-[#98989D] mt-1 px-1">
            {timeString}
          </span>
        )}
      </div>
    </div>
  );
}
