/** Evidence system TypeScript types for the mod dashboard */

export type EvidenceType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'URL' | 'DISCORD_URL' | 'MESSAGE_SNAPSHOT';
export type EvidenceStatus = 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'FLAGGED' | 'REJECTED';
export type CaseStatus = 'OPEN' | 'CLOSED' | 'VOID';
export type ModAction = 'BAN' | 'UNBAN' | 'KICK' | 'TIMEOUT' | 'WARN' | 'SOFTBAN' | 'TEMPBAN' | 'MUTE_TEXT' | 'MUTE_VOICE' | 'MUTE_BOTH' | 'UNMUTE_TEXT' | 'UNMUTE_VOICE' | 'UNMUTE_BOTH';

export interface Evidence {
  id: string;
  guildId: string;
  caseId: string;
  caseNumber: number;
  uploadedById: string;
  uploadedByTag: string;
  type: EvidenceType;
  status: EvidenceStatus;
  storageKey: string | null;
  storageBucket: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  contentHash: string | null;
  hmacSignature: string | null;
  url: string | null;
  snapshotId: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  snapshot?: MessageSnapshot | null;
  amendments?: EvidenceAmendment[];
}

export interface EvidenceAmendment {
  id: string;
  evidenceId: string;
  amendedById: string;
  amendedByTag: string;
  action: string;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
}

export interface MessageSnapshot {
  id: string;
  guildId: string;
  channelId: string;
  capturedById: string;
  capturedByTag: string;
  firstMessageId: string;
  lastMessageId: string | null;
  messageCount: number;
  snapshotData: MessageSnapshotEntry[];
  mediaStorageKeys: string[] | null;
  contentHash: string;
  hmacSignature: string;
  createdAt: string;
}

export interface MessageSnapshotEntry {
  messageId: string;
  authorId: string;
  authorTag: string;
  authorAvatarUrl: string;
  content: string;
  embeds: unknown[];
  attachments: SerializedAttachment[];
  stickers: SerializedSticker[];
  reactions: SerializedReaction[];
  messageUrl: string;
  createdAt: string;
  editedAt: string | null;
}

export interface SerializedAttachment {
  url: string;
  proxyUrl?: string;
  filename: string;
  size: number;
  contentType: string | null;
  storageKey?: string;
}

export interface SerializedSticker {
  id: string;
  name: string;
  format: string;
  url: string;
}

export interface SerializedReaction {
  emoji: string;
  count: number;
}

export interface ModCase {
  id: string;
  caseNumber: number;
  guildId: string;
  action: ModAction;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason: string | null;
  duration: number | null;
  status: CaseStatus;
  evidence: unknown;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface EvidenceSummary {
  total: number;
  byType: Partial<Record<EvidenceType, number>>;
  byStatus: Partial<Record<EvidenceStatus, number>>;
  totalSizeBytes: number;
  latestAt: string | null;
  hasWeakEvidenceOnly: boolean;
}

export interface DashboardPermissions {
  userId: string;
  guildId: string;
  isAdmin: boolean;
  isOwner: boolean;
  hasAccess: boolean;
  sections: {
    cases: boolean;
    evidence: boolean;
    evidenceAdd: boolean;
    evidenceCapture: boolean;
  };
  permissions: Record<string, { allowed: boolean; reason?: string }>;
}

export interface PresignedUpload {
  evidenceId: string;
  uploadUrl: string;
  uploadFields: Record<string, string>;
}

/** Evidence type display metadata */
export const EVIDENCE_TYPE_META: Record<EvidenceType, { label: string; icon: string; className: string }> = {
  IMAGE: { label: 'Image', icon: 'photo', className: 'type-image' },
  VIDEO: { label: 'Video', icon: 'video', className: 'type-video' },
  AUDIO: { label: 'Audio', icon: 'volume', className: 'type-audio' },
  DOCUMENT: { label: 'Document', icon: 'file', className: 'type-document' },
  URL: { label: 'URL', icon: 'link', className: 'type-url' },
  DISCORD_URL: { label: 'Discord Link', icon: 'brand-discord', className: 'type-url' },
  MESSAGE_SNAPSHOT: { label: 'Snapshot', icon: 'camera', className: 'type-snapshot' },
};

/** Evidence status display metadata */
export const EVIDENCE_STATUS_META: Record<EvidenceStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'badge-pending' },
  PROCESSING: { label: 'Processing', className: 'badge-processing' },
  VERIFIED: { label: 'Verified', className: 'badge-verified' },
  FLAGGED: { label: 'Flagged', className: 'badge-flagged' },
  REJECTED: { label: 'Rejected', className: 'badge-rejected' },
};
