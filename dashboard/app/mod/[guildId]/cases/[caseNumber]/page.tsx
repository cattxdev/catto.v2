'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCaseDetail, getEvidenceForCase } from '@/lib/services/mod.service';
import type { ModCase, Evidence, EvidenceSummary } from '@/lib/mod-types';
import { EvidenceGallery } from '@/components/mod/evidence-gallery';
import { EvidenceWizard } from '@/components/mod/evidence-wizard';

const ACTION_LABELS: Record<string, string> = {
  BAN: 'Ban', UNBAN: 'Unban', KICK: 'Kick', TIMEOUT: 'Timeout',
  WARN: 'Warning', SOFTBAN: 'Softban', TEMPBAN: 'Tempban',
  MUTE_TEXT: 'Mute (Text)', MUTE_VOICE: 'Mute (Voice)', MUTE_BOTH: 'Mute',
  UNMUTE_TEXT: 'Unmute (Text)', UNMUTE_VOICE: 'Unmute (Voice)', UNMUTE_BOTH: 'Unmute',
};

export default function CaseDetailPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const caseNumber = parseInt(params.caseNumber as string);
  const [modCase, setModCase] = useState<ModCase | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [summary, setSummary] = useState<EvidenceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getCaseDetail(guildId, caseNumber),
      getEvidenceForCase(guildId, caseNumber),
    ]).then(([caseData, evidenceData]) => {
      setModCase(caseData);
      setEvidence(evidenceData.evidence);
      setSummary(evidenceData.summary);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [guildId, caseNumber]);

  if (loading) {
    return <div className="py-12 text-center text-[var(--mod-text-dim)]">Loading case...</div>;
  }

  if (!modCase) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--mod-text-muted)]">Case #{caseNumber} not found.</p>
        <Link href={`/mod/${guildId}/cases`} className="mt-4 inline-block text-sm text-[var(--mod-text-dim)] underline">
          Back to cases
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href={`/mod/${guildId}/cases`} className="mb-2 inline-block text-xs text-[var(--mod-text-dim)] hover:text-[var(--mod-text-muted)]">
            ← Back to cases
          </Link>
          <h1 className="text-2xl font-bold text-[var(--mono-white)]">
            Case #{modCase.caseNumber}
          </h1>
          <p className="text-sm text-[var(--mod-text-muted)]">
            {ACTION_LABELS[modCase.action] ?? modCase.action} — {modCase.targetTag}
          </p>
        </div>
        <span className={` border px-3 py-1 text-xs ${
          modCase.status === 'OPEN' ? 'border-green-800 text-green-400'
          : modCase.status === 'VOID' ? 'border-red-800 text-red-400'
          : 'border-[var(--mono-700)] text-[var(--mod-text-dim)]'
        }`}>
          {modCase.status}
        </span>
      </div>

      {/* Case Details */}
      <div className="mb-8  border border-[var(--mod-border)] bg-[var(--mod-surface)] p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--mod-text-dim)]">Target</label>
            <p className="text-sm text-[var(--mono-white)]">{modCase.targetTag} <span className="text-[var(--mod-text-dim)]">({modCase.targetId})</span></p>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--mod-text-dim)]">Moderator</label>
            <p className="text-sm text-[var(--mono-white)]">{modCase.moderatorTag} <span className="text-[var(--mod-text-dim)]">({modCase.moderatorId})</span></p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wider text-[var(--mod-text-dim)]">Reason</label>
            <p className="text-sm text-[var(--mod-text)]">{modCase.reason ?? 'No reason provided'}</p>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--mod-text-dim)]">Created</label>
            <p className="text-sm text-[var(--mod-text)]">{new Date(modCase.createdAt).toLocaleString()}</p>
          </div>
          {modCase.duration && (
            <div>
              <label className="text-xs uppercase tracking-wider text-[var(--mod-text-dim)]">Duration</label>
              <p className="text-sm text-[var(--mod-text)]">{modCase.duration}s</p>
            </div>
          )}
        </div>
      </div>

      {/* Weak evidence warning */}
      {summary?.hasWeakEvidenceOnly && (
        <div className="mb-4  border border-yellow-800 bg-yellow-950/20 px-4 py-3 text-sm text-yellow-400">
          This case only has Discord message links as evidence. These may become unavailable if messages are deleted. Consider adding stronger evidence.
        </div>
      )}

      {/* Evidence Section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--mono-white)]">
          Evidence {summary ? `(${summary.total})` : ''}
        </h2>
        <Link
          href={`/mod/${guildId}/cases/${caseNumber}/evidence`}
          className="text-xs text-[var(--mod-text-dim)] underline hover:text-[var(--mod-text-muted)]"
        >
          Full evidence view →
        </Link>
      </div>

      <EvidenceGallery evidence={evidence} guildId={guildId} />

      {/* Upload */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-[var(--mono-white)]">Add Evidence</h2>
        <EvidenceWizard guildId={guildId} caseNumber={caseNumber} onUploadComplete={loadData} />
      </div>
    </div>
  );
}
