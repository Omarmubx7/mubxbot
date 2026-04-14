"use client";

import React, { useState } from 'react';
import { MessageSquare, Send, X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    try {
      // Send feedback to your backend
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: feedback.trim(),
          email: email.trim() || 'anonymous',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFeedback('');
        setEmail('');
        setTimeout(() => {
          setIsOpen(false);
          setSubmitStatus(null);
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Feedback Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 sm:p-3 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        title="Send feedback"
      >
        <MessageSquare size={20} strokeWidth={2} />
      </motion.button>

      {/* Feedback Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <MessageSquare size={20} className="text-orange-600 dark:text-orange-500" />
                  </div>
                  <h2 className="text-[17px] font-bold text-[#1C1C1E] dark:text-white">
                    Send Feedback
                  </h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X size={18} className="text-[#8E8E93] dark:text-[#98989D]" />
                </button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {submitStatus === 'success' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-8 space-y-3"
                  >
                    <CheckCircle className="w-12 h-12 text-green-500" />
                    <p className="text-[15px] font-semibold text-[#1C1C1E] dark:text-white text-center">
                      Thank you for your feedback!
                    </p>
                    <p className="text-[13px] text-[#8E8E93] dark:text-[#98989D] text-center">
                      We appreciate your input to improve MUBXBot.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {/* Email Field (Optional) */}
                    <div>
                      <label className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white block mb-2">
                        Email (optional)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[#1C1C1E] dark:text-white placeholder-[#8E8E93] dark:placeholder-[#98989D] outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
                      />
                      <p className="text-[11px] text-[#8E8E93] dark:text-[#98989D] mt-1.5">
                        We'll use this to follow up if needed
                      </p>
                    </div>

                    {/* Feedback Textarea */}
                    <div>
                      <label className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white block mb-2">
                        Your feedback *
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Tell us what you think... Bug report? Feature suggestion? Anything else?"
                        maxLength={1000}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[#1C1C1E] dark:text-white placeholder-[#8E8E93] dark:placeholder-[#98989D] outline-none focus:ring-2 focus:ring-orange-500/30 transition-all resize-none"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-[11px] text-[#8E8E93] dark:text-[#98989D]">
                          Be specific and helpful
                        </p>
                        <p className="text-[11px] text-[#8E8E93] dark:text-[#98989D]">
                          {feedback.length}/1000
                        </p>
                      </div>
                    </div>

                    {/* Error Message */}
                    {submitStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                      >
                        <p className="text-[13px] text-red-600 dark:text-red-500 font-medium">
                          Failed to send feedback. Please try again.
                        </p>
                      </motion.div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={!feedback.trim() || isSubmitting}
                      className={`w-full py-3 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 transition-all ${
                        feedback.trim() && !isSubmitting
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Send Feedback
                        </>
                      )}
                    </button>
                  </>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

FeedbackButton.propTypes = {};
