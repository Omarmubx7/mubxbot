"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatWindow from "../components/ChatWindow.jsx";
import { useDoctors } from "../components/Providers.jsx";

export default function Page() {
  const { loading } = useDoctors();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] text-[var(--text-secondary)]">
      Loading...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex justify-center transition-colors duration-300">
      <AnimatePresence mode="wait">
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col w-full max-w-[430px] md:max-w-[720px] lg:max-w-[960px] min-h-screen bg-[var(--bg-page)] relative"
        >
          <ChatWindow />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
