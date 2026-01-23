import { Route } from '@sapphire/plugin-api';
import { resetUserXP } from '#root/modules/xp-text';

export class XPResetUserRoute extends Route {
	public constructor(context: Route.LoaderContext, options: Route.Options) {
		super(context, {
			...options,
			route: 'guilds/[guildId]/xp/reset/user',
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
		const body = await this.parseBody(request);
		const userId = body?.userId;
		const reason = body?.reason;

		if (!userId) {
			return response.status(400).json({
				error: 'userId is required in request body'
			});
		}

		try {
			await resetUserXP(guildId, userId, reason);

			return response.json({
				success: true,
				message: `XP reset for user ${userId}`,
				guildId,
				userId
			});

		} catch (error) {
			this.container.logger.error('Error resetting user XP:', error);
			return response.status(500).json({
				error: 'Internal server error'
			});
		}
	}

	private async parseBody(request: Route.Request): Promise<any> {
		return new Promise((resolve, reject) => {
			let body = '';
			request.on('data', (chunk: Buffer) => {
				body += chunk.toString();
			});
			request.on('end', () => {
				try {
					resolve(body ? JSON.parse(body) : undefined);
				} catch (error) {
					resolve(undefined);
				}
			});
			request.on('error', reject);
		});
	}
}
