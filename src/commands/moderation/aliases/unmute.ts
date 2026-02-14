import { Command, type Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Message } from 'discord.js';
import { parseUnmuteFromMessage } from '#lib/interaction/messageArgs.js';
import { handleUnmuteText, handleUnmuteVoice, handleUnmuteBoth } from '../_mute.js';
import { runAliasCommand } from './_shared.js';
import type { CommandResponder } from '#lib/discord/index.js';
import type { UnmuteOptions } from '#lib/interaction/typedOptions.js';

const UNMUTE_TYPE_MAP: Record<
  string,
  (options: UnmuteOptions, ctx: CommandResponder) => Promise<void>
> = {
  text: handleUnmuteText,
  voice: handleUnmuteVoice,
  both: handleUnmuteBoth,
};

/**
 * `!unmute [text|voice|both] <@user> [reason]`
 *
 * If the first argument is an unmute type, it routes to the corresponding handler.
 * Otherwise defaults to "both".
 */
@ApplyOptions<Command.Options>({
  name: 'unmute',
  description: 'Unmute a member (prefix shortcut)',
  preconditions: ['GuildOnly'],
})
export class UnmuteAliasCommand extends Command {
  public override async messageRun(message: Message, args: Args) {
    let handler = handleUnmuteBoth;

    // Peek at the first arg — if it's a known unmute type, consume it
    args.save();
    try {
      const word = (await args.pick('string')).toLowerCase();
      if (word in UNMUTE_TYPE_MAP) {
        handler = UNMUTE_TYPE_MAP[word]!;
      } else {
        args.restore();
      }
    } catch {
      // No args at all — parser will surface its own error
    }

    return runAliasCommand(message, args, parseUnmuteFromMessage, handler);
  }
}
