import Link from 'next/link';

export default function GuildModNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <p
          className="text-6xl font-bold text-[var(--mod-text-dim)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          404
        </p>
        <h1
          className="text-sm uppercase tracking-widest text-[var(--mono-white)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Page Not Found
        </h1>
        <p className="max-w-xs text-sm text-[var(--mod-text-muted)]">
          This page doesn&apos;t exist. Check the URL or navigate using the sidebar.
        </p>
        <Link
          href="/mod"
          className="border border-[var(--mod-border)] bg-[var(--mod-surface)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mono-850)] hover:text-[var(--mono-white)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          &larr; Back to servers
        </Link>
      </div>
    </div>
  );
}
