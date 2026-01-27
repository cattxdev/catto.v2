/**
 * Service for managing temp voice configuration
 */

import { PrismaClient } from '@prisma/client';
import type { TempVoiceConfig as PrismaTempVoiceConfig } from '@prisma/client';
import type {
  TempVoiceConfig,
  TempVoiceConfigInput,
  TempVoiceConfigUpdate,
} from '../models/config.model.js';
import { DEFAULT_TEMP_VOICE_CONFIG, type OwnerLeaveStrategy } from '../constants.js';
import type { Client } from 'discord.js';
import { ChannelType } from 'discord.js';

export class TempVoiceConfigService {
  constructor(
    private prisma: PrismaClient,
    private client?: Client
  ) {}

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
   * Also cleans up Discord channels and categories
   */
  async delete(guildId: string): Promise<void> {
    // Fetch the config first
    const config = await this.prisma.tempVoiceConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      return; // Already deleted or doesn't exist
    }

    // If client is available, clean up Discord resources
    if (this.client) {
      try {
        const guild = await this.client.guilds.fetch(guildId).catch(() => null);

        if (guild) {
          // 1. Delete all active temp voice channels
          const tempChannels = await this.prisma.tempVoiceChannel.findMany({
            where: { guildId },
          });

          await Promise.all(
            tempChannels.map(async (tempChannel) => {
              try {
                const channel = await guild.channels.fetch(tempChannel.channelId).catch(() => null);
                if (channel) {
                  await channel.delete('Temp voice configuration deleted');
                }
              } catch (error) {
                // Continue even if individual channel deletion fails
                console.error(`Failed to delete temp channel ${tempChannel.channelId}:`, error);
              }
            })
          );

          // 2. Delete join-to-create channels
          const joinChannels = Array.isArray(config.joinToCreateChannels)
            ? (config.joinToCreateChannels as string[])
            : [];

          await Promise.all(
            joinChannels.map(async (channelId) => {
              try {
                const channel = await guild.channels.fetch(channelId).catch(() => null);
                if (channel) {
                  await channel.delete('Temp voice configuration deleted');
                }
              } catch (error) {
                // Continue even if join channel deletion fails
                console.error(`Failed to delete join channel ${channelId}:`, error);
              }
            })
          );

          // 3. Delete the category if it exists and is empty (or delete it anyway)
          if (config.categoryId) {
            try {
              const category = await guild.channels.fetch(config.categoryId).catch(() => null);
              if (category && category.type === ChannelType.GuildCategory) {
                // Delete the category (Discord will only allow if it's empty)
                await category.delete('Temp voice configuration deleted');
              }
            } catch (error) {
              // Category might not be empty or might not exist
              console.error(`Failed to delete category ${config.categoryId}:`, error);
            }
          }

          // 4. Delete fallback category if it exists
          if (config.fallbackCategoryId && config.fallbackCategoryId !== config.categoryId) {
            try {
              const category = await guild.channels
                .fetch(config.fallbackCategoryId)
                .catch(() => null);
              if (category && category.type === ChannelType.GuildCategory) {
                await category.delete('Temp voice configuration deleted');
              }
            } catch (error) {
              console.error(
                `Failed to delete fallback category ${config.fallbackCategoryId}:`,
                error
              );
            }
          }
        }
      } catch (error) {
        // Log error but continue with database deletion
        console.error(`Failed to clean up Discord resources for guild ${guildId}:`, error);
      }
    }

    // Delete temp channel records first
    await this.prisma.tempVoiceChannel.deleteMany({
      where: { guildId },
    });

    // Finally, delete the config record
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
