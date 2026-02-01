import { container } from '@sapphire/framework';
import type { Subcommand } from '@sapphire/plugin-subcommands';
import { Gate } from '#lib/validation/Gate.js';
import { ephemeralError, defer, editReply } from '#lib/discord/index.js';
import { evidenceService } from '#modules/moderation/services/EvidenceService.js';
import {
  container as fluentContainer,
  EMOJI,
  COLORS,
  formatRelativeTimestamp,
  formatStatsLine,
} from '#lib/discord/index.js';

/** Human-readable evidence type labels */
const TYPE_LABELS: Record<string, string> = {
  IMAGE: 'Images',
  VIDEO: 'Videos',
  AUDIO: 'Audio',
  DOCUMENT: 'Documents',
  URL: 'URLs',
  DISCORD_URL: 'Discord Links',
  MESSAGE_SNAPSHOT: 'Snapshots',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function handleEvidenceList(interaction: Subcommand.ChatInputCommandInteraction) {
  const gate = Gate.from(interaction);
  if (!gate) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  if (!(await gate.requireAuth('mod.evidence.list'))) return;

  const caseNumber = interaction.options.getInteger('number', true);

  await defer(interaction);

  try {
    // Verify case exists
    const modCase = await container.prisma.modCase.findFirst({
      where: { guildId: gate.guild.id, caseNumber },
    });

    if (!modCase) {
      await editReply(
        interaction,
        fluentContainer({ color: COLORS.ERROR })
          .h2(`${EMOJI.STATUS.ERROR} Case Not Found`)
          .text(`Case #${caseNumber} was not found in this server.`)
      );
      return;
    }

    // Get evidence summary
    const summary = await evidenceService.getEvidenceSummary(gate.guild.id, caseNumber);

    if (summary.total === 0) {
      const dashboardUrl = evidenceService.generateEvidenceListUrl(gate.guild.id, caseNumber);

      const result = fluentContainer({ color: COLORS.INFO })
        .h2(`${EMOJI.MODERATION.ICONS.SHIELD_BLUE} Evidence for Case #${caseNumber}`)
        .text('No evidence has been added to this case yet.')
        .linkButtons({ url: dashboardUrl, label: 'Add Evidence' });

      await editReply(interaction, result);
      return;
    }

    // Build type breakdown
    const typeBreakdown: Record<string, number> = {};
    for (const [type, count] of Object.entries(summary.byType)) {
      if (count && count > 0) {
        typeBreakdown[TYPE_LABELS[type] ?? type] = count;
      }
    }

    const dashboardUrl = evidenceService.generateEvidenceListUrl(gate.guild.id, caseNumber);

    const result = fluentContainer({ color: COLORS.INFO })
      .h2(`${EMOJI.MODERATION.ICONS.SHIELD_BLUE} Evidence for Case #${caseNumber}`)
      .text(formatStatsLine({ Total: summary.total, ...typeBreakdown }));

    if (summary.totalSizeBytes > 0) {
      result.text(`${EMOJI.STATUS.INFO} **Total size:** ${formatBytes(summary.totalSizeBytes)}`);
    }

    if (summary.latestAt) {
      result.text(`${EMOJI.TIME.CLOCK} **Latest:** ${formatRelativeTimestamp(summary.latestAt)}`);
    }

    if (summary.hasWeakEvidenceOnly) {
      result
        .separator()
        .text(
          `${EMOJI.STATUS.WARNING} **Warning:** This case only has Discord message links as evidence. These may become unavailable if messages are deleted. Consider adding stronger evidence (screenshots, files).`
        );
    }

    result.linkButtons(
      { url: dashboardUrl, label: 'View in Dashboard' },
      { url: dashboardUrl, label: 'Add Evidence' }
    );

    result.footer('Evidence files and content are only viewable in the dashboard.');

    await editReply(interaction, result);
  } catch (error) {
    interaction.client.logger.error('Error in evidence list command:', error);
    await editReply(
      interaction,
      fluentContainer({ color: COLORS.ERROR })
        .h2(`${EMOJI.STATUS.ERROR} Error`)
        .text('An unexpected error occurred.')
    ).catch(() => {});
  }
}
