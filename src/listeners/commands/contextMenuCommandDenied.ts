import {
  Listener,
  Events,
  type ContextMenuCommandDeniedPayload,
  type UserError,
} from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { MessageFlags } from 'discord.js';
import type { Prisma } from '@prisma/client';

/**
 * Handles denied context menu commands.
 *
 * When a precondition (like PermissionGatePrecondition using Gate) denies a context menu command:
 * 1. Logs the denial to the database
 * 2. Sends an ephemeral error response to the user
 */
@ApplyOptions<Listener.Options>({
  event: Events.ContextMenuCommandDenied,
})
export class ContextMenuCommandDeniedListener extends Listener<
  typeof Events.ContextMenuCommandDenied
> {
  public override async run(
    error: UserError,
    { interaction, command }: ContextMenuCommandDeniedPayload
  ) {
    // Check if this denial should be silent
    const isSilent = Reflect.get(Object(error.context), 'silent') === true;

    // Log the denial (non-blocking)
    this.container.prisma.log
      .create({
        data: {
          level: 'warn',
          message: `Context menu denied: ${command.name}`,
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
      .catch((err) => this.container.logger.error('Failed to log context menu denial:', err));

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
