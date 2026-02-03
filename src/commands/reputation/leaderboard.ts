/**
 * Leaderboard command - Display guild XP leaderboard with a custom generated card
 */

import { Command } from '@sapphire/framework';
import { AttachmentBuilder, EmbedBuilder, Colors } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { ImageGeneratorService } from '#root/lib/services/image-generator.js';
import * as leaderboardService from '#root/modules/xp/xp-text/services/xp-text-leaderboard.service.js';

export class LeaderboardCommand extends Command {
  private imageGenerator: ImageGeneratorService;

  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'leaderboard',
      description: 'View the server XP leaderboard',
      aliases: ['lb', 'top'],
    });

    this.imageGenerator = new ImageGeneratorService();
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addIntegerOption((option) =>
          option
            .setName('limit')
            .setDescription('Number of users to show (default: 10, max: 25)')
            .setMinValue(5)
            .setMaxValue(25)
            .setRequired(false)
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();

    // Ensure command is run in a guild
    if (!interaction.guild || !interaction.guildId) {
      return interaction.editReply({
        content: `${EMOJI.STATUS.ERROR} This command can only be used in a server.`,
      });
    }

    const limit = interaction.options.getInteger('limit') || 10;

    try {
      // Get leaderboard data
      const leaderboardData = await leaderboardService.getLeaderboard(
        interaction.guildId,
        limit,
        0
      );

      if (leaderboardData.users.length === 0) {
        return interaction.editReply({
          content: `${EMOJI.STATUS.ERROR} No users have earned XP yet!`,
        });
      }

      // Prepare data for image generation
      const entries = leaderboardData.users.map((user) => ({
        rank: user.rank,
        username: user.username,
        avatarUrl: user.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
        level: user.level,
        xp: user.xp,
      }));

      // Generate leaderboard card
      const cardImage = await this.imageGenerator.generateLeaderboardCard({
        guildName: interaction.guild.name,
        guildIcon: interaction.guild.iconURL({ extension: 'png', size: 128 }) || undefined,
        entries: entries,
        accentColor: '#5865F2',
      });

      // Create attachment
      const attachment = new AttachmentBuilder(cardImage, { name: 'leaderboard.png' });

      // Send the image
      return interaction.editReply({
        files: [attachment],
      });
    } catch (error) {
      this.container.logger.error('Error generating leaderboard card:', error);

      // Fallback to text-based embed
      const leaderboardData = await leaderboardService.getLeaderboard(
        interaction.guildId,
        limit,
        0
      );

      if (leaderboardData.users.length === 0) {
        return interaction.editReply({
          content: `${EMOJI.STATUS.ERROR} No users have earned XP yet!`,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(`🏆 ${interaction.guild.name} - XP Leaderboard`)
        .setDescription(
          leaderboardData.users
            .map((user, index) => {
              const medal =
                index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${user.rank}.**`;
              return `${medal} <@${user.userId}> - Level ${user.level} (${user.xp.toLocaleString()} XP)`;
            })
            .join('\n')
        )
        .setFooter({ text: 'Image generation failed, showing text-based leaderboard' })
        .setTimestamp();

      const iconURL = interaction.guild.iconURL();
      if (iconURL) {
        embed.setThumbnail(iconURL);
      }

      return interaction.editReply({
        embeds: [embed],
        content: `${EMOJI.STATUS.WARNING} Image generation failed, showing text-based leaderboard instead.`,
      });
    }
  }
}
