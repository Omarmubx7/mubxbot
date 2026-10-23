"use client";

import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function ChatMessage({ type, content, timestamp, animationDelay = 0 }) {
  const isUser = type === 'user';
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof globalThis?.matchMedia !== 'function') return;

    const media = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(media.matches);

    updatePreference();
    media.addEventListener('change', updatePreference);

    return () => {
      media.removeEventListener('change', updatePreference);
    };
  }, []);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reducedMotion ? 0 : 0.32,
        delay: reducedMotion ? 0 : animationDelay,
        ease: [0.22, 1, 0.36, 1]
      }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 sm:px-6 mb-5`}
    >
      <div className={`flex flex-col ${isUser ? 'max-w-[86%] items-end sm:max-w-[78%]' : 'w-full items-start'}`}>
        {isUser ? (
          <div className="rounded-[22px] bg-[var(--accent)] px-4 py-2.5 text-white">
            <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.55]">
              {content}
            </div>
          </div>
        ) : (
          <div className="w-full whitespace-pre-wrap break-words text-[15px] leading-7 text-[var(--ink)]">
            {content}
          </div>
        )}
        {timestamp && (
          <span className={`mt-1.5 px-1 text-[11px] tabular-nums text-[var(--muted)] ${isUser ? 'text-right' : 'text-left'}`}>
            {timestamp}
          </span>
        )}
      </div>
    </motion.div>
  );
}

ChatMessage.propTypes = {
  type: PropTypes.string.isRequired,
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  timestamp: PropTypes.string,
  variant: PropTypes.string,
  animationDelay: PropTypes.number,
};
