import {
  getVoiceXPConfig,
  getAllGuildVoiceUsers,
  recalculateAllVoiceLevels,
  updateUserVoiceLevel,
} from '#root/modules/xp-voice/index.js';
import { Route } from '@sapphire/plugin-api';

export class VoiceXPRecalcRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/voice-xp/recalc',
      methods: ['POST'],
    });
  }

  public async run(request: Route.Request, response: Route.Response) {
    const { guildId } = request.params;

    if (!guildId) {
      return response.status(400).json({
        error: 'Guild ID is required',
      });
    }

    try {
      const config = await getVoiceXPConfig(guildId);
      const users = await getAllGuildVoiceUsers(guildId);

      const updates = recalculateAllVoiceLevels(
        config,
        users.map((u) => ({ userId: u.userId, xp: u.xp }))
      );

      for (const update of updates) {
        await updateUserVoiceLevel(guildId, update.userId, update.newLevel);
      }

      return response.json({
        success: true,
        message: 'Voice XP levels recalculated successfully',
        usersUpdated: updates.length,
      });
    } catch (error) {
      this.container.logger.error('[Voice XP API] Error recalculating voice XP levels:', error);
      return response.status(500).json({
        error: 'Failed to recalculate voice XP levels',
      });
    }
  }
}
