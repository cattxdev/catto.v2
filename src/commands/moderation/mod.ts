import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplyOptions } from '@sapphire/decorators';
import {
  PermissionFlagsBits,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  InteractionContextType,
  ChannelType,
} from 'discord.js';
import { handleKick } from './_kick.js';
import { handleTimeout } from './_timeout.js';
import { handleWarn } from './_warn.js';
import { handleUnban } from './_unban.js';
import { handleCase } from './_case.js';
import { handleHistory } from './_history.js';
import { handleBan } from './_ban.js';
import { handleVoiceWhere } from './_voiceWhere.js';
import { handleVoiceWatch } from './_voiceWatch.js';
import { handleVoiceSnapshot } from './_voiceSnapshot.js';
import { handleVoiceTrack } from './_voiceTrack.js';
import { handleSoftban } from './_softban.js';
import { handleTempban } from './_tempban.js';
import { handlePanel } from './_panel.js';
import { handleContext } from './_context.js';
import { handleNoteAdd, handleNoteList, handleNoteDelete } from './_note.js';
import { handleCaseEdit, handleCaseLink, handleCaseClose } from './_caseManagement.js';
import { handleEvidenceAdd } from './_evidenceAdd.js';
import { handleEvidenceList } from './_evidenceList.js';

import {
  handleMuteText,
  handleMuteVoice,
  handleMuteBoth,
  handleUnmuteText,
  handleUnmuteVoice,
  handleUnmuteBoth,
  handleMutesList,
} from './_mute.js';
import { handleSetup } from './_setup.js';

@ApplyOptions<Subcommand.Options>({
  name: 'mod',
  description: 'Moderation commands',
  requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
  subcommands: [
    {
      name: 'ban',
      chatInputRun: 'chatInputBan',
    },
    {
      name: 'kick',
      chatInputRun: 'chatInputKick',
    },
    {
      name: 'timeout',
      chatInputRun: 'chatInputTimeout',
    },
    {
      name: 'warn',
      chatInputRun: 'chatInputWarn',
    },
    {
      name: 'unban',
      chatInputRun: 'chatInputUnban',
    },
    {
      name: 'case',
      chatInputRun: 'chatInputCase',
    },
    {
      name: 'history',
      chatInputRun: 'chatInputHistory',
    },
    {
      name: 'softban',
      chatInputRun: 'chatInputSoftban',
    },
    {
      name: 'tempban',
      chatInputRun: 'chatInputTempban',
    },
    {
      name: 'panel',
      chatInputRun: 'chatInputPanel',
    },
    {
      name: 'context',
      chatInputRun: 'chatInputContext',
    },
    // Voice subcommand group
    {
      name: 'voice',
      type: 'group',
      entries: [
        { name: 'where', chatInputRun: 'chatInputVoiceWhere' },
        { name: 'watch', chatInputRun: 'chatInputVoiceWatch' },
        { name: 'snapshot', chatInputRun: 'chatInputVoiceSnapshot' },
        { name: 'track', chatInputRun: 'chatInputVoiceTrack' },
      ],
    },
    // Note subcommand group
    {
      name: 'note',
      type: 'group',
      entries: [
        { name: 'add', chatInputRun: 'chatInputNoteAdd' },
        { name: 'list', chatInputRun: 'chatInputNoteList' },
        { name: 'delete', chatInputRun: 'chatInputNoteDelete' },
      ],
    },
    // Case management subcommand group
    {
      name: 'casemod',
      type: 'group',
      entries: [
        { name: 'edit', chatInputRun: 'chatInputCaseEdit' },
        { name: 'link', chatInputRun: 'chatInputCaseLink' },
        { name: 'close', chatInputRun: 'chatInputCaseClose' },
      ],
    },
    // Evidence subcommand group
    {
      name: 'evidence',
      type: 'group',
      entries: [
        { name: 'add', chatInputRun: 'chatInputEvidenceAdd' },
        { name: 'list', chatInputRun: 'chatInputEvidenceList' },
      ],
    },

    // Mute subcommand group
    {
      name: 'mute',
      type: 'group',
      entries: [
        { name: 'text', chatInputRun: 'chatInputMuteText' },
        { name: 'voice', chatInputRun: 'chatInputMuteVoice' },
        { name: 'both', chatInputRun: 'chatInputMuteBoth' },
      ],
    },
    // Unmute subcommand group
    {
      name: 'unmute',
      type: 'group',
      entries: [
        { name: 'text', chatInputRun: 'chatInputUnmuteText' },
        { name: 'voice', chatInputRun: 'chatInputUnmuteVoice' },
        { name: 'both', chatInputRun: 'chatInputUnmuteBoth' },
      ],
    },
    // Mutes list
    {
      name: 'mutes',
      chatInputRun: 'chatInputMutesList',
    },
    // Setup wizard
    {
      name: 'setup',
      chatInputRun: 'chatInputSetup',
    },
  ],
})
export class ModCommand extends Subcommand {
  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(null) // Show to all users, Gate handles authorization via PermissionGatePrecondition
        .setContexts(InteractionContextType.Guild)
        .addSubcommand(this.buildBanSubcommand)
        .addSubcommand(this.buildKickSubcommand)
        .addSubcommand(this.buildTimeoutSubcommand)
        .addSubcommand(this.buildWarnSubcommand)
        .addSubcommand(this.buildUnbanSubcommand)
        .addSubcommand(this.buildCaseSubcommand)
        .addSubcommand(this.buildHistorySubcommand)
        .addSubcommand(this.buildSoftbanSubcommand)
        .addSubcommand(this.buildTempbanSubcommand)
        .addSubcommand(this.buildPanelSubcommand)
        .addSubcommand(this.buildContextSubcommand)
        .addSubcommand(this.buildMutesSubcommand)
        .addSubcommand(this.buildSetupSubcommand)
        .addSubcommandGroup(this.buildVoiceSubcommandGroup.bind(this))
        .addSubcommandGroup(this.buildNoteSubcommandGroup.bind(this))
        .addSubcommandGroup(this.buildCaseModSubcommandGroup.bind(this))

        .addSubcommandGroup(this.buildEvidenceSubcommandGroup.bind(this))
        .addSubcommandGroup(this.buildMuteSubcommandGroup.bind(this))
        .addSubcommandGroup(this.buildUnmuteSubcommandGroup.bind(this))
    );
  }

  private buildBanSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('ban')
      .setDescription('Ban a member from the server')
      .addUserOption((option) =>
        option.setName('target').setDescription('The member to ban (if in server)')
      )
      .addStringOption((option) =>
        option
          .setName('target_id')
          .setDescription('User ID to ban (for users not in server)')
          .setMinLength(17)
          .setMaxLength(20)
      )
      .addStringOption((option) =>
        option.setName('reason').setDescription('Reason for the ban').setMaxLength(512)
      )
      .addBooleanOption((option) =>
        option.setName('delete_messages').setDescription('Delete messages from the last 7 days')
      );
  }

  private buildKickSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('kick')
      .setDescription('Kick a member from the server')
      .addUserOption((option) =>
        option.setName('target').setDescription('The member to kick').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('reason').setDescription('Reason for the kick').setMaxLength(512)
      );
  }

  private buildTimeoutSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('timeout')
      .setDescription('Timeout a member')
      .addUserOption((option) =>
        option.setName('target').setDescription('The member to timeout').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('duration').setDescription('Duration (e.g., 10m, 1h, 1d)').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('reason').setDescription('Reason for the timeout').setMaxLength(512)
      );
  }

  private buildWarnSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('warn')
      .setDescription('Warn a member')
      .addUserOption((option) =>
        option.setName('target').setDescription('The member to warn').setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('reason')
          .setDescription('Reason for the warning')
          .setRequired(true)
          .setMaxLength(512)
      );
  }

  private buildUnbanSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('unban')
      .setDescription('Unban a user')
      .addStringOption((option) =>
        option.setName('user_id').setDescription('The user ID to unban').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('reason').setDescription('Reason for the unban').setMaxLength(512)
      );
  }

  private buildCaseSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('case')
      .setDescription('View a moderation case')
      .addIntegerOption((option) =>
        option.setName('number').setDescription('Case number').setRequired(true).setMinValue(1)
      );
  }

  private buildHistorySubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('history')
      .setDescription('View moderation history for a user')
      .addUserOption((option) =>
        option.setName('target').setDescription('The user to check').setRequired(true)
      );
  }

  private buildSoftbanSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('softban')
      .setDescription('Softban a member (ban + immediate unban to delete messages)')
      .addUserOption((option) =>
        option.setName('target').setDescription('The member to softban (if in server)')
      )
      .addStringOption((option) =>
        option
          .setName('target_id')
          .setDescription('User ID to softban (for users not in server)')
          .setMinLength(17)
          .setMaxLength(20)
      )
      .addStringOption((option) =>
        option.setName('reason').setDescription('Reason for the softban').setMaxLength(512)
      )
      .addIntegerOption((option) =>
        option
          .setName('delete_days')
          .setDescription('Days of messages to delete (default: 7)')
          .setMinValue(1)
          .setMaxValue(7)
      );
  }

  private buildTempbanSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('tempban')
      .setDescription('Temporarily ban a member')
      .addStringOption((option) =>
        option
          .setName('duration')
          .setDescription('Ban duration (e.g., 1h, 1d, 7d)')
          .setRequired(true)
      )
      .addUserOption((option) =>
        option.setName('target').setDescription('The member to tempban (if in server)')
      )
      .addStringOption((option) =>
        option
          .setName('target_id')
          .setDescription('User ID to tempban (for users not in server)')
          .setMinLength(17)
          .setMaxLength(20)
      )
      .addStringOption((option) =>
        option.setName('reason').setDescription('Reason for the tempban').setMaxLength(512)
      )
      .addBooleanOption((option) =>
        option.setName('delete_messages').setDescription('Delete messages from the last 7 days')
      );
  }

  private buildPanelSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('panel')
      .setDescription('Open interactive mod panel for a user')
      .addUserOption((option) =>
        option.setName('target').setDescription('The user to moderate').setRequired(true)
      );
  }

  private buildContextSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('context')
      .setDescription('Get context bundle for a user')
      .addUserOption((option) =>
        option.setName('target').setDescription('The user to get context for').setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('window')
          .setDescription('Time window (e.g., 15m, 1h, 24h)')
          .addChoices(
            { name: '15 minutes', value: '15m' },
            { name: '1 hour', value: '1h' },
            { name: '6 hours', value: '6h' },
            { name: '24 hours', value: '24h' },
            { name: '7 days', value: '7d' }
          )
      );
  }

  private buildVoiceSubcommandGroup(group: SlashCommandSubcommandGroupBuilder) {
    return group
      .setName('voice')
      .setDescription('Voice channel monitoring commands')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('where')
          .setDescription('Check where a user is in voice')
          .addUserOption((option) =>
            option.setName('target').setDescription('The user to locate').setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('watch')
          .setDescription("Watch a user's voice activity in real-time")
          .addUserOption((option) =>
            option.setName('target').setDescription('The user to watch').setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName('duration')
              .setDescription('Watch duration (1m-15m, e.g., 5m, 10m)')
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('snapshot')
          .setDescription('Get a snapshot of members in a voice channel')
          .addChannelOption((option) =>
            option
              .setName('channel')
              .setDescription('The voice channel to snapshot')
              .setRequired(true)
              .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('track')
          .setDescription("Track a voice channel's activity in real-time")
          .addChannelOption((option) =>
            option
              .setName('channel')
              .setDescription('The voice channel to track')
              .setRequired(true)
              .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
          )
          .addStringOption((option) =>
            option
              .setName('duration')
              .setDescription('Track duration (1m-15m, e.g., 5m, 10m)')
              .setRequired(true)
          )
      );
  }

  private buildNoteSubcommandGroup(group: SlashCommandSubcommandGroupBuilder) {
    return group
      .setName('note')
      .setDescription('Manage moderator notes on users')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('add')
          .setDescription('Add a note to a user')
          .addUserOption((option) =>
            option.setName('target').setDescription('The user to add a note to').setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName('note')
              .setDescription('The note content')
              .setRequired(true)
              .setMaxLength(1000)
          )
          .addStringOption((option) =>
            option.setName('tags').setDescription('Comma-separated tags (e.g., "toxic,raid")')
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('list')
          .setDescription('List notes for a user')
          .addUserOption((option) =>
            option.setName('target').setDescription('The user to list notes for').setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('delete')
          .setDescription('Delete a note by ID')
          .addStringOption((option) =>
            option.setName('note_id').setDescription('The note ID to delete').setRequired(true)
          )
      );
  }

  private buildCaseModSubcommandGroup(group: SlashCommandSubcommandGroupBuilder) {
    return group
      .setName('casemod')
      .setDescription('Case management commands')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('edit')
          .setDescription('Edit a case reason')
          .addIntegerOption((option) =>
            option.setName('number').setDescription('Case number').setRequired(true).setMinValue(1)
          )
          .addStringOption((option) =>
            option
              .setName('reason')
              .setDescription('New reason')
              .setRequired(true)
              .setMaxLength(512)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('link')
          .setDescription('Link evidence to a case')
          .addIntegerOption((option) =>
            option.setName('number').setDescription('Case number').setRequired(true).setMinValue(1)
          )
          .addStringOption((option) =>
            option
              .setName('message_link')
              .setDescription('Message link to attach')
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('close')
          .setDescription('Close a case')
          .addIntegerOption((option) =>
            option.setName('number').setDescription('Case number').setRequired(true).setMinValue(1)
          )
          .addStringOption((option) =>
            option
              .setName('status')
              .setDescription('Close status')
              .addChoices(
                { name: 'Closed', value: 'CLOSED' },
                { name: 'Void (reversed)', value: 'VOID' }
              )
          )
      );
  }

  private buildEvidenceSubcommandGroup(group: SlashCommandSubcommandGroupBuilder) {
    return group
      .setName('evidence')
      .setDescription('Evidence management commands')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('add')
          .setDescription('Add evidence to a case (opens dashboard)')
          .addIntegerOption((option) =>
            option.setName('number').setDescription('Case number').setRequired(true).setMinValue(1)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('list')
          .setDescription('List evidence for a case')
          .addIntegerOption((option) =>
            option.setName('number').setDescription('Case number').setRequired(true).setMinValue(1)
          )
      );
  }

  private buildMutesSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('mutes')
      .setDescription('List active mutes')
      .addUserOption((option) =>
        option.setName('target').setDescription('Filter by user (optional)')
      )
      .addStringOption((option) =>
        option
          .setName('type')
          .setDescription('Filter by mute type')
          .addChoices(
            { name: 'Text', value: 'TEXT' },
            { name: 'Voice', value: 'VOICE' },
            { name: 'Both', value: 'BOTH' }
          )
      );
  }

  private buildMuteSubcommandGroup(group: SlashCommandSubcommandGroupBuilder) {
    return group
      .setName('mute')
      .setDescription('Mute a user (text, voice, or both)')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('text')
          .setDescription('Mute a user in text channels')
          .addUserOption((option) =>
            option.setName('target').setDescription('The user to mute').setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName('reason')
              .setDescription('Reason for the mute')
              .setRequired(true)
              .setMaxLength(512)
          )
          .addStringOption((option) =>
            option
              .setName('duration')
              .setDescription('Duration (e.g., 1h, 1d, 7d) - leave empty for permanent')
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('voice')
          .setDescription('Mute a user in voice channels (server deafen)')
          .addUserOption((option) =>
            option.setName('target').setDescription('The user to mute').setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName('reason')
              .setDescription('Reason for the mute')
              .setRequired(true)
              .setMaxLength(512)
          )
          .addStringOption((option) =>
            option
              .setName('duration')
              .setDescription('Duration (e.g., 1h, 1d, 7d) - leave empty for permanent')
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('both')
          .setDescription('Mute a user in both text and voice channels')
          .addUserOption((option) =>
            option.setName('target').setDescription('The user to mute').setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName('reason')
              .setDescription('Reason for the mute')
              .setRequired(true)
              .setMaxLength(512)
          )
          .addStringOption((option) =>
            option
              .setName('duration')
              .setDescription('Duration (e.g., 1h, 1d, 7d) - leave empty for permanent')
          )
      );
  }

  private buildUnmuteSubcommandGroup(group: SlashCommandSubcommandGroupBuilder) {
    return group
      .setName('unmute')
      .setDescription('Unmute a user')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('text')
          .setDescription('Remove text mute from a user')
          .addUserOption((option) =>
            option.setName('target').setDescription('The user to unmute').setRequired(true)
          )
          .addStringOption((option) =>
            option.setName('reason').setDescription('Reason for the unmute').setMaxLength(512)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('voice')
          .setDescription('Remove voice mute from a user')
          .addUserOption((option) =>
            option.setName('target').setDescription('The user to unmute').setRequired(true)
          )
          .addStringOption((option) =>
            option.setName('reason').setDescription('Reason for the unmute').setMaxLength(512)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('both')
          .setDescription('Remove all mutes from a user')
          .addUserOption((option) =>
            option.setName('target').setDescription('The user to unmute').setRequired(true)
          )
          .addStringOption((option) =>
            option.setName('reason').setDescription('Reason for the unmute').setMaxLength(512)
          )
      );
  }

  private buildSetupSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('setup')
      .setDescription('Interactive setup wizard for moderation settings (Admin only)');
  }

  public async chatInputBan(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleBan(interaction);
  }

  public async chatInputKick(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleKick(interaction);
  }

  public async chatInputTimeout(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleTimeout(interaction);
  }

  public async chatInputWarn(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleWarn(interaction);
  }

  public async chatInputUnban(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleUnban(interaction);
  }

  public async chatInputCase(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleCase(interaction);
  }

  public async chatInputHistory(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleHistory(interaction);
  }

  public async chatInputSoftban(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleSoftban(interaction);
  }

  public async chatInputTempban(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleTempban(interaction);
  }

  public async chatInputPanel(interaction: Subcommand.ChatInputCommandInteraction) {
    return handlePanel(interaction);
  }

  public async chatInputContext(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleContext(interaction);
  }

  // Voice subcommand handlers
  public async chatInputVoiceWhere(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleVoiceWhere(interaction);
  }

  public async chatInputVoiceWatch(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleVoiceWatch(interaction);
  }

  public async chatInputVoiceSnapshot(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleVoiceSnapshot(interaction);
  }

  public async chatInputVoiceTrack(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleVoiceTrack(interaction);
  }

  // Note subcommand handlers
  public async chatInputNoteAdd(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleNoteAdd(interaction);
  }

  public async chatInputNoteList(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleNoteList(interaction);
  }

  public async chatInputNoteDelete(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleNoteDelete(interaction);
  }

  // Case management subcommand handlers
  public async chatInputCaseEdit(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleCaseEdit(interaction);
  }

  public async chatInputCaseLink(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleCaseLink(interaction);
  }

  public async chatInputCaseClose(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleCaseClose(interaction);
  }

  // Evidence subcommand handlers
  public async chatInputEvidenceAdd(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleEvidenceAdd(interaction);
  }

  public async chatInputEvidenceList(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleEvidenceList(interaction);
  }

  // Mute subcommand handlers
  public async chatInputMuteText(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleMuteText(interaction);
  }

  public async chatInputMuteVoice(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleMuteVoice(interaction);
  }

  public async chatInputMuteBoth(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleMuteBoth(interaction);
  }

  // Unmute subcommand handlers
  public async chatInputUnmuteText(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleUnmuteText(interaction);
  }

  public async chatInputUnmuteVoice(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleUnmuteVoice(interaction);
  }

  public async chatInputUnmuteBoth(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleUnmuteBoth(interaction);
  }

  // Mutes list handler
  public async chatInputMutesList(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleMutesList(interaction);
  }

  // Setup handler
  public async chatInputSetup(interaction: Subcommand.ChatInputCommandInteraction) {
    return handleSetup(interaction);
  }
}
