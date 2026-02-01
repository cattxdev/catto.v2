'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getEvidenceForCase, getCases } from '@/lib/services/mod.service';
import type { Evidence, EvidenceSummary, ModCase } from '@/lib/mod-types';
import { EvidenceGallery } from '@/components/mod/evidence-gallery';

export default function GuildEvidencePage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [allEvidence, setAllEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [caseFilter, setCaseFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [cases, setCases] = useState<ModCase[]>([]);

  useEffect(() => {
    setLoading(true);
    // Load cases to populate filter and to fetch evidence per case
    getCases(guildId, { limit: 100 })
      .then(async (data) => {
        setCases(data.cases);

        // Fetch evidence for all cases
        const results = await Promise.allSettled(
          data.cases.map((c) => getEvidenceForCase(guildId, c.caseNumber))
        );

        const evidence: Evidence[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled') {
            evidence.push(...r.value.evidence);
          }
        }

        // Sort by newest first
        evidence.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllEvidence(evidence);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const filtered = allEvidence.filter((e) => {
    if (caseFilter && e.caseNumber !== parseInt(caseFilter)) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    return true;
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--mono-white)]">All Evidence</h1>
      <p className="mb-6 text-sm text-[var(--mod-text-muted)]">
        {allEvidence.length} evidence item(s) across all cases
      </p>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={caseFilter}
          onChange={(e) => setCaseFilter(e.target.value)}
          className="rounded border border-[var(--mod-border)] bg-[var(--mono-950)] px-3 py-1.5 text-sm text-[var(--mono-white)] outline-none"
        >
          <option value="">All Cases</option>
          {cases.map((c) => (
            <option key={c.id} value={c.caseNumber}>
              Case #{c.caseNumber}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-[var(--mod-border)] bg-[var(--mono-950)] px-3 py-1.5 text-sm text-[var(--mono-white)] outline-none"
        >
          <option value="">All Types</option>
          <option value="IMAGE">Image</option>
          <option value="VIDEO">Video</option>
          <option value="AUDIO">Audio</option>
          <option value="DOCUMENT">Document</option>
          <option value="URL">URL</option>
          <option value="DISCORD_URL">Discord Link</option>
          <option value="MESSAGE_SNAPSHOT">Snapshot</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-[var(--mod-text-dim)]">Loading evidence...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--mod-border)] bg-[var(--mod-surface)] p-8 text-center text-[var(--mod-text-muted)]">
          {allEvidence.length === 0 ? 'No evidence found across any cases.' : 'No evidence matches the current filters.'}
        </div>
      ) : (
        <EvidenceGallery evidence={filtered} guildId={guildId} />
      )}
    </div>
  );
}
