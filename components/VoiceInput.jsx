"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function VoiceInput({ onResult }) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [error, setError] = useState(null);
  const [interimText, setInterimText] = useState('');
  const restartRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = navigator.language && navigator.language.startsWith('ar') ? 'ar-JO' : 'en-US';
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        setError(null);
        setInterimText('');
        restartRef.current = false;
      };

      rec.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setInterimText(interimTranscript.trim());

        if (finalTranscript.trim()) {
          setInterimText('');
          if (onResult) {
            onResult(finalTranscript.trim());
          }
        }
      };

      rec.onerror = (event) => {
        if (event.error === 'no-speech') {
          setError(null);
        } else if (event.error === 'not-allowed') {
          setError('Microphone permission denied');
        } else if (event.error === 'audio-capture') {
          setError('No microphone found');
        } else if (event.error === 'network') {
          setError('Network error while using voice');
        } else {
          setError('Voice recognition failed');
        }
        setIsListening(false);
        setInterimText('');
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      setRecognition(rec);
    }
  }, [onResult]);

  const toggleListen = useCallback(async () => {
    if (!recognition) {
      setError('Voice input not supported in this browser.');
      return;
    }

    if (isListening) {
      try {
        recognition.stop();
      } catch (err) {
        console.error("Could not stop recognition", err);
      }
      return;
    }

    try {
      setError(null);
      setInterimText('');
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (permErr) {
          console.error('Microphone permission error', permErr);
          const name = permErr?.name || '';
          if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            setError('Microphone permission denied. Allow mic access and try again.');
          } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            setError('No microphone found. Use text input instead.');
          } else if (name === 'NotSupportedError') {
            setError('Microphone access not supported. Use text input instead.');
          } else {
            setError('Microphone permission denied. Use text input instead.');
          }
          return;
        }
      } else {
        setError('Microphone access requires HTTPS or localhost. Use text input instead.');
        return;
      }
      try {
        recognition.start();
      } catch (startErr) {
        console.error("Could not start recognition", startErr);
        setError('Could not start voice input. Use text input instead.');
      }
    } catch (err) {
      console.error("Could not start voice input", err);
      setError('Voice input unavailable. Use text input instead.');
    }
  }, [recognition, isListening]);

  if (!recognition && typeof window !== 'undefined') {
    return null;
  }

  return (
    <div className="relative flex items-center justify-center">
      <AnimatePresence>
        {(isListening || interimText) && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-[var(--accent)]/25 pointer-events-none"
          />
        )}
      </AnimatePresence>
      <button
        onClick={toggleListen}
        type="button"
        className={`z-10 flex h-9 w-9 items-center justify-center rounded-full outline-none transition-colors duration-200 ${
          isListening
            ? 'bg-[var(--accent)] text-white'
            : 'text-[var(--ink-soft)] hover:bg-[var(--surface-strong)] hover:text-[var(--ink)]'
        }`}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
        title={isListening ? (interimText || "Listening...") : "Voice input"}
      >
        <Mic className={`h-[18px] w-[18px] ${isListening ? 'animate-pulse' : ''}`} strokeWidth={1.9} />
      </button>
      {error && (
        <div className="absolute -top-8 right-0 whitespace-nowrap rounded-full bg-[var(--ink)] px-2 py-1 text-[10px] text-[var(--paper)]">
          {error}
        </div>
      )}
    </div>
  );
}
