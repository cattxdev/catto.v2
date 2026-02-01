'use client';

import { useEffect, useState } from 'react';
import type { Evidence, EvidenceAmendment } from '@/lib/mod-types';
import { EVIDENCE_TYPE_META } from '@/lib/mod-types';
import { getEvidenceViewUrl, getEvidenceHistory, amendEvidence } from '@/lib/services/mod.service';
import { EVIDENCE_TYPE_ICONS, IconX, IconDownload, IconLink, IconBrandDiscord, IconFile, IconVolume } from '@/lib/mod-icons';
import { SnapshotViewer } from './snapshot-viewer';
import { AmendmentTimeline } from './amendment-timeline';

interface EvidenceViewerProps {
  guildId: string;
  evidenceId: string;
  evidence: Evidence;
  onClose: () => void;
  onDownload?: () => void;
}

type ViewerTab = 'details' | 'history' | 'amend';

export function EvidenceViewer({ guildId, evidenceId, evidence, onClose, onDownload }: EvidenceViewerProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewerTab>('details');
  const [amendments, setAmendments] = useState<EvidenceAmendment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Amend form state
  const [amendAction, setAmendAction] = useState('NOTE_ADDED');
  const [amendReason, setAmendReason] = useState('');
  const [amendNewValue, setAmendNewValue] = useState('');
  const [amendSubmitting, setAmendSubmitting] = useState(false);

  useEffect(() => {
    if (evidence.type === 'URL' || evidence.type === 'DISCORD_URL') {
      setViewUrl(evidence.url);
      setLoading(false);
      return;
    }

    if (evidence.snapshotId && evidence.type === 'MESSAGE_SNAPSHOT') {
      setLoading(false);
      return;
    }

    if (evidence.storageKey) {
      getEvidenceViewUrl(guildId, evidenceId)
        .then((url) => {
          if (url) setViewUrl(url);
          else setError('Could not generate view URL.');
        })
        .catch(() => setError('Failed to load evidence.'))
        .finally(() => setLoading(false));
      return;
    }

    setLoading(false);
  }, [guildId, evidenceId, evidence]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const loadHistory = () => {
    setHistoryLoading(true);
    getEvidenceHistory(guildId, evidenceId)
      .then(setAmendments)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  const handleAmendSubmit = async () => {
    setAmendSubmitting(true);
    try {
      await amendEvidence(guildId, evidenceId, {
        action: amendAction,
        newValue: amendNewValue.trim() || undefined,
        reason: amendReason.trim() || undefined,
      });
      setAmendReason('');
      setAmendNewValue('');
      setActiveTab('history');
      loadHistory();
    } catch {
      // silent
    } finally {
      setAmendSubmitting(false);
    }
  };

  const typeMeta = EVIDENCE_TYPE_META[evidence.type];
  const TypeIcon = EVIDENCE_TYPE_ICONS[evidence.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="relative mx-4 max-h-[90vh] w-full max-w-4xl overflow-auto border border-[var(--mod-border)] bg-[var(--mono-900)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TypeIcon size={20} className={typeMeta.className} />
            <h2 className="text-lg font-semibold text-[var(--mono-white)]">{typeMeta.label}</h2>
            {evidence.originalFilename && (
              <span className="text-sm text-[var(--mod-text-dim)]">— {evidence.originalFilename}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-1 text-[var(--mod-text-dim)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface-hover)] hover:text-[var(--mono-white)]"
                title="Download"
              >
                <IconDownload size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-[var(--mod-text-dim)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface-hover)] hover:text-[var(--mono-white)]"
            >
              <IconX size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[200px]">
          {loading && (
            <div className="flex h-[200px] items-center justify-center text-[var(--mod-text-dim)]">
              Loading...
            </div>
          )}

          {error && (
            <div className="flex h-[200px] items-center justify-center text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && renderContent(evidence, viewUrl)}
        </div>

        {/* Tabbed bottom section */}
        <div className="mt-4 border-t border-[var(--mod-border)]">
          <div className="flex border-b border-[var(--mod-border)]">
            {(['details', 'history', 'amend'] as ViewerTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium transition-[background-color] duration-75 ${
                  activeTab === tab
                    ? 'border-b-2 border-[var(--mono-white)] text-[var(--mono-white)]'
                    : 'text-[var(--mod-text-dim)] hover:text-[var(--mod-text-muted)]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="pt-4">
            {/* Details tab */}
            {activeTab === 'details' && (
              <div>
                <div className="flex flex-wrap gap-4 text-xs text-[var(--mod-text-dim)]">
                  <span>Uploaded by {evidence.uploadedByTag}</span>
                  <span>{new Date(evidence.createdAt).toLocaleString()}</span>
                  {evidence.sizeBytes && <span>{(evidence.sizeBytes / 1024).toFixed(1)} KB</span>}
                  {evidence.contentHash && (
                    <span className="font-mono">SHA-256: {evidence.contentHash.slice(0, 16)}...</span>
                  )}
                  {evidence.status === 'VERIFIED' && (
                    <span className="text-green-400">Signed & Verified</span>
                  )}
                </div>
                {evidence.description && (
                  <div className="mt-3 border border-[var(--mod-border)] bg-[var(--mod-surface)] p-3 text-sm text-[var(--mod-text-muted)]">
                    {evidence.description}
                  </div>
                )}
              </div>
            )}

            {/* History tab */}
            {activeTab === 'history' && (
              <div>
                {historyLoading ? (
                  <div className="py-4 text-center text-sm text-[var(--mod-text-dim)]">Loading history...</div>
                ) : (
                  <AmendmentTimeline amendments={amendments} />
                )}
              </div>
            )}

            {/* Amend tab */}
            {activeTab === 'amend' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--mod-text-dim)]">Action</label>
                  <select
                    value={amendAction}
                    onChange={(e) => setAmendAction(e.target.value)}
                    className="w-full border border-[var(--mod-border)] bg-[var(--mono-950)] px-3 py-2 text-sm text-[var(--mono-white)] outline-none"
                  >
                    <option value="NOTE_ADDED">Add Note</option>
                    <option value="DESCRIPTION_UPDATED">Update Description</option>
                    <option value="FLAGGED">Flag</option>
                    <option value="UNFLAGGED">Unflag</option>
                  </select>
                </div>

                {amendAction === 'DESCRIPTION_UPDATED' && (
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--mod-text-dim)]">New Value</label>
                    <input
                      type="text"
                      value={amendNewValue}
                      onChange={(e) => setAmendNewValue(e.target.value)}
                      placeholder="New description..."
                      className="w-full border border-[var(--mod-border)] bg-[var(--mono-950)] px-3 py-2 text-sm text-[var(--mono-white)] placeholder-[var(--mod-text-dim)] outline-none focus:border-[var(--mono-500)]"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--mod-text-dim)]">Reason</label>
                  <textarea
                    value={amendReason}
                    onChange={(e) => setAmendReason(e.target.value)}
                    placeholder="Reason for amendment..."
                    rows={2}
                    className="w-full border border-[var(--mod-border)] bg-[var(--mono-950)] px-3 py-2 text-sm text-[var(--mono-white)] placeholder-[var(--mod-text-dim)] outline-none focus:border-[var(--mono-500)]"
                  />
                </div>

                <button
                  onClick={handleAmendSubmit}
                  disabled={amendSubmitting}
                  className="border border-[var(--mono-500)] px-4 py-1.5 text-sm text-[var(--mono-white)] transition-[background-color] duration-75 hover:bg-[var(--mono-800)] disabled:opacity-30"
                >
                  {amendSubmitting ? 'Submitting...' : 'Submit Amendment'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderContent(evidence: Evidence, viewUrl: string | null) {
  const { type } = evidence;

  // URL types
  if (type === 'URL' || type === 'DISCORD_URL') {
    const UrlIcon = type === 'DISCORD_URL' ? IconBrandDiscord : IconLink;
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <UrlIcon size={40} className="text-[var(--mono-400)]" />
        <a
          href={evidence.url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-sm text-[var(--mono-300)] underline hover:text-[var(--mono-white)]"
        >
          {evidence.url}
        </a>
        {type === 'DISCORD_URL' && (
          <p className="text-xs text-yellow-400">
            Discord links may become unavailable if messages are deleted.
          </p>
        )}
      </div>
    );
  }

  // Message snapshot
  if (type === 'MESSAGE_SNAPSHOT' && evidence.snapshot) {
    return <SnapshotViewer snapshot={evidence.snapshot} />;
  }

  if (!viewUrl) {
    return (
      <div className="flex h-[200px] items-center justify-center text-[var(--mod-text-dim)]">
        No preview available.
      </div>
    );
  }

  // Image
  if (type === 'IMAGE') {
    return (
      <div className="flex justify-center">
        <img
          src={viewUrl}
          alt={evidence.originalFilename ?? 'Evidence image'}
          className="max-h-[60vh] object-contain"
        />
      </div>
    );
  }

  // Video
  if (type === 'VIDEO') {
    return (
      <div className="flex justify-center">
        <video
          src={viewUrl}
          controls
          className="max-h-[60vh]"
        >
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // Audio
  if (type === 'AUDIO') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <IconVolume size={40} className="text-[var(--mono-400)]" />
        <audio src={viewUrl} controls className="w-full max-w-md">
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  // Document / fallback
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <IconFile size={40} className="text-[var(--mono-400)]" />
      <p className="text-sm text-[var(--mod-text-muted)]">{evidence.originalFilename ?? 'Document'}</p>
      <a
        href={viewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="border border-[var(--mod-border)] px-4 py-2 text-sm text-[var(--mod-text-muted)] transition-[background-color] duration-75 hover:bg-[var(--mod-surface-hover)]"
      >
        Download
      </a>
    </div>
  );
}
