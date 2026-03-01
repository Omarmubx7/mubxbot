"use client";

import React from "react";
import ChatWindow from "../components/ChatWindow.jsx";
import { useDoctors } from "../components/Providers.jsx";

export default function Page() {
  const context = useDoctors();
  
  // Handle initialization/loading state
  if (!context || context.loading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <p className="text-gray-400 font-medium animate-pulse tracking-tight">Initializing MBOT...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="h-[100dvh] w-full flex justify-center items-center overflow-hidden bg-[#F2F2F7] dark:bg-[#000000] relative">
      {/* Background Mesh (Force visible for debugging) */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ 
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(0, 122, 255, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(88, 86, 214, 0.15) 0px, transparent 50%)' 
      }} />
      
      {/* Main Container */}
      <div className="glass-surface w-full max-w-[960px] h-[100dvh] md:h-[90vh] md:rounded-[32px] md:shadow-2xl relative z-10 overflow-hidden flex flex-col">
        <ChatWindow />
      </div>
    </main>
  );
}
