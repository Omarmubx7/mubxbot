"use client";

import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="mb-5 flex justify-start px-4 sm:px-6"
    >
      <div className="flex h-7 items-center gap-2 text-[13px] text-[var(--muted)]">
        <span>Thinking</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]"
              animate={{ y: [0, -3, 0], opacity: [0.35, 1, 0.35] }}
              transition={{
                duration: 0.7,
                repeat: Infinity,
                delay: i * 0.14,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
