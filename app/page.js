"use client";

import React from "react";
import ChatWindow from "../components/ChatWindow.jsx";
import { useDoctors } from "../components/Providers.jsx";

export default function Page() {
  const { loading } = useDoctors() || { loading: true };

  if (loading) return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-white dark:bg-black transition-colors duration-500">
      <div className="animate-pulse text-[#8E8E93] font-medium tracking-tight">Initializing MBOT...</div>
    </div>
  );

  return (
    <main className="h-[100dvh] w-full flex justify-center items-center overflow-hidden">
      {/* 
          Glass Container: 
          - On mobile: Fills screen (100dvh)
          - On PC: max-w-960px and fits within screen
      */}
      <div className="glass-surface w-full max-w-[960px] h-[100dvh] md:h-[90vh] md:rounded-[32px] md:shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative overflow-hidden">
        <ChatWindow />
      </div>
    </main>
  );
}
