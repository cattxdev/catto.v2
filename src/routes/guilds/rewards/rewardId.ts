/**
 * Single Reward Route
 * GET/PATCH/DELETE /api/guilds/:guildId/rewards/:rewardId
 */

import { Route } from '@sapphire/plugin-api';
import { RewardService } from '#root/modules/rewards';

export class RewardRoute extends Route {
    private rewardService: RewardService;

    public constructor(context: Route.LoaderContext, options: Route.Options) {
        super(context, {
            ...options,
            route: 'guilds/[guildId]/rewards/[rewardId]',
            methods: ['GET', 'PATCH', 'DELETE']
        });
        this.rewardService = new RewardService(this.container.prisma);
    }

    public async run(request: Route.Request, response: Route.Response) {
        const { guildId, rewardId } = request.params;

        if (!guildId || !rewardId) {
            return response.status(400).json({
                error: 'Guild ID and Reward ID are required'
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
            return this.handleGet(guildId, rewardId, response);
        } else if (request.method === 'PATCH') {
            const body = await this.parseBody(request);
            return this.handlePatch(guildId, rewardId, body, response);
        } else if (request.method === 'DELETE') {
            return this.handleDelete(guildId, rewardId, response);
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
     * GET - Get a specific reward
     */
    private async handleGet(guildId: string, rewardId: string, response: Route.Response) {
        try {
            const rewards = await this.rewardService.getGuildRewards(guildId);
            const reward = rewards.find(r => r.id === rewardId);

            if (!reward) {
                return response.status(404).json({
                    error: 'Reward not found'
                });
            }

            return response.json({
                success: true,
                reward
            });

        } catch (error) {
            this.container.logger.error('Error fetching reward:', error);
            return response.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * PATCH - Update a reward
     */
    private async handlePatch(guildId: string, rewardId: string, body: any, response: Route.Response) {
        try {
            if (!body || typeof body !== 'object') {
                return response.status(400).json({
                    error: 'Invalid request body'
                });
            }

            // Verify reward exists and belongs to this guild
            const rewards = await this.rewardService.getGuildRewards(guildId);
            const existingReward = rewards.find(r => r.id === rewardId);

            if (!existingReward) {
                return response.status(404).json({
                    error: 'Reward not found'
                });
            }

            // Build update object with only provided fields
            const updates: any = {};

            if (body.level !== undefined) {
                if (typeof body.level !== 'number' || body.level < 1 || body.level > 1000) {
                    return response.status(400).json({
                        error: 'Level must be a number between 1 and 1000'
                    });
                }
                updates.level = body.level;
            }

            if (body.xpType !== undefined) {
                if (!['TEXT', 'VOICE', 'BOTH'].includes(body.xpType)) {
                    return response.status(400).json({
                        error: 'xpType must be TEXT, VOICE, or BOTH'
                    });
                }
                updates.xpType = body.xpType;
            }

            if (body.rewardType !== undefined) updates.rewardType = body.rewardType;
            if (body.rewardData !== undefined) updates.rewardData = body.rewardData;
            if (body.name !== undefined) updates.name = body.name;
            if (body.description !== undefined) updates.description = body.description;
            if (body.icon !== undefined) updates.icon = body.icon;
            if (body.oneTime !== undefined) updates.oneTime = body.oneTime;
            if (body.stackable !== undefined) updates.stackable = body.stackable;
            if (body.requiresPrevious !== undefined) updates.requiresPrevious = body.requiresPrevious;
            if (body.priority !== undefined) updates.priority = body.priority;
            if (body.enabled !== undefined) updates.enabled = body.enabled;

            const updatedReward = await this.rewardService.updateReward(rewardId, updates);

            return response.json({
                success: true,
                reward: updatedReward
            });

        } catch (error) {
            this.container.logger.error('Error updating reward:', error);
            return response.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * DELETE - Delete a reward
     */
    private async handleDelete(guildId: string, rewardId: string, response: Route.Response) {
        try {
            // Verify reward exists and belongs to this guild
            const rewards = await this.rewardService.getGuildRewards(guildId);
            const existingReward = rewards.find(r => r.id === rewardId);

            if (!existingReward) {
                return response.status(404).json({
                    error: 'Reward not found'
                });
            }

            await this.rewardService.deleteReward(rewardId);

            return response.json({
                success: true,
                message: 'Reward deleted successfully'
            });

        } catch (error) {
            this.container.logger.error('Error deleting reward:', error);
            return response.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
