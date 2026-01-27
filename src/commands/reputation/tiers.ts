import { Command } from '#command.js';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, Colors } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { REPUTATION_TIERS } from '#modules/reputation/models/reputation.model.js';

@ApplyOptions<Command.Options>({
  name: 'tiers',
  preconditions: ['GuildOnly'],
  registerSubCommand: {
    parentCommandName: 'reputation',
    slashSubcommand: (builder) =>
      builder.setName('tiers').setDescription('View all reputation tiers and their perks'),
  },
})
export class ReputationTiersCommand extends Command {
  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();

    const embed = new EmbedBuilder()
      .setColor(Colors.Purple)
      .setTitle(`${EMOJI.XP.GAIN} Reputation Tiers`)
      .setDescription('Build your reputation to unlock amazing perks!')
      .setTimestamp();

    // Add each tier
    for (const [tierName, tierInfo] of Object.entries(REPUTATION_TIERS)) {
      embed.addFields({
        name: `${tierInfo.emoji} ${tierName}`,
        value: `**${tierInfo.minScore}+ points**\n${tierInfo.perks.map((perk) => `• ${perk}`).join('\n')}`,
        inline: false,
      });
    }

    embed.setFooter({ text: 'Use /rep to help others gain reputation!' });

    return interaction.editReply({ embeds: [embed] });
  }
}
