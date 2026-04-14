"use client";

import React, { useState, useRef } from 'react';
import { Share2, Copy, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

export function InstructorShareButton({ faculty, email, department, office, officeHours = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const cardRef = useRef(null);

  const showFeedback = (message, duration = 2000) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), duration);
  };

  const shareText = async () => {
    try {
      const hoursText = officeHours.length > 0 
        ? officeHours.map(h => `${h.day}: ${h.start} - ${h.end}`).join('\n')
        : 'No office hours available';

      const text = `${faculty} - ${department}\nOffice: ${office || 'TBD'}\nEmail: ${email}\n\nOffice Hours:\n${hoursText}`;

      if (navigator.share) {
        await navigator.share({
          title: `${faculty} - MUBXBot`,
          text: text,
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
      const hoursText = officeHours.length > 0 
        ? officeHours.map(h => `${h.day}: ${h.start} - ${h.end}`).join('\n')
        : 'No office hours available';

      const text = `${faculty} - ${department}\nOffice: ${office || 'TBD'}\nEmail: ${email}\n\nOffice Hours:\n${hoursText}`;
      
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

      if (!cardRef.current) {
        showFeedback('Card not found');
        setIsCapturing(false);
        return;
      }

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      canvas.toBlob(async (blob) => {
        try {
          const file = new File([blob], `${faculty}-info.png`, { type: 'image/png' });

          if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `${faculty} - MUBXBot`,
              text: `Check out ${faculty}'s info on MUBXBot!`,
            });
            showFeedback('Screenshot shared!');
          } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${faculty}-info.png`;
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
        className="w-full sm:w-auto flex items-center justify-center text-[#DC2626] dark:text-[#EF4444] hover:bg-[#DC2626]/5 dark:hover:bg-[#DC2626]/10 p-2.5 sm:p-2 rounded-lg border border-[#DC2626]/30 dark:border-[#DC2626]/40 transition-colors min-h-11 sm:min-h-0 aspect-square"
        title="Share instructor info"
      >
        <Share2 className="w-4 h-4" />
      </button>

      {/* Share Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-full right-0 mb-3 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50"
          >
            <div className="p-2 space-y-1">
              <button
                onClick={shareText}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-[#DC2626]/10 dark:hover:bg-[#DC2626]/15 transition-all group text-sm"
              >
                <Share2 size={16} className="text-[#DC2626] dark:text-[#EF4444]" />
                <span className="font-medium text-gray-900 dark:text-white">Share Text</span>
              </button>

              <button
                onClick={copyToClipboard}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-[#DC2626]/10 dark:hover:bg-[#DC2626]/15 transition-all group text-sm"
              >
                <Copy size={16} className="text-[#DC2626] dark:text-[#EF4444]" />
                <span className="font-medium text-gray-900 dark:text-white">Copy Info</span>
              </button>

              <button
                onClick={captureScreenshot}
                disabled={isCapturing}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-[#DC2626]/10 dark:hover:bg-[#DC2626]/15 transition-all group text-sm disabled:opacity-50"
              >
                <ImageIcon size={16} className="text-[#DC2626] dark:text-[#EF4444]" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {isCapturing ? 'Capturing...' : 'Screenshot'}
                </span>
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
            className="absolute bottom-20 right-0 mt-2 flex items-center gap-2 px-4 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-semibold shadow-lg"
          >
            <CheckCircle size={14} />
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden card ref for screenshot */}
      <div ref={cardRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} className="w-112.5 bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
        <div className="p-8 bg-linear-to-br from-[#DC2626] to-[#B91C1C] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10" />
          <div className="relative z-10 flex flex-col justify-end min-h-35">
            <h2 className="text-3xl font-extrabold text-white mb-1.5 tracking-tight drop-shadow-md">{faculty}</h2>
            <p className="text-white/90 text-lg font-medium tracking-wide">
              {department || 'Faculty Member'}
            </p>
          </div>
        </div>

        <div className="p-8 bg-white space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {office && (
              <div className="flex bg-gray-50 rounded-2xl p-4 flex-col border border-gray-100 shadow-sm">
                <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider mb-1">Office Location</span>
                <span className="text-gray-900 font-semibold">{office}</span>
              </div>
            )}
            {email && (
              <div className="flex bg-gray-50 rounded-2xl p-4 flex-col border border-gray-100 shadow-sm">
                <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider mb-1">Email Contact</span>
                <span className="text-gray-900 font-semibold break-all leading-tight">{email}</span>
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-sm">
            <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider mb-3 block">Office Hours</span>
            <div className="space-y-2">
              {officeHours && officeHours.length > 0 ? (
                officeHours.map((h, i) => (
                  <div key={i} className="flex justify-between items-center text-[15px]">
                    <span className="text-gray-600 font-bold">{h.day}</span>
                    <span className="text-gray-900 font-medium">
                      {h.start} - {h.end}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic text-[15px]">No office hours specified</div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 tracking-wider">MUBXBOT DIRECTORY</span>
            <span className="text-xs font-bold text-[#DC2626] tracking-wider">SPRING 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}

InstructorShareButton.propTypes = {
  faculty: PropTypes.string.isRequired,
  email: PropTypes.string,
  department: PropTypes.string,
  office: PropTypes.string,
  officeHours: PropTypes.arrayOf(PropTypes.shape({
    day: PropTypes.string,
    start: PropTypes.string,
    end: PropTypes.string,
  })),
};
