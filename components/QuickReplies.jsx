"use client";

export function QuickReplies({ options, onSelect }) {
  if (!options || options.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2 px-3 sm:px-4 pb-1 max-w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onSelect(option)}
          className="max-w-full px-3.5 sm:px-4 py-2.5 sm:py-2 rounded-[20px] border border-[#DC2626] dark:border-[#EF4444] text-[#DC2626] dark:text-[#EF4444] text-[14px] font-medium hover:bg-[#DC2626]/10 dark:hover:bg-[#EF4444]/10 transition-all active:scale-95 shadow-sm whitespace-normal leading-tight"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
