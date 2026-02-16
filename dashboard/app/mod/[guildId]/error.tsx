'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { IconAlertTriangle } from '@/lib/mod-icons';

export default function GuildModError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const guildId = params?.guildId as string | undefined;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center bg-red-500/10">
          <IconAlertTriangle size={24} className="text-red-400" />
        </div>
        <h1
          className="text-sm uppercase tracking-widest text-[var(--mono-white)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Something went wrong
        </h1>
        <p className="max-w-xs text-sm text-[var(--mod-text-muted)]">
          An error occurred while loading this page. Try again or navigate elsewhere.
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="border border-[var(--mod-border)] bg-[var(--mod-surface)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mono-850)] hover:text-[var(--mono-white)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Try again
          </button>
          <Link
            href={guildId ? `/mod/${guildId}` : '/mod'}
            className="border border-[var(--mod-border)] bg-[var(--mod-surface)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mono-850)] hover:text-[var(--mono-white)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            &larr; Back to overview
          </Link>
        </div>
      </div>
    </div>
  );
}
