import { botApi } from '@/lib/api';

export interface TempVoiceConfig {
  guildId: string;
  enabled: boolean;
  joinChannelIds: string[];
  namingScheme: 'username' | 'custom';
  customNamingPattern: string | null;
  userLimit: number | null;
  bitrate: number | null;
  defaultCategoryId: string | null;
  autoDeleteEmpty: boolean;
  deleteEmptyAfterMs: number;
  autoDeleteOwnerLeave: boolean;
  deleteOwnerLeaveAfterMs: number;
  allowOwnerTransfer: boolean;
  allowOwnerManagement: boolean;
  maxChannelsPerUser: number;
  logChannelId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TempVoiceConfigCreate {
  enabled?: boolean;
  joinChannelIds?: string[];
  namingScheme?: 'username' | 'custom';
  customNamingPattern?: string | null;
  userLimit?: number | null;
  bitrate?: number | null;
  defaultCategoryId?: string | null;
  autoDeleteEmpty?: boolean;
  deleteEmptyAfterMs?: number;
  autoDeleteOwnerLeave?: boolean;
  deleteOwnerLeaveAfterMs?: number;
  allowOwnerTransfer?: boolean;
  allowOwnerManagement?: boolean;
  maxChannelsPerUser?: number;
  logChannelId?: string | null;
}

export interface TempVoiceConfigUpdate extends Partial<TempVoiceConfigCreate> {}

export interface TempVoiceChannel {
  channelId: string;
  name: string;
  ownerId: string;
  ownerName: string;
  userCount: number;
  userLimit: number | null;
  createdAt: string;
  categoryId: string | null;
}

export interface TempVoiceChannelsResponse {
  channels: TempVoiceChannel[];
  count: number;
}

export interface TempVoiceStats {
  totalChannelsCreated: number;
  currentActiveChannels: number;
  totalUsersServed: number;
  averageSessionDuration: number;
  peakConcurrentChannels: number;
  lastActivityAt: string | null;
}

export interface TempVoiceSetupRequest {
  categoryName?: string;
  joinChannelName?: string;
  logChannelName?: string;
  createLogChannel?: boolean;
}

export interface TempVoiceSetupResponse {
  success: boolean;
  message: string;
  categoryId: string;
  joinChannelId: string;
  logChannelId: string | null;
  config: TempVoiceConfig;
}

export interface TempVoiceValidateRequest extends TempVoiceConfigCreate {}

export interface TempVoiceValidateResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface JoinChannelResponse {
  success: boolean;
  message: string;
  joinChannelIds: string[];
  count: number;
}

export const tempVoiceService = {
  /**
   * Get temp voice configuration for a guild
   */
  async getConfig(guildId: string): Promise<TempVoiceConfig> {
    const response = await botApi.get(`/api/guilds/${guildId}/temp-voice/config`);
    return response.data;
  },

  /**
   * Create temp voice configuration for a guild
   */
  async createConfig(guildId: string, config: TempVoiceConfigCreate): Promise<TempVoiceConfig> {
    const response = await botApi.post(`/api/guilds/${guildId}/temp-voice/config`, config);
    return response.data;
  },

  /**
   * Update temp voice configuration for a guild
   */
  async updateConfig(guildId: string, config: TempVoiceConfigUpdate): Promise<TempVoiceConfig> {
    const response = await botApi.patch(`/api/guilds/${guildId}/temp-voice/config`, config);
    return response.data;
  },

  /**
   * Delete temp voice configuration for a guild
   */
  async deleteConfig(guildId: string): Promise<{ success: boolean; message: string }> {
    const response = await botApi.delete(`/api/guilds/${guildId}/temp-voice/config`);
    return response.data;
  },

  /**
   * Get all active temporary voice channels
   */
  async getChannels(guildId: string): Promise<TempVoiceChannelsResponse> {
    const response = await botApi.get(`/api/guilds/${guildId}/temp-voice/channels`);
    return response.data;
  },

  /**
   * Get temp voice statistics for a guild
   */
  async getStats(guildId: string): Promise<TempVoiceStats> {
    const response = await botApi.get(`/api/guilds/${guildId}/temp-voice/stats`);
    return response.data;
  },

  /**
   * Auto-setup temp voice system
   * Creates category, join channel, and optionally log channel
   */
  async setup(guildId: string, request: TempVoiceSetupRequest): Promise<TempVoiceSetupResponse> {
    const response = await botApi.post(`/api/guilds/${guildId}/temp-voice/setup`, request);
    return response.data;
  },

  /**
   * Validate temp voice configuration without saving
   */
  async validate(
    guildId: string,
    config: TempVoiceValidateRequest
  ): Promise<TempVoiceValidateResponse> {
    const response = await botApi.post(`/api/guilds/${guildId}/temp-voice/validate`, config);
    return response.data;
  },

  /**
   * Add a join channel to the temp voice system
   */
  async addJoinChannel(guildId: string, channelId: string): Promise<JoinChannelResponse> {
    const response = await botApi.post(`/api/guilds/${guildId}/temp-voice/join-channels`, {
      channelId,
    });
    return response.data;
  },

  /**
   * Remove a join channel from the temp voice system
   */
  async removeJoinChannel(guildId: string, channelId: string): Promise<JoinChannelResponse> {
    const response = await botApi.delete(
      `/api/guilds/${guildId}/temp-voice/join-channels/${channelId}`
    );
    return response.data;
  },
};
