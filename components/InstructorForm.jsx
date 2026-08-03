"use client";

import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { BUILDINGS, DEPARTMENTS, DEPARTMENT_OTHER, formatRoom, isValidEmail, parseRoom } from "../lib/directoryLists";

export const ALL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const inputClass = "w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all font-medium text-[var(--text-primary)]";
const inputErrorClass = "border-red-400/60 focus:ring-red-400/30";
const selectClass = "bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all font-medium text-[var(--text-primary)] appearance-none cursor-pointer";
const optionClass = "bg-white text-[#111827] dark:bg-[#2C2C2E] dark:text-white";
const labelClass = "text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)] px-1";

function isRequired(field, requiredFields) {
  if (!requiredFields || requiredFields.length === 0) return false;
  return requiredFields.includes(field);
}

function validateEmail(value, required) {
  const email = String(value || '').trim();
  if (!email) return required ? 'Email is required.' : '';
  if (!isValidEmail(email)) return 'Enter a valid email address (e.g. name@htu.edu.jo).';
  return '';
}

export default function InstructorForm({
  formData,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  submitting = false,
  requiredFields = ['name', 'department', 'email', 'office'],
  departments = DEPARTMENTS,
  stickyActions = false
}) {
  const [visibleDays, setVisibleDays] = useState(() =>
    new Set(ALL_DAYS.filter(d => String(formData.office_hours?.[d] || '').trim()))
  );
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [officeManual, setOfficeManual] = useState(false);
  const officeDirtyRef = useRef(false);

  const [room, setRoom] = useState(() => {
    const parsed = parseRoom(formData.office);
    return parsed
      ? { building: parsed.building, number: parsed.number, freeText: '' }
      : { building: '', number: '', freeText: String(formData.office || '') };
  });

  useEffect(() => {
    setVisibleDays(prev => {
      const next = new Set(prev);
      for (const day of ALL_DAYS) {
        if (String(formData.office_hours?.[day] || '').trim()) next.add(day);
      }
      return next;
    });
  }, [formData.office_hours]);

  useEffect(() => {
    if (officeDirtyRef.current) {
      officeDirtyRef.current = false;
      return;
    }
    const parsed = parseRoom(formData.office);
    const next = parsed
      ? { building: parsed.building, number: parsed.number, freeText: '' }
      : { building: '', number: '', freeText: String(formData.office || '') };
    setRoom(prev =>
      prev.building === next.building && prev.number === next.number && prev.freeText === next.freeText
        ? prev
        : next
    );
  }, [formData.office]);

  const update = (patch) => onChange({ ...formData, ...patch });

  const updateHours = (day, value) => onChange({
    ...formData,
    office_hours: { ...(formData.office_hours || {}), [day]: value }
  });

  const addDay = (day) => {
    setVisibleDays(prev => new Set(prev).add(day));
  };

  const removeDay = (day) => {
    setVisibleDays(prev => {
      const next = new Set(prev);
      next.delete(day);
      return next;
    });
    updateHours(day, '');
  };

  const setRoomAndOffice = (patch) => {
    officeDirtyRef.current = true;
    const next = { ...room, ...patch };
    setRoom(next);
    if ('freeText' in patch) {
      onChange({ ...formData, office: String(next.freeText || '').trim() });
    } else {
      onChange({ ...formData, office: formatRoom(next.building, next.number) });
    }
  };

  const handleOfficeManualToggle = () => {
    const manual = !officeManual;
    setOfficeManual(manual);
    if (manual) {
      setRoom(prev => ({ ...prev, freeText: formatRoom(prev.building, prev.number) }));
    }
  };

  const visibleDaysList = ALL_DAYS.filter(d => visibleDays.has(d));
  const hiddenDays = ALL_DAYS.filter(d => !visibleDays.has(d));
  const emailRequired = isRequired('email', requiredFields);
  const deptIsOther = !!String(formData.department || '').trim() && !departments.includes(formData.department);

  const handleEmailChange = (value) => {
    update({ email: value });
    const err = validateEmail(value, emailRequired);
    if (err) setEmailError(err);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const err = validateEmail(formData.email, emailRequired);
    setEmailError(err);
    if (err) return;
    onSubmit(e);
  };

  return (
    <form onSubmit={handleFormSubmit} noValidate className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="inst-name" className={labelClass}>Name</label>
        <input id="inst-name" required={isRequired('name', requiredFields)}
          className={inputClass}
          value={formData.name || ''}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Instructor name" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="inst-department" className={labelClass}>Department</label>
          <div className="relative">
            <select id="inst-department" required={isRequired('department', requiredFields)}
              className={`${selectClass} w-full pr-10`}
              value={deptIsOther ? DEPARTMENT_OTHER : (formData.department || '')}
              onChange={(e) => {
                const value = e.target.value;
                update({ department: value === DEPARTMENT_OTHER ? '' : value });
              }}>
              <option value="">Select department</option>
              {departments.map(dept => (
                <option key={dept} value={dept} className={optionClass}>{dept}</option>
              ))}
              <option value={DEPARTMENT_OTHER} className={optionClass}>{DEPARTMENT_OTHER}</option>
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-[12px]">▾</span>
          </div>
          {deptIsOther && (
            <input
              type="text"
              className={inputClass}
              value={formData.department || ''}
              onChange={(e) => update({ department: e.target.value })}
              placeholder="Type the department" />
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="inst-office" className={labelClass}>Office / Room</label>
          {!officeManual ? (
            <div className="flex gap-2">
              <div className="relative shrink-0">
                <select
                  aria-label="Building"
                  className={`${selectClass} w-24 pr-8`}
                  value={room.building}
                  onChange={(e) => setRoomAndOffice({ building: e.target.value })}>
                  <option value="">Building</option>
                  {BUILDINGS.map(b => (
                    <option key={b} value={b} className={optionClass}>{b}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-[12px]">▾</span>
              </div>
              <input
                aria-label="Room number"
                type="text"
                inputMode="numeric"
                className={`${inputClass} flex-1 min-w-0`}
                value={room.number}
                onChange={(e) => setRoomAndOffice({ number: e.target.value })}
                placeholder="e.g. 319" />
            </div>
          ) : (
            <input
              id="inst-office"
              type="text"
              className={inputClass}
              value={room.freeText}
              onChange={(e) => setRoomAndOffice({ freeText: e.target.value })}
              placeholder="e.g. Dean's Office (S-319)" />
          )}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handleOfficeManualToggle}
              className="text-[11px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
              {officeManual ? 'Use building + number' : 'Or type the full room manually'}
            </button>
            {!officeManual && (room.building || room.number) && (
              <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                Preview: <span className="text-[var(--primary)]">{formatRoom(room.building, room.number)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="inst-email" className={labelClass}>Email</label>
        <input id="inst-email" required={emailRequired} type="email"
          className={`${inputClass} ${emailError ? inputErrorClass : ''}`}
          aria-invalid={emailError ? 'true' : undefined}
          aria-describedby={emailError ? 'inst-email-error' : undefined}
          value={formData.email || ''}
          onChange={(e) => handleEmailChange(e.target.value)}
          onBlur={() => setEmailError(validateEmail(formData.email, emailRequired))}
          placeholder="Email" />
        {emailError && (
          <p id="inst-email-error" className="px-1 text-[12px] font-semibold text-red-500 dark:text-red-400">{emailError}</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className={`${labelClass} block`}>Office hours</span>
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
            {visibleDaysList.length}/{ALL_DAYS.length} days
          </span>
        </div>

        <div className="space-y-2">
          {visibleDaysList.map(day => (
            <div key={day} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-[12px] font-semibold text-[var(--text-secondary)]">{day}</span>
              <input
                id={`inst-oh-${day}`}
                type="text"
                className="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl px-3.5 py-3 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all text-[15px] font-medium text-[var(--text-primary)]"
                value={formData.office_hours?.[day] ?? ''}
                onChange={(e) => updateHours(day, e.target.value)}
                placeholder="e.g. 9:00 AM - 11:00 AM"
                inputMode="text"
              />
              <button
                type="button"
                onClick={() => removeDay(day)}
                aria-label={`Remove ${day}`}
                className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-[16px] leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {hiddenDays.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setDayPickerOpen(v => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-dashed border-[var(--text-tertiary)]/40 text-[13px] font-bold text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
            >
              ＋ Add a day
            </button>

            {dayPickerOpen && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {hiddenDays.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => { addDay(day); setDayPickerOpen(false); }}
                    className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-[13px] font-bold text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 transition-all"
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={stickyActions
        ? "sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/75 dark:bg-black/50 backdrop-blur-xl"
        : "pt-4"}
      >
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="flex-1 px-6 py-4 rounded-2xl font-bold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-[var(--text-primary)]">
              {cancelLabel}
            </button>
          )}
          <button type="submit" disabled={submitting}
            className="flex-1 px-6 py-4 rounded-2xl font-bold bg-[#DC2626] text-white shadow-lg shadow-[#DC2626]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
            {submitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

InstructorForm.propTypes = {
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  submitLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  submitting: PropTypes.bool,
  requiredFields: PropTypes.array,
  departments: PropTypes.array,
  stickyActions: PropTypes.bool
};
