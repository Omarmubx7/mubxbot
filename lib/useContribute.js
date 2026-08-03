"use client";

import { useState, useEffect, useCallback } from 'react';
import { DEPARTMENTS, isValidEmail } from './directoryLists';

export const ALL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function emptyHours() {
  return {
    Sunday: '',
    Monday: '',
    Tuesday: '',
    Wednesday: '',
    Thursday: '',
    Friday: '',
    Saturday: ''
  };
}

function emptyForm() {
  return {
    name: '',
    department: '',
    email: '',
    office: '',
    office_hours: emptyHours()
  };
}

export function useContribute({ prefillName = '', prefillFromUrl = false } = {}) {
  const [missingNames, setMissingNames] = useState([]);
  const [staleInstructors, setStaleInstructors] = useState([]);
  const [departments, setDepartments] = useState(DEPARTMENTS);
  const [counts, setCounts] = useState({ new: 0, old: 0, missing: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formData, setFormData] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/contribute', { cache: 'no-store' });
      const data = await res.json();
      setMissingNames(Array.isArray(data?.missingNames)
        ? data.missingNames.filter(n => !n.resolved)
        : []);
      setStaleInstructors(Array.isArray(data?.staleInstructors) ? data.staleInstructors : []);
      if (Array.isArray(data?.departments) && data.departments.length > 0) {
        setDepartments(data.departments);
      }
      if (data?.counts) setCounts(data.counts);
    } catch {
      setLoadError('Could not load the missing names list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let initial = prefillName || '';
    if (prefillFromUrl) {
      const params = new URLSearchParams(globalThis.location?.search || '');
      initial = params.get('name') || initial;
    }
    if (initial) {
      setFormData(prev => (prev.name.trim() ? prev : { ...prev, name: initial }));
    }
  }, [prefillName, prefillFromUrl]);

  const pickName = useCallback((name) => {
    setFormData(prev => ({ ...prev, name }));
  }, []);

  const pickInstructor = useCallback((instructor) => {
    const existingHours = emptyHours();
    for (const day of Object.keys(existingHours)) {
      const value = instructor?.office_hours?.[day];
      if (value && String(value).trim()) existingHours[day] = String(value).trim();
    }
    setFormData(prev => ({
      ...prev,
      name: instructor?.name || prev.name,
      department: instructor?.department || prev.department,
      email: instructor?.email || prev.email,
      office: instructor?.office || prev.office,
      office_hours: existingHours
    }));
  }, []);

  const submit = useCallback(async (e) => {
    if (e?.preventDefault) e.preventDefault();

    const filledDays = Object.values(formData.office_hours || {}).filter(v => String(v).trim());
    if (!String(formData.name || '').trim()) {
      setFormError('Please enter the instructor name.');
      return false;
    }
    if (!String(formData.email || '').trim()) {
      setFormError('Please enter an email address.');
      return false;
    }
    if (!isValidEmail(formData.email)) {
      setFormError('Please enter a valid email address.');
      return false;
    }
    if (filledDays.length === 0) {
      setFormError('Please fill in at least one office hours entry (day + time).');
      return false;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const response = await fetch('/api/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          _hp: '',
          missing_name_link: null
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || body?.details || 'Could not submit data');
      }

      setSubmitted(true);
      setFormData(emptyForm());
      refresh();
      return true;
    } catch (err) {
      setFormError(String(err?.message || err || 'Could not submit data'));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [formData, refresh]);

  const resetForm = useCallback(() => {
    setFormData(emptyForm());
    setFormError('');
    setSubmitted(false);
  }, []);

  return {
    missingNames,
    staleInstructors,
    departments,
    counts,
    loading,
    loadError,
    formData,
    submitting,
    formError,
    submitted,
    setFormData,
    refresh,
    pickName,
    pickInstructor,
    submit,
    resetForm
  };
}
