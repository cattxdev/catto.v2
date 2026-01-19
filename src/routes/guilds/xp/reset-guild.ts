/**
 * XP Reset Guild Route
 * POST /api/guilds/:guildId/xp/reset/guild
 * Body: { reason?: string }
 */

import { Route } from '@sapphire/plugin-api';
import { resetGuildXP } from '../../../modules/xp-text/repositories/xp-text.repository';

export class XPResetGuildRoute extends Route {
	public constructor(context: Route.LoaderContext, options: Route.Options) {
		super(context, {
			...options,
			route: 'guilds/[guildId]/xp/reset/guild',
			methods: ['POST']
		});
	}

	public async run(request: Route.Request, response: Route.Response) {
		const { guildId } = request.params;

		if (!guildId) {
			return response.status(400).json({
				error: 'Guild ID is required'
			});
		}

		// Verify guild exists
		const guild = this.container.client.guilds.cache.get(guildId);
		if (!guild) {
			return response.status(404).json({
				error: 'Guild not found or bot is not in the guild'
			});
		}

		// Parse body
		const body = (request as Route.Request & { body?: unknown }).body as { reason?: string } | undefined;
		const reason = body?.reason;

		try {
			const resetCount = await resetGuildXP(guildId, reason);

			return response.json({
				success: true,
				message: `XP reset for entire guild`,
				guildId,
				usersReset: resetCount
			});

		} catch (error) {
			this.container.logger.error('Error resetting guild XP:', error);
			return response.status(500).json({
				error: 'Internal server error'
			});
		}
	}
}
