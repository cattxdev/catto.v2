import { Listener, container } from '@sapphire/framework';
import {
  Events,
  type Interaction,
  MessageFlags,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { ModAction } from '@prisma/client';
import {
  decodeEvidenceActionCustomId,
  decodeEvidenceCaptureModalCustomId,
  decodeEvidenceModActionCustomId,
  encodeEvidenceActionCustomId,
  encodeEvidenceModActionCustomId,
} from '#root/modules/moderation/discord/customId.js';
import {
  buildModActionSuccess,
  buildModActionError,
} from '#root/modules/moderation/discord/panelBuilder.js';
import { evidenceService } from '#root/modules/moderation/services/EvidenceService.js';
import {
  buildModerationContext,
  type ModerationContext,
} from '#root/modules/moderation/handlers/index.js';
import {
  notifyUser,
  logModAction,
  formatDuration,
} from '#root/modules/moderation/discord/embeds/presets.js';
import type { ModActionResult } from '#root/modules/moderation/domain/types.js';
import { asCaseNumber, asDuration } from '#root/modules/moderation/domain/types.js';
import { parseDurationToSeconds } from '#lib/interaction/typedOptions.js';
import { safeParse, durationStringSchema } from '#lib/validation/zod.js';
import { isFail, type Gate } from '#lib/validation/Gate.js';
import { getGate } from '#lib/validation/gateContext.js';
import { resolveModalKey, resolveSelectMenuKey } from '#lib/validation/resourceKey.js';
import {
  successContainer as makeSuccessContainer,
  errorContainer as makeErrorContainer,
  stringSelectRow,
  ephemeralError,
  formModal,
  paragraphModal,
  EMOJI,
} from '#lib/discord/index.js';

const ACTION_LABELS: Record<string, string> = {
  warn: 'Warned',
  kick: 'Kicked',
  ban: 'Banned',
  softban: 'Softbanned',
  timeout: 'TIMEOUT',
  tempban: 'TEMPBAN',
};

const ACTION_TO_MOD_ACTION: Record<string, ModAction> = {
  warn: ModAction.WARN,
  kick: ModAction.KICK,
  ban: ModAction.BAN,
  softban: ModAction.SOFTBAN,
  timeout: ModAction.TIMEOUT,
  tempban: ModAction.TEMPBAN,
};

export class ModEvidenceInteractionListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, { ...options, event: Events.InteractionCreate });
  }

  public async run(interaction: Interaction) {
    if (!interaction.guildId) return;

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('evidence_action:')) {
      await this.handleActionSelect(interaction);
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('evidence_capture:')) {
        await this.handleCaptureModal(interaction);
      } else if (interaction.customId.startsWith('evidence_modaction:')) {
        await this.handleModActionModal(interaction);
      }
    }
  }

  // ─── Shared Helpers ───

  private async requireGateForModal(interaction: ModalSubmitInteraction): Promise<Gate | null> {
    const gate = getGate(interaction);
    if (!gate) {
      await interaction.reply(ephemeralError('This can only be used in a server.'));
      return null;
    }
    const key = resolveModalKey(interaction);
    if (!key) {
      await interaction.reply(ephemeralError('Invalid modal data.'));
      return null;
    }
    if (!(await gate.requireAuth(key))) return null;
    return gate;
  }

  private async editError(interaction: ModalSubmitInteraction, message: string): Promise<void> {
    await interaction.editReply({
      components: [buildModActionError(message).build()],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  // ─── Select Menu: Pick follow-up mod action ───

  private async handleActionSelect(interaction: StringSelectMenuInteraction): Promise<void> {
    const parsed = decodeEvidenceActionCustomId(interaction.customId);
    if (!parsed) return;

    const gate = getGate(interaction);
    if (!gate)
      return void (await interaction.reply(ephemeralError('This can only be used in a server.')));

    const resourceKey = resolveSelectMenuKey(interaction);
    if (!resourceKey || !(await gate.requireAuth(resourceKey))) return;

    const action = interaction.values[0];
    if (!action) return;

    const { targetId } = parsed;
    const caseNumber = parseInt(parsed.caseNumber, 10);

    try {
      if (action === 'none') {
        return void (await interaction.update({
          components: interaction.message.components.slice(0, -1),
        }));
      }

      const label = action.charAt(0).toUpperCase() + action.slice(1);

      if (action === 'warn' || action === 'kick' || action === 'ban' || action === 'softban') {
        await interaction.showModal(
          paragraphModal(
            encodeEvidenceModActionCustomId(action, targetId, caseNumber),
            `${label} User`,
            {
              customId: 'reason',
              label: 'Reason',
              placeholder: 'Enter the reason for this action...',
              required: true,
              maxLength: 512,
            }
          )
        );
      } else if (action === 'timeout' || action === 'tempban') {
        await interaction.showModal(
          formModal(
            encodeEvidenceModActionCustomId(action, targetId, caseNumber),
            `${label} User`,
            [
              {
                id: 'duration',
                label: 'Duration (e.g., 10m, 1h, 1d)',
                type: 'short' as const,
                placeholder: '1h',
                required: true,
                maxLength: 10,
              },
              {
                id: 'reason',
                label: 'Reason',
                type: 'paragraph' as const,
                placeholder: 'Enter the reason for this action...',
                required: true,
                maxLength: 512,
              },
            ]
          )
        );
      } else {
        await interaction.reply(ephemeralError('Unknown action.'));
      }
    } catch (error) {
      container.logger.error('[ModEvidence] Error handling action select:', error);
      await interaction.reply(ephemeralError('An unexpected error occurred.')).catch(() => {});
    }
  }

  // ─── Modal: Evidence Capture ───

  private async handleCaptureModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = decodeEvidenceCaptureModalCustomId(interaction.customId);
    if (!parsed) return void (await interaction.reply(ephemeralError('Invalid modal data.')));

    const gate = await this.requireGateForModal(interaction);
    if (!gate) return;

    const caseNumberStr = interaction.fields.getTextInputValue('case_number');
    const captureRangeInput = interaction.fields.getTextInputValue('capture_range');
    const deleteInput = interaction.fields.getTextInputValue('delete_messages');

    const caseNumber = parseInt(caseNumberStr, 10);
    if (isNaN(caseNumber) || caseNumber < 1) {
      return void (await interaction.reply({
        components: [
          makeErrorContainer()
            .h2(`${EMOJI.STATUS.ERROR} Invalid Case Number`)
            .text('Please enter a valid case number.')
            .build(),
        ],
        flags: MessageFlags.Ephemeral,
      }));
    }

    // Validate case number isn't in the past (would create gaps)
    const nextCaseNumber = await evidenceService.getNextCaseNumber(gate.guild.id);
    const existingCase = await container.prisma.modCase.findFirst({
      where: { guildId: gate.guild.id, caseNumber },
    });

    if (!existingCase && caseNumber < nextCaseNumber) {
      return void (await interaction.reply({
        components: [
          makeErrorContainer()
            .h2(`${EMOJI.STATUS.ERROR} Invalid Case Number`)
            .text(
              `Case #${caseNumber} doesn't exist. The next available case number is #${nextCaseNumber}.`
            )
            .build(),
        ],
        flags: MessageFlags.Ephemeral,
      }));
    }

    // Parse capture range: empty | number (count) | message link/ID
    let lastMessageId: string | undefined;
    let messageCount: number | undefined;
    const trimmed = captureRangeInput?.trim();

    if (trimmed) {
      if (/^\d+$/.test(trimmed) && trimmed.length < 4) {
        const count = parseInt(trimmed, 10);
        if (count < 1 || count > 100) {
          return void (await interaction.reply({
            components: [
              makeErrorContainer()
                .h2(`${EMOJI.STATUS.ERROR} Invalid Count`)
                .text('Message count must be between 1 and 100.')
                .build(),
            ],
            flags: MessageFlags.Ephemeral,
          }));
        }
        messageCount = count;
      } else {
        const match = trimmed.match(/(\d{17,19})\s*$/);
        lastMessageId = match?.[1] ?? trimmed;
      }
    }

    const deleteAfterCapture = !deleteInput || deleteInput.toLowerCase() === 'yes';
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Use existing case or create a new one at the requested number
      // (We already validated that caseNumber is either existing or == nextCaseNumber)
      if (!existingCase) {
        await container.prisma.modCase.create({
          data: {
            caseNumber,
            guildId: gate.guild.id,
            action: ModAction.WARN,
            targetId: gate.member.id,
            targetTag: gate.member.user.tag,
            moderatorId: gate.member.id,
            moderatorTag: gate.member.user.tag,
            reason: 'Evidence capture — pending mod action',
          },
        });
      }

      const { snapshot, evidence } = await evidenceService.captureMessageRange(gate.guild, {
        guildId: gate.guild.id,
        channelId: parsed.channelId,
        firstMessageId: parsed.messageId,
        lastMessageId,
        messageCount,
        capturedById: gate.member.id,
        capturedByTag: gate.member.user.tag,
        caseNumber,
        deleteAfterCapture,
      });

      // Build success response
      const dashboardUrl = evidenceService.generateEvidenceListUrl(gate.guild.id, caseNumber);
      const snapshotData = snapshot.snapshotData as unknown as Array<{ authorId: string }>;
      const targetUserId = snapshotData?.[0]?.authorId;

      const successResult = makeSuccessContainer()
        .h2(`${EMOJI.STATUS.SUCCESS} Evidence Captured`)
        .text(
          `**${snapshot.messageCount}** message(s) captured and attached to **Case #${caseNumber}**.`
        )
        .text(`Evidence ID: \`${evidence.id}\``)
        .text(
          deleteAfterCapture
            ? 'Original messages have been deleted.'
            : 'Original messages were preserved.'
        )
        .linkButtons({ url: dashboardUrl, label: 'View Evidence' });

      // Offer follow-up mod action if the target is someone else
      if (targetUserId && targetUserId !== gate.member.id) {
        const selectRow = stringSelectRow({
          customId: encodeEvidenceActionCustomId(targetUserId, caseNumber),
          placeholder: 'Take a mod action on the author?',
          options: [
            { label: 'No action', value: 'none', description: 'Dismiss this menu' },
            { label: 'Warn', value: 'warn', description: 'Issue a warning' },
            { label: 'Timeout', value: 'timeout', description: 'Timeout the user' },
            { label: 'Kick', value: 'kick', description: 'Kick from server' },
            { label: 'Ban', value: 'ban', description: 'Permanently ban' },
            {
              label: 'Softban',
              value: 'softban',
              description: 'Ban and immediately unban (purge messages)',
            },
            { label: 'Tempban', value: 'tempban', description: 'Temporarily ban' },
          ],
        });
        await interaction.editReply({
          components: [successResult.build(), selectRow],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interaction.editReply({
          components: [successResult.build()],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } catch (error) {
      container.logger.error('[ModEvidence] Error in capture modal:', error);
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred.';
      await interaction
        .editReply({
          components: [
            makeErrorContainer().h2(`${EMOJI.STATUS.ERROR} Capture Failed`).text(msg).build(),
          ],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  }

  // ─── Modal: Follow-up mod action after evidence capture ───

  private async handleModActionModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = decodeEvidenceModActionCustomId(interaction.customId);
    if (!parsed) return void (await interaction.reply(ephemeralError('Invalid modal data.')));

    const gate = await this.requireGateForModal(interaction);
    if (!gate) return;

    const caseNumber = parseInt(parsed.caseNumber, 10);
    const reason = interaction.fields.getTextInputValue('reason');

    // Parse duration for timeout/tempban
    let duration;
    if (parsed.action === 'timeout' || parsed.action === 'tempban') {
      const durationStr = interaction.fields.getTextInputValue('duration');
      if (!safeParse(durationStringSchema, durationStr).success) {
        return void (await interaction.reply(
          ephemeralError('Invalid duration format. Use formats like: 10m, 1h, 1d')
        ));
      }
      duration = parseDurationToSeconds(durationStr) ?? undefined;
      if (!duration) return void (await interaction.reply(ephemeralError('Invalid duration.')));
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const ctxResult = await buildModerationContext({
        guild: gate.guild,
        targetId: parsed.targetId,
        moderator: interaction.user,
        moderatorMember: gate.member,
        reason,
        duration,
      });
      if (!ctxResult.success) return void (await this.editError(interaction, ctxResult.error));

      const ctx = ctxResult.context;
      if (ctx.targetMember) {
        const h = gate.checkHierarchy(ctx.targetMember);
        if (isFail(h)) return void (await this.editError(interaction, h.message));
      }

      // Execute Discord action and update the existing case (not create new)
      const modAction = ACTION_TO_MOD_ACTION[parsed.action];
      if (!modAction) return void (await this.editError(interaction, 'Unknown action.'));

      const result = await this.executeAndUpdateCase(ctx, modAction, caseNumber, duration);
      if (!result.success)
        return void (await this.editError(interaction, result.error ?? 'Action failed.'));

      // Log to mod channel
      const brandedDuration = duration ? asDuration(duration) : undefined;
      await logModAction(
        gate.guild,
        modAction,
        ctx.target,
        ctx.moderator,
        reason,
        asCaseNumber(caseNumber),
        brandedDuration
      );

      // Show success
      const label = ACTION_LABELS[parsed.action] ?? parsed.action.toUpperCase();
      const durationText = duration ? formatDuration(duration) : undefined;
      const success = buildModActionSuccess(label, ctx.target, caseNumber, reason, durationText, {
        guildId: gate.guild.id,
      });
      await interaction.editReply({
        components: [success.build()],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      container.logger.error('[ModEvidence] Error in mod action modal:', error);
      await this.editError(interaction, 'An unexpected error occurred.').catch(() => {});
    }
  }

  /**
   * Execute the Discord action and update an existing case (instead of creating a new one).
   * This is used for the evidence follow-up flow where a placeholder case already exists.
   */
  private async executeAndUpdateCase(
    ctx: ModerationContext,
    action: ModAction,
    caseNumber: number,
    duration?: number
  ): Promise<ModActionResult> {
    const { guild, target, targetMember, moderator, reason } = ctx;
    const modTag = `${reason} | Moderator: ${moderator.tag}`;

    try {
      // Notify user before action (where applicable)
      const shouldNotify = targetMember != null;
      if (shouldNotify) {
        await notifyUser(
          target,
          action,
          guild,
          reason,
          duration ? asDuration(duration) : undefined
        );
      }

      // Execute the Discord action
      switch (action) {
        case ModAction.WARN:
          // Warn is just a case record, no Discord action
          break;

        case ModAction.KICK:
          if (!targetMember)
            return { success: false, error: 'User is not in this server.', userNotified: false };
          await targetMember.kick(modTag);
          break;

        case ModAction.BAN:
          await guild.members.ban(target.id, { reason: modTag });
          break;

        case ModAction.SOFTBAN:
          await guild.members.ban(target.id, {
            reason: `[SOFTBAN] ${modTag}`,
            deleteMessageSeconds: 7 * 24 * 60 * 60,
          });
          await guild.members.unban(target.id, `[SOFTBAN] Automatic unban | ${moderator.tag}`);
          break;

        case ModAction.TIMEOUT:
          if (!targetMember)
            return { success: false, error: 'User is not in this server.', userNotified: false };
          if (!duration)
            return {
              success: false,
              error: 'Duration is required for timeout.',
              userNotified: false,
            };
          await targetMember.timeout(duration * 1000, modTag);
          break;

        case ModAction.TEMPBAN: {
          if (!duration)
            return {
              success: false,
              error: 'Duration is required for tempban.',
              userNotified: false,
            };
          await guild.members.ban(target.id, { reason: `[TEMPBAN] ${modTag}` });
          // Schedule unban
          const { tempbanScheduler } =
            await import('#root/modules/moderation/services/TempbanScheduler.js');
          const { asGuildId, asUserId } = await import('#root/modules/moderation/domain/types.js');
          await tempbanScheduler.scheduleUnban(
            asGuildId(guild.id),
            asUserId(target.id),
            asCaseNumber(caseNumber),
            reason,
            duration * 1000
          );
          break;
        }

        default:
          return { success: false, error: 'Unknown action.', userNotified: false };
      }

      // Update the existing case with the real action, target, and reason
      const expiresAt = duration ? new Date(Date.now() + duration * 1000) : undefined;
      await container.prisma.modCase.updateMany({
        where: { guildId: guild.id, caseNumber },
        data: {
          action,
          targetId: target.id,
          targetTag: target.tag,
          moderatorId: moderator.id,
          moderatorTag: moderator.tag,
          reason,
          duration: duration ?? null,
          expiresAt: expiresAt ?? null,
        },
      });

      return { success: true, caseNumber: asCaseNumber(caseNumber), userNotified: shouldNotify };
    } catch (error) {
      container.logger.error(`[ModEvidence] Failed to execute ${action}:`, error);
      return {
        success: false,
        error: `Failed to execute ${action.toLowerCase()}.`,
        userNotified: false,
      };
    }
  }
}
