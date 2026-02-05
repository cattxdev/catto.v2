'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import useSWR from 'swr';
import { getGuildEvidence } from '@/lib/services/mod.service';
import type { Evidence } from '@/lib/mod-types';
import { EvidenceGallery } from '@/components/mod/evidence-gallery';

const EVIDENCE_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'URL', label: 'URL' },
  { value: 'DISCORD_URL', label: 'Discord Link' },
  { value: 'MESSAGE_SNAPSHOT', label: 'Snapshot' },
];

const PAGE_SIZE = 50;

export default function GuildEvidencePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const guildId = params.guildId as string;

  const typeParam = searchParams.get('type') ?? '';
  const caseParam = searchParams.get('case') ?? '';
  const pageParam = parseInt(searchParams.get('page') ?? '1') || 1;

  // Local state for immediate input feedback
  const [localCase, setLocalCase] = useState(caseParam);

  // Sync local state when URL params change externally
  useEffect(() => { setLocalCase(caseParam); }, [caseParam]);

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
      // Reset to page 1 when filters change (unless we're explicitly setting page)
      if (!('page' in updates)) {
        next.delete('page');
      }
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Debounced URL update for case input
  const debouncedUpdateCase = useDebouncedCallback((value: string) => {
    updateParams({ case: value || undefined });
  }, 300);

  const handleCaseChange = useCallback((value: string) => {
    setLocalCase(value);
    debouncedUpdateCase(value);
  }, [debouncedUpdateCase]);

  const { data: evidenceData, isLoading: loading, mutate } = useSWR(
    ['guild-evidence', guildId, typeParam, caseParam, pageParam],
    () => getGuildEvidence(guildId, {
      page: pageParam,
      limit: PAGE_SIZE,
      ...(typeParam && { type: typeParam }),
      ...(caseParam && { case: parseInt(caseParam) }),
    }),
    { keepPreviousData: true },
  );

  const evidence = evidenceData?.evidence ?? [];
  const total = evidenceData?.total ?? 0;
  const totalPages = evidenceData?.totalPages ?? 1;
  const handleRefresh = useCallback(() => { mutate(); }, [mutate]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--mono-white)]">All Evidence</h1>
      <p className="mb-6 text-sm text-[var(--mod-text-muted)]">
        {total} evidence item{total !== 1 ? 's' : ''} across all cases
      </p>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Type filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {EVIDENCE_TYPES.map((t) => {
            const isActive = typeParam === t.value;
            return (
              <button
                key={t.value}
                onClick={() => updateParams({ type: t.value || undefined })}
                className={`border px-2.5 py-1 text-xs transition-[background-color,border-color] duration-75 ${
                  isActive
                    ? 'border-[var(--mono-400)] bg-[var(--mono-800)] text-[var(--mono-white)]'
                    : 'border-[var(--mod-border)] text-[var(--mod-text-muted)] hover:border-[var(--mod-border-hover)] hover:text-[var(--mono-white)]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Case number input */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[var(--mod-text-dim)]">Case #</label>
          <input
            type="text"
            inputMode="numeric"
            value={localCase}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              handleCaseChange(val);
            }}
            placeholder="..."
            className="w-20 border border-[var(--mod-border)] bg-[var(--mono-950)] px-2 py-1 text-xs text-[var(--mono-white)] placeholder-[var(--mod-text-dim)] outline-none focus:border-[var(--mono-500)]"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-[var(--mod-text-dim)]">Loading evidence...</div>
      ) : evidence.length === 0 ? (
        <div className="border border-[var(--mod-border)] bg-[var(--mod-surface)] p-8 text-center text-[var(--mod-text-muted)]">
          {typeParam || caseParam
            ? 'No evidence matches the current filters.'
            : 'No evidence found across any cases.'}
        </div>
      ) : (
        <>
          <EvidenceGallery evidence={evidence} guildId={guildId} onEvidenceUpdated={handleRefresh} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => updateParams({ page: String(pageParam - 1) })}
                disabled={pageParam <= 1}
                className="border border-[var(--mod-border)] px-3 py-1.5 text-xs text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface-hover)] disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-xs text-[var(--mod-text-dim)]">
                Page {pageParam} of {totalPages}
              </span>
              <button
                onClick={() => updateParams({ page: String(pageParam + 1) })}
                disabled={pageParam >= totalPages}
                className="border border-[var(--mod-border)] px-3 py-1.5 text-xs text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface-hover)] disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
