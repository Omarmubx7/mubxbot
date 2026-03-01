"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatWindow from "../components/ChatWindow.jsx";
import { useDoctors } from "./layout.js";

export default function Page() {
  const { loading } = useDoctors();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] text-[var(--text-secondary)]">
      Loading...
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col md:items-center p-0 md:bg-[#F8F9FA] dark:md:bg-[#000000] transition-colors duration-300 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex-1 flex flex-col w-full md:max-w-[480px] md:h-[90vh] md:max-h-[850px] md:mt-[5vh] md:mb-[5vh] bg-[var(--bg-page)] md:rounded-[16px] md:shadow-card overflow-hidden relative"
        >
          <ChatWindow />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
