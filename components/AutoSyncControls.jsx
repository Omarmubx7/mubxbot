import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import PropTypes from 'prop-types';

export function useAutoSync(onSync, defaultInterval = 15) {
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncIntervalSec, setSyncIntervalSec] = useState(defaultInterval);
  const [syncCountdown, setSyncCountdown] = useState(defaultInterval);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // Store onSync in a ref so it's always up-to-date without
  // needing the function to exist at hook call-time (avoids TDZ).
  const onSyncRef = useRef(onSync);
  useEffect(() => { onSyncRef.current = onSync; }, [onSync]);

  const performSync = useCallback(async (...args) => {
    if (typeof onSyncRef.current === 'function') {
      await onSyncRef.current(...args);
    }
    setLastSyncedAt(new Date());
    setSyncCountdown(syncIntervalSec);
  }, [syncIntervalSec]);

  useEffect(() => {
    if (!autoSyncEnabled) {
      setSyncCountdown(syncIntervalSec);
      return;
    }

    setSyncCountdown(syncIntervalSec);
    const timer = setInterval(() => {
      if (globalThis.document?.hidden) return;

      setSyncCountdown((prev) => {
        if (prev <= 1) {
          performSync();
          return syncIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoSyncEnabled, syncIntervalSec, performSync]);

  return {
    autoSyncEnabled,
    setAutoSyncEnabled,
    syncIntervalSec,
    setSyncIntervalSec,
    syncCountdown,
    lastSyncedAt,
    performSync
  };
}

export function AutoSyncControls({
  autoSyncEnabled,
  setAutoSyncEnabled,
  syncIntervalSec,
  setSyncIntervalSec,
  syncCountdown,
  lastSyncedAt,
  onRefresh
}) {
  return (
    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 glass-card rounded-[24px] sm:rounded-[28px] border-black/[0.03] dark:border-white/[0.05] p-2 sm:p-3 shadow-sm">
      <button 
        onClick={onRefresh} 
        className="rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 px-4 py-3 text-[13px] font-bold inline-flex items-center gap-2 text-[var(--text-primary)] transition-all"
      >
        <RefreshCw size={14} /> Refresh
      </button>
      
      <button
        onClick={() => setAutoSyncEnabled((prev) => !prev)}
        className={`rounded-xl px-4 py-3 text-[13px] font-bold inline-flex items-center gap-2 transition-all ${autoSyncEnabled ? 'bg-[#DC2626] text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)]' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-primary)]'}`}
      >
        {autoSyncEnabled ? 'Live Sync On' : 'Live Sync Off'}
      </button>

      <div className="flex items-center gap-2">
        <label htmlFor="admin-sync-interval" className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] hidden sm:block">
          Interval
        </label>
        <select
          id="admin-sync-interval"
          value={syncIntervalSec}
          onChange={(e) => setSyncIntervalSec(Number.parseInt(e.target.value, 10) || 15)}
          className="block rounded-xl bg-black/5 dark:bg-white/10 border border-transparent px-3 py-3 text-[13px] text-[var(--text-primary)] font-bold outline-none hover:bg-black/10 dark:hover:bg-white/15 transition-all text-center"
        >
          <option value="5" className="text-black">5s</option>
          <option value="10" className="text-black">10s</option>
          <option value="15" className="text-black">15s</option>
          <option value="30" className="text-black">30s</option>
        </select>
      </div>
      
      <div className="text-[12px] font-medium text-[var(--text-secondary)] sm:ml-auto px-2 text-center sm:text-right">
        {autoSyncEnabled ? `Next sync in ${syncCountdown}s.` : 'Live sync paused.'}
        {lastSyncedAt ? <br className="sm:hidden" /> : ''}
        {lastSyncedAt ? ` Last: ${lastSyncedAt.toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit', second:'2-digit', hour12:true})}` : ''}
      </div>
    </div>
  );
}

AutoSyncControls.propTypes = {
  autoSyncEnabled: PropTypes.bool.isRequired,
  setAutoSyncEnabled: PropTypes.func.isRequired,
  syncIntervalSec: PropTypes.number.isRequired,
  setSyncIntervalSec: PropTypes.func.isRequired,
  syncCountdown: PropTypes.number.isRequired,
  lastSyncedAt: PropTypes.instanceOf(Date),
  onRefresh: PropTypes.func.isRequired
};
