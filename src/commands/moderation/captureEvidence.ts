import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import {
  ApplicationCommandType,
  InteractionContextType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ContextMenuCommandInteraction,
  type ModalSubmitInteraction,
} from 'discord.js';
import { Gate } from '#lib/validation/Gate.js';
import { evidenceService } from '#modules/moderation/services/EvidenceService.js';
import { successContainer, errorContainer, EMOJI } from '#lib/discord/index.js';

@ApplyOptions<Command.Options>({
  name: 'Capture Evidence',
})
export class CaptureEvidenceCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerContextMenuCommand((builder) =>
      builder
        .setName('Capture Evidence')
        .setType(ApplicationCommandType.Message)
        .setContexts(InteractionContextType.Guild)
    );
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    const gate = Gate.from(interaction);
    if (!gate) {
      await interaction.reply({
        components: [
          errorContainer()
            .h2(`${EMOJI.STATUS.ERROR} Server Only`)
            .text('This command can only be used in a server.')
            .build(),
        ],
        flags: 64, // Ephemeral
      });
      return;
    }

    if (!(await gate.requireAuth('mod.evidence.capture'))) return;

    // Get the target message
    const targetMessage = interaction.isMessageContextMenuCommand()
      ? interaction.targetMessage
      : null;

    if (!targetMessage) {
      await interaction.reply({
        components: [
          errorContainer()
            .h2(`${EMOJI.STATUS.ERROR} Error`)
            .text('Could not find the target message.')
            .build(),
        ],
        flags: 64,
      });
      return;
    }

    // Show modal for case number and range
    const modal = new ModalBuilder()
      .setCustomId(`evidence_capture:${targetMessage.id}:${targetMessage.channelId}`)
      .setTitle('Capture Evidence')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('case_number')
            .setLabel('Case Number')
            .setPlaceholder('Enter the case number to attach this evidence to')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(10)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('last_message_id')
            .setLabel('Last Message ID/Link (for range)')
            .setPlaceholder('Leave empty to capture only this message')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('delete_messages')
            .setLabel('Delete messages after capture? (yes/no)')
            .setPlaceholder('yes')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(3)
        )
      );

    await interaction.showModal(modal);
  }
}

/**
 * Handle the modal submission for evidence capture.
 * This is registered as an interaction handler, not as part of the command class.
 */
export async function handleEvidenceCaptureModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const gate = Gate.from(interaction);
  if (!gate) return;

  // Parse custom ID: evidence_capture:{messageId}:{channelId}
  const parts = interaction.customId.split(':');
  if (parts.length < 3) return;

  const firstMessageId = parts[1]!;
  const channelId = parts[2]!;

  const caseNumberStr = interaction.fields.getTextInputValue('case_number');
  const lastMessageInput = interaction.fields.getTextInputValue('last_message_id');
  const deleteInput = interaction.fields.getTextInputValue('delete_messages');

  const caseNumber = parseInt(caseNumberStr, 10);
  if (isNaN(caseNumber) || caseNumber < 1) {
    await interaction.reply({
      components: [
        errorContainer()
          .h2(`${EMOJI.STATUS.ERROR} Invalid Case Number`)
          .text('Please enter a valid case number.')
          .build(),
      ],
      flags: 64,
    });
    return;
  }

  // Parse last message ID (could be a link or raw ID)
  let lastMessageId: string | undefined;
  if (lastMessageInput) {
    const match = lastMessageInput.match(/(\d{17,19})(?:\s*$)/);
    if (match?.[1]) {
      lastMessageId = match[1];
    } else {
      lastMessageId = lastMessageInput.trim();
    }
  }

  const deleteAfterCapture = !deleteInput || deleteInput.toLowerCase() === 'yes';

  await interaction.deferReply({ flags: 64 });

  try {
    const { snapshot, evidence } = await evidenceService.captureMessageRange(gate.guild, {
      guildId: gate.guild.id,
      channelId,
      firstMessageId,
      lastMessageId,
      capturedById: gate.member.id,
      capturedByTag: gate.member.user.tag,
      caseNumber,
      deleteAfterCapture,
    });

    const dashboardUrl = evidenceService.generateEvidenceListUrl(gate.guild.id, caseNumber);

    const result = successContainer()
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

    await interaction.editReply({
      components: [result.build()],
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred.';
    await interaction.editReply({
      components: [
        errorContainer().h2(`${EMOJI.STATUS.ERROR} Capture Failed`).text(errorMsg).build(),
      ],
    });
  }
}
