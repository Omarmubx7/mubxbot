"use client";

import { GraduationCap } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-4">
        <GraduationCap className="w-8 h-8 text-white" strokeWidth={2} />
      </div>
      <h2 className="text-[18px] font-semibold text-[#1C1C1E] dark:text-white mb-2 leading-tight">
        HTU Computing Directory
      </h2>
      <p className="text-[14px] text-[#8E8E93] dark:text-[#98989D] leading-[1.4]">
        Search for instructors by name, department, or office.
      </p>
    </div>
  );
}
