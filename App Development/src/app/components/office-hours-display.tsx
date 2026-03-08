import React from 'react';
import { TeamsButton } from './teams-button';
import { MapPin, Clock, Calendar, Mail } from 'lucide-react';

/**
 * OfficeHoursDisplay Component
 * Shows faculty office hours with integrated Teams button
 * 
 * Props:
 * - officeHours: array of office hour entries
 * - faculty: faculty name
 * - email: faculty email
 */
export function OfficeHoursDisplay({ officeHours, faculty, email }) {
  if (!officeHours || officeHours.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-4 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">No office hours available</p>
      </div>
    );
  }

  // Get unique days
  const uniqueHours = [];
  const seenDays = new Set();
  
  officeHours.forEach(hour => {
    const day = hour.day;
    if (!seenDays.has(day)) {
      uniqueHours.push(hour);
      seenDays.add(day);
    }
  });

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
      {/* Header with Teams Button */}
      <div className="p-4 border-b border-blue-200 dark:border-blue-800 flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{faculty}</h3>
          <div className="mt-1 flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
            <Mail className="w-4 h-4" />
            {email}
          </div>
        </div>
        {/* Teams Button */}
        <TeamsButton email={email} facultyName={faculty} />
      </div>

      {/* Office Hours Content */}
      <div className="p-4 space-y-3">
        {uniqueHours.map((hour, idx) => (
          <div key={idx} className="flex items-start gap-4 pb-3 border-b border-blue-100 dark:border-blue-800/50 last:border-0 last:pb-0">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 text-xs px-2.5 py-1.5 rounded-full font-medium">
                  <Calendar className="w-3 h-3" />
                  {hour.day}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-1">
                <Clock className="w-4 h-4" />
                <span>
                  {hour.start} - {hour.end}
                </span>
              </div>

              {hour.office && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span>{hour.office}</span>
                </div>
              )}

              {hour.type && (
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {hour.type}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="mt-0 p-4 border-t border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          💡 Click <strong>Open in Teams</strong> to search for this faculty member and start a chat
        </p>
      </div>
    </div>
  );
}
