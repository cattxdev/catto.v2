import { Listener } from '@sapphire/framework';
import { Events } from '@sapphire/framework';
import { type Client } from 'discord.js';
import type { Server } from '@sapphire/plugin-api';
import { CONFIG } from '#config.js';
import { Prisma } from '@prisma/client';
import { loggingService } from '../lib/services/logging.js';

export class ReadyListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      once: true,
      event: Events.ClientReady,
    });
  }

  public async run(client: Client<true>) {
    const { username, id } = client.user;
    this.container.logger.info(`Successfully logged in as ${username} (${id})`);
    this.container.logger.info(`Environment: ${CONFIG.NODE_ENV}`);
    this.container.logger.info(`Serving ${client.guilds.cache.size} guilds`);

    // Initialize moderation scheduler
    this.container.logger.info('Initializing moderation scheduler...');
    try {
      const { tempbanScheduler } =
        await import('../modules/moderation/services/TempbanScheduler.js');
      await tempbanScheduler.initialize();
      this.container.logger.info('Moderation scheduler (tempban) initialized');

      const { muteScheduler } = await import('../modules/moderation/services/MuteScheduler.js');
      await muteScheduler.initialize();
      this.container.logger.info('Moderation scheduler (mute) initialized');

      const { modEventLogger } = await import('../modules/moderation/services/ModEventLogger.js');
      await modEventLogger.initialize();
      this.container.logger.info('Moderation event logger initialized');

      const { voiceMuteAllScheduler } =
        await import('../modules/voice/services/VoiceMuteAllScheduler.js');
      await voiceMuteAllScheduler.initialize();
      this.container.logger.info('Voice mute-all scheduler initialized');
    } catch (error) {
      this.container.logger.error('Failed to initialize moderation scheduler:', error);
    }

    // Sync all guilds to database on startup
    this.container.logger.info('Syncing guilds to database...');

    try {
      const guilds = client.guilds.cache;
      let syncedCount = 0;

      for (const [, guild] of guilds) {
        try {
          await this.container.prisma.guild.upsert({
            where: { guildId: guild.id },
            update: {
              name: guild.name,
              updatedAt: new Date(),
            },
            create: {
              guildId: guild.id,
              name: guild.name,
              language: 'en-US',
              settings: {
                prefix: '!',
              },
            },
          });
          syncedCount++;
        } catch (error) {
          this.container.logger.error(`Failed to sync guild ${guild.name}:`, error);
        }
      }

      this.container.logger.info(`Synced ${syncedCount}/${guilds.size} guilds to database`);
    } catch (error) {
      this.container.logger.error('Failed to sync guilds:', error);
    }

    // Log ready event
    await this.container.prisma.log
      .create({
        data: {
          level: 'info',
          message: `Bot started: ${username}`,
          metadata: {
            userId: id,
            username,
            guildCount: client.guilds.cache.size,
          } satisfies Prisma.JsonObject,
        },
      })
      .catch((err) => this.container.logger.error('Failed to log ready event:', err));

    this.container.logger.info(`Default prefix: ${CONFIG.DEFAULT_PREFIX}`);

    // Initialize logging service
    this.container.logger.info('Initializing logging service...');

    // Handle graceful shutdown
    let isShuttingDown = false;
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) {
        this.container.logger.warn('Shutdown already in progress, ignoring signal');
        return;
      }
      isShuttingDown = true;

      this.container.logger.info(`Received ${signal}, shutting down gracefully...`);

      // Shutdown moderation scheduler
      try {
        const { tempbanScheduler } =
          await import('../modules/moderation/services/TempbanScheduler.js');
        await tempbanScheduler.shutdown();
        this.container.logger.info('Moderation scheduler (tempban) shut down');

        const { muteScheduler } = await import('../modules/moderation/services/MuteScheduler.js');
        await muteScheduler.shutdown();
        this.container.logger.info('Moderation scheduler (mute) shut down');

        const { modEventLogger } = await import('../modules/moderation/services/ModEventLogger.js');
        await modEventLogger.shutdown();
        this.container.logger.info('Moderation event logger shut down');

        const { voiceMuteAllScheduler } =
          await import('../modules/voice/services/VoiceMuteAllScheduler.js');
        await voiceMuteAllScheduler.shutdown();
        this.container.logger.info('Voice mute-all scheduler shut down');
      } catch (error) {
        this.container.logger.error('Error shutting down scheduler:', error);
      }

      // Shutdown logging service
      try {
        await loggingService.destroy();
        this.container.logger.info('Logging service shut down');
      } catch (error) {
        this.container.logger.error('Error shutting down logging service:', error);
      }

      // Disconnect Redis
      try {
        if (
          this.container.redis.status === 'ready' ||
          this.container.redis.status === 'connecting'
        ) {
          await this.container.redis.quit();
          this.container.logger.info('Redis connection closed');
        }
      } catch (error) {
        this.container.logger.error('Error closing Redis connection:', error);
        // Force disconnect if quit fails
        try {
          this.container.redis.disconnect();
        } catch {
          // Ignore
        }
      }

      // Disconnect Prisma
      try {
        await this.container.prisma.$disconnect();
        this.container.logger.info('Prisma connection closed');
      } catch (error) {
        this.container.logger.error('Error closing Prisma connection:', error);
      }

      // Stop API server
      try {
        const server = this.container.server as Server;
        if (server) {
          await new Promise<void>((resolve) => {
            server.server?.close(() => {
              this.container.logger.info('API server stopped');
              resolve();
            });
            // Force close after 5 seconds
            setTimeout(() => resolve(), 5000);
          });
        }
      } catch (error) {
        this.container.logger.error('Error stopping API server:', error);
      }

      // Destroy Discord client
      try {
        client.destroy();
        this.container.logger.info('Discord client destroyed');
      } catch (error) {
        this.container.logger.error('Error destroying Discord client:', error);
      }

      this.container.logger.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    setTimeout(() => {
      try {
        const server = this.container.server as Server;
        if (server) {
          const port = (server.options.listenOptions as { port?: number })?.port ?? 4000;
          const prefix = server.options.prefix ?? '';
          const baseUrl = `http://localhost:${port}${prefix ? `/${prefix}` : ''}`;

          // Get all registered routes
          const routes = server.routes;
          const routePaths: { method: string; path: string }[] = [];

          for (const route of routes.values()) {
            const routePath = route.options.route || '';
            const methods = route.options.methods || ['GET'];

            for (const method of methods) {
              routePaths.push({
                method: method.toUpperCase(),
                path: `/${routePath}`.replace(/\/+/g, '/'),
              });
            }
          }

          // Sort routes by path for better readability
          routePaths.sort((a, b) => a.path.localeCompare(b.path));

          // Create beautiful log output
          const separator = '─'.repeat(80);
          const doubleSeparator = '═'.repeat(80);

          this.container.logger.info('\n' + doubleSeparator);
          this.container.logger.info('🌐 API Server Started Successfully');
          this.container.logger.info(doubleSeparator);
          this.container.logger.info(`📍 Base URL: ${baseUrl}`);
          this.container.logger.info(`📊 Total Routes: ${routePaths.length}`);
          this.container.logger.info(separator);

          if (routePaths.length > 0) {
            this.container.logger.info('📋 Available Endpoints:');
            this.container.logger.info(separator);

            // Group routes by category
            const groupedRoutes: Record<string, typeof routePaths> = {};

            for (const route of routePaths) {
              const category = route.path.split('/')[2] || 'root';
              if (!groupedRoutes[category]) {
                groupedRoutes[category] = [];
              }
              groupedRoutes[category].push(route);
            }

            // Log each category
            const categories = Object.keys(groupedRoutes).sort();
            for (let i = 0; i < categories.length; i++) {
              const category = categories[i];
              if (!category) continue;

              const categoryRoutes = groupedRoutes[category];
              if (!categoryRoutes) continue;

              // Category header with emoji
              const emoji =
                category === 'guilds'
                  ? '🏰'
                  : category === 'health'
                    ? '💚'
                    : category === 'stats'
                      ? '📊'
                      : category === 'ping'
                        ? '🏓'
                        : category === 'bot'
                          ? '🤖'
                          : '📁';

              this.container.logger.info(`\n  ${emoji} ${category.toUpperCase()}`);

              // Log routes in this category
              for (const route of categoryRoutes) {
                const methodColor =
                  route.method === 'GET'
                    ? '🟢'
                    : route.method === 'POST'
                      ? '🟡'
                      : route.method === 'PUT'
                        ? '🟠'
                        : route.method === 'PATCH'
                          ? '🔵'
                          : route.method === 'DELETE'
                            ? '🔴'
                            : '⚪';

                const methodPadded = route.method.padEnd(6);
                this.container.logger.info(
                  `    ${methodColor} ${methodPadded} ${baseUrl}${route.path}`
                );
              }
            }

            this.container.logger.info('\n' + separator);
          }

          this.container.logger.info('✨ API Server is ready to accept requests');
          this.container.logger.info(doubleSeparator + '\n');
        }
      } catch (error) {
        this.container.logger.error('[API] Error logging server info:', error);
      }
    }, 500);
  }
}
