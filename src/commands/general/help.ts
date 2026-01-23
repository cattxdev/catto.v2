import { Command } from '@sapphire/framework';
import { type Message, EmbedBuilder } from 'discord.js';
import { COLORS } from '#lib/constants.js';

export class HelpCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'help',
      aliases: ['h', 'commands'],
      description: 'Display all available commands',
      detailedDescription: 'Shows a list of all available commands and their descriptions.',
    });
  }

  public override async messageRun(message: Message) {
    const { client, stores } = this.container;
    const commands = stores.get('commands');

    const categories = new Map<string, Command[]>();

    for (const command of commands.values()) {
      const category = command.fullCategory.join('/') || 'General';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)?.push(command);
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.DEFAULT)
      .setTitle('📚 Command List')
      .setDescription(
        `Use \`${this.container.client.options.defaultPrefix}help <command>\` for more info`
      )
      .setThumbnail(client.user?.displayAvatarURL() ?? null);

    for (const [category, cmds] of categories) {
      const commandList = cmds.map((cmd) => `\`${cmd.name}\` - ${cmd.description}`).join('\n');

      embed.addFields({
        name: `${category}`,
        value: commandList || 'No commands',
        inline: false,
      });
    }

    embed.setFooter({
      text: `${commands.size} commands available`,
      iconURL: message.author.displayAvatarURL(),
    });

    if (!message.channel.isSendable()) {
      return;
    }

    return message.channel.send({ embeds: [embed] });
  }
}
