"use client";

import { motion } from "framer-motion";
import { GraduationCap, Sparkles, MessageSquare, Clock } from 'lucide-react';

export function EmptyState() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center justify-center h-full px-4 text-center max-w-md mx-auto"
    >
      <motion.div 
        variants={itemVariants}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-red-600 shadow-xl shadow-red-500/20 flex items-center justify-center mb-6 relative"
      >
        <div className="absolute inset-0 bg-white/20 rounded-3xl blur-[2px] opacity-0 hover:opacity-100 transition-opacity" />
        <GraduationCap className="w-10 h-10 text-white relative z-10" strokeWidth={2.5} />
      </motion.div>
      
      <motion.div variants={itemVariants} className="space-y-2 mb-8">
        <h2 className="text-[24px] text-[#1C1C1E] dark:text-white tracking-tight">
          MUBX<span className="text-red-600 dark:text-red-500">Bot</span> Directory
        </h2>
        <p className="text-[15px] text-[#8E8E93] dark:text-[#98989D] max-w-[280px] mx-auto leading-relaxed">
          Your intelligent assistant for HTU School of Computing and Informatics.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="w-full space-y-3">
        <h3 className="text-[12px] font-bold uppercase tracking-widest text-[#8E8E93] dark:text-[#98989D] text-left ml-2 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Quick Tips
        </h3>
        
        <div className="grid gap-3">
          <div className="flex items-center gap-4 p-4 glass-surface rounded-2xl border border-black/5 dark:border-white/10 text-left transition-all hover:bg-white/50 dark:hover:bg-white/5">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[14px] font-bold text-[#1C1C1E] dark:text-white">Contact Info</div>
              <div className="text-[13px] text-[#8E8E93] dark:text-[#98989D]">Ask "what is [name] email"</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 glass-surface rounded-2xl border border-black/5 dark:border-white/10 text-left transition-all hover:bg-white/50 dark:hover:bg-white/5">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[14px] font-bold text-[#1C1C1E] dark:text-white">Office Hours</div>
              <div className="text-[13px] text-[#8E8E93] dark:text-[#98989D]">Ask "when is [name]"</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
