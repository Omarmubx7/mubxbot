import React from 'react';
import { TeamsButton } from './TeamsButton';
import { MapPin, Clock, Calendar, Mail } from 'lucide-react';

/**
 * OfficeHoursDisplay Component
 * Shows faculty office hours with integrated Teams button
 * 
 * Props:
 * - officeHours: array of office hour entries
 * - faculty: faculty name
 * - email: faculty email
 * - department: faculty department
 */
export function OfficeHoursDisplay({ officeHours, faculty, email, department }) {
  if (!officeHours || officeHours.length === 0) {
    return (
      <div className="bg-gradient-to-r from-[#DC2626]/5 to-[#DC2626]/2 dark:from-[#DC2626]/10 dark:to-[#DC2626]/5 rounded-lg p-4 border border-[#DC2626]/20 dark:border-[#DC2626]/30">
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
    <div className="bg-gradient-to-r from-[#DC2626]/5 to-[#DC2626]/2 dark:from-[#DC2626]/10 dark:to-[#DC2626]/5 border border-[#DC2626]/20 dark:border-[#DC2626]/30 rounded-lg overflow-hidden">
      {/* Header with Teams Button */}
      <div className="p-4 border-b border-[#DC2626]/15 dark:border-[#DC2626]/25 flex items-start justify-between gap-4 bg-white/40 dark:bg-black/20">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{faculty}</h3>
          {department && (
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{department}</div>
          )}
          {email && (
            <div className="mt-2 flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
              <Mail className="w-4 h-4" />
              <a href={`mailto:${email}`} className="text-[#DC2626] dark:text-[#EF4444] hover:underline">
                {email}
              </a>
            </div>
          )}
        </div>
        {/* Teams Button */}
        <TeamsButton email={email} facultyName={faculty} />
      </div>

      {/* Office Hours Content */}
      <div className="p-4 space-y-3">
        {uniqueHours.map((hour, idx) => (
          <div key={idx} className="flex items-start gap-4 pb-3 border-b border-[#DC2626]/10 dark:border-[#DC2626]/15 last:border-0 last:pb-0">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 bg-[#DC2626]/10 dark:bg-[#DC2626]/20 text-[#DC2626] dark:text-[#EF4444] text-xs px-2.5 py-1.5 rounded-full font-medium">
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
      <div className="p-4 border-t border-[#DC2626]/15 dark:border-[#DC2626]/25 bg-[#DC2626]/3 dark:bg-[#DC2626]/5">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          💡 Click <strong>Open in Teams</strong> above to search for this faculty member and start a chat
        </p>
      </div>
    </div>
  );
}
