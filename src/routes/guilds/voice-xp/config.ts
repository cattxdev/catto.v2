import {
  getVoiceXPConfig,
  validateUpdateVoiceXPConfig,
  updateVoiceXPConfig,
} from '#root/modules/xp-voice/index.js';
import { Route } from '@sapphire/plugin-api';
import { Buffer } from 'node:buffer';

export class VoiceXPConfigRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/voice-xp/config',
      methods: ['GET', 'PUT'],
    });
  }

  private async parseBody(request: Route.Request): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = '';
      request.on('data', (chunk: Buffer) => {
        body += String(chunk);
      });
      request.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : undefined);
        } catch {
          resolve(undefined);
        }
      });
      request.on('error', reject);
    });
  }

  public async run(request: Route.Request, response: Route.Response) {
    const { guildId } = request.params;

    if (!guildId) {
      return response.status(400).json({
        error: 'Guild ID is required',
      });
    }

    if (request.method === 'GET') {
      return this.handleGet(guildId, response);
    } else if (request.method === 'PUT') {
      const body = await this.parseBody(request);
      return this.handlePut(guildId, body, response);
    }
  }

  private async handleGet(guildId: string, response: Route.Response) {
    try {
      const config = await getVoiceXPConfig(guildId);
      return response.json(config);
    } catch (error) {
      this.container.logger.error('[Voice XP API] Error fetching voice XP config:', error);
      return response.status(500).json({
        error: 'Failed to fetch voice XP configuration',
      });
    }
  }

  private async handlePut(guildId: string, body: unknown, response: Route.Response) {
    if (!body) {
      return response.status(400).json({
        error: 'Request body is required',
      });
    }

    const validation = validateUpdateVoiceXPConfig(body);
    if (!validation.valid) {
      return response.status(400).json({
        error: 'Invalid request body',
        details: validation.errors,
      });
    }

    try {
      const config = await updateVoiceXPConfig(guildId, body);
      return response.json(config);
    } catch (error) {
      this.container.logger.error('[Voice XP API] Error updating voice XP config:', error);
      return response.status(500).json({
        error: 'Failed to update voice XP configuration',
      });
    }
  }
}
