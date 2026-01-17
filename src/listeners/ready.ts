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

    public run(client: Client<true>) {
        const { username, id } = client.user;
        this.container.logger.info(`Successfully logged in as ${username} (${id})`);
        this.container.logger.info(`Environment: ${CONFIG.NODE_ENV}`);
        this.container.logger.info(`Serving ${client.guilds.cache.size} guilds`);
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
