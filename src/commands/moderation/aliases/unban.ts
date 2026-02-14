import { Command, type Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Message } from 'discord.js';
import { parseUnbanFromMessage } from '#lib/interaction/messageArgs.js';
import { handleUnban } from '../_unban.js';
import { runAliasCommand } from './_shared.js';

@ApplyOptions<Command.Options>({
  name: 'unban',
  description: 'Unban a user (prefix shortcut)',
  preconditions: ['GuildOnly'],
})
export class UnbanAliasCommand extends Command {
  public override async messageRun(message: Message, args: Args) {
    return runAliasCommand(message, args, parseUnbanFromMessage, handleUnban);
  }
}
