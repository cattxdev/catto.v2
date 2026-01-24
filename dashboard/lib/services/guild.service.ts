import { botApi } from '@/lib/api';
import type { GuildData } from '@/lib/types';

export const guildService = {
  /**
   * Get channels and roles for a guild
   */
  async getChannelsAndRoles(guildId: string): Promise<GuildData> {
    const response = await botApi.get(`/api/guilds/${guildId}/channels-roles`);
    return response.data;
  },

  /**
   * Get guild information
   */
  async getGuild(guildId: string) {
    const response = await botApi.get(`/api/guilds/${guildId}`);
    return response.data;
  },
};
