import React from 'react';
import PropTypes from 'prop-types';
import { TeamsButton } from './TeamsButton';
import { InstructorShareButton } from './InstructorShareButton';
import { PencilLine } from 'lucide-react';
import { isNewDataName } from '../lib/updateList';
import {
  ResponseBody,
  ResponseCard,
  ResponseFact,
  ResponseGrid,
  ResponseHeader,
  ResponseRow,
  ResponseText
} from './ResponseCard';

/**
 * OfficeHoursDisplay Component
 * Shows faculty office hours with integrated Teams button and Add to Calendar button
 *
 * Props:
 * - officeHours: array of office hour entries
 * - faculty: faculty name
 * - email: faculty email
 * - department: faculty department
 * - office: faculty office location
 * - emptyStateMessage: custom no-hours message
 */
export function OfficeHoursDisplay({ officeHours, faculty, email, department, office, emptyStateMessage = 'No office hours available', showTeamsButton = true, isNew, onUpdate }) {
  // Get unique days
  const uniqueHours = [];
  if (officeHours && officeHours.length > 0) {
    const seenDays = new Set();
    officeHours.forEach(hour => {
      const day = hour.day;
      if (!seenDays.has(day)) {
        uniqueHours.push(hour);
        seenDays.add(day);
      }
    });
  }

  const dataTag = faculty
    ? (isNew === true ? 'new' : isNew === false ? 'old' : (isNewDataName(faculty) ? 'new' : 'old'))
    : null;

  return (
    <ResponseCard className="relative z-0">
      <ResponseHeader
        label="Faculty"
        meta="Directory profile"
        badge={dataTag === 'new' ? 'New data' : dataTag === 'old' ? 'Old data' : null}
        badgeTone={dataTag === 'new' ? 'accent' : 'muted'}
      />

      <ResponseBody>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-display text-[17px] font-semibold leading-tight tracking-[-0.01em] text-[var(--ink)] break-words">
              {faculty}
            </h3>
            {department && (
              <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--muted)] break-words">
                {department}
              </p>
            )}
          </div>

          <div className="ml-auto flex w-full flex-row flex-wrap items-center justify-end gap-2 pr-1 sm:ml-0 sm:w-auto sm:justify-end sm:pr-0">
            {dataTag === 'old' && onUpdate && (
              <button
                type="button"
                onClick={() => onUpdate({ name: faculty, email, department, office, officeHours })}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-line)] px-2.5 py-1 text-[10.5px] font-medium text-[var(--accent)] transition-all hover:bg-[var(--accent-soft)] active:scale-95"
                title="Update this professor's data"
              >
                <PencilLine size={11} />
                Update
              </button>
            )}
            {showTeamsButton && (
              <>
                <TeamsButton email={email} facultyName={faculty} />
                <InstructorShareButton faculty={faculty} email={email} department={department} office={office} officeHours={officeHours} />
              </>
            )}
          </div>
        </div>

        <ResponseGrid className="mt-3">
          {office && (
            <ResponseFact label="Office" value={office} />
          )}
          <ResponseFact
            label="Office hours"
            value={uniqueHours.length > 0 ? `${uniqueHours.length} ${uniqueHours.length === 1 ? 'day' : 'days'}` : 'Not listed'}
            accent={uniqueHours.length > 0}
          />
          {email && (
            <ResponseFact
              label="Email"
              value={(
                <a href={`mailto:${email}`} className="break-all text-[var(--accent)] underline decoration-current/25 hover:decoration-current">
                  {email}
                </a>
              )}
              wide
            />
          )}
        </ResponseGrid>
      </ResponseBody>

      <div className="border-t border-[var(--rule)]">
        <div className="flex items-center justify-between gap-3 px-3.5 pb-1.5 pt-2">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Weekly schedule
          </span>
          <span className="text-[10px] text-[var(--muted)]">Amman time</span>
        </div>

        {uniqueHours.length > 0 ? (
          <div className="divide-y divide-[var(--rule)]">
            {uniqueHours.map((hour) => (
              <ResponseRow key={hour.day}>
                <span className="flex h-7 min-w-[3rem] shrink-0 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--surface)] px-2 text-[10px] font-semibold text-[var(--ink-soft)]">
                  {hour.day}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-[var(--ink)]">
                      {hour.start} – {hour.end}
                    </span>
                    {hour.type && (
                      <span className="shrink-0 text-[10px] text-[var(--muted)]">{hour.type}</span>
                    )}
                  </span>
                  {hour.office && hour.office !== office && (
                    <span className="mt-0.5 block truncate text-[10.5px] text-[var(--muted)]">
                      Office {hour.office}
                    </span>
                  )}
                </span>
              </ResponseRow>
            ))}
          </div>
        ) : (
          <div className="px-3.5 pb-3">
            <ResponseText className="text-[12px] italic text-[var(--muted)]">
              {emptyStateMessage}
            </ResponseText>
          </div>
        )}
      </div>

      {showTeamsButton && (
        <div className="border-t border-[var(--rule)] bg-[var(--surface)]/50 px-3.5 py-2">
          <ResponseText className="text-[10.5px] leading-relaxed text-[var(--muted)]">
            Use <span className="font-medium text-[var(--ink-soft)]">Open in Teams</span> above to search for this faculty member and start a chat.
          </ResponseText>
        </div>
      )}
    </ResponseCard>
  );
}

OfficeHoursDisplay.propTypes = {
  officeHours: PropTypes.array,
  faculty: PropTypes.string,
  email: PropTypes.string,
  department: PropTypes.string,
  office: PropTypes.string,
  emptyStateMessage: PropTypes.string,
  showTeamsButton: PropTypes.bool,
  isNew: PropTypes.bool,
  onUpdate: PropTypes.func,
};
