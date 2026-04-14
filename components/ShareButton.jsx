"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Share2, Copy, Image, MessageCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { useScreenshotListener, useShareListener } from '../lib/useScreenshotListener';

export function ShareButton({ messages = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const chatRef = useRef(null);

  const showFeedback = (message, duration = 2000) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), duration);
  };

  // Handle screenshot keyboard shortcut
  const handleScreenshotShortcut = () => {
    captureScreenshot();
  };

  // Handle share keyboard shortcut
  const handleShareShortcut = () => {
    setIsOpen(prev => !prev);
  };

  // Enable keyboard listeners
  useScreenshotListener(handleScreenshotShortcut, messages.length > 1);
  useShareListener(handleShareShortcut, messages.length > 1);

  const shareText = async () => {
    try {
      const conversationText = messages
        .map(m => `${m.sender === 'user' ? 'You' : 'MUBXBot'}: ${m.content}`)
        .join('\n\n');

      const shareData = {
        title: 'MUBXBot Conversation',
        text: conversationText,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        showFeedback('Shared successfully!');
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(conversationText);
        showFeedback('Conversation copied to clipboard!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        showFeedback('Failed to share');
      }
    }
    setIsOpen(false);
  };

  const copyToClipboard = async () => {
    try {
      const conversationText = messages
        .map(m => `${m.sender === 'user' ? 'You' : 'MUBXBot'}: ${m.content}`)
        .join('\n\n');

      await navigator.clipboard.writeText(conversationText);
      showFeedback('Copied to clipboard!');
    } catch (error) {
      showFeedback('Failed to copy');
    }
    setIsOpen(false);
  };

  const captureScreenshot = async () => {
    setIsCapturing(true);
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // Find the chat container
      const chatContainer = chatRef.current || document.querySelector('[data-chat-container]');
      
      if (!chatContainer) {
        showFeedback('Chat container not found');
        setIsCapturing(false);
        return;
      }

      // Capture the screenshot
      const canvas = await html2canvas(chatContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Convert to blob and share
      canvas.toBlob(async (blob) => {
        try {
          const file = new File([blob], 'mubxbot-screenshot.png', { type: 'image/png' });

          if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'MUBXBot Conversation',
              text: 'Check out my conversation with MUBXBot!',
            });
            showFeedback('Screenshot shared successfully!');
          } else {
            // Fallback: download the image
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'mubxbot-screenshot.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showFeedback('Screenshot downloaded!');
          }
        } catch (error) {
          console.error('Screenshot share error:', error);
          showFeedback('Failed to share screenshot');
        }
      });
    } catch (error) {
      console.error('Screenshot capture error:', error);
      showFeedback('Failed to capture screenshot');
    } finally {
      setIsCapturing(false);
      setIsOpen(false);
    }
  };

  const hasMessages = messages && messages.length > 1; // More than just the welcome message

  return (
    <div className="relative">
      {/* Main Share Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={!hasMessages}
        className={`p-2.5 sm:p-3 rounded-full transition-all duration-200 ${
          hasMessages
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
        title="Share conversation"
      >
        <Share2 size={20} strokeWidth={2} />
      </motion.button>

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
            <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E93] dark:text-[#98989D]">
                Share Options
              </div>
              <div className="text-[10px] text-[#8E8E93] dark:text-[#98989D] mt-1">
                💡 Tip: Cmd+Shift+H to open
              </div>
            </div>
            <div className="p-2 space-y-1">
      {/* Share Text Option */}
              <button
                onClick={shareText}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-800 transition-all group"
              >
                <MessageCircle size={18} className="text-blue-500 group-hover:text-blue-600" />
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white">
                    Share Text
                  </div>
                  <div className="text-[11px] text-[#8E8E93] dark:text-[#98989D]">
                    Conversation & data
                  </div>
                </div>
              </button>

              {/* Copy to Clipboard */}
              <button
                onClick={copyToClipboard}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-green-50 dark:hover:bg-gray-800 transition-all group"
              >
                <Copy size={18} className="text-green-500 group-hover:text-green-600" />
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white">
                    Copy Text
                  </div>
                  <div className="text-[11px] text-[#8E8E93] dark:text-[#98989D]">
                    To clipboard
                  </div>
                </div>
              </button>

              {/* Capture Screenshot */}
              <button
                onClick={captureScreenshot}
                disabled={isCapturing}
                title="Keyboard shortcut: Ctrl+Shift+S (or Cmd+Shift+S on Mac)"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-purple-50 dark:hover:bg-gray-800 transition-all group disabled:opacity-50"
              >
                <Image size={18} className="text-purple-500 group-hover:text-purple-600" />
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white">
                    {isCapturing ? 'Capturing...' : 'Screenshot'}
                  </div>
                  <div className="text-[11px] text-[#8E8E93] dark:text-[#98989D]">
                    {isCapturing ? 'Processing...' : 'Share image'}
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
    </div>
  );
}

ShareButton.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      sender: PropTypes.oneOf(['user', 'system', 'assistant']),
      content: PropTypes.string,
      timestamp: PropTypes.instanceOf(Date),
    })
  ),
};
