"use client";

export function TypingIndicator() {
  return (
    <div className="flex justify-start px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-[18px] px-[14px] py-[10px] bg-[#E9ECEF] dark:bg-[#2C2C2E]">
        <div className="flex gap-1 items-center h-5">
          <span 
            className="w-2 h-2 rounded-full bg-[#8E8E93] dark:bg-[#98989D] animate-bounce" 
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          ></span>
          <span 
            className="w-2 h-2 rounded-full bg-[#8E8E93] dark:bg-[#98989D] animate-bounce" 
            style={{ animationDelay: '150ms', animationDuration: '1s' }}
          ></span>
          <span 
            className="w-2 h-2 rounded-full bg-[#8E8E93] dark:bg-[#98989D] animate-bounce" 
            style={{ animationDelay: '300ms', animationDuration: '1s' }}
          ></span>
        </div>
      </div>
    </div>
  );
}
