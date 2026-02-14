import { Command, type Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Message } from 'discord.js';
import { parseKickFromMessage } from '#lib/interaction/messageArgs.js';
import { handleKick } from '../_kick.js';
import { runAliasCommand } from './_shared.js';

@ApplyOptions<Command.Options>({
  name: 'kick',
  description: 'Kick a member (prefix shortcut)',
  preconditions: ['GuildOnly'],
})
export class KickAliasCommand extends Command {
  public override async messageRun(message: Message, args: Args) {
    return runAliasCommand(message, args, parseKickFromMessage, handleKick);
  }
}
