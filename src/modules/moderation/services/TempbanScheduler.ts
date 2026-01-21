import { container } from '@sapphire/framework';
import { Queue, Worker, type Job } from 'bullmq';
import type { GuildId, UserId } from '../domain/types.js';
import { CONFIG } from '#config';
import { getSafeUserTag } from '#lib/discord/userDisplay.js';

/**
 * Job data for tempban unban task
 */
export interface TempbanUnbanJobData {
  guildId: string;
  userId: string;
  caseNumber: number;
  reason: string;
}

/**
 * Queue name for tempban jobs
 */
const TEMPBAN_QUEUE_NAME = 'tempban-unban';

/**
 * TempbanScheduler - Handles scheduling and processing of tempban unban tasks
 */
export class TempbanScheduler {
  private queue: Queue<TempbanUnbanJobData> | null = null;
  private worker: Worker<TempbanUnbanJobData> | null = null;
  private isInitialized = false;

  /**
   * Initialize the scheduler (call once on bot startup)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const connection = {
      host: CONFIG.REDIS_HOST,
      port: CONFIG.REDIS_PORT,
      password: CONFIG.REDIS_PASSWORD,
      db: CONFIG.REDIS_DB,
    };

    // Create the queue
    this.queue = new Queue<TempbanUnbanJobData>(TEMPBAN_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: { count: 100 },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    // Create the worker
    this.worker = new Worker<TempbanUnbanJobData>(
      TEMPBAN_QUEUE_NAME,
      async (job) => this.processUnban(job),
      {
        connection,
        concurrency: 5,
      }
    );

    // Worker event handlers
    this.worker.on('completed', (job) => {
      container.logger.info(
        `[TempbanScheduler] Unban job ${job.id} completed for user ${job.data.userId}`
      );
    });

    this.worker.on('failed', (job, err) => {
      container.logger.error(`[TempbanScheduler] Unban job ${job?.id} failed:`, err);
    });

    this.isInitialized = true;
    container.logger.info('[TempbanScheduler] Initialized');
  }

  /**
   * Schedule an unban for a tempbanned user
   */
  async scheduleUnban(
    guildId: GuildId,
    userId: UserId,
    caseNumber: number,
    reason: string,
    delayMs: number
  ): Promise<string | null> {
    if (!this.queue) {
      container.logger.error('[TempbanScheduler] Queue not initialized');
      return null;
    }

    try {
      const job = await this.queue.add(
        `unban-${guildId}-${userId}`,
        {
          guildId,
          userId,
          caseNumber,
          reason,
        },
        {
          delay: delayMs,
          jobId: `tempban-${guildId}-${userId}-${Date.now()}`,
        }
      );

      container.logger.info(
        `[TempbanScheduler] Scheduled unban for user ${userId} in guild ${guildId} in ${delayMs}ms`
      );

      return job.id ?? null;
    } catch (error) {
      container.logger.error('[TempbanScheduler] Failed to schedule unban:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled unban
   */
  async cancelUnban(guildId: GuildId, userId: UserId): Promise<boolean> {
    if (!this.queue) {
      container.logger.error('[TempbanScheduler] Queue not initialized');
      return false;
    }

    try {
      // Find and remove delayed jobs for this user
      const delayed = await this.queue.getDelayed();
      for (const job of delayed) {
        if (job.data.guildId === guildId && job.data.userId === userId) {
          await job.remove();
          container.logger.info(
            `[TempbanScheduler] Cancelled unban for user ${userId} in guild ${guildId}`
          );
          return true;
        }
      }
      return false;
    } catch (error) {
      container.logger.error('[TempbanScheduler] Failed to cancel unban:', error);
      return false;
    }
  }

  /**
   * Process an unban job
   */
  private async processUnban(job: Job<TempbanUnbanJobData>): Promise<void> {
    const { guildId, userId, caseNumber, reason } = job.data;

    container.logger.info(
      `[TempbanScheduler] Processing unban for user ${userId} in guild ${guildId}`
    );

    try {
      // Get the guild
      const guild = await container.client.guilds.fetch(guildId).catch(() => null);
      if (!guild) {
        container.logger.warn(`[TempbanScheduler] Guild ${guildId} not found, skipping unban`);
        return;
      }

      // Attempt to unban
      await guild.members.unban(userId, `Tempban expired (Case #${caseNumber}): ${reason}`);

      // Create unban case with resolved user tag
      const lastCase = await container.prisma.modCase.findFirst({
        where: { guildId },
        orderBy: { caseNumber: 'desc' },
      });

      // Get a proper user tag (not "Unknown#0000")
      const userTag = await getSafeUserTag(userId);

      await container.prisma.modCase.create({
        data: {
          caseNumber: (lastCase?.caseNumber ?? 0) + 1,
          guildId,
          action: 'UNBAN',
          targetId: userId,
          targetTag: userTag,
          moderatorId: container.client.user?.id ?? 'System',
          moderatorTag: container.client.user?.tag ?? 'System',
          reason: `Automatic unban - Tempban expired (Case #${caseNumber})`,
        },
      });

      container.logger.info(
        `[TempbanScheduler] Successfully unbanned user ${userId} in guild ${guildId}`
      );
    } catch (error) {
      container.logger.error(`[TempbanScheduler] Failed to unban user ${userId}:`, error);
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Get pending unbans count
   */
  async getPendingCount(): Promise<number> {
    if (!this.queue) return 0;
    return this.queue.getDelayedCount();
  }

  /**
   * Shutdown the scheduler gracefully
   */
  async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    this.isInitialized = false;
    container.logger.info('[TempbanScheduler] Shutdown complete');
  }
}

// Export singleton instance
export const tempbanScheduler = new TempbanScheduler();
