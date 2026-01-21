import { EmbedBuilder, WebhookClient, Colors } from 'discord.js';
import { container } from '@sapphire/framework';
import { Queue, Worker, type Job } from 'bullmq';
import { CONFIG } from '#config';

export enum LogType {
  Messages = 'messages',
  Voice = 'voice',
  VoiceState = 'voiceState',
  Tickets = 'tickets',
  Transcripts = 'transcripts',
  Roles = 'roles',
  Channels = 'channels',
  Members = 'members',
  Stage = 'stage',
  Events = 'events',
  Polls = 'polls',
  Emojis = 'emojis',
  Stickers = 'stickers',
  Webhooks = 'webhooks',
  Joins = 'joins',
  Leaves = 'leaves',
  Server = 'server',
}
type WebhookField =
  | 'messagesWebhook'
  | 'voiceWebhook'
  | 'voiceStateWebhook'
  | 'ticketsWebhook'
  | 'transcriptsWebhook'
  | 'rolesWebhook'
  | 'channelsWebhook'
  | 'membersWebhook'
  | 'stageWebhook'
  | 'eventsWebhook'
  | 'pollsWebhook'
  | 'emojisWebhook'
  | 'stickersWebhook'
  | 'webhooksWebhook'
  | 'joinsWebhook'
  | 'leavesWebhook'
  | 'serverWebhook';

interface LogJobData {
  guildId: string;
  type: LogType;
  embed: ReturnType<EmbedBuilder['toJSON']>;
}

class LoggingService {
  private queue: Queue<LogJobData>;
  private worker: Worker<LogJobData>;
  private readonly QUEUE_NAME = 'discord-logs';

  constructor() {
    const connection = {
      host: CONFIG.REDIS_HOST,
      port: CONFIG.REDIS_PORT,
      password: CONFIG.REDIS_PASSWORD,
      db: CONFIG.REDIS_DB,
    };

    // Create queue for adding jobs
    this.queue = new Queue<LogJobData>(this.QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2s, then 4s, then 8s
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000,
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    });

    // Create worker to process jobs
    this.worker = new Worker<LogJobData>(
      this.QUEUE_NAME,
      async (job: Job<LogJobData>) => this.processLog(job),
      {
        connection,
        concurrency: 5, // Process up to 5 logs concurrently
        limiter: {
          max: 50, // Max 50 jobs
          duration: 1000, // per 1 second (rate limiting)
        },
      }
    );

    // Worker event handlers
    this.worker.on('completed', (job) => {
      container.logger.debug(
        `Log job ${job.id} completed for ${job.data.guildId}:${job.data.type}`
      );
    });

    this.worker.on('failed', (job, err) => {
      container.logger.error(`Log job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      container.logger.error('Worker error:', err);
    });

    container.logger.info('BullMQ logging service initialized');
  }

  /**
   * Add a log entry to the queue
   */
  public async log(guildId: string, type: LogType, embed: EmbedBuilder): Promise<void> {
    try {
      await this.queue.add(
        `log:${guildId}:${type}`,
        {
          guildId,
          type,
          embed: embed.toJSON(),
        },
        {
          // Group jobs by guild+type for better batching
          jobId: `${guildId}:${type}:${Date.now()}`,
        }
      );
    } catch (error) {
      container.logger.error(`Failed to queue log entry for ${guildId}:${type}`, error);
    }
  }

  /**
   * Process a log job (called by BullMQ worker)
   */
  private async processLog(job: Job<LogJobData>): Promise<void> {
    const { guildId, type, embed } = job.data;

    // Get webhook URL from database
    const config = await container.prisma.logConfig.findUnique({
      where: { guildId }
    });

    if (!config || !config.enabled) {
      // Silently skip if logging is disabled - this is expected behavior
      return;
    }

    const webhookUrl = this.getWebhookUrl(config, type);
    if (!webhookUrl) {
      // Silently skip if no webhook configured - this is expected behavior
      return;
    }

    // Reconstruct embed from JSON
    const embedBuilder = EmbedBuilder.from(embed);

    // Create webhook client and send
    const webhook = new WebhookClient({ url: webhookUrl });

    try {
      await webhook.send({
        embeds: [embedBuilder],
        username: container.client.user?.username,
        avatarURL: container.client.user?.displayAvatarURL()
      });
    } finally {
      webhook.destroy();
    }
  }

  /**
   * Get webhook URL for a specific log type
   */
  private getWebhookUrl(
    config: NonNullable<Awaited<ReturnType<typeof container.prisma.logConfig.findUnique>>>,
    type: LogType
  ): string | null {
    const fieldMap: Record<LogType, WebhookField> = {
      [LogType.Messages]: 'messagesWebhook',
      [LogType.Voice]: 'voiceWebhook',
      [LogType.VoiceState]: 'voiceStateWebhook',
      [LogType.Tickets]: 'ticketsWebhook',
      [LogType.Transcripts]: 'transcriptsWebhook',
      [LogType.Roles]: 'rolesWebhook',
      [LogType.Channels]: 'channelsWebhook',
      [LogType.Members]: 'membersWebhook',
      [LogType.Stage]: 'stageWebhook',
      [LogType.Events]: 'eventsWebhook',
      [LogType.Polls]: 'pollsWebhook',
      [LogType.Emojis]: 'emojisWebhook',
      [LogType.Stickers]: 'stickersWebhook',
      [LogType.Webhooks]: 'webhooksWebhook',
      [LogType.Joins]: 'joinsWebhook',
      [LogType.Leaves]: 'leavesWebhook',
      [LogType.Server]: 'serverWebhook',
    };

    const field = fieldMap[type];
    return config[field] || null;
  }

  /**
   * Gracefully close the queue and worker
   */
  public async destroy(): Promise<void> {
    container.logger.info('Shutting down BullMQ logging service...');
    await this.worker.close();
    await this.queue.close();
    container.logger.info('BullMQ logging service shut down');
  }
}

// Export singleton instance
export const loggingService = new LoggingService();

/**
 * Helper function to create log embeds
 */
export function createLogEmbed(options: {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
  timestamp?: Date;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(options.title)
    .setColor(options.color ?? Colors.Blue)
    .setTimestamp(options.timestamp ?? new Date());

  if (options.description) {
    embed.setDescription(options.description);
  }

  if (options.fields) {
    embed.addFields(options.fields);
  }

  if (options.footer) {
    embed.setFooter({ text: options.footer });
  }

  return embed;
}

/**
 * Helper to log an action
 */
export async function logAction(options: {
  guildId: string;
  type: LogType;
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
  timestamp?: Date;
  thumbnail?: string;
}): Promise<void> {
  const embed = createLogEmbed({
    title: options.title,
    description: options.description,
    color: options.color,
    fields: options.fields,
    footer: options.footer,
    timestamp: options.timestamp,
  });

  if (options.thumbnail) {
    embed.setThumbnail(options.thumbnail);
  }

  await loggingService.log(options.guildId, options.type, embed);
}
