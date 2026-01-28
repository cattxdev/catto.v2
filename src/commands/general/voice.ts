import { Command } from '#lib/sapphire/command/command.js';
import { type Message, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '#lib/constants.js';
import { SlashCommandSubcommandBuilder } from '@discordjs/builders';

export class VoiceCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'voice',
      description: 'Display help for voice commands',
      detailedDescription: 'Shows a list of all available voice-related commands and their usage.',
      registerSubcommandInGroup: {
        parentCommandName: 'info',
        groupName: 'help',
        slashSubcommand: new SlashCommandSubcommandBuilder()
          .setName('voice')
          .setDescription('Display help for voice commands'),
      },
    });
  }

  public override async messageRun(message: Message) {
    const { client, stores } = this.container;
    const commands = stores.get('commands');

    // Filter voice-related commands
    const voiceCommands = Array.from(commands.values()).filter(
      (cmd) =>
        cmd.fullCategory.some((cat) => cat.toLowerCase().includes('voice')) ||
        cmd.name.toLowerCase().includes('voice') ||
        cmd.description.toLowerCase().includes('voice')
    );

    const embed = new EmbedBuilder()
      .setColor(COLORS.DEFAULT)
      .setTitle('🎤 Temporary Voice Channels')
      .setDescription('Manage your own temporary voice channel with these commands.')
      .setThumbnail(client.user?.displayAvatarURL() ?? null);

    if (voiceCommands.length > 0) {
      // Group commands by category
      const channelControl = voiceCommands.filter((cmd) =>
        ['bitrate', 'limit', 'region', 'rename', 'reset'].includes(cmd.name.replace('voice/', ''))
      );
      const privacy = voiceCommands.filter((cmd) =>
        ['lock', 'unlock', 'hide', 'show'].includes(cmd.name.replace('voice/', ''))
      );
      const userManagement = voiceCommands.filter((cmd) =>
        ['permit', 'deny', 'kick', 'trust', 'untrust'].includes(cmd.name.replace('voice/', ''))
      );
      const ownership = voiceCommands.filter((cmd) =>
        ['claim', 'transfer', 'panel'].includes(cmd.name.replace('voice/', ''))
      );

      if (channelControl.length > 0) {
        embed.addFields({
          name: '⚙️ Channel Settings',
          value: channelControl
            .map((cmd) => `\`/voice ${cmd.name.replace('voice/', '')}\` • ${cmd.description}`)
            .join('\n'),
          inline: false,
        });
      }

      if (privacy.length > 0) {
        embed.addFields({
          name: '🔒 Privacy Controls',
          value: privacy
            .map((cmd) => `\`/voice ${cmd.name.replace('voice/', '')}\` • ${cmd.description}`)
            .join('\n'),
          inline: false,
        });
      }

      if (userManagement.length > 0) {
        embed.addFields({
          name: '👥 User Management',
          value: userManagement
            .map((cmd) => `\`/voice ${cmd.name.replace('voice/', '')}\` • ${cmd.description}`)
            .join('\n'),
          inline: false,
        });
      }

      if (ownership.length > 0) {
        embed.addFields({
          name: '👑 Ownership & Control',
          value: ownership
            .map((cmd) => `\`/voice ${cmd.name.replace('voice/', '')}\` • ${cmd.description}`)
            .join('\n'),
          inline: false,
        });
      }
    }

    embed.setFooter({
      text: `${voiceCommands.length} commands available • Use /voice panel for quick access`,
      iconURL: message.author.displayAvatarURL(),
    });

    if (!message.channel.isSendable()) {
      return;
    }

    return message.channel.send({ embeds: [embed] });
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      this.container.logger.debug('[Voice Command] chatInputRun started');

      const { client, stores } = this.container;
      const commands = stores.get('commands');

      // Filter voice-related commands
      const voiceCommands = Array.from(commands.values()).filter(
        (cmd) =>
          cmd.fullCategory.some((cat) => cat.toLowerCase().includes('voice')) ||
          cmd.name.toLowerCase().includes('voice') ||
          cmd.description.toLowerCase().includes('voice')
      );

      this.container.logger.debug(`[Voice Command] Found ${voiceCommands.length} voice commands`);

      const embed = new EmbedBuilder()
        .setColor(COLORS.DEFAULT)
        .setTitle('🎤 Temporary Voice Channels')
        .setDescription('Manage your own temporary voice channel with these commands.')
        .setThumbnail(client.user?.displayAvatarURL() ?? null);

      if (voiceCommands.length > 0) {
        // Group commands by category
        const channelControl = voiceCommands.filter((cmd) =>
          ['bitrate', 'limit', 'region', 'rename', 'reset'].includes(cmd.name.replace('voice/', ''))
        );
        const privacy = voiceCommands.filter((cmd) =>
          ['lock', 'unlock', 'hide', 'show'].includes(cmd.name.replace('voice/', ''))
        );
        const userManagement = voiceCommands.filter((cmd) =>
          ['permit', 'deny', 'kick', 'trust', 'untrust'].includes(cmd.name.replace('voice/', ''))
        );
        const ownership = voiceCommands.filter((cmd) =>
          ['claim', 'transfer', 'panel'].includes(cmd.name.replace('voice/', ''))
        );

        if (channelControl.length > 0) {
          embed.addFields({
            name: '⚙️ Channel Settings',
            value: channelControl
              .map(
                (cmd) =>
                  `</voice ${cmd.name.replace('voice/', '')}:1465799878579060880> • ${cmd.description}`
              )
              .join('\n'),
            inline: false,
          });
        }

        if (privacy.length > 0) {
          embed.addFields({
            name: '🔒 Privacy Controls',
            value: privacy
              .map(
                (cmd) =>
                  `</voice ${cmd.name.replace('voice/', '')}:1465799878579060880> • ${cmd.description}`
              )
              .join('\n'),
            inline: false,
          });
        }

        if (userManagement.length > 0) {
          embed.addFields({
            name: '👥 User Management',
            value: userManagement
              .map(
                (cmd) =>
                  `</voice ${cmd.name.replace('voice/', '')}:1465799878579060880> • ${cmd.description}`
              )
              .join('\n'),
            inline: false,
          });
        }

        if (ownership.length > 0) {
          embed.addFields({
            name: '👑 Ownership & Control',
            value: ownership
              .map(
                (cmd) =>
                  `</voice ${cmd.name.replace('voice/', '')}:1465799878579060880> • ${cmd.description}`
              )
              .join('\n'),
            inline: false,
          });
        }
      }

      embed.setFooter({
        text: `${voiceCommands.length} commands available • Use /voice panel for quick access`,
        iconURL: interaction.user.displayAvatarURL(),
      });

      this.container.logger.debug('[Voice Command] About to reply to interaction');
      await interaction.reply({ embeds: [embed] });
      this.container.logger.debug('[Voice Command] Successfully replied to interaction');
    } catch (error) {
      this.container.logger.error('[Voice Command] Error in chatInputRun:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content: 'An error occurred while processing this command.',
            ephemeral: true,
          })
          .catch((e) =>
            this.container.logger.error('[Voice Command] Failed to send error message:', e)
          );
      }
      throw error;
    }
  }
}
