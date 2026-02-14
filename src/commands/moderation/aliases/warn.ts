import { Command, type Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Message } from 'discord.js';
import { parseWarnFromMessage } from '#lib/interaction/messageArgs.js';
import { handleWarn } from '../_warn.js';
import { runAliasCommand } from './_shared.js';

@ApplyOptions<Command.Options>({
  name: 'warn',
  description: 'Warn a member (prefix shortcut)',
  preconditions: ['GuildOnly'],
})
export class WarnAliasCommand extends Command {
  public override async messageRun(message: Message, args: Args) {
    return runAliasCommand(message, args, parseWarnFromMessage, handleWarn);
  }
}
