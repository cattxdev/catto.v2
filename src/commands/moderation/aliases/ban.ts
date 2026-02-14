import { Command, type Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Message } from 'discord.js';
import { parseBanFromMessage } from '#lib/interaction/messageArgs.js';
import { handleBan } from '../_ban.js';
import { runAliasCommand } from './_shared.js';

@ApplyOptions<Command.Options>({
  name: 'ban',
  description: 'Ban a member (prefix shortcut)',
  preconditions: ['GuildOnly'],
})
export class BanAliasCommand extends Command {
  public override async messageRun(message: Message, args: Args) {
    return runAliasCommand(message, args, parseBanFromMessage, handleBan);
  }
}
