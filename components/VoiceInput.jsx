"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function VoiceInput({ onResult }) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      
      rec.continuous = false;
      rec.interimResults = false;
      // You can set default language here, e.g., 'en-US' or 'ar-SA' if desired
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (onResult) {
          onResult(transcript);
        }
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error !== 'no-speech') {
          setError(event.error);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [onResult]);

  const toggleListen = useCallback(() => {
    if (!recognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error("Could not start recognition", err);
      }
    }
  }, [recognition, isListening]);

  if (!recognition && typeof window !== 'undefined') {
    // Hide if not supported
    return null;
  }

  return (
    <div className="relative flex items-center justify-center">
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-red-500/30 dark:bg-red-400/30 pointer-events-none"
          />
        )}
      </AnimatePresence>
      <button
        onClick={toggleListen}
        type="button"
        className={`w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 z-10 ${
          isListening 
            ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' 
            : 'bg-[#E9ECEF] text-[#8E8E93] hover:bg-[#DEDFE1] hover:text-[#1C1C1E] dark:bg-[#2C2C2E] dark:text-[#98989D] dark:hover:bg-[#3C3C3E] dark:hover:text-white'
        }`}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
        title={isListening ? "Listening..." : "Voice input"}
      >
        {isListening ? (
          <Mic className="w-5 h-5 animate-pulse" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
