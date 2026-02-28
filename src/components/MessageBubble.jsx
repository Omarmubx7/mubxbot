
import React from "react";

export default function MessageBubble({ sender, children }) {
  const isUser = sender === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
      <div
        className={`relative px-4 py-2 rounded-2xl max-w-[80%] mb-1 shadow
          ${isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"}
          animate-messageEnter`}
      >
        {children}
      </div>
    </div>
  );
}
