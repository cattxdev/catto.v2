import { botApi } from '@/lib/api';

// Types
export type ModAction =
  | 'BAN'
  | 'KICK'
  | 'TIMEOUT'
  | 'WARN'
  | 'UNBAN'
  | 'MUTE_TEXT'
  | 'MUTE_VOICE'
  | 'MUTE_BOTH'
  | 'UNMUTE_TEXT'
  | 'UNMUTE_VOICE'
  | 'UNMUTE_BOTH';

export interface ModConfig {
  guildId: string;
  modLogChannelId: string | null;
  muteRoleId: string | null;
  autoModEnabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ModConfigUpdate {
  modLogChannelId?: string | null;
  muteRoleId?: string | null;
  autoModEnabled?: boolean;
}

export interface ModCase {
  id: string;
  guildId: string;
  caseNumber: number;
  action: ModAction;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ModStats {
  guildId: string;
  totalCases: number;
  actionCounts: {
    bans: number;
    kicks: number;
    timeouts: number;
    warns: number;
    unbans: number;
    mutes: number;
    unmutes: number;
  };
  activePunishments: number;
  topModerators: {
    id: string;
    tag: string;
    cases: number;
  }[];
  recentCases: ModCase[];
}

export interface ModCasesResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  cases: ModCase[];
}

export interface ModCasesQuery {
  page?: number;
  limit?: number;
  action?: ModAction;
  targetId?: string;
  moderatorId?: string;
}

export interface ModStatsQuery {
  startDate?: string;
  endDate?: string;
}

export interface UserModHistory {
  userId: string;
  guildId: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statistics: {
    total: number;
    bans: number;
    kicks: number;
    timeouts: number;
    warns: number;
    unbans: number;
    mutes: number;
    unmutes: number;
  };
  cases: ModCase[];
}

export const moderationService = {
  /**
   * Get moderation configuration for a guild
   */
  async getConfig(guildId: string): Promise<ModConfig> {
    const response = await botApi.get(`/api/guilds/${guildId}/moderation/config`);
    return response.data;
  },

  /**
   * Update moderation configuration for a guild
   */
  async updateConfig(guildId: string, config: ModConfigUpdate): Promise<ModConfig> {
    const response = await botApi.patch(`/api/guilds/${guildId}/moderation/config`, config);
    return response.data;
  },

  /**
   * Replace moderation configuration for a guild
   */
  async setConfig(guildId: string, config: ModConfigUpdate): Promise<ModConfig> {
    const response = await botApi.put(`/api/guilds/${guildId}/moderation/config`, config);
    return response.data;
  },

  /**
   * Get moderation statistics for a guild
   */
  async getStats(guildId: string, query?: ModStatsQuery): Promise<ModStats> {
    const params = new URLSearchParams();
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    const queryString = params.toString();
    const response = await botApi.get(
      `/api/guilds/${guildId}/moderation/stats${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },

  /**
   * Get moderation cases for a guild
   */
  async getCases(guildId: string, query?: ModCasesQuery): Promise<ModCasesResponse> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.action) params.append('action', query.action);
    if (query?.targetId) params.append('targetId', query.targetId);
    if (query?.moderatorId) params.append('moderatorId', query.moderatorId);
    const queryString = params.toString();
    const response = await botApi.get(
      `/api/guilds/${guildId}/moderation/cases${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },

  /**
   * Get a specific moderation case
   */
  async getCase(guildId: string, caseNumber: number): Promise<ModCase> {
    const response = await botApi.get(`/api/guilds/${guildId}/moderation/cases/${caseNumber}`);
    return response.data;
  },

  /**
   * Update a moderation case (reason only)
   */
  async updateCase(guildId: string, caseNumber: number, reason: string): Promise<ModCase> {
    const response = await botApi.patch(`/api/guilds/${guildId}/moderation/cases/${caseNumber}`, {
      reason,
    });
    return response.data;
  },

  /**
   * Delete a moderation case
   */
  async deleteCase(guildId: string, caseNumber: number): Promise<void> {
    await botApi.delete(`/api/guilds/${guildId}/moderation/cases/${caseNumber}`);
  },

  /**
   * Get moderation history for a specific user
   */
  async getUserHistory(
    guildId: string,
    userId: string,
    query?: { page?: number; limit?: number; action?: ModAction }
  ): Promise<UserModHistory> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.action) params.append('action', query.action);
    const queryString = params.toString();
    const response = await botApi.get(
      `/api/guilds/${guildId}/moderation/users/${userId}${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },
};
