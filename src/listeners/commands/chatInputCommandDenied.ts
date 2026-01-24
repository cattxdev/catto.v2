import {
  Listener,
  Events,
  type ChatInputCommandDeniedPayload,
  type UserError,
} from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { MessageFlags } from 'discord.js';
import type { Prisma } from '@prisma/client';

/**
 * Handles denied chat input commands.
 *
 * When a precondition (like PermissionGatePrecondition using Gate) denies a command:
 * 1. Logs the denial to the database
 * 2. Sends an ephemeral error response to the user
 *
 * This prevents the "Application did not respond" error that occurs
 * when an interaction is never replied to.
 */
@ApplyOptions<Listener.Options>({
  event: Events.ChatInputCommandDenied,
})
export class ChatInputCommandDeniedListener extends Listener<typeof Events.ChatInputCommandDenied> {
  public override async run(
    error: UserError,
    { interaction, command }: ChatInputCommandDeniedPayload
  ) {
    // Check if this denial should be silent (some preconditions may handle responses themselves)
    const isSilent = Reflect.get(Object(error.context), 'silent') === true;

    // Log the denial (non-blocking)
    this.container.prisma.log
      .create({
        data: {
          level: 'warn',
          message: `Command denied: ${command.name}`,
          metadata: {
            userId: interaction.user.id,
            username: interaction.user.username,
            guildId: interaction.guildId,
            commandName: command.name,
            identifier: error.identifier,
            code: Reflect.get(Object(error.context), 'code'),
          } satisfies Prisma.InputJsonObject,
        },
      })
      .catch((err) => this.container.logger.error('Failed to log command denial:', err));

    // Don't respond if silent
    if (isSilent) return;

    // Send error response
    const content = `❌ ${error.message}`;

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content });
      } else {
        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
      }
    } catch {
      // Interaction may have expired
    }
  }
}
