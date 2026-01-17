import { Listener } from '@sapphire/framework';
import { Events } from '@sapphire/framework';
import { type Client } from 'discord.js';
import type { Server } from '@sapphire/plugin-api';
import { CONFIG } from '#config';

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
                            updatedAt: new Date()
                        },
                        create: {
                            guildId: guild.id,
                            name: guild.name,
                            language: 'en-US',
                            settings: {
                                prefix: '!'
                            }
                        }
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
        await this.container.prisma.log.create({
            data: {
                level: 'info',
                message: `Bot started: ${username}`,
                metadata: {
                    userId: id,
                    username,
                    guildCount: client.guilds.cache.size
                } as any
            }
        }).catch(err => this.container.logger.error('Failed to log ready event:', err));
        
        this.container.logger.info(`Default prefix: ${CONFIG.DEFAULT_PREFIX}`);
        
        setTimeout(() => {
            try {
                const server = this.container.server as Server;
                if (server) {
                    const port = (server.options.listenOptions as { port?: number })?.port ?? 4000;
                    const prefix = server.options.prefix ?? '';
                    this.container.logger.info(`API Server ready at http://localhost:${port}${prefix ? `/${prefix}` : ''}`);
                    this.container.logger.info(`Available routes: health, ping, stats, guilds`);
                }
            } catch (error) {
                this.container.logger.error('[API] Error logging server info:', error);
            }
        }, 500);
    }
}
