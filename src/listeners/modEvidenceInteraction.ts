import { Listener, container } from '@sapphire/framework';
import { Events, type Interaction, MessageFlags } from 'discord.js';
import {
  decodeEvidenceActionCustomId,
  encodeEvidenceModActionCustomId,
} from '#root/modules/moderation/discord/customId.js';
import { formModal, paragraphModal } from '#lib/discord/index.js';
import { getGate } from '#lib/validation/gateContext.js';
import { resolveSelectMenuKey } from '#lib/validation/resourceKey.js';

export class ModEvidenceInteractionListener extends Listener {
  public constructor(context: Listener.LoaderContext, options: Listener.Options) {
    super(context, {
      ...options,
      event: Events.InteractionCreate,
    });
  }

  public async run(interaction: Interaction) {
    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.guildId) return;
    if (!interaction.customId.startsWith('evidence_action:')) return;

    const parsed = decodeEvidenceActionCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply({
        content: '❌ Invalid interaction data.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const gate = getGate(interaction);
    if (!gate) {
      await interaction.reply({
        content: '❌ This can only be used in a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const resourceKey = resolveSelectMenuKey(interaction);
    if (!resourceKey) {
      await interaction.reply({
        content: '❌ Invalid interaction data.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!(await gate.requireAuth(resourceKey))) return;

    const selectedAction = interaction.values[0];
    if (!selectedAction) return;

    const targetId = parsed.targetId;
    const caseNumber = parseInt(parsed.caseNumber, 10);

    try {
      switch (selectedAction) {
        case 'none':
          // Remove the select menu by updating the message without it
          await interaction.update({
            components: interaction.message.components.slice(0, -1),
          });
          return;

        case 'warn':
        case 'kick':
        case 'ban':
        case 'softban': {
          const modal = paragraphModal(
            encodeEvidenceModActionCustomId(selectedAction, targetId, caseNumber),
            `${selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)} User`,
            {
              customId: 'reason',
              label: 'Reason',
              placeholder: 'Enter the reason for this action...',
              required: true,
              maxLength: 512,
            }
          );
          await interaction.showModal(modal);
          return;
        }

        case 'timeout':
        case 'tempban': {
          const modal = formModal(
            encodeEvidenceModActionCustomId(selectedAction, targetId, caseNumber),
            `${selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)} User`,
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
          );
          await interaction.showModal(modal);
          return;
        }

        default:
          await interaction.reply({
            content: '❌ Unknown action.',
            flags: MessageFlags.Ephemeral,
          });
      }
    } catch (error) {
      container.logger.error('[ModEvidenceInteraction] Error handling evidence action:', error);
      await interaction
        .reply({
          content: '❌ An unexpected error occurred.',
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  }
}
