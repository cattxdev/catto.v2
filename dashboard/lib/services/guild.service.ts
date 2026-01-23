import { botApi } from '@/lib/api';

export interface Channel {
  id: string;
  name: string;
  type: string;
}

export interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
}

export interface GuildData {
  channels: Channel[];
  roles: Role[];
}

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
