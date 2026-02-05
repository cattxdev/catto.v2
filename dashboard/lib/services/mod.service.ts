import axios from 'axios';
import type {
  Evidence,
  EvidenceSummary,
  EvidenceAmendment,
  ModCase,
  DashboardPermissions,
  PresignedUpload,
  CaseNote,
} from '@/lib/mod-types';
import { emitSessionExpired } from '@/lib/auth-events';

const BOT_API_URL = (() => {
  const url = process.env.NEXT_PUBLIC_BOT_API_URL;
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_BOT_API_URL environment variable is required in production'
    );
  }
  return url || 'http://localhost:4000';
})();

// Shared axios instance with session expiration handling
const apiInstance = axios.create({
  baseURL: `${BOT_API_URL}/api`,
  withCredentials: true,
});

// Intercept 401 responses to emit session expired event
apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      emitSessionExpired();
    }
    return Promise.reject(error);
  }
);

function api() {
  return apiInstance;
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
  params?: {
    page?: number;
    limit?: number;
    action?: string;
    targetId?: string;
    status?: string;
    sort?: string;
    order?: string;
    search?: string;
  }
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

export async function getGuildEvidence(
  guildId: string,
  params?: { page?: number; limit?: number; type?: string; case?: number; tags?: string }
): Promise<{ evidence: Evidence[]; total: number; page: number; totalPages: number }> {
  const res = await api().get(`/guilds/${guildId}/moderation/evidence`, { params });
  return res.data;
}

export async function getEvidenceForCase(
  guildId: string,
  caseNumber: number
): Promise<{ evidence: Evidence[]; summary: EvidenceSummary }> {
  const res = await api().get(`/guilds/${guildId}/moderation/evidence`, {
    params: { caseNumber },
  });
  return res.data;
}

export async function getEvidenceDetail(
  guildId: string,
  evidenceId: string
): Promise<Evidence | null> {
  try {
    const res = await api().get(`/guilds/${guildId}/moderation/evidence/${evidenceId}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getEvidenceViewUrl(
  guildId: string,
  evidenceId: string
): Promise<string | null> {
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

export async function getEvidenceDownloadUrl(
  guildId: string,
  evidenceId: string
): Promise<string | null> {
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
    tags?: string[];
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
    tags?: string[];
  }
): Promise<Evidence> {
  const res = await api().post(`/guilds/${guildId}/moderation/evidence`, {
    action: 'url',
    ...params,
  });
  return res.data;
}

// ─── OG Preview ───

export async function previewOG(
  guildId: string,
  url: string
): Promise<{ title?: string; description?: string; image?: string; siteName?: string } | null> {
  try {
    const res = await api().post(`/guilds/${guildId}/moderation/evidence`, {
      action: 'preview-og',
      url,
    });
    return res.data.og ?? null;
  } catch {
    return null;
  }
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

// ─── Case Notes ───

export async function getCaseNotes(
  guildId: string,
  caseNumber: number,
  params?: { page?: number; limit?: number }
): Promise<{ notes: CaseNote[]; total: number }> {
  const res = await api().get(`/guilds/${guildId}/moderation/cases/${caseNumber}/notes`, {
    params,
  });
  return res.data;
}

export async function addCaseNote(
  guildId: string,
  caseNumber: number,
  content: string
): Promise<CaseNote> {
  const res = await api().post(`/guilds/${guildId}/moderation/cases/${caseNumber}/notes`, {
    content,
  });
  return res.data;
}

// ─── Export ───

export async function exportCase(
  guildId: string,
  caseNumber: number
): Promise<{ downloadUrl: string }> {
  const res = await api().post(`/guilds/${guildId}/moderation/cases/${caseNumber}/export`);
  return res.data;
}

// ─── Client-Side SHA-256 ───

export async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
