"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Building2, CalendarDays, Clock3, Mail, MapPin, Users } from 'lucide-react';
import PropTypes from 'prop-types';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
};

const EXAMPLES = [
  {
    title: "Who's free now?",
    description: 'Check current office hours',
    query: "who's free now?",
    icon: Users
  },
  {
    title: 'Which week are we in?',
    description: 'See term progress and what’s next',
    query: 'which week are we in?',
    icon: CalendarDays
  },
  {
    title: 'Check office hours',
    description: 'See when someone is available',
    query: 'when is Razan free',
    icon: Clock3
  },
  {
    title: 'Find an email',
    description: 'Look up an instructor’s contact',
    query: 'what is Razan email',
    icon: Mail
  },
  {
    title: 'Find an office',
    description: 'Get a room or building location',
    query: 'where is Razan office',
    icon: MapPin
  },
  {
    title: 'Browse departments',
    description: 'Explore the School of Computing',
    query: 'list professors in cs',
    icon: Building2
  }
];

export function EmptyState({ onAsk }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto flex h-full w-full max-w-[720px] flex-col justify-center px-4 py-8 sm:px-6 sm:py-12"
    >
      <motion.div variants={itemVariants} className="flex flex-col items-center text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white">
          <span className="text-[17px] font-semibold leading-none">M</span>
        </div>

        <h1 className="mt-5 text-[26px] font-semibold leading-tight tracking-[-0.025em] text-[var(--ink)] sm:text-[32px]">
          What can I help you find?
        </h1>
        <p className="mt-2 max-w-[460px] text-[14px] leading-relaxed text-[var(--muted)] sm:text-[15px]">
          Ask about office hours, emails, rooms, and departments — or get a straight
          answer on who is available now and where the semester stands.
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {EXAMPLES.map((example) => {
          const Icon = example.icon;

          return (
            <button
              key={example.title}
              type="button"
              onClick={() => onAsk?.(example.query)}
              className="group flex items-center gap-3 rounded-2xl border border-[var(--rule)] bg-transparent px-3.5 py-3 text-left transition-colors duration-200 hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--ink-soft)] transition-colors group-hover:bg-[var(--paper)]">
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium leading-tight text-[var(--ink)]">
                  {example.title}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-[var(--muted)]">
                  {example.description}
                </span>
              </span>
              <ArrowUpRight
                className="h-3.5 w-3.5 shrink-0 text-[var(--muted)] opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
                strokeWidth={1.8}
              />
            </button>
          );
        })}
      </motion.div>

      <motion.p
        variants={itemVariants}
        className="mt-6 text-center text-[11px] leading-relaxed text-[var(--muted)]"
      >
        Ask in plain language. I can check availability, look up instructors, and
        answer academic-calendar questions.
      </motion.p>
    </motion.div>
  );
}

EmptyState.propTypes = {
  onAsk: PropTypes.func
};
