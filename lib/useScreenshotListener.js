import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to listen for screenshot keyboard shortcuts (Ctrl+Shift+S on Windows/Linux, Cmd+Shift+S on Mac)
 * Triggers the callback when the shortcut is pressed
 * @param {Function} onScreenshotShortcut - Callback function when screenshot shortcut is pressed
 * @param {boolean} enabled - Whether the listener is enabled
 */
export function useScreenshotListener(onScreenshotShortcut, enabled = true) {
  const callbackRef = useRef(onScreenshotShortcut);

  useEffect(() => {
    callbackRef.current = onScreenshotShortcut;
  }, [onScreenshotShortcut]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ctrl+Shift+S (Windows/Linux) or Cmd+Shift+S (Mac)
      const isScreenshotShortcut = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S';
      
      if (isScreenshotShortcut) {
        e.preventDefault();
        if (callbackRef.current) {
          callbackRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}

/**
 * Custom hook to handle keyboard shortcut for sharing (Ctrl+Shift+H on Windows/Linux, Cmd+Shift+H on Mac)
 * @param {Function} onShareShortcut - Callback function when share shortcut is pressed
 * @param {boolean} enabled - Whether the listener is enabled
 */
export function useShareListener(onShareShortcut, enabled = true) {
  const callbackRef = useRef(onShareShortcut);

  useEffect(() => {
    callbackRef.current = onShareShortcut;
  }, [onShareShortcut]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ctrl+Shift+H (Windows/Linux) or Cmd+Shift+H (Mac) for share
      const isShareShortcut = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H';
      
      if (isShareShortcut) {
        e.preventDefault();
        if (callbackRef.current) {
          callbackRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
