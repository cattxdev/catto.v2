'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCases } from '@/lib/services/mod.service';
import type { ModCase } from '@/lib/mod-types';

const ACTION_LABELS: Record<string, string> = {
  BAN: 'Ban', UNBAN: 'Unban', KICK: 'Kick', TIMEOUT: 'Timeout',
  WARN: 'Warning', SOFTBAN: 'Softban', TEMPBAN: 'Tempban',
  MUTE_TEXT: 'Mute (Text)', MUTE_VOICE: 'Mute (Voice)', MUTE_BOTH: 'Mute',
  UNMUTE_TEXT: 'Unmute (Text)', UNMUTE_VOICE: 'Unmute (Voice)', UNMUTE_BOTH: 'Unmute',
};

export default function CasesPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [cases, setCases] = useState<ModCase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCases(guildId, { page, limit: 25 })
      .then((data) => {
        setCases(data.cases);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId, page]);

  const totalPages = Math.ceil(total / 25) || 1;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--mono-white)]">Cases</h1>
      <p className="mb-6 text-sm text-[var(--mod-text-muted)]">{total} total cases</p>

      {loading ? (
        <div className="py-12 text-center text-[var(--mod-text-dim)]">Loading cases...</div>
      ) : cases.length === 0 ? (
        <div className="rounded-lg border border-[var(--mod-border)] bg-[var(--mod-surface)] p-8 text-center text-[var(--mod-text-muted)]">
          No cases found.
        </div>
      ) : (
        <div className="space-y-2">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/mod/${guildId}/cases/${c.caseNumber}`}
              className="flex items-center justify-between rounded-lg border border-[var(--mod-border)] bg-[var(--mod-surface)] p-4 transition-colors hover:border-[var(--mod-border-hover)] hover:bg-[var(--mod-surface-hover)]"
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
              <div className="flex items-center gap-4 text-xs text-[var(--mod-text-dim)]">
                <span className={`rounded-full border px-2 py-0.5 ${
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-[var(--mod-border)] px-3 py-1 text-sm text-[var(--mod-text-muted)] transition-colors hover:bg-[var(--mod-surface)] disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--mod-text-dim)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded border border-[var(--mod-border)] px-3 py-1 text-sm text-[var(--mod-text-muted)] transition-colors hover:bg-[var(--mod-surface)] disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
