"use client";

import React, { useState, useRef } from 'react';
import { Share2, Copy, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

export function BotShareButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const botCardRef = useRef(null);

  const showFeedback = (message, duration = 2000) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), duration);
  };

  const shareText = async () => {
    try {
      const text = `MUBXBot - Spring 2026\n\nMUBXBot is an intelligent chatbot that helps students find instructor information at the School of Computing.\n\nFeatures:\n• Search for instructors by name\n• Find office locations\n• Check office hours\n• Browse by department\n• Get contact information\n\nBuilt by Omar Mubaidin\nhttps://mubx.dev/links`;

      if (navigator.share) {
        await navigator.share({
          title: 'MUBXBot',
          text: text,
          url: typeof window !== 'undefined' ? window.location.href : '',
        });
        showFeedback('Shared successfully!');
      } else {
        await navigator.clipboard.writeText(text);
        showFeedback('Copied to clipboard!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        showFeedback('Failed to share');
      }
    }
    setIsOpen(false);
  };

  const copyToClipboard = async () => {
    try {
      const text = `MUBXBot - Spring 2026\n\nMUBXBot is an intelligent chatbot that helps students find instructor information.\n\nVisit: ${typeof window !== 'undefined' ? window.location.href : 'mubxbot.vercel.app'}`;
      await navigator.clipboard.writeText(text);
      showFeedback('Copied to clipboard!');
    } catch (error) {
      showFeedback('Failed to copy');
    }
    setIsOpen(false);
  };

  const captureScreenshot = async () => {
    setIsCapturing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;

      if (!botCardRef.current) {
        showFeedback('Card not found');
        setIsCapturing(false);
        return;
      }

      const canvas = await html2canvas(botCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      canvas.toBlob(async (blob) => {
        try {
          const file = new File([blob], 'mubxbot-info.png', { type: 'image/png' });

          if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'MUBXBot',
              text: 'Check out MUBXBot - an intelligent chatbot for finding instructor info!',
            });
            showFeedback('Screenshot shared!');
          } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'mubxbot-info.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showFeedback('Screenshot downloaded!');
          }
        } catch (error) {
          showFeedback('Failed to share screenshot');
        }
      });
    } catch (error) {
      showFeedback('Failed to capture screenshot');
    } finally {
      setIsCapturing(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Share Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group"
        title="Share MUBXBot"
      >
        <Share2 className="w-5 h-5 text-[#8E8E93] dark:text-[#98989D] group-hover:text-[#DC2626] transition-colors" strokeWidth={2} />
      </button>

      {/* Share Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-full right-0 mb-3 w-52 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50"
          >
            <div className="px-4 py-2.5 bg-gradient-to-r from-[#DC2626]/10 to-[#DC2626]/5 dark:from-[#DC2626]/20 dark:to-[#DC2626]/10 border-b border-gray-200 dark:border-gray-700">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E93] dark:text-[#98989D]">
                Share MUBXBot
              </div>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={shareText}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#DC2626]/10 dark:hover:bg-[#DC2626]/15 transition-all group"
              >
                <Share2 size={18} className="text-[#DC2626] dark:text-[#EF4444]" />
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-semibold text-gray-900 dark:text-white">
                    Share Bot
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    Tell others about it
                  </div>
                </div>
              </button>

              <button
                onClick={copyToClipboard}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#DC2626]/10 dark:hover:bg-[#DC2626]/15 transition-all group"
              >
                <Copy size={18} className="text-[#DC2626] dark:text-[#EF4444]" />
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-semibold text-gray-900 dark:text-white">
                    Copy Info
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    Bot description
                  </div>
                </div>
              </button>

              <button
                onClick={captureScreenshot}
                disabled={isCapturing}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#DC2626]/10 dark:hover:bg-[#DC2626]/15 transition-all group disabled:opacity-50"
              >
                <ImageIcon size={18} className="text-[#DC2626] dark:text-[#EF4444]" />
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-semibold text-gray-900 dark:text-white">
                    {isCapturing ? 'Capturing...' : 'Screenshot'}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    {isCapturing ? 'Processing...' : 'Create image'}
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 right-0 mt-2 flex items-center gap-2 px-4 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[13px] font-semibold shadow-lg"
          >
            <CheckCircle size={16} />
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden bot card ref for screenshot */}
      <div ref={botCardRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} className="w-112.5 bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
        <div className="p-8 bg-linear-to-br from-[#DC2626] to-[#B91C1C] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white mb-2 shadow-lg">
              <span className="text-3xl">🤖</span>
            </div>
            <div className="text-right">
              <p className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-1">Semester</p>
              <p className="text-white font-bold">Spring 2026</p>
            </div>
          </div>
          <div className="relative z-10 mt-6">
            <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">MUBXBot</h2>
            <p className="text-[#FCA5A5] text-lg leading-snug">
              Intelligent faculty directory &<br />office hours assistant.
            </p>
          </div>
        </div>
        <div className="p-8 bg-white">
          <h4 className="font-bold text-gray-900 uppercase tracking-widest text-xs mb-4 text-[#DC2626]">Key Capabilities</h4>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-[15px] text-gray-700 font-medium mb-8">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" /> Search by Name
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" /> Find Locations
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" /> Office Hours
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" /> Contact Info
            </div>
          </div>
          <div className="flex bg-gray-50 rounded-2xl p-4 items-center justify-between border border-gray-100">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Author</p>
              <p className="text-gray-900 font-bold">Omar Mubaidin</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Connect</p>
              <p className="text-[#DC2626] font-bold">mubx.dev/links</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

BotShareButton.propTypes = {};
