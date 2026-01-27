/**
 * Service for recovering temp voice channels after bot restart
 */

import { PrismaClient } from '@prisma/client';
import type { Client } from 'discord.js';
import { CleanupService } from './cleanup.service.js';

export class RecoveryService {
  constructor(
    private prisma: PrismaClient,
    private client: Client,
    private cleanupService: CleanupService
  ) {}

  /**
   * Reconcile database state with Discord after restart
   */
  async reconcileChannels(): Promise<void> {
    this.client.logger.info('[TempVoice] Starting channel reconciliation...');

    const dbChannels = await this.prisma.tempVoiceChannel.findMany();
    let recovered = 0;
    let deletedFromDb = 0;
    let scheduledForDeletion = 0;

    for (const record of dbChannels) {
      try {
        // Fetch guild
        const guild = this.client.guilds.cache.get(record.guildId);
        if (!guild) {
          // Guild not available - delete record
          await this.prisma.tempVoiceChannel.delete({
            where: { id: record.id },
          });
          deletedFromDb++;
          continue;
        }

        // Fetch channel
        const channel = await guild.channels.fetch(record.channelId).catch(() => null);

        if (!channel || !channel.isVoiceBased()) {
          // Channel doesn't exist - delete from database
          await this.prisma.tempVoiceChannel.delete({
            where: { id: record.id },
          });
          deletedFromDb++;
          continue;
        }

        // Channel exists - check if empty
        if (channel.members.size === 0) {
          // Empty channel - schedule for deletion
          await this.cleanupService.scheduleDelete(record.channelId);
          scheduledForDeletion++;
        } else {
          // Channel has members - resume tracking
          await this.prisma.tempVoiceChannel.update({
            where: { id: record.id },
            data: {
              lastActiveAt: new Date(),
              deletionScheduledAt: null,
            },
          });
          recovered++;
        }
      } catch (error) {
        this.client.logger.error(
          `[TempVoice] Error reconciling channel ${record.channelId}:`,
          error
        );
      }
    }

    this.client.logger.info(
      `[TempVoice] Reconciliation complete: ${recovered} recovered, ${deletedFromDb} deleted, ${scheduledForDeletion} scheduled for deletion`
    );
  }

  /**
   * Get statistics about recovery process
   */
  async getRecoveryStats(): Promise<{
    totalRecovered: number;
    deletedFromDb: number;
    scheduledForDeletion: number;
  }> {
    // This would need to track stats during reconciliation
    // For now, return current state
    const totalActive = await this.prisma.tempVoiceChannel.count();
    const scheduledForDeletion = await this.prisma.tempVoiceChannel.count({
      where: {
        deletionScheduledAt: { not: null },
      },
    });

    return {
      totalRecovered: totalActive - scheduledForDeletion,
      deletedFromDb: 0, // Would need to track during reconciliation
      scheduledForDeletion,
    };
  }
}
