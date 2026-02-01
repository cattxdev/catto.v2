'use client';

import { useState } from 'react';
import { IconBrandDiscord } from '@/lib/mod-icons';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:4000';

export default function ModLoginPage() {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    // Use the existing bot-backend OAuth flow.
    // After Discord auth, the bot redirects to /api/auth/callback?token=...
    // which sets the DASHBOARD_AUTH cookie and redirects to the destination.
    // We store the intended redirect so the callback knows where to send us.
    document.cookie = `mod_auth_redirect=/mod; path=/; max-age=300; SameSite=Lax`;
    window.location.href = `${BOT_API_URL}/api/oauth/login`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm border border-[var(--mod-border)] bg-[var(--mod-surface)] p-8">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-xl font-bold text-[var(--mono-white)]" style={{ fontFamily: 'var(--font-mono)' }}>
            Mod Dashboard
          </h1>
          <p className="text-sm text-[var(--mod-text-dim)]">
            Authenticate to access moderation tools
          </p>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 border border-[var(--mono-500)] px-4 py-3 text-sm font-medium text-[var(--mono-white)] transition-colors hover:bg-[var(--mono-800)] disabled:opacity-50"
        >
          <IconBrandDiscord size={20} />
          {loading ? 'Redirecting...' : 'Authenticate with Discord'}
        </button>

        <p className="mt-4 text-center text-xs text-[var(--mod-text-dim)]">
          Only users with moderation permissions will be granted access.
        </p>
      </div>
    </div>
  );
}
