'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Command as CommandPrimitive } from 'cmdk';
import {
  IconLayoutDashboard,
  IconGavel,
  IconFolder,
  IconChevronLeft,
  IconSearch,
  IconFilter,
  IconKeyboard,
} from '@/lib/mod-icons';

interface NavItem {
  label: string;
  href: string;
  shortcut?: string;
  icon: typeof IconLayoutDashboard;
}

interface ActionItem {
  label: string;
  action: () => void;
  icon: typeof IconLayoutDashboard;
}

interface CommandPaletteProps {
  onShowShortcuts?: () => void;
}

export function CommandPalette({ onShowShortcuts }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const guildId = params.guildId as string;

  const navItems: NavItem[] = [
    { label: 'Overview', href: `/mod/${guildId}`, shortcut: 'G O', icon: IconLayoutDashboard },
    { label: 'Cases', href: `/mod/${guildId}/cases`, shortcut: 'G C', icon: IconGavel },
    { label: 'All Evidence', href: `/mod/${guildId}/evidence`, shortcut: 'G E', icon: IconFolder },
    { label: 'Back to Servers', href: '/mod', shortcut: 'G S', icon: IconChevronLeft },
  ];

  const caseFilterActions: ActionItem[] = [
    { label: 'Cases: Filter by Ban', action: () => router.push(`/mod/${guildId}/cases?action=BAN`), icon: IconGavel },
    { label: 'Cases: Filter by Kick', action: () => router.push(`/mod/${guildId}/cases?action=KICK`), icon: IconGavel },
    { label: 'Cases: Filter by Timeout', action: () => router.push(`/mod/${guildId}/cases?action=TIMEOUT`), icon: IconGavel },
    { label: 'Cases: Filter by Warning', action: () => router.push(`/mod/${guildId}/cases?action=WARN`), icon: IconGavel },
    { label: 'Cases: Show Open only', action: () => router.push(`/mod/${guildId}/cases?status=OPEN`), icon: IconFilter },
    { label: 'Cases: Show Closed only', action: () => router.push(`/mod/${guildId}/cases?status=CLOSED`), icon: IconFilter },
    { label: 'Cases: Show Void only', action: () => router.push(`/mod/${guildId}/cases?status=VOID`), icon: IconFilter },
    { label: 'Cases: Clear all filters', action: () => router.push(`/mod/${guildId}/cases`), icon: IconGavel },
  ];

  const evidenceFilterActions: ActionItem[] = [
    { label: 'Evidence: Filter by Image', action: () => router.push(`/mod/${guildId}/evidence?type=IMAGE`), icon: IconFolder },
    { label: 'Evidence: Filter by Video', action: () => router.push(`/mod/${guildId}/evidence?type=VIDEO`), icon: IconFolder },
    { label: 'Evidence: Filter by URL', action: () => router.push(`/mod/${guildId}/evidence?type=URL`), icon: IconFolder },
    { label: 'Evidence: Filter by Snapshot', action: () => router.push(`/mod/${guildId}/evidence?type=MESSAGE_SNAPSHOT`), icon: IconFolder },
    { label: 'Evidence: Clear all filters', action: () => router.push(`/mod/${guildId}/evidence`), icon: IconFolder },
  ];

  const utilityActions: ActionItem[] = [
    { label: 'Show keyboard shortcuts', action: () => { setOpen(false); onShowShortcuts?.(); }, icon: IconKeyboard },
  ];

  // Toggle on Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleNavSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const handleActionSelect = useCallback(
    (action: () => void) => {
      setOpen(false);
      action();
    },
    []
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg border border-[var(--mod-border)] bg-[var(--mono-900)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CommandPrimitive
          className="flex flex-col"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
        >
          {/* Input */}
          <div className="flex items-center border-b border-[var(--mod-border)] px-4">
            <IconSearch size={16} className="shrink-0 text-[var(--mod-text-dim)]" />
            <CommandPrimitive.Input
              placeholder="Type a command..."
              className="flex-1 bg-transparent px-3 py-3 text-sm text-[var(--mono-white)] placeholder-[var(--mod-text-dim)] outline-none"
              style={{ fontFamily: 'var(--font-mono)' }}
              autoFocus
            />
          </div>

          {/* List */}
          <CommandPrimitive.List className="max-h-[300px] overflow-y-auto p-2">
            <CommandPrimitive.Empty className="py-6 text-center text-sm text-[var(--mod-text-dim)]">
              No results found.
            </CommandPrimitive.Empty>

            <CommandPrimitive.Group
              heading={
                <span
                  className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--mod-text-dim)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  NAVIGATION
                </span>
              }
            >
              {navItems.map((item) => (
                <CommandPrimitive.Item
                  key={item.href}
                  value={item.label}
                  onSelect={() => handleNavSelect(item.href)}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-[var(--mod-text-muted)] transition-[background-color] duration-75 data-[selected=true]:bg-[var(--mono-800)] data-[selected=true]:text-[var(--mono-white)]"
                >
                  <item.icon size={16} className="shrink-0 text-[var(--mod-text-dim)]" />
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <span
                      className="text-[10px] tracking-wider text-[var(--mod-text-dim)]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {item.shortcut}
                    </span>
                  )}
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.Group>

            <CommandPrimitive.Group
              heading={
                <span
                  className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--mod-text-dim)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  CASES
                </span>
              }
            >
              {caseFilterActions.map((item) => (
                <CommandPrimitive.Item
                  key={item.label}
                  value={item.label}
                  onSelect={() => handleActionSelect(item.action)}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-[var(--mod-text-muted)] transition-[background-color] duration-75 data-[selected=true]:bg-[var(--mono-800)] data-[selected=true]:text-[var(--mono-white)]"
                >
                  <item.icon size={16} className="shrink-0 text-[var(--mod-text-dim)]" />
                  <span className="flex-1">{item.label}</span>
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.Group>

            <CommandPrimitive.Group
              heading={
                <span
                  className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--mod-text-dim)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  EVIDENCE
                </span>
              }
            >
              {evidenceFilterActions.map((item) => (
                <CommandPrimitive.Item
                  key={item.label}
                  value={item.label}
                  onSelect={() => handleActionSelect(item.action)}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-[var(--mod-text-muted)] transition-[background-color] duration-75 data-[selected=true]:bg-[var(--mono-800)] data-[selected=true]:text-[var(--mono-white)]"
                >
                  <item.icon size={16} className="shrink-0 text-[var(--mod-text-dim)]" />
                  <span className="flex-1">{item.label}</span>
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.Group>

            <CommandPrimitive.Group
              heading={
                <span
                  className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--mod-text-dim)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  UTILITY
                </span>
              }
            >
              {utilityActions.map((item) => (
                <CommandPrimitive.Item
                  key={item.label}
                  value={item.label}
                  onSelect={() => handleActionSelect(item.action)}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-[var(--mod-text-muted)] transition-[background-color] duration-75 data-[selected=true]:bg-[var(--mono-800)] data-[selected=true]:text-[var(--mono-white)]"
                >
                  <item.icon size={16} className="shrink-0 text-[var(--mod-text-dim)]" />
                  <span className="flex-1">{item.label}</span>
                  <span
                    className="text-[10px] tracking-wider text-[var(--mod-text-dim)]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    ?
                  </span>
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.Group>
          </CommandPrimitive.List>
        </CommandPrimitive>
      </div>
    </div>
  );
}
