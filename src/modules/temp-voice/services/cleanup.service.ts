/**
 * Service for handling cleanup and deletion of temp voice channels
 */

import { PrismaClient, TempVoiceChannel as PrismaTempVoiceChannel } from '@prisma/client';
import type { Client } from 'discord.js';
import { TempVoiceConfigService } from './config.service.js';

export class CleanupService {
  private deletionTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private prisma: PrismaClient,
    private client: Client,
    private configService: TempVoiceConfigService
  ) {}

  /**
   * Schedule a temp channel for deletion
   */
  async scheduleDelete(channelId: string): Promise<void> {
    // Cancel existing timer if any
    this.cancelDeleteTimer(channelId);

    const record = await this.prisma.tempVoiceChannel.findUnique({
      where: { channelId },
    });

    if (!record) return;

    const config = await this.configService.get(record.guildId);
    const delayMs = config.deleteDelaySeconds * 1000;

    // Mark in database
    await this.prisma.tempVoiceChannel.update({
      where: { channelId },
      data: { deletionScheduledAt: new Date(Date.now() + delayMs) },
    });

    // Set timer
    const timer = setTimeout(() => {
      this.executeDelete(channelId).catch((error) => {
        this.client.logger.error(`[TempVoice] Error executing deletion for ${channelId}:`, error);
      });
    }, delayMs);

    this.deletionTimers.set(channelId, timer);
  }

  /**
   * Cancel a scheduled deletion
   */
  async cancelDelete(channelId: string): Promise<void> {
    this.cancelDeleteTimer(channelId);

    await this.prisma.tempVoiceChannel
      .update({
        where: { channelId },
        data: { deletionScheduledAt: null },
      })
      .catch(() => {
        // Channel may not exist in DB anymore
      });
  }

  /**
   * Cancel timer only (internal helper)
   */
  private cancelDeleteTimer(channelId: string): void {
    const timer = this.deletionTimers.get(channelId);
    if (timer) {
      clearTimeout(timer);
      this.deletionTimers.delete(channelId);
    }
  }

  /**
   * Execute deletion of a temp channel
   */
  private async executeDelete(channelId: string): Promise<void> {
    const record = await this.prisma.tempVoiceChannel.findUnique({
      where: { channelId },
    });

    if (!record) return;

    // Fetch guild and channel
    const guild = this.client.guilds.cache.get(record.guildId);
    if (!guild) {
      // Guild not available, clean up database
      await this.cleanup(record);
      return;
    }

    const channel = await guild.channels.fetch(channelId).catch(() => null);

    if (!channel) {
      // Channel already deleted
      await this.cleanup(record);
      return;
    }

    if (!channel.isVoiceBased()) {
      // Not a voice channel anymore?
      await this.cleanup(record);
      return;
    }

    // Verify still empty
    if (channel.members.size > 0) {
      // Someone joined, cancel deletion
      await this.cancelDelete(channelId);
      return;
    }

    // Delete from Discord
    try {
      await channel.delete('Temp voice channel empty');
    } catch (error) {
      this.client.logger.error(`[TempVoice] Failed to delete channel ${channelId}:`, error);
    }

    // Cleanup database and control panel
    await this.cleanup(record);

    // Log
    this.client.logger.info(`[TempVoice] Deleted temp channel ${channelId} after being empty`);
  }

  /**
   * Clean up database and control panel message
   */
  private async cleanup(record: PrismaTempVoiceChannel): Promise<void> {
    // Delete control panel message if exists
    if (record.controlPanelMessageId && record.controlPanelChannelId) {
      try {
        const guild = this.client.guilds.cache.get(record.guildId);
        if (guild) {
          const channel = await guild.channels
            .fetch(record.controlPanelChannelId)
            .catch(() => null);

          if (channel?.isTextBased()) {
            await channel.messages.delete(record.controlPanelMessageId).catch(() => {});
          }
        }
      } catch {
        // Ignore errors deleting control panel
      }
    }

    // Clear timer
    this.cancelDeleteTimer(record.channelId);
  }

  /**
   * Clean up resources on shutdown
   */
  async shutdown(): Promise<void> {
    // Clear all timers
    for (const timer of this.deletionTimers.values()) {
      clearTimeout(timer);
    }
    this.deletionTimers.clear();
  }
}
