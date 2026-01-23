/**
 * Service for managing temp voice configuration
 */

import { PrismaClient } from '@prisma/client';
import type { TempVoiceConfig as PrismaTempVoiceConfig } from '@prisma/client';
import type {
  TempVoiceConfig,
  TempVoiceConfigInput,
  TempVoiceConfigUpdate,
} from '../models/config.model';
import { DEFAULT_TEMP_VOICE_CONFIG, type OwnerLeaveStrategy } from '../constants';

export class TempVoiceConfigService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get configuration for a guild
   * Creates default config if it doesn't exist
   */
  async get(guildId: string): Promise<TempVoiceConfig> {
    let config = await this.prisma.tempVoiceConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await this.create(guildId, DEFAULT_TEMP_VOICE_CONFIG);
    }

    return this.mapToModel(config);
  }

  /**
   * Get configuration without creating if it doesn't exist
   */
  async getOrNull(guildId: string): Promise<TempVoiceConfig | null> {
    const config = await this.prisma.tempVoiceConfig.findUnique({
      where: { guildId },
    });

    return config ? this.mapToModel(config) : null;
  }

  /**
   * Create configuration for a guild
   */
  async create(guildId: string, data: Partial<TempVoiceConfigInput>): Promise<TempVoiceConfig> {
    const config = await this.prisma.tempVoiceConfig.create({
      data: {
        guildId,
        ...data,
        joinToCreateChannels: data.joinToCreateChannels || [],
        adminRoleIds: data.adminRoleIds || [],
      },
    });

    return this.mapToModel(config);
  }

  /**
   * Update configuration for a guild
   */
  async update(guildId: string, data: TempVoiceConfigUpdate): Promise<TempVoiceConfig> {
    const config = await this.prisma.tempVoiceConfig.update({
      where: { guildId },
      data,
    });

    return this.mapToModel(config);
  }

  /**
   * Add a Join to Create channel
   */
  async addJoinChannel(guildId: string, channelId: string): Promise<string[]> {
    const config = await this.get(guildId);

    if (config.joinToCreateChannels.includes(channelId)) {
      throw new Error('Channel is already a Join to Create channel');
    }

    const updated = await this.update(guildId, {
      joinToCreateChannels: [...config.joinToCreateChannels, channelId],
    });

    return updated.joinToCreateChannels;
  }

  /**
   * Remove a Join to Create channel
   */
  async removeJoinChannel(guildId: string, channelId: string): Promise<string[]> {
    const config = await this.get(guildId);

    if (!config.joinToCreateChannels.includes(channelId)) {
      throw new Error('Channel is not a Join to Create channel');
    }

    const updated = await this.update(guildId, {
      joinToCreateChannels: config.joinToCreateChannels.filter((id) => id !== channelId),
    });

    return updated.joinToCreateChannels;
  }

  /**
   * Delete configuration for a guild
   */
  async delete(guildId: string): Promise<void> {
    await this.prisma.tempVoiceConfig.delete({
      where: { guildId },
    });
  }

  /**
   * Map Prisma model to TypeScript interface
   */
  private mapToModel(data: PrismaTempVoiceConfig): TempVoiceConfig {
    return {
      ...data,
      joinToCreateChannels: Array.isArray(data.joinToCreateChannels)
        ? (data.joinToCreateChannels as string[])
        : [],
      adminRoleIds: Array.isArray(data.adminRoleIds) ? (data.adminRoleIds as string[]) : [],
      ownerLeaveStrategy: data.ownerLeaveStrategy as OwnerLeaveStrategy,
    };
  }
}
