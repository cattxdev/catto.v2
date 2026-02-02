'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getCases } from '@/lib/services/mod.service';
import type { ModCase } from '@/lib/mod-types';

const ACTION_LABELS: Record<string, string> = {
  BAN: 'Ban', UNBAN: 'Unban', KICK: 'Kick', TIMEOUT: 'Timeout',
  WARN: 'Warning', SOFTBAN: 'Softban', TEMPBAN: 'Tempban',
  MUTE_TEXT: 'Mute (Text)', MUTE_VOICE: 'Mute (Voice)', MUTE_BOTH: 'Mute',
  UNMUTE_TEXT: 'Unmute (Text)', UNMUTE_VOICE: 'Unmute (Voice)', UNMUTE_BOTH: 'Unmute',
};

const ACTION_FILTERS = [
  { value: '', label: 'All Actions' },
  { value: 'BAN', label: 'Ban' },
  { value: 'KICK', label: 'Kick' },
  { value: 'TIMEOUT', label: 'Timeout' },
  { value: 'WARN', label: 'Warning' },
  { value: 'SOFTBAN', label: 'Softban' },
  { value: 'TEMPBAN', label: 'Tempban' },
  { value: 'UNBAN', label: 'Unban' },
  { value: 'MUTE_BOTH', label: 'Mute' },
  { value: 'UNMUTE_BOTH', label: 'Unmute' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'VOID', label: 'Void' },
];

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'caseNumber:desc', label: 'Case # (high-low)' },
  { value: 'caseNumber:asc', label: 'Case # (low-high)' },
];

const PAGE_SIZE = 25;

function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export default function CasesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const guildId = params.guildId as string;

  const actionParam = searchParams.get('action') ?? '';
  const statusParam = searchParams.get('status') ?? '';
  const sortParam = searchParams.get('sort') ?? 'createdAt:desc';
  const searchParam = searchParams.get('search') ?? '';
  const pageParam = parseInt(searchParams.get('page') ?? '1') || 1;

  const [cases, setCases] = useState<ModCase[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [focusIndex, setFocusIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const casesRef = useRef(cases);
  casesRef.current = cases;
  const focusIndexRef = useRef(focusIndex);
  focusIndexRef.current = focusIndex;

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      if (!('page' in updates)) {
        next.delete('page');
      }
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  useEffect(() => {
    setLoading(true);
    const [sortField, sortOrder] = sortParam.split(':');
    const fetchParams: Record<string, unknown> = {
      page: pageParam,
      limit: PAGE_SIZE,
      sort: sortField,
      order: sortOrder,
    };
    if (actionParam) fetchParams.action = actionParam;
    if (statusParam) fetchParams.status = statusParam;
    if (searchParam) fetchParams.search = searchParam;

    getCases(guildId, fetchParams as Parameters<typeof getCases>[1])
      .then((data) => {
        setCases(data.cases);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setFocusIndex(0);
      })
      .catch(() => {
        setCases([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [guildId, actionParam, statusParam, sortParam, searchParam, pageParam]);

  // Keyboard shortcuts for case list navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case 'j':
          e.preventDefault();
          setFocusIndex((i) => Math.min(i + 1, casesRef.current.length - 1));
          break;
        case 'k':
          e.preventDefault();
          setFocusIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter': {
          e.preventDefault();
          const c = casesRef.current[focusIndexRef.current];
          if (c) router.push(`/mod/${guildId}/cases/${c.caseNumber}`);
          break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [guildId, router]);

  // Scroll focused item into view
  useEffect(() => {
    const el = listRef.current?.children[focusIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusIndex]);

  const hasFilters = actionParam || statusParam || searchParam;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--mono-white)]">Cases</h1>
      <p className="mb-6 text-sm text-[var(--mod-text-muted)]">{total} total cases</p>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3">
        {/* Action filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {ACTION_FILTERS.map((f) => {
            const isActive = actionParam === f.value;
            return (
              <button
                key={f.value}
                onClick={() => updateParams({ action: f.value || undefined })}
                className={`border px-2.5 py-1 text-xs transition-[background-color,border-color] duration-75 ${
                  isActive
                    ? 'border-[var(--mono-400)] bg-[var(--mono-800)] text-[var(--mono-white)]'
                    : 'border-[var(--mod-border)] text-[var(--mod-text-muted)] hover:border-[var(--mod-border-hover)] hover:text-[var(--mono-white)]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Status + Sort + Search row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status chips */}
          <div className="flex gap-1.5">
            {STATUS_FILTERS.map((f) => {
              const isActive = statusParam === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => updateParams({ status: f.value || undefined })}
                  className={`border px-2.5 py-1 text-xs transition-[background-color,border-color] duration-75 ${
                    isActive
                      ? 'border-[var(--mono-400)] bg-[var(--mono-800)] text-[var(--mono-white)]'
                      : 'border-[var(--mod-border)] text-[var(--mod-text-muted)] hover:border-[var(--mod-border-hover)] hover:text-[var(--mono-white)]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Sort select */}
          <select
            value={sortParam}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="border border-[var(--mod-border)] bg-[var(--mono-950)] px-2 py-1 text-xs text-[var(--mono-white)] outline-none focus:border-[var(--mono-500)]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Search input */}
          <input
            type="text"
            value={searchParam}
            onChange={(e) => updateParams({ search: e.target.value || undefined })}
            placeholder="Search target..."
            className="w-40 border border-[var(--mod-border)] bg-[var(--mono-950)] px-2 py-1 text-xs text-[var(--mono-white)] placeholder-[var(--mod-text-dim)] outline-none focus:border-[var(--mono-500)]"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-[var(--mod-text-dim)]">Loading cases...</div>
      ) : cases.length === 0 ? (
        <div className="border border-[var(--mod-border)] bg-[var(--mod-surface)] p-8 text-center text-[var(--mod-text-muted)]">
          {hasFilters ? 'No cases match the current filters.' : 'No cases found.'}
        </div>
      ) : (
        <div ref={listRef} className="space-y-2">
          {cases.map((c, index) => (
            <Link
              key={c.id}
              href={`/mod/${guildId}/cases/${c.caseNumber}`}
              className={`flex flex-col gap-2 border bg-[var(--mod-surface)] p-4 transition-[background-color,border-color] duration-75 hover:border-[var(--mod-border-hover)] hover:bg-[var(--mod-surface-hover)] md:flex-row md:items-center md:justify-between md:gap-4 ${
                index === focusIndex
                  ? 'border-[var(--mono-500)]'
                  : 'border-[var(--mod-border)]'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono font-medium text-[var(--mod-text-dim)]">
                  #{c.caseNumber}
                </span>
                <div>
                  <span className="text-sm font-medium text-[var(--mono-white)]">
                    {ACTION_LABELS[c.action] ?? c.action}
                  </span>
                  <span className="ml-2 text-sm text-[var(--mod-text-muted)]">
                    {c.targetTag}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--mod-text-dim)] md:justify-end">
                <span className={`border px-2 py-0.5 ${
                  c.status === 'OPEN' ? 'border-green-800 text-green-400'
                  : c.status === 'VOID' ? 'border-red-800 text-red-400'
                  : 'border-[var(--mono-700)] text-[var(--mod-text-dim)]'
                }`}>
                  {c.status}
                </span>
                <span>{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => updateParams({ page: String(pageParam - 1) })}
            disabled={pageParam <= 1}
            className="border border-[var(--mod-border)] px-3 py-1 text-sm text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface)] disabled:opacity-30"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Previous
          </button>
          <span className="text-sm text-[var(--mod-text-dim)]" style={{ fontFamily: 'var(--font-mono)' }}>
            Page {pageParam} of {totalPages}
          </span>
          <button
            onClick={() => updateParams({ page: String(pageParam + 1) })}
            disabled={pageParam >= totalPages}
            className="border border-[var(--mod-border)] px-3 py-1 text-sm text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface)] disabled:opacity-30"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
