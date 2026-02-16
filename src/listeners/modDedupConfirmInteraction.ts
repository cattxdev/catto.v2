/**
 * Mod Dedup Confirm Interaction Listener
 *
 * Handles the "Confirm Override" button shown when a duplicate mod action
 * is detected. Consumes the pending override from Redis and re-executes
 * the action with skipDedup=true.
 *
 * Custom ID format: moddedup:v1:confirm:{pendingId}
 *
 * @see https://github.com/your-org/catto/issues/114
 */

import { Listener, container } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import { ModAction } from '@prisma/client';
import { consumePendingOverride } from '#root/modules/moderation/services/DedupService.js';
import {
  buildModerationContext,
  executeWarn,
  executeKick,
  executeBan,
  executeSoftban,
  executeTimeout,
  executeTempban,
  executeMute,
  type MuteType,
} from '#root/modules/moderation/handlers/index.js';
import {
  buildModActionSuccess,
  buildModActionError,
} from '#root/modules/moderation/discord/panelBuilder.js';
import { getActionDisplay } from '#root/modules/moderation/discord/modlog.js';
import { formatDuration } from '#root/modules/moderation/discord/embeds/presets.js';
import {
  ACTION_TO_MOD_ACTION,
  MUTE_ACTION_TO_MOD_ACTION,
} from '#root/modules/moderation/domain/types.js';
import type { ModActionResult, DurationSeconds } from '#root/modules/moderation/domain/types.js';
import { ensureNonNull } from '#root/lib/utils.js';
import { ephemeralError } from '#lib/discord/index.js';
import { getGate } from '#lib/validation/gateContext.js';
import { isFail } from '#lib/validation/Gate.js';

const CUSTOM_ID_PREFIX = 'moddedup:v1:confirm:';

export class ModDedupConfirmInteractionListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.InteractionCreate });
  }

  public async run(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith(CUSTOM_ID_PREFIX)) return;

    const pendingId = interaction.customId.slice(CUSTOM_ID_PREFIX.length);
    if (!pendingId) {
      await interaction.reply(ephemeralError('Invalid confirmation data.'));
      return;
    }

    // Consume the pending override (one-time use)
    const pending = await consumePendingOverride(pendingId);
    if (!pending) {
      await interaction.reply(
        ephemeralError(
          'This confirmation has expired or was already used. Please retry the action.'
        )
      );
      return;
    }

    // Verify the clicking user is the same moderator who triggered the dedup warning
    if (interaction.user.id !== pending.moderatorId) {
      await interaction.reply(
        ephemeralError('Only the moderator who initiated this action can confirm it.')
      );
      return;
    }

    const gate = getGate(interaction);
    if (!gate) {
      await interaction.reply(ephemeralError('This can only be used in a server.'));
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const ctxResult = await buildModerationContext({
        guild: gate.guild,
        targetId: pending.targetId,
        moderator: interaction.user,
        moderatorMember: gate.member,
        reason: pending.reason,
        duration: pending.duration as DurationSeconds | undefined,
      });

      if (!ctxResult.success) {
        await interaction.editReply({
          components: [buildModActionError(ctxResult.error).build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Mark skipDedup so we don't loop
      const ctx = { ...ctxResult.context, skipDedup: true };

      // Re-check hierarchy
      if (ctx.targetMember) {
        const h = gate.checkHierarchy(ctx.targetMember);
        if (isFail(h)) {
          await interaction.editReply({
            components: [buildModActionError(h.message).build()],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      let result: ModActionResult;
      const action = pending.action as string;

      // Check if this is a mute action
      const muteActions = new Set<string>([
        ModAction.MUTE_TEXT,
        ModAction.MUTE_VOICE,
        ModAction.MUTE_BOTH,
      ]);

      if (muteActions.has(action)) {
        // Resolve the mute type from the extra data or from the action enum
        const muteType = (pending.extra?.muteType as MuteType) ?? 'both';
        const muteResult = await executeMute(ctx, muteType);
        result = {
          success: muteResult.success,
          caseNumber: muteResult.caseNumber,
          error: muteResult.error,
          userNotified: false,
        };
      } else {
        // Standard mod actions
        switch (action) {
          case ModAction.WARN:
            result = await executeWarn(ctx);
            break;
          case ModAction.KICK:
            result = await executeKick(ctx);
            break;
          case ModAction.BAN:
            result = await executeBan(ctx, Boolean(pending.extra?.deleteMessages));
            break;
          case ModAction.SOFTBAN:
            result = await executeSoftban(ctx);
            break;
          case ModAction.TIMEOUT:
            result = await executeTimeout(ctx);
            break;
          case ModAction.TEMPBAN:
            result = await executeTempban(ctx, Boolean(pending.extra?.deleteMessages));
            break;
          default:
            await interaction.editReply({
              components: [buildModActionError('Unknown action type.').build()],
              flags: MessageFlags.IsComponentsV2,
            });
            return;
        }
      }

      if (!result.success) {
        await interaction.editReply({
          components: [buildModActionError(result.error ?? 'Action failed.').build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      const caseNumber = ensureNonNull(result.caseNumber, 'dedup confirm > caseNumber');

      // Determine display label
      const modAction = (ACTION_TO_MOD_ACTION[action.toLowerCase()] ??
        MUTE_ACTION_TO_MOD_ACTION[pending.extra?.muteType as string] ??
        action) as ModAction;
      const display = getActionDisplay(modAction);
      const durationText = pending.duration ? formatDuration(pending.duration) : undefined;

      const success = buildModActionSuccess(
        display.label,
        ctx.target,
        caseNumber,
        pending.reason,
        durationText,
        { guildId: gate.guild.id }
      );

      await interaction.editReply({
        components: [success.build()],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      container.logger.error('[ModDedupConfirm] Error:', error);
      await interaction
        .editReply({
          components: [buildModActionError('An unexpected error occurred.').build()],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  }
}
