'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { AccountSwitcher } from '@/components/mod/account-switcher';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', href: '' },
  { id: 'cases', label: 'Cases', href: '/cases' },
  { id: 'evidence', label: 'All Evidence', href: '/evidence' },
];

export default function GuildModLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const guildId = params.guildId as string;
  const basePath = `/mod/${guildId}`;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-56 flex-col border-r border-[var(--mod-border)] bg-[var(--mod-surface)]">
        <div className="border-b border-[var(--mod-border)] p-4">
          <Link href="/mod" className="text-xs uppercase tracking-widest text-[var(--mod-text-dim)] hover:text-[var(--mod-text-muted)]">
            ← Servers
          </Link>
          <h2 className="mt-2 text-sm font-semibold text-[var(--mono-white)]">Moderation</h2>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV_ITEMS.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive =
              item.href === ''
                ? pathname === basePath
                : pathname.startsWith(href);

            return (
              <Link
                key={item.id}
                href={href}
                className={`block  px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--mono-800)] text-[var(--mono-white)]'
                    : 'text-[var(--mod-text-muted)] hover:bg-[var(--mono-850)] hover:text-[var(--mod-text)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <AccountSwitcher />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
