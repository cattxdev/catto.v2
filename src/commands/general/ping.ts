import { Command } from '@sapphire/framework';
import { type Message } from 'discord.js';
import { createInfoEmbed } from '#lib/utils.js';

export class PingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'ping',
      aliases: ['pong'],
      description: 'Check the bot latency',
      detailedDescription: 'Returns the bot\'s websocket ping and API latency.',
    });
  }

  public override async messageRun(message: Message) {
    if (!message.channel.isSendable()) {
      return;
    }

    const msg = await message.channel.send('Pinging...');

    const embed = createInfoEmbed(
      [
        `🏓 Pong!`,
        `**Bot Latency:** ${Math.round(this.container.client.ws.ping)}ms`,
        `**API Latency:** ${msg.createdTimestamp - message.createdTimestamp}ms`,
      ].join('\n'),
      'Ping Statistics'
    );

    return msg.edit({ content: null, embeds: [embed] });
  }
}
