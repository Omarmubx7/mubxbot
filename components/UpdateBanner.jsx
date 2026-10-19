"use client";

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

// Announcement config — bump `id` whenever you publish new data so the
// banner shows again for everyone (dismissal is remembered per device).
const ANNOUNCEMENT = {
  id: 'data-2026-fall-refresh',
  message: 'New instructor data is live — office hours and emails were just refreshed.',
};

const STORAGE_KEY = 'mubx_update_dismissed';

function isDismissed(id) {
  try {
    return globalThis.localStorage.getItem(STORAGE_KEY) === id;
  } catch {
    return false;
  }
}

export function UpdateBanner({ announcement = ANNOUNCEMENT }) {
  // Start hidden to avoid flashing for users who already dismissed it (SSR).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isDismissed(announcement.id)) setVisible(true);
  }, [announcement.id]);

  const dismiss = () => {
    setVisible(false);
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, announcement.id);
    } catch {
      // Storage unavailable — banner will simply show again next visit.
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden bg-gradient-to-r from-red-500 to-red-600 text-white"
        >
          <div className="flex items-center gap-2.5 px-3 sm:px-4 py-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <p className="flex-1 min-w-0 text-[12px] sm:text-[13px] font-medium leading-snug">
              {announcement.message}
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Dismiss update banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

UpdateBanner.propTypes = {
  announcement: PropTypes.shape({
    id: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
  }),
};
