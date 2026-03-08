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
    // Open Teams and search for the email in the search bar
    // This allows user to find and click the faculty member to start chat
    const teamsSearchUrl = `https://teams.microsoft.com/_#/search/${encodeURIComponent(email)}`;
    
    try {
      // Try to open with search URL first (works in web and desktop)
      window.open(teamsSearchUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Could not open Teams:', error);
      // Fallback: Show alert with manual instructions
      alert(`Open Teams and search for: ${email}`);
    }
  };

  return (
    <button
      onClick={handleTeamsClick}
      className="gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 text-sm font-medium flex items-center transition-colors"
      title={`Click to open Teams and search for ${facultyName} (${email})`}
    >
      <MessageCircle className="w-4 h-4" />
      <span>Open in Teams</span>
    </button>
  );
}
