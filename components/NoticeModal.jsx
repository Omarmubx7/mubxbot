"use client";

import React from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, X, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export function NoticeModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 p-6 shadow-2xl z-10 overflow-hidden text-[#1C1C1E] dark:text-white"
          >
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-600" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors"
              aria-label="Close notice"
            >
              <X size={18} />
            </button>

            {/* Content Header */}
            <div className="flex items-center gap-3.5 mb-4 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-inner">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Semester Data Notice
                </span>
                <h2 className="text-[18px] font-bold leading-tight">
                  Summer &apos;26 Data Active
                </h2>
              </div>
            </div>

            {/* Content Body */}
            <div className="space-y-3.5 text-[14px] leading-relaxed text-gray-700 dark:text-gray-300 mb-6">
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-[13px]">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-amber-800 dark:text-amber-300 mb-0.5">Fall Data Not Uploaded Yet</strong>
                  Fall semester data is not available yet. The current data displayed across MUBXBot is for <strong>Summer &apos;26</strong>.
                </div>
              </div>

              {/* Status Comparison */}
              <div className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/10 p-3.5 space-y-2.5 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-gray-600 dark:text-gray-400">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    Current Active Data
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                    Summer &apos;26
                  </span>
                </div>
                <div className="h-px bg-black/5 dark:bg-white/5" />
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-gray-600 dark:text-gray-400">
                    <Clock size={15} className="text-amber-500" />
                    Fall Semester Data
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                    Not Here Yet
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-bold text-[14px] transition-all shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

NoticeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
