import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-6xl font-bold text-muted-foreground font-mono">404</p>
        <h1 className="text-sm uppercase tracking-widest font-mono">Page Not Found</h1>
        <p className="max-w-xs text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="border border-input bg-background px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground font-mono">&larr; Home</Link>
      </div>
    </div>
  );
}
