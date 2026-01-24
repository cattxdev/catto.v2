import { Subcommand } from '@sapphire/plugin-subcommands';
import { MuteType, ModAction } from '@prisma/client';
import { muteService } from '../../modules/moderation/services/MuteService.js';
import { logModAction, formatDuration } from '../../modules/moderation/discord/embeds/presets.js';
import {
  buildModActionSuccess,
  buildModActionError,
} from '../../modules/moderation/discord/panelBuilder.js';
import { parseMuteOptions, parseUnmuteOptions } from '#lib/interaction/typedOptions.js';
import { ValidationError } from '#lib/validation/zod.js';
import { asUserId, asGuildId } from '../../modules/moderation/domain/types.js';
import {
  ephemeralError,
  defer,
  editReply,
  errorMessage,
  successMessage,
} from '#lib/discord/index.js';
import { ensureNonNull } from '#root/lib/utils.js';
import { getGate } from '#lib/validation/gateContext.js';
import { isFail } from '#lib/validation/Gate.js';

/**
 * Handle /mod mute text
 */
export async function handleMuteText(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseMuteOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    throw error;
  }

  await defer(interaction);

  // Get Gate for hierarchy validation
  const gate = getGate(interaction);
  if (!gate) {
    await editReply(
      interaction,
      errorMessage('Error', 'This command can only be used in a server.')
    );
    return;
  }

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await editReply(interaction, errorMessage('Error', 'Target is not a member of this server.'));
      return;
    }

    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('ManageRoles')) {
      await editReply(
        interaction,
        errorMessage('Error', 'I do not have permission to manage roles.')
      );
      return;
    }

    // Check hierarchy using Gate
    const hierarchyResult = gate.checkHierarchy(targetMember);
    if (isFail(hierarchyResult)) {
      await editReply(interaction, hierarchyResult.response);
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
      await editReply(
        interaction,
        buildModActionError(
          result.error ?? 'Failed to mute the user.',
          'Check bot permissions and role hierarchy.'
        )
      );
      return;
    }

    // Log to mod channel
    await logModAction(
      options.guild,
      ModAction.MUTE_TEXT,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      ensureNonNull(
        result.caseNumber,
        '_muteText > handleMuteText > logModAction(88): result.caseNumber'
      ),
      options.durationSeconds
    );

    const durationText = options.durationSeconds
      ? formatDuration(options.durationSeconds)
      : 'Permanent';

    await editReply(
      interaction,
      buildModActionSuccess(
        'Text mute',
        options.target,
        ensureNonNull(
          result.caseNumber,
          '_muteText > handleMuteText > buildModActionSuccess(101): result.caseNumber'
        ),
        options.reason ?? 'No reason provided',
        durationText
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in mute text command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while processing the mute.')
    ).catch(() => {});
  }
}

/**
 * Handle /mod mute voice
 */
export async function handleMuteVoice(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseMuteOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    throw error;
  }

  await defer(interaction);

  // Get Gate for hierarchy validation
  const gate = getGate(interaction);
  if (!gate) {
    await editReply(
      interaction,
      errorMessage('Error', 'This command can only be used in a server.')
    );
    return;
  }

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await editReply(interaction, errorMessage('Error', 'Target is not a member of this server.'));
      return;
    }

    // Check bot permissions
    if (!options.guild.members.me?.permissions.has('DeafenMembers')) {
      await editReply(
        interaction,
        errorMessage('Error', 'I do not have permission to deafen members.')
      );
      return;
    }

    // Check hierarchy using Gate
    const hierarchyResult = gate.checkHierarchy(targetMember);
    if (isFail(hierarchyResult)) {
      await editReply(interaction, hierarchyResult.response);
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
      await editReply(
        interaction,
        buildModActionError(result.error ?? 'Failed to mute the user.', 'Check bot permissions.')
      );
      return;
    }

    // Log to mod channel
    await logModAction(
      options.guild,
      ModAction.MUTE_VOICE,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      ensureNonNull(
        result.caseNumber,
        '_muteVoice > handleMuteVoice > logModAction(183): result.caseNumber'
      ),
      options.durationSeconds
    );

    const durationText = options.durationSeconds
      ? formatDuration(options.durationSeconds)
      : 'Permanent';

    await editReply(
      interaction,
      buildModActionSuccess(
        'Voice mute',
        options.target,
        ensureNonNull(
          result.caseNumber,
          '_muteVoice > handleMuteVoice > buildModActionSuccess(196): result.caseNumber'
        ),
        options.reason ?? 'No reason provided',
        durationText
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in mute voice command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while processing the mute.')
    ).catch(() => {});
  }
}

/**
 * Handle /mod mute both
 */
export async function handleMuteBoth(interaction: Subcommand.ChatInputCommandInteraction) {
  let options;
  try {
    options = parseMuteOptions(interaction);
  } catch (error) {
    if (error instanceof ValidationError) {
      await interaction.reply(ephemeralError(error.message));
      return;
    }
    throw error;
  }

  await defer(interaction);

  // Get Gate for hierarchy validation
  const gate = getGate(interaction);
  if (!gate) {
    await editReply(
      interaction,
      errorMessage('Error', 'This command can only be used in a server.')
    );
    return;
  }

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await editReply(interaction, errorMessage('Error', 'Target is not a member of this server.'));
      return;
    }

    // Check bot permissions
    if (
      !options.guild.members.me?.permissions.has('ManageRoles') ||
      !options.guild.members.me?.permissions.has('DeafenMembers')
    ) {
      await editReply(
        interaction,
        errorMessage('Error', 'I do not have permission to manage roles and deafen members.')
      );
      return;
    }

    // Check hierarchy using Gate
    const hierarchyResult = gate.checkHierarchy(targetMember);
    if (isFail(hierarchyResult)) {
      await editReply(interaction, hierarchyResult.response);
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
      await editReply(
        interaction,
        buildModActionError(
          result.error ?? 'Failed to mute the user.',
          'Check bot permissions and role hierarchy.'
        )
      );
      return;
    }

    // Log to mod channel
    await logModAction(
      options.guild,
      ModAction.MUTE_BOTH,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      ensureNonNull(
        result.caseNumber,
        '_muteBoth > handleMuteBoth > logModAction(287): result.caseNumber'
      ),
      options.durationSeconds
    );

    const durationText = options.durationSeconds
      ? formatDuration(options.durationSeconds)
      : 'Permanent';

    await editReply(
      interaction,
      buildModActionSuccess(
        'Full mute',
        options.target,
        ensureNonNull(
          result.caseNumber,
          '_muteBoth > handleMuteBoth > buildModActionSuccess(300): result.caseNumber'
        ),
        options.reason ?? 'No reason provided',
        durationText
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in mute both command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while processing the mute.')
    ).catch(() => {});
  }
}

/**
 * Handle /mod unmute text
 */
export async function handleUnmuteText(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseUnmuteOptions(interaction);

  await defer(interaction);

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await editReply(interaction, errorMessage('Error', 'Target is not a member of this server.'));
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
      await editReply(
        interaction,
        errorMessage('Error', 'User does not have an active text mute.')
      );
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
      await editReply(
        interaction,
        buildModActionError(result.error ?? 'Failed to unmute the user.')
      );
      return;
    }

    // Log to mod channel
    await logModAction(
      options.guild,
      ModAction.UNMUTE_TEXT,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      ensureNonNull(
        result.caseNumber,
        '_unmuteText > handleUnmuteText > logModAction(368): result.caseNumber'
      )
    );

    await editReply(
      interaction,
      buildModActionSuccess(
        'Text unmute',
        options.target,
        ensureNonNull(
          result.caseNumber,
          '_unmuteText > handleUnmuteText > buildModActionSuccess(376): result.caseNumber'
        ),
        options.reason ?? 'No reason provided'
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in unmute text command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while processing the unmute.')
    ).catch(() => {});
  }
}

/**
 * Handle /mod unmute voice
 */
export async function handleUnmuteVoice(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseUnmuteOptions(interaction);

  await defer(interaction);

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await editReply(interaction, errorMessage('Error', 'Target is not a member of this server.'));
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
      await editReply(
        interaction,
        errorMessage('Error', 'User does not have an active voice mute.')
      );
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
      await editReply(
        interaction,
        buildModActionError(result.error ?? 'Failed to unmute the user.')
      );
      return;
    }

    // Log to mod channel
    await logModAction(
      options.guild,
      ModAction.UNMUTE_VOICE,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      ensureNonNull(
        result.caseNumber,
        '_unmuteVoice > handleUnmuteVoice > logModAction(443): result.caseNumber'
      )
    );

    await editReply(
      interaction,
      buildModActionSuccess(
        'Voice unmute',
        options.target,
        ensureNonNull(
          result.caseNumber,
          '_unmuteVoice > handleUnmuteVoice > buildModActionSuccess(451): result.caseNumber'
        ),
        options.reason ?? 'No reason provided'
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in unmute voice command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while processing the unmute.')
    ).catch(() => {});
  }
}

/**
 * Handle /mod unmute both
 */
export async function handleUnmuteBoth(interaction: Subcommand.ChatInputCommandInteraction) {
  const options = parseUnmuteOptions(interaction);

  await defer(interaction);

  try {
    // Fetch target member
    let targetMember;
    try {
      targetMember = await options.guild.members.fetch(options.target.id);
    } catch {
      await editReply(interaction, errorMessage('Error', 'Target is not a member of this server.'));
      return;
    }

    // Check if user has any active mutes
    const activeMutes = await muteService.getActiveMutes(
      asGuildId(options.guild.id),
      asUserId(options.target.id)
    );

    if (activeMutes.length === 0) {
      await editReply(interaction, errorMessage('Error', 'User does not have any active mutes.'));
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
      await editReply(
        interaction,
        buildModActionError(result.error ?? 'Failed to unmute the user.')
      );
      return;
    }

    // Log to mod channel
    await logModAction(
      options.guild,
      ModAction.UNMUTE_BOTH,
      options.target,
      options.moderator,
      options.reason ?? 'No reason provided',
      ensureNonNull(
        result.caseNumber,
        '_unmuteBoth > handleUnmuteBoth > logModAction(515): result.caseNumber'
      )
    );

    await editReply(
      interaction,
      buildModActionSuccess(
        'Full unmute',
        options.target,
        ensureNonNull(
          result.caseNumber,
          '_unmuteBoth > handleUnmuteBoth > buildModActionSuccess(523): result.caseNumber'
        ),
        options.reason ?? 'No reason provided'
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in unmute both command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while processing the unmute.')
    ).catch(() => {});
  }
}

/**
 * Handle /mod mutes list
 */
export async function handleMutesList(interaction: Subcommand.ChatInputCommandInteraction) {
  await defer(interaction);

  const guild = interaction.guild;
  if (!guild) {
    await editReply(
      interaction,
      errorMessage('Error', 'This command can only be used in a server.')
    );
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
      await editReply(
        interaction,
        errorMessage('Error', `No active mutes found${filterText}${typeText}.`)
      );
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

    await editReply(
      interaction,
      successMessage(`${title} (${mutes.length} total)`, `${muteLines.join('\n')}${remaining}`)
    );
  } catch (error) {
    interaction.client.logger.error('Error in mutes list command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while fetching mutes.')
    ).catch(() => {});
  }
}
