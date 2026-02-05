'use client';

import type { EvidenceAmendment } from '@/lib/mod-types';
import { AMENDMENT_ACTION_ICONS, IconNote } from '@/lib/mod-icons';

const ACTION_LABELS: Record<string, string> = {
  NOTE_ADDED: 'Note Added',
  DESCRIPTION_UPDATED: 'Description Updated',
  FLAGGED: 'Flagged',
  UNFLAGGED: 'Unflagged',
  STATUS_CHANGED: 'Status Changed',
};

const NODE_COLORS: Record<string, string> = {
  FLAGGED: 'var(--mod-warning)',
  UNFLAGGED: 'var(--mod-success)',
  NOTE_ADDED: 'var(--mono-500)',
  DESCRIPTION_UPDATED: 'var(--mono-400)',
  STATUS_CHANGED: 'var(--mono-400)',
};

interface AmendmentTimelineProps {
  amendments: EvidenceAmendment[];
}

export function AmendmentTimeline({ amendments }: AmendmentTimelineProps) {
  if (amendments.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-[var(--mod-text-muted)]">
        No amendments recorded.
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical trunk line */}
      <div
        className="absolute left-[5px] top-1 bottom-1 w-px"
        style={{ backgroundColor: 'var(--mod-border)' }}
      />

      {amendments.map((amendment, index) => {
        const ActionIcon = AMENDMENT_ACTION_ICONS[amendment.action] ?? IconNote;
        const label = ACTION_LABELS[amendment.action] ?? amendment.action;
        const nodeColor = NODE_COLORS[amendment.action] ?? 'var(--mono-800)';

        return (
          <div key={amendment.id} className="relative pb-5 last:pb-0">
            {/* Circle node */}
            <div
              className="absolute -left-6 top-1 flex h-3 w-3 items-center justify-center"
              style={{ left: '-1px' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5" fill={nodeColor} stroke="var(--mono-900)" strokeWidth="2" />
              </svg>
            </div>

            {/* Content card */}
            <div className="ml-3 border border-[var(--mod-border)] bg-[var(--mod-surface)] p-3">
              <div className="mb-1 flex items-center gap-2">
                <ActionIcon size={14} style={{ color: nodeColor }} />
                <span className="text-sm font-medium text-[var(--mono-white)]">{label}</span>
                <span className="ml-auto text-xs text-[var(--mod-text-dim)]">
                  {new Date(amendment.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="mb-1 text-xs text-[var(--mod-text-dim)]">
                by {amendment.amendedByTag}
              </p>

              {amendment.reason && (
                <p className="mt-2 text-sm text-[var(--mod-text-muted)]">
                  {amendment.reason}
                </p>
              )}

              {amendment.previousValue && (
                <div className="mt-2 bg-[var(--mono-950)] p-2 text-xs">
                  <span className="text-[var(--mod-text-dim)]">Previous: </span>
                  <span className="text-red-400 line-through">{amendment.previousValue}</span>
                </div>
              )}

              {amendment.newValue && (
                <div className="mt-1 bg-[var(--mono-950)] p-2 text-xs">
                  <span className="text-[var(--mod-text-dim)]">New: </span>
                  <span className="text-green-400">{amendment.newValue}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
