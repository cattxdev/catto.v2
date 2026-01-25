import { RewardService } from '#root/modules/rewards';
import { type RewardData } from '#lib/types/rewards.types';
import { Route } from '@sapphire/plugin-api';
import { validateDto } from '#lib/validation/validate-dto';
import { CreateRewardDto } from '#root/dtos/rewards/create-reward.dto';

export class RewardsRoute extends Route {
  private rewardService: RewardService;

  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/rewards',
      methods: ['GET', 'POST'],
    });
    this.rewardService = new RewardService(this.container.prisma);
  }

  public async run(request: Route.Request, response: Route.Response) {
    const { guildId } = request.params;

    if (!guildId) {
      return response.status(400).json({
        error: 'Guild ID is required',
      });
    }

    // Verify guild exists
    const guild = this.container.client.guilds.cache.get(guildId);
    if (!guild) {
      return response.status(404).json({
        error: 'Guild not found or bot is not in the guild',
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

  private async parseBody(request: Route.Request): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = '';
      request.on('data', (chunk: unknown) => {
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
        rewards = rewards.filter((r) => r.xpType === typeFilter.toUpperCase());
      }

      if (enabledFilter !== undefined) {
        const enabled = enabledFilter === 'true';
        rewards = rewards.filter((r) => r.enabled === enabled);
      }

      return response.json({
        success: true,
        count: rewards.length,
        rewards,
      });
    } catch (error) {
      this.container.logger.error('Error fetching rewards:', error);
      return response.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST - Create a new reward
   */
  private async handlePost(guildId: string, body: unknown, response: Route.Response) {
    try {
      // Validate with DTO
      const validation = await validateDto(CreateRewardDto, body);

      if (!validation.success) {
        return response.status(400).json({
          error: 'Validation failed',
          details: validation.errors,
        });
      }

      // Now validation.data is fully typed and validated!
      const dto = validation.data!;

      // Create reward config
      const config = {
        guildId,
        level: dto.level,
        xpType: dto.xpType,
        rewardType: dto.rewardType,
        rewardData: dto.rewardData as unknown as RewardData,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        oneTime: dto.oneTime ?? true,
        stackable: dto.stackable ?? false,
        requiresPrevious: dto.requiresPrevious ?? false,
        priority: dto.priority ?? 0,
        enabled: dto.enabled ?? true,
      };

      const reward = await this.rewardService.createReward(config);

      return response.status(201).json({
        success: true,
        reward,
      });
    } catch (error) {
      this.container.logger.error('Error creating reward:', error);
      return response.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
