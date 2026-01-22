/**
 * Rewards Command
 * Allows administrators to configure XP rewards for their guild
 */

import { Command } from '@sapphire/framework';
import {
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { RewardService } from '../../modules/rewards/services/RewardService';
import { RewardType, XPType, PRESET_TEMPLATES } from '../../lib/types/rewards.types';
import type { LevelRewardConfig } from '../../lib/types/rewards.types';

export class RewardsCommand extends Command {
  private rewardService!: RewardService;

  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'rewards',
      description: 'Configure XP rewards for your server',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addSubcommand((cmd) =>
          cmd
            .setName('list')
            .setDescription('View all configured rewards for this server')
            .addStringOption((opt) =>
              opt
                .setName('type')
                .setDescription('Filter by XP type')
                .addChoices(
                  { name: 'Text XP', value: 'TEXT' },
                  { name: 'Voice XP', value: 'VOICE' },
                  { name: 'Both', value: 'BOTH' }
                )
            )
        )
        .addSubcommand((cmd) =>
          cmd
            .setName('add')
            .setDescription('Add a new reward')
            .addIntegerOption((opt) =>
              opt
                .setName('level')
                .setDescription('Level requirement')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1000)
            )
            .addStringOption((opt) =>
              opt
                .setName('type')
                .setDescription('Reward type')
                .setRequired(true)
                .addChoices(
                  { name: '🎭 Add Role', value: RewardType.ROLE_ADD },
                  { name: '🔄 Replace Role', value: RewardType.ROLE_REPLACE },
                  { name: '💰 Grant Currency', value: RewardType.CURRENCY_GRANT },
                  { name: '⚡ XP Multiplier', value: RewardType.XP_MULTIPLIER },
                  { name: '🚪 Channel Access', value: RewardType.CHANNEL_ACCESS },
                  { name: '🔐 Permissions', value: RewardType.PERMISSION_GRANT },
                  { name: '🎤 Voice Priority', value: RewardType.VOICE_PRIORITY },
                  { name: '📢 Announcement', value: RewardType.ANNOUNCEMENT }
                )
            )
            .addStringOption((opt) =>
              opt
                .setName('xp-type')
                .setDescription('Which XP type this reward is for')
                .setRequired(true)
                .addChoices(
                  { name: 'Text XP', value: 'TEXT' },
                  { name: 'Voice XP', value: 'VOICE' },
                  { name: 'Both', value: 'BOTH' }
                )
            )
            .addStringOption((opt) =>
              opt.setName('name').setDescription('Reward name').setRequired(true)
            )
            .addRoleOption((opt) =>
              opt
                .setName('role')
                .setDescription('Role to grant (for role rewards)')
            )
            .addIntegerOption((opt) =>
              opt
                .setName('amount')
                .setDescription('Amount (for currency/multiplier)')
                .setMinValue(1)
            )
        )
        .addSubcommand((cmd) =>
          cmd
            .setName('remove')
            .setDescription('Remove a reward')
            .addStringOption((opt) =>
              opt
                .setName('reward-id')
                .setDescription('ID of the reward to remove')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand((cmd) =>
          cmd
            .setName('template')
            .setDescription('Apply a reward template')
            .addStringOption((opt) =>
              opt
                .setName('template')
                .setDescription('Template to apply')
                .setRequired(true)
                .addChoices(
                  { name: '🥉 Basic Role Progression', value: 'BASIC_ROLES' },
                  { name: '💰 Economy Focus', value: 'ECONOMY_FOCUS' },
                  { name: '🚪 Channel Access', value: 'CHANNEL_ACCESS' },
                  { name: '🎤 Voice Specialist', value: 'VOICE_SPECIALIST' }
                )
            )
        )
        .addSubcommand((cmd) =>
          cmd
            .setName('edit')
            .setDescription('Edit an existing reward')
            .addStringOption((opt) =>
              opt
                .setName('reward-id')
                .setDescription('ID of the reward to edit')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand((cmd) =>
          cmd
            .setName('toggle')
            .setDescription('Enable or disable a reward')
            .addStringOption((opt) =>
              opt
                .setName('reward-id')
                .setDescription('ID of the reward')
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addBooleanOption((opt) =>
              opt
                .setName('enabled')
                .setDescription('Enable or disable')
                .setRequired(true)
            )
        )
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
    }

    // Initialize service if needed
    if (!this.rewardService) {
      const { prisma } = this.container;
      this.rewardService = new RewardService(prisma);
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'list':
        return this.handleList(interaction);
      case 'add':
        return this.handleAdd(interaction);
      case 'remove':
        return this.handleRemove(interaction);
      case 'template':
        return this.handleTemplate(interaction);
      case 'edit':
        return this.handleEdit(interaction);
      case 'toggle':
        return this.handleToggle(interaction);
      default:
        return interaction.reply({
          content: '❌ Unknown subcommand.',
          ephemeral: true,
        });
    }
  }

  private async handleList(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const typeFilter = interaction.options.getString('type') as XPType | null;
    const rewards = await this.rewardService.getGuildRewards(interaction.guildId!);

    let filteredRewards = rewards;
    if (typeFilter) {
      filteredRewards = rewards.filter(
        (r) => r.xpType === typeFilter || r.xpType === XPType.BOTH
      );
    }

    if (filteredRewards.length === 0) {
      return interaction.editReply({
        content: '❌ No rewards configured yet. Use `/rewards add` or `/rewards template` to get started!',
      });
    }

    // Group by level
    const rewardsByLevel = new Map<number, LevelRewardConfig[]>();
    for (const reward of filteredRewards) {
      if (!rewardsByLevel.has(reward.level)) {
        rewardsByLevel.set(reward.level, []);
      }
      rewardsByLevel.get(reward.level)!.push(reward);
    }

    // Create embeds (paginate if needed)
    const embeds: EmbedBuilder[] = [];
    let currentEmbed = new EmbedBuilder()
      .setTitle('📊 Server XP Rewards')
      .setColor(0x5865f2)
      .setDescription(
        `Total Rewards: ${filteredRewards.length}\n` +
          `${typeFilter ? `Filtered by: ${typeFilter}` : 'All types'}`
      );

    let fieldCount = 0;
    const sortedLevels = Array.from(rewardsByLevel.keys()).sort((a, b) => a - b);

    for (const level of sortedLevels) {
      const levelRewards = rewardsByLevel.get(level)!;
      const rewardList = levelRewards
        .map(
          (r) =>
            `${r.icon || '•'} **${r.name}** (${r.xpType})\n` +
            `  Type: \`${r.rewardType}\`${!r.enabled ? ' ⚠️ *Disabled*' : ''}\n` +
            `  ID: \`${r.id}\``
        )
        .join('\n');

      if (fieldCount >= 10) {
        embeds.push(currentEmbed);
        currentEmbed = new EmbedBuilder()
          .setTitle('📊 Server XP Rewards (continued)')
          .setColor(0x5865f2);
        fieldCount = 0;
      }

      currentEmbed.addFields({
        name: `Level ${level}`,
        value: rewardList,
        inline: false,
      });
      fieldCount++;
    }

    embeds.push(currentEmbed);

    if (embeds.length === 0 || !embeds[0]) {
      return interaction.editReply({
        content: '❌ No rewards to display.',
      });
    }

    return interaction.editReply({ embeds: [embeds[0]!] });
  }

  private async handleAdd(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const level = interaction.options.getInteger('level', true);
    const rewardType = interaction.options.getString('type', true) as RewardType;
    const xpType = interaction.options.getString('xp-type', true) as XPType;
    const name = interaction.options.getString('name', true);
    const role = interaction.options.getRole('role');
    const amount = interaction.options.getInteger('amount');

    // Build reward data based on type
    let rewardData: any = {};

    switch (rewardType) {
      case RewardType.ROLE_ADD:
      case RewardType.ROLE_REPLACE:
        if (!role) {
          return interaction.editReply({
            content: '❌ You must specify a role for role rewards.',
          });
        }
        rewardData = {
          roleId: role.id,
          action: rewardType === RewardType.ROLE_ADD ? 'ADD' : 'REPLACE',
        };
        break;

      case RewardType.CURRENCY_GRANT:
        if (!amount) {
          return interaction.editReply({
            content: '❌ You must specify an amount for currency rewards.',
          });
        }
        rewardData = {
          amount,
          currencyType: 'coins',
        };
        break;

      case RewardType.XP_MULTIPLIER:
        if (!amount) {
          return interaction.editReply({
            content: '❌ You must specify a multiplier (e.g., 150 for 1.5x).',
          });
        }
        rewardData = {
          multiplier: amount / 100,
          xpType,
        };
        break;

      default:
        rewardData = {};
    }

    try {
      const reward = await this.rewardService.createReward({
        guildId: interaction.guildId!,
        level,
        xpType,
        rewardType,
        rewardData,
        name,
        oneTime: true,
        stackable: false,
        enabled: true,
      });

      const embed = new EmbedBuilder()
        .setTitle('✅ Reward Created')
        .setColor(0x57f287)
        .addFields(
          { name: 'Name', value: reward.name, inline: true },
          { name: 'Level', value: String(reward.level), inline: true },
          { name: 'Type', value: reward.xpType, inline: true },
          { name: 'Reward Type', value: reward.rewardType, inline: false },
          { name: 'ID', value: `\`${reward.id}\``, inline: false }
        )
        .setFooter({ text: 'Use /rewards list to view all rewards' });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Failed to create reward:', error);
      return interaction.editReply({
        content: '❌ Failed to create reward. Please try again.',
      });
    }
  }

  private async handleRemove(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const rewardId = interaction.options.getString('reward-id', true);

    try {
      await this.rewardService.deleteReward(rewardId);

      return interaction.editReply({
        content: '✅ Reward successfully removed.',
      });
    } catch (error) {
      this.container.logger.error('Failed to remove reward:', error);
      return interaction.editReply({
        content: '❌ Failed to remove reward. Make sure the ID is correct.',
      });
    }
  }

  private async handleTemplate(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const templateKey = interaction.options.getString('template', true);
    const template = PRESET_TEMPLATES[templateKey];

    if (!template) {
      return interaction.editReply({
        content: '❌ Invalid template selected.',
      });
    }

    try {
      const createdRewards = [];

      for (const rewardConfig of template.rewards) {
        const reward = await this.rewardService.createReward({
          ...rewardConfig,
          guildId: interaction.guildId!,
        });
        createdRewards.push(reward);
      }

      const embed = new EmbedBuilder()
        .setTitle(`✅ Template Applied: ${template.name}`)
        .setDescription(template.description || 'No description')
        .setColor(0x57f287)
        .addFields({
          name: 'Rewards Created',
          value: `${createdRewards.length} rewards have been added to your server.`,
        })
        .setFooter({
          text: 'Remember to configure role IDs and other settings for each reward!',
        });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Failed to apply template:', error);
      return interaction.editReply({
        content: '❌ Failed to apply template. Some rewards may already exist.',
      });
    }
  }

  private async handleEdit(interaction: Command.ChatInputCommandInteraction) {
    return interaction.reply({
      content: '🚧 Edit functionality coming soon! Use `/rewards remove` and `/rewards add` for now.',
      ephemeral: true,
    });
  }

  private async handleToggle(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const rewardId = interaction.options.getString('reward-id', true);
    const enabled = interaction.options.getBoolean('enabled', true);

    try {
      await this.rewardService.updateReward(rewardId, { enabled });

      return interaction.editReply({
        content: `✅ Reward ${enabled ? 'enabled' : 'disabled'} successfully.`,
      });
    } catch (error) {
      this.container.logger.error('Failed to toggle reward:', error);
      return interaction.editReply({
        content: '❌ Failed to toggle reward. Make sure the ID is correct.',
      });
    }
  }

  // Autocomplete for reward IDs
  public override async autocompleteRun(
    interaction: Command.AutocompleteInteraction
  ) {
    if (!interaction.inGuild()) return;

    if (!this.rewardService) {
      const { prisma } = this.container;
      this.rewardService = new RewardService(prisma);
    }

    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'reward-id') {
      const rewards = await this.rewardService.getGuildRewards(interaction.guildId);
      const filtered = rewards
        .filter((r) =>
          r.name.toLowerCase().includes(focusedOption.value.toLowerCase())
        )
        .slice(0, 25);

      return interaction.respond(
        filtered.map((r) => ({
          name: `${r.name} (Level ${r.level} - ${r.xpType})`,
          value: r.id!,
        }))
      );
    }
  }
}
