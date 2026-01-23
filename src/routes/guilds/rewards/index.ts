/**
 * Rewards List/Create Route
 * GET/POST /api/guilds/:guildId/rewards
 */

import { RewardService } from '#root/modules/rewards';
import { Route } from '@sapphire/plugin-api';

export class RewardsRoute extends Route {
    private rewardService: RewardService;

    public constructor(context: Route.LoaderContext, options: Route.Options) {
        super(context, {
            ...options,
            route: 'guilds/[guildId]/rewards',
            methods: ['GET', 'POST']
        });
        this.rewardService = new RewardService(this.container.prisma);
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
            return this.handleGet(guildId, request, response);
        } else if (request.method === 'POST') {
            const body = await this.parseBody(request);
            return this.handlePost(guildId, body, response);
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
     * GET - List all rewards for a guild
     */
    private async handleGet(guildId: string, request: Route.Request, response: Route.Response) {
        try {
            // Parse query parameters
            const typeFilter = request.query?.type as string | undefined;
            const enabledFilter = request.query?.enabled as string | undefined;

            let rewards = await this.rewardService.getGuildRewards(guildId);

            // Apply filters
            if (typeFilter) {
                rewards = rewards.filter(r => r.xpType === typeFilter.toUpperCase());
            }

            if (enabledFilter !== undefined) {
                const enabled = enabledFilter === 'true';
                rewards = rewards.filter(r => r.enabled === enabled);
            }

            return response.json({
                success: true,
                count: rewards.length,
                rewards
            });

        } catch (error) {
            this.container.logger.error('Error fetching rewards:', error);
            return response.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * POST - Create a new reward
     */
    private async handlePost(guildId: string, body: any, response: Route.Response) {
        try {
            // Validate required fields
            if (!body || typeof body !== 'object') {
                return response.status(400).json({
                    error: 'Invalid request body'
                });
            }

            const { level, xpType, rewardType, rewardData, name } = body;

            if (!level || !xpType || !rewardType || !rewardData || !name) {
                return response.status(400).json({
                    error: 'Missing required fields: level, xpType, rewardType, rewardData, name'
                });
            }

            // Validate level
            if (typeof level !== 'number' || level < 1 || level > 1000) {
                return response.status(400).json({
                    error: 'Level must be a number between 1 and 1000'
                });
            }

            // Validate xpType
            if (!['TEXT', 'VOICE', 'BOTH'].includes(xpType)) {
                return response.status(400).json({
                    error: 'xpType must be TEXT, VOICE, or BOTH'
                });
            }

            // Create reward config
            const config = {
                guildId,
                level,
                xpType,
                rewardType,
                rewardData,
                name,
                description: body.description,
                icon: body.icon,
                oneTime: body.oneTime ?? true,
                stackable: body.stackable ?? false,
                requiresPrevious: body.requiresPrevious ?? false,
                priority: body.priority ?? 0,
                enabled: body.enabled ?? true,
            };

            const reward = await this.rewardService.createReward(config);

            return response.status(201).json({
                success: true,
                reward
            });

        } catch (error) {
            this.container.logger.error('Error creating reward:', error);
            return response.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
