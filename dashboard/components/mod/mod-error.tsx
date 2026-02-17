'use client';

import Link from 'next/link';
import { IconAlertTriangle } from '@/lib/mod-icons';

interface ModErrorProps {
  reset: () => void;
  backHref?: string;
  backLabel?: string;
  fullScreen?: boolean;
}

export function ModError({ reset, backHref = '/mod', backLabel = 'Back to servers', fullScreen = true }: ModErrorProps) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'min-h-screen bg-[var(--mod-bg)]' : 'min-h-[60vh]'}`}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center bg-red-500/10"><IconAlertTriangle size={24} className="text-red-400" /></div>
        <h1 className="text-sm uppercase tracking-widest text-[var(--mono-white)]" style={{ fontFamily: 'var(--font-mono)' }}>Something went wrong</h1>
        <p className="max-w-xs text-sm text-[var(--mod-text-muted)]">An unexpected error occurred. Try again or head back.</p>
        <div className="flex gap-3">
          <button onClick={reset} className="border border-[var(--mod-border)] bg-[var(--mod-surface)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mono-850)] hover:text-[var(--mono-white)]" style={{ fontFamily: 'var(--font-mono)' }}>Try again</button>
          <Link href={backHref} className="border border-[var(--mod-border)] bg-[var(--mod-surface)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mono-850)] hover:text-[var(--mono-white)]" style={{ fontFamily: 'var(--font-mono)' }}>&larr; {backLabel}</Link>
        </div>
      </div>
    </div>
  );
}
