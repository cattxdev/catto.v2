import type { Args } from '@sapphire/framework';
import { UserError } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { MessageResponder } from '#lib/discord/index.js';
import { buildErrorText } from '#lib/discord/index.js';

/**
 * Shared helper for prefix alias commands.
 * Wraps parser + handler with error handling identical to mod.ts's handleMessageCommand.
 */
export async function runAliasCommand<T>(
  message: Message,
  args: Args,
  parser: (message: Message, args: Args) => Promise<T>,
  handler: (options: T, ctx: MessageResponder) => Promise<unknown>
): Promise<unknown> {
  try {
    const options = await parser(message, args);
    return handler(options, new MessageResponder(message as Message<true>));
  } catch (error) {
    if (error instanceof UserError) {
      if (message.channel.isSendable()) {
        return message.channel.send({
          content: buildErrorText(error.message),
          allowedMentions: { parse: [] },
        });
      }
    }
    throw error;
  }
}
