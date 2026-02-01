'use client';

import { useState, useCallback, useRef } from 'react';
import type { Evidence } from '@/lib/mod-types';
import { EVIDENCE_TYPE_META, EVIDENCE_STATUS_META } from '@/lib/mod-types';
import { EVIDENCE_TYPE_ICONS, IconEye, IconHistory, IconDownload, IconPencil, IconX, IconFlag, IconNote, IconCheck } from '@/lib/mod-icons';
import { EvidenceViewer } from './evidence-viewer';
import { EvidenceHistory } from './evidence-history';
import { ShortcutHelp } from './shortcut-help';
import { getEvidenceDownloadUrl, amendEvidence } from '@/lib/services/mod.service';
import { useModShortcuts } from '@/hooks/use-mod-shortcuts';

interface EvidenceGalleryProps {
  evidence: Evidence[];
  guildId: string;
  onEvidenceUpdated?: () => void;
}

export function EvidenceGallery({ evidence, guildId, onEvidenceUpdated }: EvidenceGalleryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [amendingId, setAmendingId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);

  const hasSelection = selectedIds.size > 0;

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownload = async (item: Evidence) => {
    try {
      const url = await getEvidenceDownloadUrl(guildId, item.id);
      if (url) window.open(url, '_blank');
    } catch {
      // silent
    }
  };

  const handleBulkFlag = async () => {
    setBulkSubmitting(true);
    try {
      for (const id of selectedIds) {
        await amendEvidence(guildId, id, { action: 'FLAGGED', reason: 'Bulk flagged' });
      }
      setSelectedIds(new Set());
      onEvidenceUpdated?.();
    } catch {
      // silent
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkDownload = async () => {
    for (const id of selectedIds) {
      const item = evidence.find((e) => e.id === id);
      if (item?.storageKey) await handleDownload(item);
    }
  };

  const handleBulkNote = async (note: string) => {
    setBulkSubmitting(true);
    try {
      for (const id of selectedIds) {
        await amendEvidence(guildId, id, { action: 'NOTE_ADDED', reason: note });
      }
      setSelectedIds(new Set());
      setBulkAction(null);
      onEvidenceUpdated?.();
    } catch {
      // silent
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Keyboard shortcuts
  useModShortcuts({
    onNavigateDown: useCallback(() => {
      setFocusIndex((i) => Math.min(i + 1, evidence.length - 1));
    }, [evidence.length]),
    onNavigateUp: useCallback(() => {
      setFocusIndex((i) => Math.max(i - 1, 0));
    }, []),
    onOpen: useCallback(() => {
      if (evidence[focusIndex]) setSelectedId(evidence[focusIndex].id);
    }, [evidence, focusIndex]),
    onDownload: useCallback(() => {
      if (evidence[focusIndex]?.storageKey) handleDownload(evidence[focusIndex]);
    }, [evidence, focusIndex]),
    onHistory: useCallback(() => {
      if (evidence[focusIndex]) setShowHistory(evidence[focusIndex].id);
    }, [evidence, focusIndex]),
    onAmend: useCallback(() => {
      if (evidence[focusIndex]) setAmendingId(evidence[focusIndex].id);
    }, [evidence, focusIndex]),
    onHelp: useCallback(() => {
      setShowHelp((prev) => !prev);
    }, []),
  });

  if (evidence.length === 0) {
    return (
      <div className="border border-[var(--mod-border)] bg-[var(--mod-surface)] p-8 text-center text-[var(--mod-text-muted)]">
        No evidence has been added yet.
      </div>
    );
  }

  return (
    <>
      <div ref={galleryRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {evidence.map((item, index) => {
          const typeMeta = EVIDENCE_TYPE_META[item.type];
          const statusMeta = EVIDENCE_STATUS_META[item.status];
          const TypeIcon = EVIDENCE_TYPE_ICONS[item.type];
          const isFocused = index === focusIndex;
          const isChecked = selectedIds.has(item.id);

          return (
            <div
              key={item.id}
              className={`relative border bg-[var(--mod-surface)] p-4 transition-[background-color,border-color] duration-75 hover:border-[var(--mod-border-hover)] ${
                isFocused ? 'border-[var(--mono-500)]' : 'border-[var(--mod-border)]'
              }`}
              onClick={() => setFocusIndex(index)}
            >
              {/* Selection checkbox */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}
                className={`absolute right-2 top-2 flex h-4 w-4 items-center justify-center border transition-[background-color,border-color] duration-75 ${
                  isChecked
                    ? 'border-[var(--mono-400)] bg-[var(--mono-700)]'
                    : hasSelection
                      ? 'border-[var(--mod-border)]'
                      : 'border-[var(--mod-border)] opacity-0 group-hover:opacity-100 hover:opacity-100'
                } ${!hasSelection ? 'hover:opacity-100' : ''}`}
                style={{ opacity: hasSelection || isChecked ? 1 : undefined }}
              >
                {isChecked && <IconCheck size={10} className="text-[var(--mono-white)]" />}
              </button>

              {/* Header */}
              <div className="mb-3 flex items-center justify-between pr-5">
                <TypeIcon size={20} className={typeMeta.className} />
                <span className={`border px-2 py-0.5 text-xs ${statusMeta.className}`}>
                  {statusMeta.label}
                </span>
              </div>

              {/* Type label */}
              <p className="mb-1 text-sm font-medium text-[var(--mono-white)]">
                {typeMeta.label}
              </p>

              {/* Filename or URL */}
              <p className="mb-2 truncate text-xs text-[var(--mod-text-dim)]">
                {item.originalFilename ?? item.url ?? item.description ?? item.id}
              </p>

              {/* Description */}
              {item.description && (
                <p className="mb-2 text-xs text-[var(--mod-text-muted)] line-clamp-2">
                  {item.description}
                </p>
              )}

              {/* Meta */}
              <div className="mb-3 flex items-center gap-2 text-xs text-[var(--mod-text-dim)]">
                {item.sizeBytes && (
                  <span>{(item.sizeBytes / 1024).toFixed(1)} KB</span>
                )}
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Footer */}
              <p className="mb-3 text-xs text-[var(--mod-text-dim)]">
                by {item.uploadedByTag}
              </p>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {(item.storageKey || item.url || item.snapshotId) && (
                  <button
                    onClick={() => setSelectedId(item.id)}
                    className="flex items-center gap-1 border border-[var(--mod-border)] px-2 py-1 text-xs text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface-hover)]"
                  >
                    <IconEye size={14} />
                    View
                  </button>
                )}
                {item.storageKey && (
                  <button
                    onClick={() => handleDownload(item)}
                    className="flex items-center gap-1 border border-[var(--mod-border)] px-2 py-1 text-xs text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface-hover)]"
                  >
                    <IconDownload size={14} />
                    Download
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(item.id)}
                  className="flex items-center gap-1 border border-[var(--mod-border)] px-2 py-1 text-xs text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface-hover)]"
                >
                  <IconHistory size={14} />
                  History
                </button>
                <button
                  onClick={() => setAmendingId(amendingId === item.id ? null : item.id)}
                  className="flex items-center gap-1 border border-[var(--mod-border)] px-2 py-1 text-xs text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface-hover)]"
                >
                  <IconPencil size={14} />
                  Amend
                </button>
              </div>

              {/* Inline amend modal */}
              {amendingId === item.id && (
                <InlineAmendForm
                  guildId={guildId}
                  evidenceId={item.id}
                  onClose={() => setAmendingId(null)}
                  onAmended={() => {
                    setAmendingId(null);
                    onEvidenceUpdated?.();
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {hasSelection && (
        <div className="sticky bottom-0 mt-3 flex items-center gap-3 border border-[var(--mod-border)] bg-[var(--mono-900)] px-4 py-3">
          <span className="text-xs text-[var(--mod-text-muted)]">{selectedIds.size} selected</span>
          <button
            onClick={handleBulkFlag}
            disabled={bulkSubmitting}
            className="flex items-center gap-1 border border-[var(--mod-border)] px-3 py-1 text-xs text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface-hover)] disabled:opacity-30"
          >
            <IconFlag size={14} />
            Flag Selected
          </button>
          <button
            onClick={handleBulkDownload}
            className="flex items-center gap-1 border border-[var(--mod-border)] px-3 py-1 text-xs text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface-hover)]"
          >
            <IconDownload size={14} />
            Download Selected
          </button>
          <button
            onClick={() => setBulkAction('note')}
            className="flex items-center gap-1 border border-[var(--mod-border)] px-3 py-1 text-xs text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface-hover)]"
          >
            <IconNote size={14} />
            Add Note to Selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-[var(--mod-text-dim)] hover:text-[var(--mono-white)]"
          >
            Clear
          </button>
        </div>
      )}

      {/* Bulk note modal */}
      {bulkAction === 'note' && (
        <BulkNoteModal
          count={selectedIds.size}
          onSubmit={handleBulkNote}
          onClose={() => setBulkAction(null)}
          submitting={bulkSubmitting}
        />
      )}

      {/* Viewer Modal */}
      {selectedId && (
        <EvidenceViewer
          guildId={guildId}
          evidenceId={selectedId}
          evidence={evidence.find((e) => e.id === selectedId)!}
          onClose={() => setSelectedId(null)}
          onDownload={
            evidence.find((e) => e.id === selectedId)?.storageKey
              ? () => handleDownload(evidence.find((e) => e.id === selectedId)!)
              : undefined
          }
        />
      )}

      {/* History Modal */}
      {showHistory && (
        <EvidenceHistory
          guildId={guildId}
          evidenceId={showHistory}
          onClose={() => setShowHistory(null)}
        />
      )}

      {/* Shortcut help */}
      {showHelp && <ShortcutHelp onClose={() => setShowHelp(false)} />}
    </>
  );
}

function InlineAmendForm({
  guildId,
  evidenceId,
  onClose,
  onAmended,
}: {
  guildId: string;
  evidenceId: string;
  onClose: () => void;
  onAmended: () => void;
}) {
  const [action, setAction] = useState('NOTE_ADDED');
  const [reason, setReason] = useState('');
  const [newValue, setNewValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await amendEvidence(guildId, evidenceId, {
        action,
        newValue: newValue.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      onAmended();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 border border-[var(--mod-border)] bg-[var(--mono-950)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--mono-white)]">Amend Evidence</span>
        <button onClick={onClose} className="text-[var(--mod-text-dim)] hover:text-[var(--mono-white)]">
          <IconX size={14} />
        </button>
      </div>
      <div className="space-y-2">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="w-full border border-[var(--mod-border)] bg-[var(--mono-900)] px-2 py-1 text-xs text-[var(--mono-white)] outline-none"
        >
          <option value="NOTE_ADDED">Add Note</option>
          <option value="DESCRIPTION_UPDATED">Update Description</option>
          <option value="FLAGGED">Flag</option>
          <option value="UNFLAGGED">Unflag</option>
        </select>

        {action === 'DESCRIPTION_UPDATED' && (
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="New description..."
            className="w-full border border-[var(--mod-border)] bg-[var(--mono-900)] px-2 py-1 text-xs text-[var(--mono-white)] placeholder-[var(--mod-text-dim)] outline-none"
          />
        )}

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason..."
          rows={2}
          className="w-full border border-[var(--mod-border)] bg-[var(--mono-900)] px-2 py-1 text-xs text-[var(--mono-white)] placeholder-[var(--mod-text-dim)] outline-none"
        />

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="border border-[var(--mono-500)] px-3 py-1 text-xs text-[var(--mono-white)] transition-[background-color] duration-75 hover:bg-[var(--mono-800)] disabled:opacity-30"
        >
          {submitting ? 'Submitting...' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}

function BulkNoteModal({
  count,
  onSubmit,
  onClose,
  submitting,
}: {
  count: number;
  onSubmit: (note: string) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-sm border border-[var(--mod-border)] bg-[var(--mono-900)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-sm font-medium text-[var(--mono-white)]">
          Add Note to {count} item{count !== 1 ? 's' : ''}
        </h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note..."
          rows={3}
          className="w-full border border-[var(--mod-border)] bg-[var(--mono-950)] px-3 py-2 text-sm text-[var(--mono-white)] placeholder-[var(--mod-text-dim)] outline-none focus:border-[var(--mono-500)]"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onSubmit(note)}
            disabled={submitting || !note.trim()}
            className="border border-[var(--mono-500)] px-4 py-1.5 text-xs text-[var(--mono-white)] transition-[background-color] duration-75 hover:bg-[var(--mono-800)] disabled:opacity-30"
          >
            {submitting ? 'Adding...' : 'Add Note'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-[var(--mod-text-dim)] hover:text-[var(--mono-white)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
