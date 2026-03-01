"use client";

export function QuickReplies({ options, onSelect }) {
  if (!options || options.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2 px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onSelect(option)}
          className="px-4 py-2 rounded-[20px] border border-[#007AFF] dark:border-[#0A84FF] text-[#007AFF] dark:text-[#0A84FF] text-[14px] font-medium hover:bg-[#007AFF]/10 dark:hover:bg-[#0A84FF]/10 transition-all active:scale-95 shadow-sm"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
