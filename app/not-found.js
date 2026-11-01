import Link from "next/link";
import { ArrowLeft, Clock3, Search, UserX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--paper)] px-4 py-14">
      {/* Warm red ambience */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[var(--accent)]/[0.06] blur-[140px]"
      />

      <div className="relative w-full max-w-xl">
        <div className="mb-7 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-white">
              <span className="text-[15px] font-semibold leading-none">M</span>
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight tracking-tight text-[var(--ink)]">
                MUBXBot
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                HTU directory
              </span>
            </span>
          </Link>

          <span className="rounded-full border border-[var(--rule)] bg-[var(--panel)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Lookup failed
          </span>
        </div>

        {/* Fake search bar — the query nobody can answer */}
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--rule)] bg-[var(--panel)] p-2 shadow-sm">
          <Search className="ml-2 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--ink-soft)]">
            bot.mubx.dev/this-page-does-not-exist
          </p>
          <span
            aria-hidden="true"
            className="shrink-0 rounded-xl bg-[var(--accent)] px-3 py-2 text-[11px] font-semibold text-white"
          >
            Search
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--panel)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Results
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              0 found
            </p>
          </div>

          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--accent)]">
              <UserX className="h-6 w-6" aria-hidden="true" />
            </div>

            <h1 className="mt-4 text-xl font-semibold tracking-tight text-[var(--ink)]">
              No faculty member found.
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--muted)]">
              This page isn&apos;t in the HTU directory. No faculty, no office hours, no
              results here. You found nothing — go back and ask the bot a real question.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to MUBXBot
              </Link>
              <Link
                href="/faq"
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-5 py-2.5 text-[13px] font-semibold text-[var(--ink-soft)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Browse FAQ
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-dashed border-[var(--rule)] bg-[var(--surface)] px-5 py-3">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              Office hours: closed
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              HTTP 404
            </span>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] font-medium text-[var(--muted)]">
          Try a real instructor name, a department, or ask who is free right now.
        </p>
      </div>
    </main>
  );
}
