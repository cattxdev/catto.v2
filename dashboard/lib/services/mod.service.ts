import axios from 'axios';
import type {
  Evidence,
  EvidenceSummary,
  EvidenceAmendment,
  ModCase,
  DashboardPermissions,
  PresignedUpload,
} from '@/lib/mod-types';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:4000';

function api() {
  return axios.create({
    baseURL: `${BOT_API_URL}/api`,
    withCredentials: true,
  });
}

// ─── Dashboard Access ───

export async function getModDashboardAccess(guildId: string): Promise<DashboardPermissions | null> {
  try {
    const res = await api().get(`/guilds/${guildId}/moderation/dashboard-access`);
    return res.data;
  } catch {
    return null;
  }
}

// ─── Cases ───

export async function getCases(
  guildId: string,
  params?: { page?: number; limit?: number; action?: string; targetId?: string }
): Promise<{ total: number; page: number; totalPages: number; cases: ModCase[] }> {
  const res = await api().get(`/guilds/${guildId}/moderation/cases`, { params });
  return res.data;
}

export async function getCaseDetail(guildId: string, caseNumber: number): Promise<ModCase | null> {
  try {
    const res = await api().get(`/guilds/${guildId}/moderation/cases/${caseNumber}`);
    return res.data;
  } catch {
    return null;
  }
}

// ─── Evidence ───

export async function getEvidenceForCase(
  guildId: string,
  caseNumber: number
): Promise<{ evidence: Evidence[]; summary: EvidenceSummary }> {
  const res = await api().get(`/guilds/${guildId}/moderation/evidence`, {
    params: { caseNumber },
  });
  return res.data;
}

export async function getEvidenceDetail(guildId: string, evidenceId: string): Promise<Evidence | null> {
  try {
    const res = await api().get(`/guilds/${guildId}/moderation/evidence/${evidenceId}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getEvidenceViewUrl(guildId: string, evidenceId: string): Promise<string | null> {
  try {
    const res = await api().get(`/guilds/${guildId}/moderation/evidence/${evidenceId}`, {
      params: { action: 'view-url' },
    });
    return res.data.url;
  } catch {
    return null;
  }
}

export async function getEvidenceHistory(
  guildId: string,
  evidenceId: string
): Promise<EvidenceAmendment[]> {
  const res = await api().get(`/guilds/${guildId}/moderation/evidence/${evidenceId}`, {
    params: { action: 'history' },
  });
  return res.data.history;
}

export async function getEvidenceDownloadUrl(guildId: string, evidenceId: string): Promise<string | null> {
  try {
    const res = await api().get(`/guilds/${guildId}/moderation/evidence/${evidenceId}`, {
      params: { action: 'download-url' },
    });
    return res.data.url;
  } catch {
    return null;
  }
}

// ─── Upload Flow ───

export async function initiateUpload(
  guildId: string,
  params: {
    caseNumber: number;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    description?: string;
  }
): Promise<PresignedUpload> {
  const res = await api().post(`/guilds/${guildId}/moderation/evidence`, {
    action: 'initiate',
    ...params,
  });
  return res.data;
}

export async function confirmUpload(
  guildId: string,
  evidenceId: string,
  contentHash: string
): Promise<Evidence> {
  const res = await api().post(`/guilds/${guildId}/moderation/evidence`, {
    action: 'confirm',
    evidenceId,
    contentHash,
  });
  return res.data;
}

export async function addUrlEvidence(
  guildId: string,
  params: {
    caseNumber: number;
    url: string;
    type?: 'URL' | 'DISCORD_URL';
    description?: string;
  }
): Promise<Evidence> {
  const res = await api().post(`/guilds/${guildId}/moderation/evidence`, {
    action: 'url',
    ...params,
  });
  return res.data;
}

// ─── Amendments ───

export async function amendEvidence(
  guildId: string,
  evidenceId: string,
  params: {
    action: string;
    newValue?: string;
    reason?: string;
  }
): Promise<EvidenceAmendment> {
  const res = await api().post(`/guilds/${guildId}/moderation/evidence/${evidenceId}`, params);
  return res.data;
}

// ─── Client-Side SHA-256 ───

export async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
