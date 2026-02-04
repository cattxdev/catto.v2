import { Command } from '#command.js';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { ReputationService } from '#modules/reputation/services/reputation.service.js';
import { REPUTATION_TIERS } from '#modules/reputation/models/reputation.model.js';

@ApplyOptions<Command.Options>({
  name: 'view',
  preconditions: ['GuildOnly'],
  registerSubCommand: {
    parentCommandName: 'reputation',
    slashSubcommand: (builder) =>
      builder
        .setName('view')
        .setDescription("View your or someone else's reputation")
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to view (leave empty for yourself)')
            .setRequired(false)
        ),
  },
})
export class ReputationViewCommand extends Command {
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
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const isOwn = targetUser.id === interaction.user.id;

    try {
      const stats = await this.reputationService.getReputationStats(guildId, targetUser.id);

      const tierInfo = REPUTATION_TIERS[stats.currentTier];

      const embed = new EmbedBuilder()
        .setColor(tierInfo.color)
        .setAuthor({
          name: `${targetUser.username}'s Reputation`,
          iconURL: targetUser.displayAvatarURL(),
        })
        .setDescription(
          `${tierInfo.emoji} **${stats.currentTier} Tier**\n${EMOJI.XP.REPUTATION.VOUCH_TYPES.SKILLED} ${stats.reputationScore} reputation points`
        )
        .addFields(
          {
            name: 'Vouches',
            value: `${EMOJI.MISC.INBOX} Received: ${stats.vouchesReceived}\n${EMOJI.MISC.OUTBOX} Given: ${stats.vouchesGiven}`,
            inline: true,
          },
          {
            name: 'Breakdown',
            value: `${EMOJI.XP.REPUTATION.VOUCH_TYPES.HELPFUL} Helpful: ${stats.breakdown.helpful}\n${EMOJI.XP.REPUTATION.VOUCH_TYPES.FRIENDLY} Friendly: ${stats.breakdown.friendly}\n${EMOJI.XP.REPUTATION.VOUCH_TYPES.SKILLED} Skilled: ${stats.breakdown.skilled}\n${EMOJI.XP.REPUTATION.VOUCH_TYPES.RELIABLE} Reliable: ${stats.breakdown.reliable}`,
            inline: true,
          }
        )
        .setFooter({ text: `Use /rep to give reputation to ${isOwn ? 'others' : 'this user'}` })
        .setTimestamp();

      // Add next tier info
      if (stats.nextTier) {
        const nextTierInfo = REPUTATION_TIERS[stats.nextTier];
        const pointsNeeded = nextTierInfo.minScore - stats.reputationScore;
        embed.addFields({
          name: `Next Tier: ${nextTierInfo.emoji} ${stats.nextTier}`,
          value: `Progress: ${stats.progressToNextTier}%\n${this.createProgressBar(stats.progressToNextTier)}\n${pointsNeeded} points needed`,
          inline: false,
        });
      } else {
        embed.addFields({
          name: `${EMOJI.REWARDS.CROWN} Maximum Tier Reached!`,
          value: "You've achieved the highest reputation tier!",
          inline: false,
        });
      }

      // Add current perks
      embed.addFields({
        name: 'Current Perks',
        value: tierInfo.perks.map((perk) => `• ${perk}`).join('\n'),
        inline: false,
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Failed to get reputation stats:', error);
      return interaction.editReply({
        content: `${EMOJI.STATUS.ERROR} Failed to retrieve reputation information.`,
      });
    }
  }

  private createProgressBar(percentage: number, length: number = 10): string {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    return EMOJI.XP.BAR.FILLED.repeat(filled) + EMOJI.XP.BAR.EMPTY.repeat(empty);
  }
}
