import { Subcommand } from '@sapphire/plugin-subcommands';
import { MessageFlags, type GuildMember } from 'discord.js';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { notesService } from '../../modules/moderation/services/NotesService.js';
import { caseService } from '../../modules/moderation/services/CaseService.js';
import { muteService } from '../../modules/moderation/services/MuteService.js';
import {
  buildModPanel,
  type ModPanelContext,
} from '../../modules/moderation/discord/panelBuilder.js';
import { asGuildId, asUserId } from '../../modules/moderation/domain/types.js';
import { CaseStatus } from '@prisma/client';
import { ephemeralError, editError } from '#lib/discord/index.js';

export async function handlePanel(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  const target = interaction.options.getUser('target', true);

  await interaction.deferReply();

  try {
    const guildId = asGuildId(interaction.guild.id);
    const userId = asUserId(target.id);

    // Fetch target member
    let targetMember: GuildMember | null = null;
    try {
      targetMember = await interaction.guild.members.fetch(target.id);
    } catch {
      // User may not be in the server
    }

    // Gather context data in parallel
    const [userCases, notes, activeMutes] = await Promise.all([
      moderationService.getUserCases(guildId, userId),
      notesService.listNotes(guildId, userId),
      muteService.getActiveMutes(guildId, userId),
    ]);

    // Get recent cases with extended data
    const recentCases = await caseService.getCasesByStatus(guildId, CaseStatus.OPEN);
    const userRecentCases = recentCases.filter((c) => c.targetId === target.id).slice(0, 5);

    // Build context
    const context: ModPanelContext = {
      target,
      targetMember,
      casesCount: userCases.length,
      notesCount: notes.length,
      recentCases: userRecentCases,
      recentNotes: notes.slice(0, 3),
      voiceChannelName: targetMember?.voice.channel?.name ?? null,
      joinedAt: targetMember?.joinedAt ?? null,
      accountCreatedAt: target.createdAt,
      hasActiveMutes: activeMutes.length > 0,
    };

    // Build the Components V2 panel
    const container = buildModPanel(context);

    await interaction.editReply({
      components: [container.build()],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    interaction.client.logger.error('Error in panel command:', error);
    await interaction
      .editReply(editError('An unexpected error occurred while loading the mod panel.'))
      .catch(() => {});
  }
}
