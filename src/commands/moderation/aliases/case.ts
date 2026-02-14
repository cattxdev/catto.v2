import { Command, type Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Message } from 'discord.js';
import { parseCaseFromMessage } from '#lib/interaction/messageArgs.js';
import { handleCase } from '../_case.js';
import { runAliasCommand } from './_shared.js';

@ApplyOptions<Command.Options>({
  name: 'case',
  description: 'View a moderation case (prefix shortcut)',
  preconditions: ['GuildOnly'],
})
export class CaseAliasCommand extends Command {
  public override async messageRun(message: Message, args: Args) {
    return runAliasCommand(message, args, parseCaseFromMessage, handleCase);
  }
}
