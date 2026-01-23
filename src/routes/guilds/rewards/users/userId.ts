/**
 * User Rewards Route
 * GET /api/guilds/:guildId/rewards/users/:userId
 */

import { RewardService } from '#root/modules/rewards';
import { Route } from '@sapphire/plugin-api';

export class UserRewardsRoute extends Route {
    private rewardService: RewardService;

    public constructor(context: Route.LoaderContext, options: Route.Options) {
        super(context, {
            ...options,
            route: 'guilds/[guildId]/rewards/users/[userId]',
            methods: ['GET']
        });
        this.rewardService = new RewardService(this.container.prisma);
    }

    public async run(request: Route.Request, response: Route.Response) {
        const { guildId, userId } = request.params;

        if (!guildId || !userId) {
            return response.status(400).json({
                error: 'Guild ID and User ID are required'
            });
        }

        // Verify guild exists
        const guild = this.container.client.guilds.cache.get(guildId);
        if (!guild) {
            return response.status(404).json({
                error: 'Guild not found or bot is not in the guild'
            });
        }

        try {
            const claims = await this.rewardService.getUserRewards(guildId, userId);

            return response.json({
                success: true,
                count: claims.length,
                claims: claims.map((claim: any) => ({
                    id: claim.id,
                    rewardId: claim.rewardId,
                    levelAtClaim: claim.levelAtClaim,
                    xpAtClaim: claim.xpAtClaim,
                    status: claim.status,
                    claimedAt: claim.claimedAt,
                    expiresAt: claim.expiresAt,
                    reward: claim.reward,
                }))
            });

        } catch (error) {
            this.container.logger.error('Error fetching user rewards:', error);
            return response.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
