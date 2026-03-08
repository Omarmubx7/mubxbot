import React from 'react';
import { MessageCircle } from 'lucide-react';

/**
 * TeamsButton Component
 * Displays a button to open Teams and search for faculty member by email
 * 
 * Workflow:
 * 1. User clicks the button
 * 2. Teams opens in new window
 * 3. Faculty email is automatically searched
 * 4. User clicks on the faculty name to start a chat
 */
export function TeamsButton({ email, facultyName }) {
  if (!email) {
    return null; // Don't show button if no email
  }

  const handleTeamsClick = () => {
    const encodedEmail = encodeURIComponent(email);
    // Primary web search flow keeps behavior consistent with current UX.
    const teamsSearchUrl = `https://teams.microsoft.com/_#/search/${encodedEmail}`;
    const desktopDeepLink = `msteams://teams.microsoft.com/l/chat/0/0?users=${encodedEmail}`;
    const webChatFallback = `https://teams.microsoft.com/l/chat/0/0?users=${encodedEmail}`;
    
    try {
      // Try opening a web tab first.
      const popup = window.open(teamsSearchUrl, '_blank', 'noopener,noreferrer');

      // If popup is blocked, try desktop protocol then fallback web chat URL.
      if (!popup) {
        window.location.href = desktopDeepLink;
        window.setTimeout(() => {
          if (document.visibilityState === 'visible') {
            window.open(webChatFallback, '_blank', 'noopener,noreferrer');
          }
        }, 1200);
      }
    } catch (error) {
      console.error('Could not open Teams:', error);
      // Last-resort fallback to web chat URL.
      window.open(webChatFallback, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button
      onClick={handleTeamsClick}
      className="gap-2 text-[#DC2626] dark:text-[#EF4444] hover:bg-[#DC2626]/5 dark:hover:bg-[#DC2626]/10 px-3 py-2 rounded-lg border border-[#DC2626]/30 dark:border-[#DC2626]/40 text-sm font-medium flex items-center transition-colors"
      title={`Click to open Teams and search for ${facultyName} (${email})`}
    >
      <MessageCircle className="w-4 h-4" />
      <span>Open in Teams</span>
    </button>
  );
}
