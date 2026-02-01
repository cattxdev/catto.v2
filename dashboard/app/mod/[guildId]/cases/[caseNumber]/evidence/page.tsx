'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getEvidenceForCase } from '@/lib/services/mod.service';
import type { Evidence, EvidenceSummary } from '@/lib/mod-types';
import { EvidenceGallery } from '@/components/mod/evidence-gallery';
import { EvidenceWizard } from '@/components/mod/evidence-wizard';

export default function EvidencePage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const caseNumber = parseInt(params.caseNumber as string);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [summary, setSummary] = useState<EvidenceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    getEvidenceForCase(guildId, caseNumber)
      .then((data) => {
        setEvidence(data.evidence);
        setSummary(data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [guildId, caseNumber]);

  return (
    <div>
      <Link href={`/mod/${guildId}/cases/${caseNumber}`} className="mb-4 inline-block text-xs text-[var(--mod-text-dim)] hover:text-[var(--mod-text-muted)]">
        ← Back to case
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-[var(--mono-white)]">
        Evidence — Case #{caseNumber}
      </h1>
      <p className="mb-6 text-sm text-[var(--mod-text-muted)]">
        {summary?.total ?? 0} evidence item(s)
        {summary?.totalSizeBytes ? ` · ${(summary.totalSizeBytes / 1024 / 1024).toFixed(1)} MB` : ''}
      </p>

      {summary?.hasWeakEvidenceOnly && (
        <div className="mb-4  border border-yellow-800 bg-yellow-950/20 px-4 py-3 text-sm text-yellow-400">
          This case only has Discord message links. Consider adding stronger evidence.
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[var(--mod-text-dim)]">Loading evidence...</div>
      ) : (
        <EvidenceGallery evidence={evidence} guildId={guildId} />
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-[var(--mono-white)]">Upload Evidence</h2>
        <EvidenceWizard guildId={guildId} caseNumber={caseNumber} onUploadComplete={loadData} />
      </div>
    </div>
  );
}
