import { getVoiceXPConfig, updateVoiceXPConfig } from '#root/modules/xp/xp-voice/index.js';
import { Route } from '@sapphire/plugin-api';
import { parseRequestBody } from '#lib/route-utils.js';
import { validateDto } from '#lib/validation/validate-dto.js';
import { UpdateVoiceXPConfigDto } from '#root/lib/dtos/voice-xp/update-voice-xp-config.dto.js';
import type { UpdateVoiceXPConfigDTO } from '#root/modules/xp/xp-voice/dtos/update-voice-xp-config.dto.js';

export class VoiceXPConfigRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/voice-xp/config',
      methods: ['GET', 'PUT'],
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
      const body = await parseRequestBody(request);
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

    const validation = await validateDto(UpdateVoiceXPConfigDto, body);
    if (!validation.success) {
      return response.status(400).json({
        error: 'Invalid request body',
        details: validation.errors,
      });
    }

    try {
      // Cast to service's expected interface (both DTOs have compatible structure)
      const config = await updateVoiceXPConfig(guildId, validation.data as UpdateVoiceXPConfigDTO);
      return response.json(config);
    } catch (error) {
      this.container.logger.error('[Voice XP API] Error updating voice XP config:', error);
      return response.status(500).json({
        error: 'Failed to update voice XP configuration',
      });
    }
  }
}
