'use client';

import { useState, useRef, useCallback } from 'react';
import type { EvidenceType } from '@/lib/mod-types';
import {
  EVIDENCE_TYPE_ICONS,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconX,
  IconCheck,
} from '@/lib/mod-icons';
import {
  initiateUpload,
  confirmUpload,
  addUrlEvidence,
  computeSHA256,
} from '@/lib/services/mod.service';

interface EvidenceWizardProps {
  guildId: string;
  caseNumber: number;
  onUploadComplete: () => void;
}

type UploadableType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'URL' | 'DISCORD_URL';
type WizardStep = 1 | 2 | 3;

const TYPE_OPTIONS: { type: UploadableType; label: string; description: string; disabled?: boolean }[] = [
  { type: 'IMAGE', label: 'Image', description: 'PNG, JPG, GIF, WebP' },
  { type: 'VIDEO', label: 'Video', description: 'MP4, WebM, MOV' },
  { type: 'AUDIO', label: 'Audio', description: 'MP3, WAV, OGG, FLAC' },
  { type: 'DOCUMENT', label: 'Document', description: 'PDF, TXT, ZIP, etc.' },
  { type: 'URL', label: 'URL', description: 'External link' },
  { type: 'DISCORD_URL', label: 'Discord URL', description: 'Discord message link' },
];

const MIME_FILTERS: Record<string, string> = {
  IMAGE: 'image/*',
  VIDEO: 'video/*',
  AUDIO: 'audio/*',
  DOCUMENT: '*/*',
};

interface FileEntry {
  file: File;
  description: string;
}

interface UploadProgress {
  index: number;
  status: 'pending' | 'uploading' | 'hashing' | 'confirming' | 'done' | 'error';
  progress: number;
  error?: string;
}

export function EvidenceWizard({ guildId, caseNumber, onUploadComplete }: EvidenceWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedType, setSelectedType] = useState<UploadableType | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [description, setDescription] = useState('');
  const [applyDescToAll, setApplyDescToAll] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFileType = selectedType && !['URL', 'DISCORD_URL'].includes(selectedType);
  const isUrlType = selectedType === 'URL' || selectedType === 'DISCORD_URL';

  const canAdvance = () => {
    if (step === 1) return selectedType !== null;
    if (step === 2) {
      if (isFileType) return files.length > 0;
      if (isUrlType) return urlInput.trim().length > 0;
      return false;
    }
    return true;
  };

  const handleFileSelect = useCallback((selected: FileList | File[]) => {
    const newFiles = Array.from(selected).map((f) => ({ file: f, description: '' }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileDescription = (index: number, desc: string) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, description: desc } : f)));
  };

  const handleUpload = async () => {
    setUploading(true);

    if (isUrlType) {
      try {
        await addUrlEvidence(guildId, {
          caseNumber,
          url: urlInput.trim(),
          type: selectedType === 'DISCORD_URL' ? 'DISCORD_URL' : 'URL',
          description: description.trim() || undefined,
        });
        onUploadComplete();
        resetWizard();
      } catch {
        setUploading(false);
      }
      return;
    }

    // File uploads
    const progress: UploadProgress[] = files.map((_, i) => ({
      index: i,
      status: 'pending',
      progress: 0,
    }));
    setUploadProgress(progress);

    const updateProg = (index: number, patch: Partial<UploadProgress>) => {
      setUploadProgress((prev) => prev.map((p) => (p.index === index ? { ...p, ...patch } : p)));
    };

    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      const fileDesc = applyDescToAll ? description : (entry.description || description);

      try {
        updateProg(i, { status: 'uploading', progress: 10 });

        const { evidenceId, uploadUrl } = await initiateUpload(guildId, {
          caseNumber,
          filename: entry.file.name,
          mimeType: entry.file.type || 'application/octet-stream',
          sizeBytes: entry.file.size,
          description: fileDesc.trim() || undefined,
        });

        updateProg(i, { progress: 30 });

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': entry.file.type || 'application/octet-stream' },
          body: entry.file,
        });
        if (!uploadResponse.ok) {
          const body = await uploadResponse.text().catch(() => '');
          throw new Error(`Upload failed (${uploadResponse.status}): ${body.slice(0, 200)}`);
        }

        updateProg(i, { status: 'hashing', progress: 60 });

        const contentHash = await computeSHA256(entry.file);
        updateProg(i, { status: 'confirming', progress: 80 });

        await confirmUpload(guildId, evidenceId, contentHash);
        updateProg(i, { status: 'done', progress: 100 });
      } catch (err) {
        updateProg(i, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    }

    onUploadComplete();
    setUploading(false);
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedType(null);
    setFiles([]);
    setUrlInput('');
    setDescription('');
    setApplyDescToAll(true);
    setUploading(false);
    setUploadProgress([]);
  };

  return (
    <div className="border border-[var(--mod-border)] bg-[var(--mod-surface)]">
      {/* Step Indicator */}
      <div className="flex border-b border-[var(--mod-border)]">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 px-4 py-3 text-center text-xs font-medium transition-colors ${
              s === step
                ? 'bg-[var(--mono-800)] text-[var(--mono-white)]'
                : s < step
                  ? 'text-[var(--mod-text-muted)]'
                  : 'text-[var(--mod-text-dim)]'
            }`}
          >
            {s}. {s === 1 ? 'Type' : s === 2 ? 'Content' : 'Metadata'}
          </div>
        ))}
      </div>

      <div className="p-5">
        {/* Step 1: Type Selection */}
        {step === 1 && (
          <div>
            <p className="mb-4 text-sm text-[var(--mod-text-muted)]">Select the type of evidence to add:</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TYPE_OPTIONS.map((opt) => {
                const TypeIcon = EVIDENCE_TYPE_ICONS[opt.type];
                const isSelected = selectedType === opt.type;
                return (
                  <button
                    key={opt.type}
                    onClick={() => setSelectedType(opt.type)}
                    disabled={opt.disabled}
                    className={`flex flex-col items-center gap-2 border p-4 text-center transition-colors ${
                      isSelected
                        ? 'border-[var(--mono-500)] bg-[var(--mono-850)]'
                        : 'border-[var(--mod-border)] hover:border-[var(--mod-border-hover)] hover:bg-[var(--mod-surface-hover)]'
                    } ${opt.disabled ? 'cursor-not-allowed opacity-30' : ''}`}
                  >
                    <TypeIcon size={24} className="text-[var(--mono-400)]" />
                    <span className="text-sm font-medium text-[var(--mono-white)]">{opt.label}</span>
                    <span className="text-xs text-[var(--mod-text-dim)]">{opt.description}</span>
                  </button>
                );
              })}
              {/* MESSAGE_SNAPSHOT - disabled */}
              <div className="flex flex-col items-center gap-2 border border-[var(--mod-border)] p-4 text-center opacity-30">
                {(() => { const SnapIcon = EVIDENCE_TYPE_ICONS.MESSAGE_SNAPSHOT; return <SnapIcon size={24} className="text-[var(--mono-400)]" />; })()}
                <span className="text-sm font-medium text-[var(--mono-white)]">Snapshot</span>
                <span className="text-xs text-[var(--mod-text-dim)]">Captured via bot command</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Content */}
        {step === 2 && isFileType && (
          <div>
            <p className="mb-3 text-sm text-[var(--mod-text-muted)]">
              Upload {selectedType?.toLowerCase()} file(s):
            </p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed p-6 text-center transition-colors ${
                dragOver
                  ? 'border-[var(--mono-400)] bg-[var(--mono-850)]'
                  : 'border-[var(--mod-border)] hover:border-[var(--mod-border-hover)]'
              }`}
            >
              <p className="text-sm text-[var(--mod-text-muted)]">Drop files here or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={MIME_FILTERS[selectedType!] ?? '*/*'}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleFileSelect(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 border border-[var(--mod-border)] bg-[var(--mono-950)] px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--mono-white)]">{entry.file.name}</span>
                    <span className="shrink-0 text-xs text-[var(--mod-text-dim)]">{(entry.file.size / 1024).toFixed(1)} KB</span>
                    <button onClick={() => removeFile(i)} className="shrink-0 text-[var(--mod-text-dim)] hover:text-[var(--mono-white)]">
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && isUrlType && (
          <div>
            <p className="mb-3 text-sm text-[var(--mod-text-muted)]">
              Enter the {selectedType === 'DISCORD_URL' ? 'Discord message' : ''} URL:
            </p>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={selectedType === 'DISCORD_URL' ? 'https://discord.com/channels/...' : 'https://...'}
              className="w-full border border-[var(--mod-border)] bg-[var(--mono-950)] px-3 py-2 text-sm text-[var(--mono-white)] placeholder-[var(--mod-text-dim)] outline-none focus:border-[var(--mono-500)]"
            />
          </div>
        )}

        {/* Step 3: Metadata */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--mod-text-dim)]">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the evidence..."
                rows={3}
                className="w-full border border-[var(--mod-border)] bg-[var(--mono-950)] px-3 py-2 text-sm text-[var(--mono-white)] placeholder-[var(--mod-text-dim)] outline-none focus:border-[var(--mono-500)]"
              />
            </div>

            {/* Per-file metadata for multi-file uploads */}
            {isFileType && files.length > 1 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <button
                    onClick={() => setApplyDescToAll(!applyDescToAll)}
                    className={`flex h-4 w-4 items-center justify-center border transition-colors ${
                      applyDescToAll
                        ? 'border-[var(--mono-500)] bg-[var(--mono-700)]'
                        : 'border-[var(--mod-border)]'
                    }`}
                  >
                    {applyDescToAll && <IconCheck size={12} className="text-[var(--mono-white)]" />}
                  </button>
                  <span className="text-xs text-[var(--mod-text-muted)]">Apply description to all files</span>
                </div>

                {!applyDescToAll && (
                  <div className="space-y-2">
                    {files.map((entry, i) => (
                      <div key={i}>
                        <label className="mb-1 block text-xs text-[var(--mod-text-dim)]">{entry.file.name}</label>
                        <input
                          type="text"
                          value={entry.description}
                          onChange={(e) => updateFileDescription(i, e.target.value)}
                          placeholder="Description for this file..."
                          className="w-full border border-[var(--mod-border)] bg-[var(--mono-950)] px-3 py-2 text-xs text-[var(--mono-white)] placeholder-[var(--mod-text-dim)] outline-none focus:border-[var(--mono-500)]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upload progress */}
            {uploading && uploadProgress.length > 0 && (
              <div className="space-y-2">
                {uploadProgress.map((p) => (
                  <div key={p.index} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-[var(--mono-white)]">{files[p.index]?.file.name}</span>
                    <div className="h-1.5 w-24 bg-[var(--mono-800)]">
                      <div
                        className={`h-full transition-all ${
                          p.status === 'error' ? 'bg-red-500' :
                          p.status === 'done' ? 'bg-green-500' : 'bg-[var(--mono-400)]'
                        }`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[var(--mod-text-dim)]">
                      {p.status === 'pending' && 'Queued'}
                      {p.status === 'uploading' && 'Uploading'}
                      {p.status === 'hashing' && 'Hashing'}
                      {p.status === 'confirming' && 'Verifying'}
                      {p.status === 'done' && 'Done'}
                      {p.status === 'error' && (p.error ?? 'Error')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t border-[var(--mod-border)] px-5 py-3">
        <button
          onClick={() => {
            if (step === 1) return;
            setStep((s) => (s - 1) as WizardStep);
          }}
          disabled={step === 1 || uploading}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--mod-text-muted)] transition-colors hover:text-[var(--mono-white)] disabled:opacity-30"
        >
          <IconChevronLeft size={16} />
          Back
        </button>
        <div className="flex gap-2">
          {step < 3 && (
            <button
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
              disabled={!canAdvance()}
              className="flex items-center gap-1 border border-[var(--mod-border)] px-4 py-1.5 text-sm text-[var(--mod-text-muted)] transition-colors hover:bg-[var(--mod-surface-hover)] disabled:opacity-30"
            >
              Next
              <IconChevronRight size={16} />
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-1 border border-[var(--mono-500)] px-4 py-1.5 text-sm text-[var(--mono-white)] transition-colors hover:bg-[var(--mono-800)] disabled:opacity-30"
            >
              <IconPlus size={16} />
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
