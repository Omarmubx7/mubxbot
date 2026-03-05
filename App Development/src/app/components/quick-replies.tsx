interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
}

export function QuickReplies({ options, onSelect }: QuickRepliesProps) {
  return (
    <div className="flex flex-wrap gap-2 px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onSelect(option)}
          className="px-4 py-2 rounded-[20px] border border-[#DC2626] dark:border-[#EF4444] text-[#DC2626] dark:text-[#EF4444] text-[14px] font-medium hover:bg-[#DC2626]/10 dark:hover:bg-[#EF4444]/10 transition-all active:scale-95 shadow-sm"
        >
          {option}
        </button>
      ))}
    </div>
  );
}