"use client";

import { motion } from "framer-motion";
import { GraduationCap, Mail, Clock, MapPin } from 'lucide-react';

export function EmptyState({ onAsk }) {
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

  const examples = [
    { icon: Mail, title: 'Find an email', query: 'what is Razan email' },
    { icon: Clock, title: 'Check office hours', query: 'when is Razan free' },
    { icon: MapPin, title: 'Find an office', query: 'where is Razan office' }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center justify-center h-full px-4 text-center max-w-md mx-auto"
    >
      <motion.div
        variants={itemVariants}
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-red-600 shadow-xl shadow-red-500/20 flex items-center justify-center mb-5 relative"
      >
        <GraduationCap className="w-10 h-10 text-white" strokeWidth={2.5} />
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-2 mb-4">
        <h2 className="text-[24px] text-[#1C1C1E] dark:text-white tracking-tight">
          MUBX<span className="text-red-600 dark:text-red-500">Bot</span>
        </h2>
        <p className="text-[15px] text-[#8E8E93] dark:text-[#98989D] max-w-[300px] mx-auto leading-relaxed">
          Find HTU instructors — emails, office hours & locations.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-center gap-2 mb-6 text-[11px] font-bold tracking-wide">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-500" /> NEW · updated
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> OLD · outdated
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DC2626]/10 text-[#B91C1C] dark:text-[#F87171]">
          <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> MISSING · not listed
        </span>
      </motion.div>

      <motion.div variants={itemVariants} className="w-full space-y-3">
        <h3 className="text-[12px] font-bold uppercase tracking-widest text-[#8E8E93] dark:text-[#98989D] text-left ml-2 mb-2">
          Try one of these
        </h3>
        <div className="grid gap-2.5">
          {examples.map((example) => (
            <button
              key={example.title}
              type="button"
              onClick={() => onAsk?.(example.query)}
              className="flex items-center gap-4 p-4 glass-surface rounded-2xl border border-black/5 dark:border-white/10 text-left transition-all hover:bg-white/50 dark:hover:bg-white/5 active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <example.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-bold text-[#1C1C1E] dark:text-white">{example.title}</div>
                <div className="text-[13px] text-[#8E8E93] dark:text-[#98989D] truncate">Try &quot;{example.query}&quot;</div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
