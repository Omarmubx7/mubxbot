"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ContributeFlow from '../../components/ContributeFlow';

export default function ContributePage() {
  return (
    <div className="min-h-dvh w-full font-sans bg-[#F2F2F7] dark:bg-[#000000]">
      <div className="sticky top-0 z-50 glass-surface border-b border-black/[0.03] dark:border-white/[0.05] pt-safe backdrop-blur-3xl">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-[13px] font-bold text-[#DC2626] hover:underline flex-shrink-0">
            <ArrowLeft size={16} /> Ask MUBX
          </Link>
          <div className="flex-1 min-w-0 text-right">
            <h1 className="text-[15px] font-black tracking-[-0.02em] text-[var(--text-primary)] leading-none">
              Help complete office hours
            </h1>
            <div className="text-[11px] font-medium text-[var(--text-tertiary)] mt-0.5">
              Students &amp; staff — the team reviews each entry.
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pb-10 h-[calc(100dvh-6.5rem)] sm:h-[calc(100dvh-8rem)]">
        <ContributeFlow variant="inline" prefillFromUrl />
      </div>
    </div>
  );
}
