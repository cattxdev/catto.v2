import Link from 'next/link';

interface ModNotFoundProps {
  message?: string;
  backHref?: string;
  backLabel?: string;
  fullScreen?: boolean;
}

export function ModNotFound({
  message = "The page you're looking for doesn't exist or has been moved.",
  backHref = '/mod',
  backLabel = 'Back to servers',
  fullScreen = true,
}: ModNotFoundProps) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'min-h-screen bg-[var(--mod-bg)]' : 'min-h-[60vh]'}`}>
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-6xl font-bold text-[var(--mod-text-dim)]" style={{ fontFamily: 'var(--font-mono)' }}>404</p>
        <h1 className="text-sm uppercase tracking-widest text-[var(--mono-white)]" style={{ fontFamily: 'var(--font-mono)' }}>Page Not Found</h1>
        <p className="max-w-xs text-sm text-[var(--mod-text-muted)]">{message}</p>
        <Link href={backHref} className="border border-[var(--mod-border)] bg-[var(--mod-surface)] px-4 py-2 text-xs uppercase tracking-widest text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mono-850)] hover:text-[var(--mono-white)]" style={{ fontFamily: 'var(--font-mono)' }}>&larr; {backLabel}</Link>
      </div>
    </div>
  );
}
