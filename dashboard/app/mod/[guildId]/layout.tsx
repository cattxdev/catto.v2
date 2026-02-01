'use client';

import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { AccountSwitcher } from '@/components/mod/account-switcher';
import { ModBreadcrumb } from '@/components/mod/mod-breadcrumb';
import { CommandPalette } from '@/components/mod/command-palette';
import { ShortcutHelp } from '@/components/mod/shortcut-help';
import { useGuildInfo } from '@/hooks/use-guild-info';
import {
  IconLayoutDashboard,
  IconGavel,
  IconFolder,
  IconClipboardList,
  IconShieldCheck,
  IconFilter,
  IconMessageReport,
} from '@/lib/mod-icons';
import type { Icon } from '@tabler/icons-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: Icon;
  shortcut?: string;
  disabled?: boolean;
}

const MODERATION_NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', href: '', icon: IconLayoutDashboard, shortcut: 'G O' },
  { id: 'cases', label: 'Cases', href: '/cases', icon: IconGavel, shortcut: 'G C' },
  { id: 'evidence', label: 'All Evidence', href: '/evidence', icon: IconFolder, shortcut: 'G E' },
  { id: 'audit', label: 'Audit Log', href: '/audit', icon: IconClipboardList, disabled: true },
  { id: 'reports', label: 'Reports', href: '/reports', icon: IconMessageReport, disabled: true },
];

const CONFIG_NAV: NavItem[] = [
  { id: 'automod', label: 'Auto-Mod Rules', href: '/automod', icon: IconShieldCheck, disabled: true },
  { id: 'filters', label: 'Filters & Triggers', href: '/filters', icon: IconFilter, disabled: true },
  { id: 'settings', label: 'Settings', href: '/settings', icon: IconLayoutDashboard, disabled: true },
];

function SoonBadge() {
  return (
    <span
      className="ml-auto border px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
      style={{
        fontFamily: 'var(--font-mono)',
        background: 'var(--mod-soon-bg)',
        color: 'var(--mod-soon-text)',
        borderColor: 'var(--mod-soon-border)',
      }}
    >
      SOON
    </span>
  );
}

function NavSection({ label, items, basePath, pathname }: {
  label: string;
  items: NavItem[];
  basePath: string;
  pathname: string;
}) {
  return (
    <div className="mb-4">
      <p
        className="mb-1 px-3 text-[10px] uppercase tracking-[0.2em] text-[var(--mod-text-dim)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive =
            item.href === ''
              ? pathname === basePath
              : pathname.startsWith(href);

          if (item.disabled) {
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3 py-2 text-sm opacity-30"
              >
                <item.icon size={16} className="text-[var(--mod-text-dim)]" />
                <span className="text-[var(--mod-text-muted)]">{item.label}</span>
                <SoonBadge />
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              href={href}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-[background-color] duration-75 ${
                isActive
                  ? 'bg-[var(--mono-800)] text-[var(--mono-white)]'
                  : 'text-[var(--mod-text-muted)] hover:bg-[var(--mono-850)] hover:text-[var(--mod-text)]'
              }`}
            >
              <item.icon size={16} className={isActive ? 'text-[var(--mono-white)]' : 'text-[var(--mod-text-dim)]'} />
              <span>{item.label}</span>
              {item.shortcut && (
                <span
                  className="ml-auto text-[10px] tracking-wider text-[var(--mod-text-dim)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {item.shortcut}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export default function GuildModLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;
  const basePath = `/mod/${guildId}`;
  const guildInfo = useGuildInfo(guildId);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const gPressedRef = useRef(false);
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // G-prefix navigation shortcuts and ? for help
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // ? shows shortcut help
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }

      // G-prefix: first press sets flag, second press navigates
      if (e.key === 'g' || e.key === 'G') {
        if (!gPressedRef.current) {
          gPressedRef.current = true;
          // Reset after 1s if no second key
          if (gTimerRef.current) clearTimeout(gTimerRef.current);
          gTimerRef.current = setTimeout(() => {
            gPressedRef.current = false;
          }, 1000);
          return;
        }
      }

      if (gPressedRef.current) {
        gPressedRef.current = false;
        if (gTimerRef.current) clearTimeout(gTimerRef.current);

        switch (e.key) {
          case 'o':
          case 'O':
            e.preventDefault();
            router.push(`/mod/${guildId}`);
            break;
          case 'c':
          case 'C':
            e.preventDefault();
            router.push(`/mod/${guildId}/cases`);
            break;
          case 'e':
          case 'E':
            e.preventDefault();
            router.push(`/mod/${guildId}/evidence`);
            break;
          case 's':
          case 'S':
            e.preventDefault();
            router.push('/mod');
            break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (gTimerRef.current) clearTimeout(gTimerRef.current);
    };
  }, [guildId, router]);

  // Listen for custom event from command palette
  useEffect(() => {
    const handler = () => setShowShortcuts(true);
    window.addEventListener('mod:show-shortcuts', handler);
    return () => window.removeEventListener('mod:show-shortcuts', handler);
  }, []);

  const guildIconUrl = guildInfo?.icon
    ? `https://cdn.discordapp.com/icons/${guildId}/${guildInfo.icon}.png?size=64`
    : null;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-56 flex-col border-r border-[var(--mod-border)] bg-[var(--mod-surface)]">
        {/* Guild header */}
        <div className="border-b border-[var(--mod-border)] p-4">
          <Link
            href="/mod"
            className="mb-3 flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--mod-text-dim)] transition-[background-color] duration-75 hover:text-[var(--mod-text-muted)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            &larr; ALL SERVERS
          </Link>
          <div className="flex items-center gap-2">
            {guildIconUrl ? (
              <img src={guildIconUrl} alt="" className="h-8 w-8 shrink-0" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[var(--mono-700)] text-xs font-medium text-[var(--mono-white)]">
                {guildInfo?.name?.charAt(0) ?? '?'}
              </div>
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--mono-white)]">
              {guildInfo?.name ?? 'Loading...'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-auto p-2">
          <NavSection label="MODERATION" items={MODERATION_NAV} basePath={basePath} pathname={pathname} />
          <NavSection label="CONFIGURATION" items={CONFIG_NAV} basePath={basePath} pathname={pathname} />
        </nav>

        <AccountSwitcher />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <ModBreadcrumb />
          {children}
        </div>
      </main>

      {/* Command palette */}
      <CommandPalette />

      {/* Shortcut help modal */}
      {showShortcuts && <ShortcutHelp onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
