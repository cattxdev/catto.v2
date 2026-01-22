import { Subcommand } from '@sapphire/plugin-subcommands';
import { MessageFlags, type GuildMember } from 'discord.js';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { notesService } from '../../modules/moderation/services/NotesService.js';
import { muteService } from '../../modules/moderation/services/MuteService.js';
import {
  buildContextBundle,
  type ModPanelContext,
} from '../../modules/moderation/discord/panelBuilder.js';
import {
  asGuildId,
  asUserId,
  type CaseNumber,
  type CaseEvidence,
} from '../../modules/moderation/domain/types.js';
import { parseDurationToSeconds } from '#lib/interaction/typedOptions.js';
import { ephemeralError, editError } from '#lib/discord/index.js';

export async function handleContext(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  const target = interaction.options.getUser('target', true);
  const windowStr = interaction.options.getString('window') ?? '24h';

  await interaction.deferReply();

  try {
    const guildId = asGuildId(interaction.guild.id);
    const userId = asUserId(target.id);

    // Parse window to seconds
    const windowSeconds = parseDurationToSeconds(windowStr);
    const windowMs = windowSeconds ? windowSeconds * 1000 : 24 * 60 * 60 * 1000;
    const windowStart = new Date(Date.now() - windowMs);

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

    // Filter cases within window
    const recentCases = userCases
      .filter((c) => c.createdAt >= windowStart)
      .map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber as CaseNumber,
        guildId: c.guildId,
        action: c.action,
        targetId: c.targetId,
        targetTag: c.targetTag,
        moderatorId: c.moderatorId,
        moderatorTag: c.moderatorTag,
        reason: c.reason,
        duration: c.duration,
        status: c.status,
        evidence: c.evidence as CaseEvidence | null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        expiresAt: c.expiresAt,
      }));

    // Filter notes within window
    const recentNotes = notes.filter((n) => n.createdAt >= windowStart);

    // Build context
    const context: ModPanelContext = {
      target,
      targetMember,
      casesCount: userCases.length,
      notesCount: notes.length,
      recentCases: recentCases.slice(0, 10),
      recentNotes: recentNotes.slice(0, 5),
      voiceChannelId: targetMember?.voice.channel?.id ?? null,
      joinedAt: targetMember?.joinedAt ?? null,
      accountCreatedAt: target.createdAt,
      hasActiveMutes: activeMutes.length > 0,
    };

    // Build the Components V2 context bundle
    const container = buildContextBundle(context);

    await interaction.editReply({
      components: [container.build()],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    interaction.client.logger.error('Error in context command:', error);
    await interaction
      .editReply(editError('An unexpected error occurred while loading the context bundle.'))
      .catch(() => {});
  }
}
