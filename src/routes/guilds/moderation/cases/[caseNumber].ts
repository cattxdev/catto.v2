import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Route.Options>({
	route: 'guilds/:guildId/moderation/cases/:caseNumber'
})
export class ModerationCaseRoute extends Route {
	public constructor(context: Route.LoaderContext, options: Route.Options) {
		super(context, {
			...options,
			methods: ['GET', 'PATCH', 'DELETE']
		});
	}

	public async run(request: Route.Request, response: Route.Response) {
		const { guildId, caseNumber } = request.params;

		if (!guildId || !caseNumber) {
			return response.status(400).json({
				error: 'Guild ID and case number are required'
			});
		}

		const caseNum = parseInt(caseNumber);
		if (isNaN(caseNum) || caseNum < 1) {
			return response.status(400).json({
				error: 'Invalid case number'
			});
		}

		// Verify guild exists in cache
		const discordGuild = this.container.client.guilds.cache.get(guildId);
		if (!discordGuild) {
			return response.status(404).json({
				error: 'Guild not found or bot is not in the guild'
			});
		}

		if (request.method === 'GET') {
			return this.handleGet(guildId, caseNum, response);
		} else if (request.method === 'PATCH') {
			return this.handleUpdate(guildId, caseNum, request, response);
		} else if (request.method === 'DELETE') {
			return this.handleDelete(guildId, caseNum, response);
		}

		return response.status(405).json({ error: 'Method not allowed' });
	}

	private async handleGet(guildId: string, caseNumber: number, response: Route.Response) {
		try {
			const modCase = await this.container.prisma.modCase.findFirst({
				where: {
					guildId,
					caseNumber
				}
			});

			if (!modCase) {
				return response.status(404).json({
					error: 'Case not found'
				});
			}

			return response.json(modCase);
		} catch (error) {
			this.container.logger.error('Error fetching moderation case:', error);
			return response.status(500).json({
				error: 'Internal server error'
			});
		}
	}

	private async handleUpdate(guildId: string, caseNumber: number, request: Route.Request, response: Route.Response) {
		try {
			const body = (request as Route.Request & { body?: unknown }).body as {
				reason?: string;
			} | undefined;

			if (!body || !body.reason) {
				return response.status(400).json({
					error: 'Reason is required'
				});
			}

			// Find the case
			const modCase = await this.container.prisma.modCase.findFirst({
				where: {
					guildId,
					caseNumber
				}
			});

			if (!modCase) {
				return response.status(404).json({
					error: 'Case not found'
				});
			}

			// Update the case
			const updatedCase = await this.container.prisma.modCase.update({
				where: { id: modCase.id },
				data: {
					reason: body.reason
				}
			});

			return response.json(updatedCase);
		} catch (error) {
			this.container.logger.error('Error updating moderation case:', error);
			return response.status(500).json({
				error: 'Internal server error'
			});
		}
	}

	private async handleDelete(guildId: string, caseNumber: number, response: Route.Response) {
		try {
			// Find the case
			const modCase = await this.container.prisma.modCase.findFirst({
				where: {
					guildId,
					caseNumber
				}
			});

			if (!modCase) {
				return response.status(404).json({
					error: 'Case not found'
				});
			}

			// Delete the case
			await this.container.prisma.modCase.delete({
				where: { id: modCase.id }
			});

		return response.status(204).end();
		} catch (error) {
			this.container.logger.error('Error deleting moderation case:', error);
			return response.status(500).json({
				error: 'Internal server error'
			});
		}
	}
}
