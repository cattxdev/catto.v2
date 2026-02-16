import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-6xl font-bold text-neutral-700 font-mono">404</p>
        <h1 className="text-sm uppercase tracking-widest font-mono">
          Page Not Found
        </h1>
        <p className="max-w-xs text-sm text-neutral-400">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs uppercase tracking-widest text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100 font-mono"
        >
          &larr; Home
        </Link>
      </div>
    </div>
  );
}
