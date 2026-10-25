"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function VoiceInput({ onResult }) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [error, setError] = useState(null);
  const [interimText, setInterimText] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
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
        setShowPermissionModal(false);
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
          setShowPermissionModal(true);
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

  const requestMicrophonePermission = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Microphone access requires HTTPS or localhost. Use text input instead.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setError(null);
      setShowPermissionModal(false);
      return true;
    } catch (permErr) {
      console.error('Microphone permission error', permErr);
      const name = permErr?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Allow mic access and try again.');
        setShowPermissionModal(true);
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No microphone found. Use text input instead.');
      } else if (name === 'NotSupportedError') {
        setError('Microphone access not supported. Use text input instead.');
      } else {
        setError('Microphone permission denied. Use text input instead.');
        setShowPermissionModal(true);
      }
      return false;
    }
  }, []);

  const toggleListen = useCallback(async () => {
    if (!recognition) {
      setError('Voice input not supported in this browser.');
      setShowPermissionModal(true);
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
      // Try to get permission first
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        setShowPermissionModal(true);
        return;
      }
      try {
        recognition.start();
      } catch (startErr) {
        console.error("Could not start recognition", startErr);
        setError('Could not start voice input. Click the mic again or check permissions.');
        setShowPermissionModal(true);
      }
    } catch (err) {
      console.error("Could not start voice input", err);
      setError('Voice input unavailable. Use text input instead.');
      setShowPermissionModal(true);
    }
  }, [recognition, isListening, requestMicrophonePermission]);

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
            : error && (error.includes('denied') || error.includes('permission'))
              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-[var(--ink-soft)] hover:bg-[var(--surface-strong)] hover:text-[var(--ink)]'
        }`}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
        title={isListening ? (interimText || "Listening...") : error && error.includes('denied') ? "Microphone permission denied - click for help" : "Voice input"}
      >
        <Mic className={`h-[18px] w-[18px] ${isListening ? 'animate-pulse' : ''}`} strokeWidth={1.9} />
      </button>
      {error && !showPermissionModal && (
        <div className="absolute -top-9 right-0 max-w-[200px] whitespace-normal rounded-lg bg-[var(--ink)] px-2 py-1 text-[10px] text-[var(--paper)] shadow-lg z-50">
          {error}
        </div>
      )}

      <AnimatePresence>
        {showPermissionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowPermissionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-[var(--paper)] rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowPermissionModal(false)}
                className="absolute top-4 right-4 text-[var(--ink-soft)] hover:text-[var(--ink)]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--ink)]">Microphone Access Denied</h3>
              </div>
              <div className="space-y-3 text-sm text-[var(--ink-soft)] mb-6">
                <p>To use voice input, you need to allow microphone access for this site.</p>
                <div className="space-y-2">
                  <p className="font-medium text-[var(--ink)]">How to fix:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs">
                    <li>Look for the lock/info icon (🔒) in the address bar</li>
                    <li>Click it → Site settings / Permissions → Microphone</li>
                    <li>Change to "Allow" (if it says "Block")</li>
                    <li>Close this dialog and click the mic again</li>
                    <li>If still blocked, refresh the page after allowing</li>
                  </ol>
                </div>
                <p className="text-xs">On mobile: Check browser permissions in your device Settings → Apps → [Browser] → Microphone → Allow.</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Note: Some browsers block mic access on HTTP. Use localhost or HTTPS.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="flex-1 px-4 py-2 text-sm rounded-lg border border-[var(--rule)] text-[var(--ink)] hover:bg-[var(--surface)]"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setError(null);
                    const granted = await requestMicrophonePermission();
                    if (granted && recognition) {
                      try {
                        recognition.start();
                        setShowPermissionModal(false);
                      } catch (e) {
                        console.error(e);
                        setError('Could not start voice input');
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90"
                >
                  Request Permission
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
