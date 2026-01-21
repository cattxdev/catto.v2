import { Subcommand } from '@sapphire/plugin-subcommands';
import { MuteType, ModAction } from '@prisma/client';
import { muteService } from '../../modules/moderation/services/MuteService.js';
import { moderationService } from '../../modules/moderation/services/ModerationService.js';
import { logModActionV2, formatDuration } from '../../modules/moderation/discord/embeds.js';
import {
  buildModActionSuccessV2,
  buildModActionErrorV2,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseMuteOptions, parseUnmuteOptions } from '#lib/interaction/typedOptions.js';
import { asUserId, asGuildId } from '../../modules/moderation/domain/types.js';
import {
  ephemeralError,
  editErrorV2,
  editSuccessV2,
  deferV2Ephemeral,
  editReplyV2,
} from '#lib/discord/index.js';

/**
 * Handle /mod mute text
 */
export async function handleMuteText(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseMuteOptions(interaction);
  if (!options) {
    await interaction.reply(
      ephemeralError('Invalid duration format. Use formats like: 10m, 1h, 2d, 1w')
    );
    return;
  }

  await deferV2Ephemeral(interaction);

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await interaction.editReply(editErrorV2('Target is not a member of this server.'));
      return;
    }

    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('ManageRoles')) {
      await interaction.editReply(editErrorV2('I do not have permission to manage roles.'));
      return;
    }

    // Check if moderator can moderate target
    const canModerateResult = moderationService.canModerate(options.moderatorMember, targetMember);
    if (!canModerateResult.canModerate) {
      await interaction.editReply(
        editErrorV2(canModerateResult.reason ?? 'You cannot moderate this user.')
      );
      return;
    }

    // Execute mute via service
    const result = await muteService.muteText(
      options.guild,
      targetMember,
      asUserId(interaction.user.id),
      interaction.user.tag,
      {
        guildId: asGuildId(options.guild.id),
        userId: asUserId(options.target.id),
        createdById: asUserId(interaction.user.id),
        reason: options.reason,
        duration: options.durationSeconds,
      }
    );

    if (!result.success) {
      await editReplyV2(
        interaction,
        buildModActionErrorV2(
          result.error ?? 'Failed to mute the user.',
          'Check bot permissions and role hierarchy.'
        )
      );
      return;
    }

    // Log to mod channel
    await logModActionV2(
      options.guild,
      ModAction.MUTE_TEXT,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      result.caseNumber!,
      options.durationSeconds
    );

    const durationText = options.durationSeconds
      ? formatDuration(options.durationSeconds)
      : 'Permanent';

    await editReplyV2(
      interaction,
      buildModActionSuccessV2(
        'Text Mute',
        options.target,
        result.caseNumber!,
        options.reason ?? 'No reason provided',
        durationText
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in mute text command:', error);
    await interaction
      .editReply(editErrorV2('An unexpected error occurred while processing the mute.'))
      .catch(() => {});
  }
}

/**
 * Handle /mod mute voice
 */
export async function handleMuteVoice(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseMuteOptions(interaction);
  if (!options) {
    await interaction.reply(
      ephemeralError('Invalid duration format. Use formats like: 10m, 1h, 2d, 1w')
    );
    return;
  }

  await deferV2Ephemeral(interaction);

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await interaction.editReply(editErrorV2('Target is not a member of this server.'));
      return;
    }

    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('DeafenMembers')) {
      await interaction.editReply(editErrorV2('I do not have permission to deafen members.'));
      return;
    }

    // Check if moderator can moderate target
    const canModerateResult = moderationService.canModerate(options.moderatorMember, targetMember);
    if (!canModerateResult.canModerate) {
      await interaction.editReply(
        editErrorV2(canModerateResult.reason ?? 'You cannot moderate this user.')
      );
      return;
    }

    // Execute mute via service
    const result = await muteService.muteVoice(
      options.guild,
      targetMember,
      asUserId(interaction.user.id),
      interaction.user.tag,
      {
        guildId: asGuildId(options.guild.id),
        userId: asUserId(options.target.id),
        createdById: asUserId(interaction.user.id),
        reason: options.reason,
        duration: options.durationSeconds,
      }
    );

    if (!result.success) {
      await editReplyV2(
        interaction,
        buildModActionErrorV2(result.error ?? 'Failed to mute the user.', 'Check bot permissions.')
      );
      return;
    }

    // Log to mod channel
    await logModActionV2(
      options.guild,
      ModAction.MUTE_VOICE,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      result.caseNumber!,
      options.durationSeconds
    );

    const durationText = options.durationSeconds
      ? formatDuration(options.durationSeconds)
      : 'Permanent';

    await editReplyV2(
      interaction,
      buildModActionSuccessV2(
        'Voice Mute',
        options.target,
        result.caseNumber!,
        options.reason ?? 'No reason provided',
        durationText
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in mute voice command:', error);
    await interaction
      .editReply(editErrorV2('An unexpected error occurred while processing the mute.'))
      .catch(() => {});
  }
}

/**
 * Handle /mod mute both
 */
export async function handleMuteBoth(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseMuteOptions(interaction);
  if (!options) {
    await interaction.reply(
      ephemeralError('Invalid duration format. Use formats like: 10m, 1h, 2d, 1w')
    );
    return;
  }

  await deferV2Ephemeral(interaction);

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await interaction.editReply(editErrorV2('Target is not a member of this server.'));
      return;
    }

    // Check bot permissions
    if (
      !options.guild.members.me?.permissions.has('ManageRoles') ||
      !options.guild.members.me?.permissions.has('DeafenMembers')
    ) {
      await interaction.editReply(
        editErrorV2('I do not have permission to manage roles and deafen members.')
      );
      return;
    }

    // Check if moderator can moderate target
    const canModerateResult = moderationService.canModerate(options.moderatorMember, targetMember);
    if (!canModerateResult.canModerate) {
      await interaction.editReply(
        editErrorV2(canModerateResult.reason ?? 'You cannot moderate this user.')
      );
      return;
    }

    // Execute mute via service
    const result = await muteService.muteBoth(
      options.guild,
      targetMember,
      asUserId(interaction.user.id),
      interaction.user.tag,
      {
        guildId: asGuildId(options.guild.id),
        userId: asUserId(options.target.id),
        createdById: asUserId(interaction.user.id),
        reason: options.reason,
        duration: options.durationSeconds,
      }
    );

    if (!result.success) {
      await editReplyV2(
        interaction,
        buildModActionErrorV2(
          result.error ?? 'Failed to mute the user.',
          'Check bot permissions and role hierarchy.'
        )
      );
      return;
    }

    // Log to mod channel
    await logModActionV2(
      options.guild,
      ModAction.MUTE_BOTH,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      result.caseNumber!,
      options.durationSeconds
    );

    const durationText = options.durationSeconds
      ? formatDuration(options.durationSeconds)
      : 'Permanent';

    await editReplyV2(
      interaction,
      buildModActionSuccessV2(
        'Full Mute',
        options.target,
        result.caseNumber!,
        options.reason ?? 'No reason provided',
        durationText
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in mute both command:', error);
    await interaction
      .editReply(editErrorV2('An unexpected error occurred while processing the mute.'))
      .catch(() => {});
  }
}

/**
 * Handle /mod unmute text
 */
export async function handleUnmuteText(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseUnmuteOptions(interaction);

  await deferV2Ephemeral(interaction);

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await interaction.editReply(editErrorV2('Target is not a member of this server.'));
      return;
    }

    // Check if user has an active text mute
    const activeMutes = await muteService.getActiveMutes(
      asGuildId(options.guild.id),
      asUserId(options.target.id)
    );
    const hasTextMute = activeMutes.some(
      (m) => m.type === MuteType.TEXT || m.type === MuteType.BOTH
    );

    if (!hasTextMute) {
      await interaction.editReply(editErrorV2('User does not have an active text mute.'));
      return;
    }

    // Execute unmute via service
    const result = await muteService.unmuteText(options.guild, targetMember, {
      guildId: asGuildId(options.guild.id),
      userId: asUserId(options.target.id),
      moderatorId: asUserId(interaction.user.id),
      moderatorTag: interaction.user.tag,
      reason: options.reason ?? 'No reason provided',
    });

    if (!result.success) {
      await editReplyV2(
        interaction,
        buildModActionErrorV2(result.error ?? 'Failed to unmute the user.')
      );
      return;
    }

    // Log to mod channel
    await logModActionV2(
      options.guild,
      ModAction.UNMUTE_TEXT,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      result.caseNumber!
    );

    await editReplyV2(
      interaction,
      buildModActionSuccessV2(
        'Text Unmute',
        options.target,
        result.caseNumber!,
        options.reason ?? 'No reason provided'
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in unmute text command:', error);
    await interaction
      .editReply(editErrorV2('An unexpected error occurred while processing the unmute.'))
      .catch(() => {});
  }
}

/**
 * Handle /mod unmute voice
 */
export async function handleUnmuteVoice(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseUnmuteOptions(interaction);

  await deferV2Ephemeral(interaction);

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await interaction.editReply(editErrorV2('Target is not a member of this server.'));
      return;
    }

    // Check if user has an active voice mute
    const activeMutes = await muteService.getActiveMutes(
      asGuildId(options.guild.id),
      asUserId(options.target.id)
    );
    const hasVoiceMute = activeMutes.some(
      (m) => m.type === MuteType.VOICE || m.type === MuteType.BOTH
    );

    if (!hasVoiceMute) {
      await interaction.editReply(editErrorV2('User does not have an active voice mute.'));
      return;
    }

    // Execute unmute via service
    const result = await muteService.unmuteVoice(options.guild, targetMember, {
      guildId: asGuildId(options.guild.id),
      userId: asUserId(options.target.id),
      moderatorId: asUserId(interaction.user.id),
      moderatorTag: interaction.user.tag,
      reason: options.reason ?? 'No reason provided',
    });

    if (!result.success) {
      await editReplyV2(
        interaction,
        buildModActionErrorV2(result.error ?? 'Failed to unmute the user.')
      );
      return;
    }

    // Log to mod channel
    await logModActionV2(
      options.guild,
      ModAction.UNMUTE_VOICE,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      result.caseNumber!
    );

    await editReplyV2(
      interaction,
      buildModActionSuccessV2(
        'Voice Unmute',
        options.target,
        result.caseNumber!,
        options.reason ?? 'No reason provided'
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in unmute voice command:', error);
    await interaction
      .editReply(editErrorV2('An unexpected error occurred while processing the unmute.'))
      .catch(() => {});
  }
}

/**
 * Handle /mod unmute both
 */
export async function handleUnmuteBoth(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseUnmuteOptions(interaction);

  await deferV2Ephemeral(interaction);

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await interaction.editReply(editErrorV2('Target is not a member of this server.'));
      return;
    }

    // Check if user has any active mutes
    const activeMutes = await muteService.getActiveMutes(
      asGuildId(options.guild.id),
      asUserId(options.target.id)
    );

    if (activeMutes.length === 0) {
      await interaction.editReply(editErrorV2('User does not have any active mutes.'));
      return;
    }

    // Execute unmute via service
    const result = await muteService.unmuteBoth(options.guild, targetMember, {
      guildId: asGuildId(options.guild.id),
      userId: asUserId(options.target.id),
      moderatorId: asUserId(interaction.user.id),
      moderatorTag: interaction.user.tag,
      reason: options.reason ?? 'No reason provided',
    });

    if (!result.success) {
      await editReplyV2(
        interaction,
        buildModActionErrorV2(result.error ?? 'Failed to unmute the user.')
      );
      return;
    }

    // Log to mod channel
    await logModActionV2(
      options.guild,
      ModAction.UNMUTE_BOTH,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      result.caseNumber!
    );

    await editReplyV2(
      interaction,
      buildModActionSuccessV2(
        'Full Unmute',
        options.target,
        result.caseNumber!,
        options.reason ?? 'No reason provided'
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in unmute both command:', error);
    await interaction
      .editReply(editErrorV2('An unexpected error occurred while processing the unmute.'))
      .catch(() => {});
  }
}

/**
 * Handle /mod mutes list
 */
export async function handleMutesList(interaction: Subcommand.ChatInputCommandInteraction) {
  await deferV2Ephemeral(interaction);

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply(editErrorV2('This command can only be used in a server.'));
    return;
  }

  const target = interaction.options.getUser('target');
  const typeStr = interaction.options.getString('type') as 'TEXT' | 'VOICE' | 'BOTH' | null;
  const type = typeStr ? MuteType[typeStr] : undefined;

  try {
    const guildId = asGuildId(guild.id);

    let mutes;
    if (target) {
      mutes = await muteService.getActiveMutes(guildId, asUserId(target.id));
      if (type) {
        mutes = mutes.filter((m) => m.type === type);
      }
    } else {
      mutes = await muteService.listActiveMutes(guildId, type);
    }

    if (mutes.length === 0) {
      const filterText = target ? ` for ${target.tag}` : '';
      const typeText = type ? ` of type ${type}` : '';
      await interaction.editReply(editErrorV2(`No active mutes found${filterText}${typeText}.`));
      return;
    }

    const muteLines = await Promise.all(
      mutes.slice(0, 20).map(async (m) => {
        const user = await interaction.client.users.fetch(m.userId).catch(() => null);
        const username = user?.tag ?? m.userId;
        const expiresText = m.expiresAt
          ? `expires <t:${Math.floor(m.expiresAt.getTime() / 1000)}:R>`
          : 'permanent';
        return `- **${username}** (${m.type}) - ${expiresText}\n  Reason: ${m.reason.substring(0, 100)}`;
      })
    );

    const title = target ? `Active mutes for ${target.tag}` : 'Active mutes';
    const remaining = mutes.length > 20 ? `\n*... and ${mutes.length - 20} more*` : '';

    await interaction.editReply(
      editSuccessV2(`${title} (${mutes.length} total)`, `${muteLines.join('\n')}${remaining}`)
    );
  } catch (error) {
    interaction.client.logger.error('Error in mutes list command:', error);
    await interaction
      .editReply(editErrorV2('An unexpected error occurred while fetching mutes.'))
      .catch(() => {});
  }
}
