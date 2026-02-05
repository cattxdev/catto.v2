import { container } from '@sapphire/framework';
import type { Subcommand } from '@sapphire/plugin-subcommands';
import { Gate } from '#lib/validation/Gate.js';
import { ephemeralError, defer, editReply } from '#lib/discord/index.js';
import { evidenceService } from '#modules/moderation/services/EvidenceService.js';
import { successContainer, EMOJI } from '#lib/discord/index.js';

export async function handleEvidenceAdd(interaction: Subcommand.ChatInputCommandInteraction) {
  const gate = Gate.from(interaction);
  if (!gate) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  if (!(await gate.requireAuth('mod.evidence.add'))) return;

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
        successContainer()
          .h2(`${EMOJI.STATUS.ERROR} Case Not Found`)
          .text(`Case #${caseNumber} was not found in this server.`)
      );
      return;
    }

    // Generate dashboard URL
    const dashboardUrl = evidenceService.generateEvidenceListUrl(gate.guild.id, caseNumber);

    const result = successContainer()
      .h2(`${EMOJI.STATUS.INFO} Add Evidence to Case #${caseNumber}`)
      .text('Use the dashboard to upload files, add URLs, or capture messages as evidence.')
      .text(
        `Evidence is stored securely with integrity verification and is immutable once verified.`
      )
      .linkButtons({ url: dashboardUrl, label: 'Open Evidence Dashboard' });

    await editReply(interaction, result);
  } catch (error) {
    interaction.client.logger.error('Error in evidence add command:', error);
    await editReply(
      interaction,
      successContainer().h2(`${EMOJI.STATUS.ERROR} Error`).text('An unexpected error occurred.')
    ).catch(() => {});
  }
}
