import { Command, type Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Message } from 'discord.js';
import { parseHistoryFromMessage } from '#lib/interaction/messageArgs.js';
import { handleHistory } from '../_history.js';
import { runAliasCommand } from './_shared.js';

@ApplyOptions<Command.Options>({
  name: 'history',
  description: "View a member's moderation history (prefix shortcut)",
  preconditions: ['GuildOnly'],
})
export class HistoryAliasCommand extends Command {
  public override async messageRun(message: Message, args: Args) {
    return runAliasCommand(message, args, parseHistoryFromMessage, handleHistory);
  }
}
