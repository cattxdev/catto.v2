import { Command } from '#command.js';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, Colors } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { ReputationService } from '#modules/reputation/services/reputation.service.js';
import { REPUTATION_TIERS, ReputationTier } from '#modules/reputation/models/reputation.model.js';
import type { UserReputation } from '@prisma/client';

@ApplyOptions<Command.Options>({
  name: 'leaderboard',
  preconditions: ['GuildOnly'],
  registerSubCommand: {
    parentCommandName: 'reputation',
    slashSubcommand: (builder) =>
      builder.setName('leaderboard').setDescription('View the reputation leaderboard'),
  },
})
export class ReputationLeaderboardCommand extends Command {
  private reputationService!: ReputationService;

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!this.reputationService) {
      this.reputationService = new ReputationService(this.container.prisma);
    }

    await interaction.deferReply();

    if (!interaction.guildId) {
      return interaction.editReply({
        content: `${EMOJI.STATUS.ERROR} This command can only be used in a server.`,
      });
    }

    const guildId = interaction.guildId;

    try {
      const leaderboard = await this.reputationService.getLeaderboard(guildId, 10);

      if (leaderboard.length === 0) {
        return interaction.editReply({
          content: `${EMOJI.STATUS.ERROR} No reputation data available yet.`,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.Gold)
        .setTitle(`${EMOJI.REWARDS.TROPHY} Reputation Leaderboard`)
        .setDescription('Top 10 most reputable members')
        .setTimestamp();

      const medals = [
        EMOJI.REWARDS.MEDALS.GOLD,
        EMOJI.REWARDS.MEDALS.SILVER,
        EMOJI.REWARDS.MEDALS.BRONZE,
      ];
      const leaderboardText = leaderboard
        .map((entry: UserReputation, index: number) => {
          const medal = medals[index] || `**${index + 1}.**`;
          const tierInfo = REPUTATION_TIERS[entry.reputationTier as ReputationTier];
          return `${medal} <@${entry.userId}> - ${tierInfo.emoji} ${entry.reputationScore} pts (${entry.vouchesReceived} vouches)`;
        })
        .join('\n');

      embed.addFields({
        name: 'Rankings',
        value: leaderboardText,
        inline: false,
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Failed to get leaderboard:', error);
      return interaction.editReply({
        content: `${EMOJI.STATUS.ERROR} Failed to retrieve leaderboard.`,
      });
    }
  }
}
