'use client';

import { useState } from 'react';
import { IconBrandDiscord } from '@/lib/mod-icons';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:4000';

export default function ModLoginPage() {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    document.cookie = `mod_auth_redirect=/mod; path=/; max-age=300; SameSite=Lax`;
    window.location.href = `${BOT_API_URL}/api/oauth/login`;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* ASCII decorative header */}
        <pre
          className="mb-8 text-center text-xs text-[var(--mono-500)] select-none"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
{`╔══════════════════════════════════╗
║   CATTO // MOD TERMINAL          ║
╚══════════════════════════════════╝`}
        </pre>

        <div className="border border-[var(--mod-border)] bg-[var(--mod-surface)] p-8">
          {/* Section label */}
          <p
            className="mb-4 text-xs uppercase tracking-[0.25em] text-[var(--mod-text-dim)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            AUTHENTICATE
          </p>

          <h1
            className="mb-2 text-xl font-bold text-[var(--mono-white)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Mod Dashboard
          </h1>
          <p className="mb-8 text-sm text-[var(--mod-text-dim)]" style={{ fontFamily: 'var(--font-mono)' }}>
            Authenticate to access moderation tools
          </p>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 border border-[var(--mono-500)] px-4 py-3 text-sm font-medium text-[var(--mono-white)] transition-[background-color] duration-75 hover:bg-[var(--mono-800)] disabled:opacity-50"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <IconBrandDiscord size={20} />
            {loading ? (
              'Redirecting...'
            ) : (
              <>
                Authenticate with Discord
                <span className="ml-1 animate-pulse">_</span>
              </>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-[var(--mod-text-dim)]" style={{ fontFamily: 'var(--font-mono)' }}>
            Only users with moderation permissions will be granted access.
          </p>
        </div>

        {/* Status bar */}
        <div
          className="mt-4 flex items-center justify-between border border-[var(--mod-border)] bg-[var(--mono-950)] px-4 py-2 text-xs text-[var(--mod-text-dim)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>SYSTEM READY</span>
          <span>// AWAITING AUTHENTICATION</span>
        </div>
      </div>
    </div>
  );
}
