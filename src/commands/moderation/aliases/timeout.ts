import { Command, type Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Message } from 'discord.js';
import { parseTimeoutFromMessage } from '#lib/interaction/messageArgs.js';
import { handleTimeout } from '../_timeout.js';
import { runAliasCommand } from './_shared.js';

@ApplyOptions<Command.Options>({
  name: 'timeout',
  description: 'Timeout a member (prefix shortcut)',
  preconditions: ['GuildOnly'],
})
export class TimeoutAliasCommand extends Command {
  public override async messageRun(message: Message, args: Args) {
    return runAliasCommand(message, args, parseTimeoutFromMessage, handleTimeout);
  }
}
