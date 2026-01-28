import { Command } from '#command.js';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, Colors } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { ReputationService } from '#modules/reputation/services/reputation.service.js';

@ApplyOptions<Command.Options>({
  name: 'history',
  preconditions: ['GuildOnly'],
  registerSubCommand: {
    parentCommandName: 'reputation',
    slashSubcommand: (builder) =>
      builder
        .setName('history')
        .setDescription('View vouch history')
        .addUserOption((option) =>
          option.setName('user').setDescription('The user to view history for').setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('View received or given vouches')
            .addChoices({ name: 'Received', value: 'received' }, { name: 'Given', value: 'given' })
            .setRequired(false)
        ),
  },
})
export class ReputationHistoryCommand extends Command {
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
    const historyType =
      (interaction.options.getString('type') as 'received' | 'given') || 'received';

    try {
      const history = await this.reputationService.getVouchHistory(
        guildId,
        targetUser.id,
        historyType
      );

      if (history.length === 0) {
        return interaction.editReply({
          content: `${targetUser.username} has no ${historyType} vouches yet.`,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setTitle(
          `${targetUser.username}'s ${historyType === 'received' ? 'Received' : 'Given'} Vouches`
        )
        .setDescription(`Showing the last ${history.length} vouches`)
        .setTimestamp();

      for (const vouch of history.slice(0, 10)) {
        const otherUserId = historyType === 'received' ? vouch.giverUserId : vouch.receiverUserId;
        const emoji = this.getVouchEmoji(vouch.vouchType);
        const timestamp = `<t:${Math.floor(vouch.createdAt.getTime() / 1000)}:R>`;

        embed.addFields({
          name: `${emoji} ${vouch.vouchType} • ${timestamp}`,
          value: `${historyType === 'received' ? 'From' : 'To'}: <@${otherUserId}>\n${
            vouch.reason ? `*"${vouch.reason}"*` : '*No reason provided*'
          }`,
          inline: false,
        });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error('Failed to get vouch history:', error);
      return interaction.editReply({
        content: `${EMOJI.STATUS.ERROR} Failed to retrieve vouch history.`,
      });
    }
  }

  private getVouchEmoji(type: string): string {
    switch (type) {
      case 'helpful':
        return EMOJI.XP.REPUTATION.VOUCH_TYPES.HELPFUL;
      case 'friendly':
        return EMOJI.XP.REPUTATION.VOUCH_TYPES.FRIENDLY;
      case 'skilled':
        return EMOJI.XP.REPUTATION.VOUCH_TYPES.SKILLED;
      case 'reliable':
        return EMOJI.XP.REPUTATION.VOUCH_TYPES.RELIABLE;
      default:
        return EMOJI.XP.REPUTATION.VOUCH_TYPES.DEFAULT;
    }
  }
}
