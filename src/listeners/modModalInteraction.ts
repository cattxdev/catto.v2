import { Listener, container } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags, type ModalSubmitInteraction } from 'discord.js';
import { ModAction, type Prisma } from '@prisma/client';
import {
  decodeReasonModalCustomId,
  decodeDurationModalCustomId,
  decodeNoteModalCustomId,
  decodeMuteModalCustomId,
  decodeEvidenceCaptureModalCustomId,
  decodeEvidenceModActionCustomId,
  encodeEvidenceActionCustomId,
} from '#root/modules/moderation/discord/customId.js';
import {
  buildModActionSuccess,
  buildModActionError,
} from '#root/modules/moderation/discord/panelBuilder.js';
import { moderationService } from '#root/modules/moderation/services/ModerationService.js';
import { notesService } from '#root/modules/moderation/services/NotesService.js';
import { muteService } from '#root/modules/moderation/services/MuteService.js';
import { evidenceService } from '#root/modules/moderation/services/EvidenceService.js';
import {
  asGuildId,
  asUserId,
  asDuration,
  asCaseNumber,
} from '#root/modules/moderation/domain/types.js';
import {
  logModAction,
  notifyUser,
  formatDuration,
} from '#root/modules/moderation/discord/embeds/presets.js';
import { parseDurationToSeconds } from '#lib/interaction/typedOptions.js';
import { safeParse, durationStringSchema } from '#lib/validation/zod.js';
import { ensureNonNull } from '#root/lib/utils.js';
import { isFail, type Gate } from '#lib/validation/Gate.js';
import { getGate } from '#lib/validation/gateContext.js';
import { resolveModalKey } from '#lib/validation/resourceKey.js';
import {
  successContainer as makeSuccessContainer,
  errorContainer as makeErrorContainer,
  stringSelectRow,
  EMOJI,
} from '#lib/discord/index.js';

export class ModModalInteractionListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.InteractionCreate,
    });
  }

  public async run(interaction: Interaction) {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.guildId) return;

    const customId = interaction.customId;

    // Check which type of modal this is
    if (customId.startsWith('modreason:')) {
      await this.handleReasonModal(interaction);
    } else if (customId.startsWith('moddur:')) {
      await this.handleDurationModal(interaction);
    } else if (customId.startsWith('modnote:')) {
      await this.handleNoteModal(interaction);
    } else if (customId.startsWith('modmute:')) {
      await this.handleMuteModal(interaction);
    } else if (customId.startsWith('evidence_capture:')) {
      await this.handleEvidenceCaptureModal(interaction);
    } else if (customId.startsWith('evidence_modaction:')) {
      await this.handleEvidenceModActionModal(interaction);
    }
  }

  /**
   * Get Gate from context and validate authorization for the modal action.
   * Returns null and sends error if validation fails.
   */
  private async requireGateWithAuth(interaction: ModalSubmitInteraction): Promise<Gate | null> {
    const gate = getGate(interaction);
    if (!gate) {
      await interaction.reply({
        content: '❌ This can only be used in a server.',
        flags: MessageFlags.Ephemeral,
      });
      return null;
    }

    // Resolve resource key from modal custom ID
    const resourceKey = resolveModalKey(interaction);
    if (!resourceKey) {
      await interaction.reply({
        content: '❌ Invalid modal data.',
        flags: MessageFlags.Ephemeral,
      });
      return null;
    }

    // Check authorization
    if (!(await gate.requireAuth(resourceKey))) {
      return null; // Error already sent by requireAuth
    }

    return gate;
  }

  private async handleReasonModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = decodeReasonModalCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply({
        content: '❌ Invalid modal data.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Use shared Gate context with auth check
    const gate = await this.requireGateWithAuth(interaction);
    if (!gate) return;

    const reason = interaction.fields.getTextInputValue('reason');
    const targetId = parsed.targetId;
    const action = parsed.action;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const target = await interaction.client.users.fetch(targetId).catch(() => null);

      if (!target) {
        const errorContainer = buildModActionError('User not found.');
        await interaction.editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Determine if member is required for this action
      const requiresMember = action === 'kick' || action === 'warn';
      const targetMember = await gate.resolveMember(targetId);

      if (requiresMember && !targetMember) {
        const errorContainer = buildModActionError('User is not in this server.');
        await interaction.editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Check hierarchy if we have a member
      if (targetMember) {
        const hierarchyResult = gate.checkHierarchy(targetMember);
        if (isFail(hierarchyResult)) {
          const errorContainer = buildModActionError(hierarchyResult.message);
          await interaction.editReply({
            components: [errorContainer.build()],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      // Execute the action
      let result;
      let modAction: ModAction;

      switch (action) {
        case 'warn':
          modAction = ModAction.WARN;
          result = await moderationService.warn(gate.guild, target, interaction.user, reason);
          break;
        case 'kick':
          modAction = ModAction.KICK;
          result = await moderationService.kick(
            gate.guild,
            ensureNonNull(targetMember, 'handleReasonModal > targetMember for kick'),
            interaction.user,
            reason
          );
          break;
        case 'ban':
          modAction = ModAction.BAN;
          // Notify before ban
          await notifyUser(target, ModAction.BAN, gate.guild, reason);
          result = await moderationService.ban(gate.guild, target, interaction.user, reason, false);
          break;
        case 'softban':
          modAction = ModAction.SOFTBAN;
          // Notify before softban
          if (targetMember) {
            await notifyUser(target, ModAction.SOFTBAN, gate.guild, reason);
          }
          result = await moderationService.softban(gate.guild, target, interaction.user, reason);
          break;
        default: {
          const errorContainer = buildModActionError('Unknown action.');
          await interaction.editReply({
            components: [errorContainer.build()],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      if (!result.success) {
        const errorContainer = buildModActionError(result.error ?? 'Action failed.');
        await interaction.editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Log to mod channel
      await logModAction(
        gate.guild,
        modAction,
        target,
        interaction.user,
        reason,
        ensureNonNull(result.caseNumber, 'handleReasonModal > result.caseNumber for log')
      );

      // Show success
      const successContainer = buildModActionSuccess(
        action.toUpperCase(),
        target,
        ensureNonNull(result.caseNumber, 'handleReasonModal > result.caseNumber for success'),
        reason,
        undefined,
        { guildId: gate.guild.id }
      );
      await interaction.editReply({
        components: [successContainer.build()],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      container.logger.error('[ModModalInteraction] Error in reason modal:', error);
      const errorContainer = buildModActionError('An unexpected error occurred.');
      await interaction
        .editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  }

  private async handleDurationModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = decodeDurationModalCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply({
        content: '❌ Invalid modal data.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Use shared Gate context with auth check
    const gate = await this.requireGateWithAuth(interaction);
    if (!gate) return;

    const durationStr = interaction.fields.getTextInputValue('duration');
    const reason = interaction.fields.getTextInputValue('reason');
    const targetId = parsed.targetId;
    const action = parsed.action;

    // Validate duration
    const validation = safeParse(durationStringSchema, durationStr);
    if (!validation.success) {
      await interaction.reply({
        content: '❌ Invalid duration format. Use formats like: 10m, 1h, 1d',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const durationSeconds = parseDurationToSeconds(durationStr);
    if (!durationSeconds) {
      await interaction.reply({
        content: '❌ Invalid duration.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const target = await interaction.client.users.fetch(targetId).catch(() => null);

      if (!target) {
        const errorContainer = buildModActionError('User not found.');
        await interaction.editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Resolve target member
      const targetMember = await gate.resolveMember(targetId);

      // For timeout, user must be in server
      if (action === 'timeout' && !targetMember) {
        const errorContainer = buildModActionError('User is not in this server.');
        await interaction.editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Check hierarchy if we have a member
      if (targetMember) {
        const hierarchyResult = gate.checkHierarchy(targetMember);
        if (isFail(hierarchyResult)) {
          const errorContainer = buildModActionError(hierarchyResult.message);
          await interaction.editReply({
            components: [errorContainer.build()],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      // Execute the action
      let result;
      let modAction: ModAction;

      switch (action) {
        case 'timeout':
          modAction = ModAction.TIMEOUT;
          // Notify before timeout
          if (targetMember) {
            await notifyUser(target, ModAction.TIMEOUT, gate.guild, reason, durationSeconds);
          }
          result = await moderationService.timeout(
            gate.guild,
            ensureNonNull(targetMember, 'handleDurationModal > targetMember for timeout'),
            interaction.user,
            reason,
            durationSeconds
          );
          break;
        case 'tempban':
          modAction = ModAction.TEMPBAN;
          // Notify before tempban
          if (targetMember) {
            await notifyUser(target, ModAction.TEMPBAN, gate.guild, reason, durationSeconds);
          }
          result = await moderationService.tempban(
            gate.guild,
            target,
            interaction.user,
            reason,
            durationSeconds
          );
          break;
        default: {
          const errorContainer = buildModActionError('Unknown action.');
          await interaction.editReply({
            components: [errorContainer.build()],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      if (!result.success) {
        const errorContainer = buildModActionError(result.error ?? 'Action failed.');
        await interaction.editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Log to mod channel
      await logModAction(
        gate.guild,
        modAction,
        target,
        interaction.user,
        reason,
        ensureNonNull(result.caseNumber, 'handleDurationModal > result.caseNumber for log'),
        durationSeconds
      );

      // Show success
      const durationText = formatDuration(durationSeconds);
      const successContainer = buildModActionSuccess(
        action.toUpperCase(),
        target,
        ensureNonNull(result.caseNumber, 'handleDurationModal > result.caseNumber for success'),
        reason,
        durationText,
        { guildId: gate.guild.id }
      );
      await interaction.editReply({
        components: [successContainer.build()],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      container.logger.error('[ModModalInteraction] Error in duration modal:', error);
      const errorContainer = buildModActionError('An unexpected error occurred.');
      await interaction
        .editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  }

  private async handleNoteModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = decodeNoteModalCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply({
        content: '❌ Invalid modal data.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Use shared Gate context with auth check
    const gate = await this.requireGateWithAuth(interaction);
    if (!gate) return;

    const note = interaction.fields.getTextInputValue('note');
    const tagsStr = interaction.fields.getTextInputValue('tags');
    const targetId = parsed.targetId;

    const tags = tagsStr
      ? tagsStr
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
      : [];

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const target = await interaction.client.users.fetch(targetId).catch(() => null);

      if (!target) {
        await interaction.editReply({ content: '❌ User not found.' });
        return;
      }

      const result = await notesService.addNote({
        guildId: asGuildId(gate.guild.id),
        userId: asUserId(targetId),
        createdById: asUserId(interaction.user.id),
        note,
        tags,
      });

      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error}` });
        return;
      }

      const tagsDisplay =
        tags.length > 0 ? `\n**Tags:** ${tags.map((t) => `\`${t}\``).join(', ')}` : '';
      await interaction.editReply({
        content: `Note added for **${target.tag}**${tagsDisplay}\n**Note ID:** \`${result.noteId}\``,
      });
    } catch (error) {
      container.logger.error('[ModModalInteraction] Error in note modal:', error);
      await interaction
        .editReply({
          content: 'An unexpected error occurred.',
        })
        .catch(() => {});
    }
  }

  private async handleMuteModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = decodeMuteModalCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply({
        content: 'Invalid modal data.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Use shared Gate context with auth check
    const gate = await this.requireGateWithAuth(interaction);
    if (!gate) return;

    const durationStr = interaction.fields.getTextInputValue('duration');
    const reason = interaction.fields.getTextInputValue('reason');
    const targetId = parsed.targetId;
    const muteType = parsed.action;

    // Validate duration if provided
    let durationSeconds: number | undefined;
    if (durationStr && durationStr.trim().length > 0) {
      const validation = safeParse(durationStringSchema, durationStr);
      if (!validation.success) {
        await interaction.reply({
          content: 'Invalid duration format. Use formats like: 10m, 1h, 1d',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      durationSeconds = parseDurationToSeconds(durationStr) ?? undefined;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const target = await interaction.client.users.fetch(targetId).catch(() => null);

      if (!target) {
        const errorContainer = buildModActionError('User not found.');
        await interaction.editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Resolve target member (required for mutes)
      const targetMember = await gate.resolveMember(targetId);
      if (!targetMember) {
        const errorContainer = buildModActionError('User is not in this server.');
        await interaction.editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Check hierarchy
      const hierarchyResult = gate.checkHierarchy(targetMember);
      if (isFail(hierarchyResult)) {
        const errorContainer = buildModActionError(hierarchyResult.message);
        await interaction.editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Execute the mute action
      let result;
      let modAction: ModAction;

      const muteInput = {
        guildId: asGuildId(gate.guild.id),
        userId: asUserId(targetId),
        createdById: asUserId(interaction.user.id),
        reason,
        duration: durationSeconds ? asDuration(durationSeconds) : undefined,
      };

      switch (muteType) {
        case 'text':
          modAction = ModAction.MUTE_TEXT;
          result = await muteService.muteText(
            gate.guild,
            targetMember,
            asUserId(interaction.user.id),
            interaction.user.tag,
            muteInput
          );
          break;
        case 'voice':
          modAction = ModAction.MUTE_VOICE;
          result = await muteService.muteVoice(
            gate.guild,
            targetMember,
            asUserId(interaction.user.id),
            interaction.user.tag,
            muteInput
          );
          break;
        case 'both':
          modAction = ModAction.MUTE_BOTH;
          result = await muteService.muteBoth(
            gate.guild,
            targetMember,
            asUserId(interaction.user.id),
            interaction.user.tag,
            muteInput
          );
          break;
        default: {
          const errorContainer = buildModActionError('Unknown mute type.');
          await interaction.editReply({
            components: [errorContainer.build()],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      if (!result.success) {
        const errorContainer = buildModActionError(result.error ?? 'Mute action failed.');
        await interaction.editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Log to mod channel
      await logModAction(
        gate.guild,
        modAction,
        target,
        interaction.user,
        reason,
        ensureNonNull(result.caseNumber, 'handleMuteModal > result.caseNumber for log'),
        durationSeconds
      );

      // Show success
      const durationText = durationSeconds ? formatDuration(durationSeconds) : undefined;
      const successContainer = buildModActionSuccess(
        `MUTE ${muteType.toUpperCase()}`,
        target,
        ensureNonNull(result.caseNumber, 'handleMuteModal > result.caseNumber for success'),
        reason,
        durationText,
        { guildId: gate.guild.id }
      );
      await interaction.editReply({
        components: [successContainer.build()],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      container.logger.error('[ModModalInteraction] Error in mute modal:', error);
      const errorContainer = buildModActionError('An unexpected error occurred.');
      await interaction
        .editReply({
          components: [errorContainer.build()],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  }

  private async handleEvidenceCaptureModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = decodeEvidenceCaptureModalCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply({
        content: '❌ Invalid modal data.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const gate = await this.requireGateWithAuth(interaction);
    if (!gate) return;

    const caseNumberStr = interaction.fields.getTextInputValue('case_number');
    const captureRangeInput = interaction.fields.getTextInputValue('capture_range');
    const deleteInput = interaction.fields.getTextInputValue('delete_messages');

    const caseNumber = parseInt(caseNumberStr, 10);
    if (isNaN(caseNumber) || caseNumber < 1) {
      await interaction.reply({
        components: [
          makeErrorContainer()
            .h2(`${EMOJI.STATUS.ERROR} Invalid Case Number`)
            .text('Please enter a valid case number.')
            .build(),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Parse capture range: empty | number (count) | message link/ID
    let lastMessageId: string | undefined;
    let messageCount: number | undefined;
    const trimmed = captureRangeInput?.trim();

    if (trimmed) {
      // Check if it's a plain number (message count)
      if (/^\d+$/.test(trimmed) && trimmed.length < 4) {
        const count = parseInt(trimmed, 10);
        if (count >= 1 && count <= 100) {
          messageCount = count;
        } else {
          await interaction.reply({
            components: [
              makeErrorContainer()
                .h2(`${EMOJI.STATUS.ERROR} Invalid Count`)
                .text('Message count must be between 1 and 100.')
                .build(),
            ],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      } else {
        // Try to extract a snowflake from a link or raw ID
        const match = trimmed.match(/(\d{17,19})\s*$/);
        if (match?.[1]) {
          lastMessageId = match[1];
        } else {
          lastMessageId = trimmed;
        }
      }
    }

    const deleteAfterCapture = !deleteInput || deleteInput.toLowerCase() === 'yes';

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Resolve the case: use existing case, or re-evaluate and create one
      let actualCaseNumber = caseNumber;
      const existingCase = await container.prisma.modCase.findFirst({
        where: { guildId: gate.guild.id, caseNumber },
      });

      if (!existingCase) {
        // The entered number doesn't exist — re-evaluate to get the current next number
        actualCaseNumber = await evidenceService.getNextCaseNumber(gate.guild.id);

        // Create a placeholder case that will be upgraded when a mod action is taken
        await container.prisma.modCase.create({
          data: {
            caseNumber: actualCaseNumber,
            guildId: gate.guild.id,
            action: ModAction.WARN,
            targetId: gate.member.id, // Placeholder — updated when mod action is taken
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
        caseNumber: actualCaseNumber,
        deleteAfterCapture,
      });

      const dashboardUrl = evidenceService.generateEvidenceListUrl(gate.guild.id, actualCaseNumber);

      // Determine the target user for follow-up mod actions (first message author)
      const snapshotData = snapshot.snapshotData as unknown as Array<{ authorId: string }>;
      const targetUserId = snapshotData?.[0]?.authorId;

      const caseLabel =
        actualCaseNumber !== caseNumber
          ? `**Case #${actualCaseNumber}** *(re-assigned — #${caseNumber} was taken)*`
          : `**Case #${actualCaseNumber}**`;

      const result = makeSuccessContainer()
        .h2(`${EMOJI.STATUS.SUCCESS} Evidence Captured`)
        .text(`**${snapshot.messageCount}** message(s) captured and attached to ${caseLabel}.`)
        .text(`Evidence ID: \`${evidence.id}\``)
        .text(
          deleteAfterCapture
            ? 'Original messages have been deleted.'
            : 'Original messages were preserved.'
        )
        .linkButtons({ url: dashboardUrl, label: 'View Evidence' });

      // Add follow-up mod action select menu if we have a target
      if (targetUserId && targetUserId !== gate.member.id) {
        const selectCustomId = encodeEvidenceActionCustomId(targetUserId, actualCaseNumber);
        const selectRow = stringSelectRow({
          customId: selectCustomId,
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
          components: [result.build(), selectRow],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interaction.editReply({
          components: [result.build()],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } catch (error) {
      container.logger.error('[ModModalInteraction] Error in evidence capture modal:', error);
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred.';
      await interaction
        .editReply({
          components: [
            makeErrorContainer().h2(`${EMOJI.STATUS.ERROR} Capture Failed`).text(errorMsg).build(),
          ],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  }

  /**
   * Handle the modal from the evidence follow-up action select menu.
   * Executes the Discord action and UPDATES the existing case — no duplicate case created.
   */
  private async handleEvidenceModActionModal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = decodeEvidenceModActionCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply({
        content: '❌ Invalid modal data.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const gate = await this.requireGateWithAuth(interaction);
    if (!gate) return;

    const { action, targetId } = parsed;
    const caseNumber = parseInt(parsed.caseNumber, 10);
    const reason = interaction.fields.getTextInputValue('reason');

    // Parse duration for timeout/tempban
    let durationSeconds: number | undefined;
    if (action === 'timeout' || action === 'tempban') {
      const durationStr = interaction.fields.getTextInputValue('duration');
      const validation = safeParse(durationStringSchema, durationStr);
      if (!validation.success) {
        await interaction.reply({
          content: '❌ Invalid duration format. Use formats like: 10m, 1h, 1d',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      durationSeconds = parseDurationToSeconds(durationStr) ?? undefined;
      if (!durationSeconds) {
        await interaction.reply({
          content: '❌ Invalid duration.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const target = await interaction.client.users.fetch(targetId).catch(() => null);
      if (!target) {
        const err = buildModActionError('User not found.');
        await interaction.editReply({
          components: [err.build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Resolve member for actions that require it
      const targetMember = await gate.resolveMember(targetId);
      const requiresMember = action === 'kick' || action === 'warn' || action === 'timeout';
      if (requiresMember && !targetMember) {
        const err = buildModActionError('User is not in this server.');
        await interaction.editReply({
          components: [err.build()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      // Check hierarchy
      if (targetMember) {
        const hierarchyResult = gate.checkHierarchy(targetMember);
        if (isFail(hierarchyResult)) {
          const err = buildModActionError(hierarchyResult.message);
          await interaction.editReply({
            components: [err.build()],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      // Execute the Discord action (without creating a new case)
      let modAction: ModAction;
      const caseUpdate: Prisma.ModCaseUpdateInput = {
        targetId,
        targetTag: target.tag,
        reason,
      };

      switch (action) {
        case 'warn':
          modAction = ModAction.WARN;
          caseUpdate.action = ModAction.WARN;
          break;
        case 'kick':
          modAction = ModAction.KICK;
          caseUpdate.action = ModAction.KICK;
          await ensureNonNull(targetMember, 'evidence kick > targetMember').kick(
            `${reason} | Moderator: ${interaction.user.tag}`
          );
          break;
        case 'ban':
          modAction = ModAction.BAN;
          caseUpdate.action = ModAction.BAN;
          await notifyUser(target, ModAction.BAN, gate.guild, reason);
          await gate.guild.members.ban(targetId, {
            reason: `${reason} | Moderator: ${interaction.user.tag}`,
          });
          break;
        case 'softban':
          modAction = ModAction.SOFTBAN;
          caseUpdate.action = ModAction.SOFTBAN;
          if (targetMember) {
            await notifyUser(target, ModAction.SOFTBAN, gate.guild, reason);
          }
          await gate.guild.members.ban(targetId, {
            reason: `[SOFTBAN] ${reason} | Moderator: ${interaction.user.tag}`,
            deleteMessageSeconds: 7 * 24 * 60 * 60,
          });
          await gate.guild.members.unban(
            targetId,
            `[SOFTBAN] Automatic unban | Moderator: ${interaction.user.tag}`
          );
          break;
        case 'timeout': {
          modAction = ModAction.TIMEOUT;
          caseUpdate.action = ModAction.TIMEOUT;
          caseUpdate.duration = durationSeconds;
          caseUpdate.expiresAt = new Date(Date.now() + durationSeconds! * 1000);
          if (targetMember) {
            await notifyUser(
              target,
              ModAction.TIMEOUT,
              gate.guild,
              reason,
              asDuration(durationSeconds!)
            );
          }
          await ensureNonNull(targetMember, 'evidence timeout > targetMember').timeout(
            durationSeconds! * 1000,
            `${reason} | Moderator: ${interaction.user.tag}`
          );
          break;
        }
        case 'tempban': {
          modAction = ModAction.TEMPBAN;
          caseUpdate.action = ModAction.TEMPBAN;
          caseUpdate.duration = durationSeconds;
          caseUpdate.expiresAt = new Date(Date.now() + durationSeconds! * 1000);
          if (targetMember) {
            await notifyUser(
              target,
              ModAction.TEMPBAN,
              gate.guild,
              reason,
              asDuration(durationSeconds!)
            );
          }
          await gate.guild.members.ban(targetId, {
            reason: `[TEMPBAN] ${reason} | Moderator: ${interaction.user.tag}`,
          });
          // Schedule unban
          const { tempbanScheduler } =
            await import('#root/modules/moderation/services/TempbanScheduler.js');
          await tempbanScheduler.scheduleUnban(
            asGuildId(gate.guild.id),
            asUserId(targetId),
            asCaseNumber(caseNumber),
            reason,
            durationSeconds! * 1000
          );
          break;
        }
        default: {
          const err = buildModActionError('Unknown action.');
          await interaction.editReply({
            components: [err.build()],
            flags: MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      // Update the existing case with the real action, target, and reason
      await container.prisma.modCase.updateMany({
        where: { guildId: gate.guild.id, caseNumber },
        data: caseUpdate,
      });

      // Log to mod channel
      const brandedCaseNumber = asCaseNumber(caseNumber);
      await logModAction(
        gate.guild,
        modAction,
        target,
        interaction.user,
        reason,
        brandedCaseNumber,
        durationSeconds
      );

      // Show success
      const durationText = durationSeconds ? formatDuration(durationSeconds) : undefined;
      const successResult = buildModActionSuccess(
        action.toUpperCase(),
        target,
        brandedCaseNumber,
        reason,
        durationText,
        { guildId: gate.guild.id }
      );
      await interaction.editReply({
        components: [successResult.build()],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      container.logger.error('[ModModalInteraction] Error in evidence mod action modal:', error);
      const err = buildModActionError('An unexpected error occurred.');
      await interaction
        .editReply({ components: [err.build()], flags: MessageFlags.IsComponentsV2 })
        .catch(() => {});
    }
  }
}
