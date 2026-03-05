"use client";

export function ChatMessage({ type, content, timestamp }) {
  const isUser = type === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className="flex flex-col max-w-[75%]">
        <div
          className={`rounded-[18px] px-[14px] py-[10px] shadow-sm ${
            isUser
              ? 'bg-[#DC2626] dark:bg-[#EF4444] text-white'
              : 'bg-[#E9ECEF] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white'
          }`}
        >
          <div className="text-[15px] leading-[1.4] whitespace-pre-wrap">{content}</div>
        </div>
        {timestamp && (
          <span className={`text-[11px] text-[#8E8E93] dark:text-[#98989D] mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
