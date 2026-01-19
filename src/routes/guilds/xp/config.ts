/**
 * XP Configuration Route
 * GET/PUT /api/guilds/:guildId/xp/config
 */

import { Route } from '@sapphire/plugin-api';
import { configService } from '../../../modules/xp-text/services';
import { validateUpdateXPConfig } from '../../../modules/xp-text/dtos/update-xp-config.dto';

export class XPConfigRoute extends Route {
	public constructor(context: Route.LoaderContext, options: Route.Options) {
		super(context, {
			...options,
			route: 'guilds/[guildId]/xp/config',
			methods: ['GET', 'PUT']
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

		if (request.method === 'GET') {
			return this.handleGet(guildId, response);
		} else if (request.method === 'PUT') {
			// Parse body for PUT requests
			const body = await this.parseBody(request);
			return this.handlePut(guildId, body, response);
		}

		return response.status(405).json({ error: 'Method not allowed' });
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

	/**
	 * GET - Retrieve XP configuration
	 */
	private async handleGet(guildId: string, response: Route.Response) {
		try {
			const config = await configService.getConfig(guildId);

			return response.json({
				success: true,
				config
			});

		} catch (error) {
			this.container.logger.error('Error fetching XP config:', error);
			return response.status(500).json({
				error: 'Internal server error'
			});
		}
	}

	/**
	 * PUT - Update XP configuration
	 */
	private async handlePut(guildId: string, updateData: any, response: Route.Response) {
		try {
			if (!updateData) {
				return response.status(400).json({
					error: 'Request body is required'
				});
			}

			// Debug log
			this.container.logger.debug('XP Config Update Request:', JSON.stringify(updateData, null, 2));

			// Validate update data
			const validation = validateUpdateXPConfig(updateData);
			if (!validation.valid) {
				return response.status(400).json({
					error: 'Validation failed',
					details: validation.errors
				});
			}

			// Update configuration
			const config = await configService.updateConfig(guildId, updateData);

			return response.json({
				success: true,
				config
			});

		} catch (error) {
			this.container.logger.error('Error updating XP config:', error);
			return response.status(500).json({
				error: 'Internal server error'
			});
		}
	}
}
