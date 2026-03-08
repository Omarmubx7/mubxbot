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
    // Use modern Teams chat URLs to avoid legacy/classic search route errors.
    const webChatUrl = `https://teams.microsoft.com/l/chat/0/0?users=${encodedEmail}`;
    const webChatV2Url = `https://teams.microsoft.com/v2/?chat=${encodedEmail}`;
    const desktopDeepLink = `msteams://teams.microsoft.com/l/chat/0/0?users=${encodedEmail}`;
    
    try {
      // Try opening modern Teams web chat first.
      const popup = globalThis.open(webChatUrl, '_blank', 'noopener,noreferrer');

      // If popup is blocked, try desktop protocol then v2 web fallback.
      if (!popup) {
        globalThis.location.href = desktopDeepLink;
        globalThis.setTimeout(() => {
          if (globalThis.document.visibilityState === 'visible') {
            globalThis.open(webChatV2Url, '_blank', 'noopener,noreferrer');
          }
        }, 1200);
      }
    } catch (error) {
      console.error('Could not open Teams:', error);
      // Last-resort fallback to Teams v2 web URL.
      globalThis.open(webChatV2Url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button
      onClick={handleTeamsClick}
      className="w-full sm:w-auto justify-center gap-2 text-[#DC2626] dark:text-[#EF4444] hover:bg-[#DC2626]/5 dark:hover:bg-[#DC2626]/10 px-3 py-2.5 sm:py-2 rounded-lg border border-[#DC2626]/30 dark:border-[#DC2626]/40 text-sm font-medium flex items-center transition-colors min-h-11 sm:min-h-0"
      title={`Click to open Teams and search for ${facultyName} (${email})`}
    >
      <MessageCircle className="w-4 h-4" />
      <span>Open in Teams</span>
    </button>
  );
}
