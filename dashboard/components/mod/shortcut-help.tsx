'use client';

import { useEffect } from 'react';
import { IconX, IconKeyboard } from '@/lib/mod-icons';

interface ShortcutHelpProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'j', description: 'Navigate down in gallery' },
  { key: 'k', description: 'Navigate up in gallery' },
  { key: 'Enter', description: 'Open selected evidence' },
  { key: 'd', description: 'Download selected evidence' },
  { key: 'h', description: 'View amendment history' },
  { key: 'a', description: 'Amend selected evidence' },
  { key: 'n', description: 'Open new evidence wizard' },
  { key: '?', description: 'Show this help' },
  { key: 'Esc', description: 'Close modal / deselect' },
];

export function ShortcutHelp({ onClose }: ShortcutHelpProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md border border-[var(--mod-border)] bg-[var(--mono-900)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconKeyboard size={20} className="text-[var(--mono-400)]" />
            <h2 className="text-lg font-semibold text-[var(--mono-white)]">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--mod-text-dim)] transition-colors hover:bg-[var(--mod-surface-hover)] hover:text-[var(--mono-white)]"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="space-y-0 divide-y divide-[var(--mod-border)]">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-[var(--mod-text-muted)]">{s.description}</span>
              <kbd className="border border-[var(--mono-700)] bg-[var(--mono-850)] px-2 py-0.5 text-xs text-[var(--mono-300)]" style={{ fontFamily: 'var(--font-mono)' }}>
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-[var(--mod-text-dim)]">
          Shortcuts are disabled when a text input is focused.
        </p>
      </div>
    </div>
  );
}
