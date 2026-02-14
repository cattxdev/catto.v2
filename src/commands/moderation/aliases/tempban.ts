import { Command, type Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Message } from 'discord.js';
import { parseTempbanFromMessage } from '#lib/interaction/messageArgs.js';
import { handleTempban } from '../_tempban.js';
import { runAliasCommand } from './_shared.js';

@ApplyOptions<Command.Options>({
  name: 'tempban',
  description: 'Temporarily ban a member (prefix shortcut)',
  preconditions: ['GuildOnly'],
})
export class TempbanAliasCommand extends Command {
  public override async messageRun(message: Message, args: Args) {
    return runAliasCommand(message, args, parseTempbanFromMessage, handleTempban);
  }
}
