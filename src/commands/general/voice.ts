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
      .setTitle('🎤 Voice Commands Help')
      .setDescription(
        voiceCommands.length > 0
          ? 'Here are all the available voice-related commands:'
          : 'No voice commands found.'
      )
      .setThumbnail(client.user?.displayAvatarURL() ?? null);

    if (voiceCommands.length > 0) {
      const commandList = voiceCommands
        .map((cmd) => `\`${cmd.name}\` - ${cmd.description}`)
        .join('\n');

      embed.addFields({
        name: 'Available Voice Commands',
        value: commandList,
        inline: false,
      });
    }

    embed.setFooter({
      text: `${voiceCommands.length} voice command(s) available`,
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
        .setTitle('🎤 Voice Commands Help')
        .setDescription(
          voiceCommands.length > 0
            ? 'Here are all the available voice-related commands:'
            : 'No voice commands found.'
        )
        .setThumbnail(client.user?.displayAvatarURL() ?? null);

      if (voiceCommands.length > 0) {
        const commandList = voiceCommands
          .map((cmd) => `\`${cmd.name}\` - ${cmd.description}`)
          .join('\n');

        embed.addFields({
          name: 'Available Voice Commands',
          value: commandList,
          inline: false,
        });
      }

      embed.setFooter({
        text: `${voiceCommands.length} voice command(s) available`,
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
