import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut, ArrowLeft } from 'lucide-react';
import PropTypes from 'prop-types';

export function AdminHeader({ title = 'Admin Control Center', onLogout }) {
  return (
    <>
      <div className="absolute inset-0 bg-white/20 dark:bg-black/20 pointer-events-none -z-10" />

      <div className="w-full flex items-center justify-between mb-8 pb-8 border-b border-black/5 dark:border-white/5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:w-auto w-full">
          <Link 
            href="/" 
            className="group flex items-center gap-2 text-[14px] font-bold text-[#DC2626] dark:text-[#EF4444] bg-[#DC2626]/5 dark:bg-[#EF4444]/10 hover:bg-[#DC2626]/10 dark:hover:bg-[#EF4444]/20 px-4 py-2.5 rounded-xl border border-[#DC2626]/10 dark:border-[#EF4444]/20 transition-all self-start sm:self-auto"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            <span>MUBXBot</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 flex-shrink-0 bg-white/50 dark:bg-white/5 p-2 rounded-2xl shadow-sm border border-black/5 dark:border-white/10 hidden sm:block">
              <Image 
                src="/mubx-icon.png" 
                alt="Logo" 
                fill 
                sizes="(max-width: 48px) 100vw, 48px"
                className="object-contain p-1.5 drop-shadow-sm"
              />
            </div>
            <div>
              <h1 className="text-[28px] sm:text-[32px] font-black tracking-[-0.04em] text-[var(--text-primary)] leading-none mb-1 shadow-sm">
                {title}
              </h1>
              <div className="text-[13px] font-medium text-[var(--text-tertiary)] flex flex-wrap gap-2 items-center">
                <span className="bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md border border-black/5 dark:border-white/5">v2.0</span>
                <span className="hidden sm:inline text-black/20 dark:text-white/20">•</span>
                <span>System Management</span>
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[var(--text-secondary)] hover:text-[#DC2626] dark:hover:text-[#EF4444] font-bold text-[13px] transition-all ml-4 flex-shrink-0"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>

      <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 chat-scroll">
        <Link 
          href="/admin" 
          className="whitespace-nowrap rounded-xl bg-black/5 dark:bg-white/10 px-4 py-3 text-[13px] font-bold text-[var(--text-secondary)] hover:bg-black/10 dark:hover:bg-white/20 hover:text-[var(--text-primary)] transition-all"
        >
          Instructors Directory
        </Link>
        <Link 
          href="/admin/static" 
          className="whitespace-nowrap rounded-xl bg-black/5 dark:bg-white/10 px-4 py-3 text-[13px] font-bold text-[var(--text-secondary)] hover:bg-black/10 dark:hover:bg-white/20 hover:text-[var(--text-primary)] transition-all"
        >
          Static Bot Responses
        </Link>
        <Link 
          href="/admin/analytics" 
          className="whitespace-nowrap rounded-xl bg-black/5 dark:bg-white/10 px-4 py-3 text-[13px] font-bold text-[var(--text-secondary)] hover:bg-black/10 dark:hover:bg-white/20 hover:text-[var(--text-primary)] transition-all"
        >
          Analytics & Quality
        </Link>
      </div>
    </>
  );
}

AdminHeader.propTypes = {
  title: PropTypes.string,
  onLogout: PropTypes.func.isRequired,
};
