import { Command, type Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Message } from 'discord.js';
import { parseSoftbanFromMessage } from '#lib/interaction/messageArgs.js';
import { handleSoftban } from '../_softban.js';
import { runAliasCommand } from './_shared.js';

@ApplyOptions<Command.Options>({
  name: 'softban',
  description: 'Softban a member (prefix shortcut)',
  preconditions: ['GuildOnly'],
})
export class SoftbanAliasCommand extends Command {
  public override async messageRun(message: Message, args: Args) {
    return runAliasCommand(message, args, parseSoftbanFromMessage, handleSoftban);
  }
}
