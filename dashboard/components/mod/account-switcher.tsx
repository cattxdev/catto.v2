'use client';

import { useState, useEffect, useRef } from 'react';
import { IconSettings } from '@/lib/mod-icons';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:4000';

interface UserInfo {
  id: string;
  username: string;
  avatar: string | null;
  global_name: string | null;
}

export function AccountSwitcher() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch user info from the existing bot API session endpoint
    fetch(`${BOT_API_URL}/api/users/@me`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    // Use the existing dashboard logout endpoint which clears DASHBOARD_AUTH
    fetch('/api/oauth/logout', { method: 'POST' })
      .then(() => {
        window.location.href = '/mod/login';
      })
      .catch(() => {
        window.location.href = '/mod/login';
      });
  };

  const handleSwitch = () => {
    // Set redirect cookie and open OAuth in popup
    document.cookie = `mod_auth_redirect=/mod; path=/; max-age=300; SameSite=Lax`;
    window.open(`${BOT_API_URL}/api/oauth/login`, 'auth', 'width=500,height=700');
  };

  if (!user) return null;

  const displayName = user.global_name || user.username;
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 border-t border-[var(--mod-border)] p-3 text-left transition-colors hover:bg-[var(--mono-850)]"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0" />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--mono-700)] text-xs text-[var(--mono-white)]">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="min-w-0 flex-1 truncate text-xs text-[var(--mono-white)]">{displayName}</span>
        <IconSettings size={14} className="shrink-0 text-[var(--mod-text-dim)]" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-full border border-[var(--mod-border)] bg-[var(--mono-900)] shadow-lg">
          <button
            onClick={handleSwitch}
            className="w-full px-3 py-2 text-left text-xs text-[var(--mod-text-muted)] transition-colors hover:bg-[var(--mono-850)]"
          >
            Switch Account
          </button>
          <button
            onClick={handleLogout}
            className="w-full border-t border-[var(--mod-border)] px-3 py-2 text-left text-xs text-red-400 transition-colors hover:bg-[var(--mono-850)]"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
