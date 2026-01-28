import { Command } from '#lib/sapphire/command/command.js';
import { type Message, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '#lib/constants.js';

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
        slashSubcommand: (builder) =>
          builder.setName('voice').setDescription('Display help for voice commands'), // Builder that will be embedded in the parent command registry to register the slash subcommand.
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
      iconURL: interaction.user.displayAvatarURL(),
    });

    return interaction.reply({ embeds: [embed] });
  }
}
