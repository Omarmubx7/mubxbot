"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/admin';

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!password.trim()) {
      setError('Please enter the admin password.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        setError('Invalid password. Please try again.');
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError('Unable to sign in right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="h-[100dvh] w-full flex items-center justify-center bg-[#F2F2F7] dark:bg-black px-4">
      <div className="w-full max-w-md rounded-[28px] border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-xl shadow-2xl p-8">
        <h1 className="text-[28px] font-black tracking-tight text-[var(--text-primary)]">Admin Access</h1>
        <p className="text-[14px] mt-2 text-[var(--text-secondary)]">
          Enter the password to continue to the admin panel.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/20 px-4 py-3 outline-none focus:ring-2 focus:ring-[#DC2626]/30 text-[var(--text-primary)]"
          />

          {error && (
            <div className="text-[13px] text-[#DC2626]">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl px-4 py-3 font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 transition-all"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
