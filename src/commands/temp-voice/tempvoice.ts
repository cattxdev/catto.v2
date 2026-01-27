import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, VoiceChannel, type GuildMember } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service.js';
import { TempVoiceConfigService } from '#modules/temp-voice/services/config.service.js';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service.js';
import { ControlPanelService } from '#modules/temp-voice/services/control-panel.service.js';
import { TempVoiceChannel } from '@prisma/client';

@ApplyOptions<Command.Options>({
  name: 'voice',
  description: 'Manage your temporary voice channel',
  requiredUserPermissions: [],
  preconditions: ['GuildOnly'],
})
export class TempVoiceCommand extends Command {
  private channelService!: TempChannelService;
  private configService!: TempVoiceConfigService;
  private permissionsService!: PermissionsService;
  private controlPanelService!: ControlPanelService;

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
          subcommand
            .setName('rename')
            .setDescription('Rename your temporary voice channel')
            .addStringOption((option) =>
              option
                .setName('name')
                .setDescription('New channel name')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(100)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('limit')
            .setDescription('Set the user limit for your channel')
            .addIntegerOption((option) =>
              option
                .setName('limit')
                .setDescription('User limit (0 for unlimited, max 99)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(99)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('lock')
            .setDescription('Lock your channel (only allowed users can join)')
        )
        .addSubcommand((subcommand) =>
          subcommand.setName('unlock').setDescription('Unlock your channel')
        )
        .addSubcommand((subcommand) =>
          subcommand.setName('hide').setDescription('Hide your channel from @everyone')
        )
        .addSubcommand((subcommand) =>
          subcommand.setName('show').setDescription('Make your channel visible to @everyone')
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('permit')
            .setDescription('Allow a user to join your locked/hidden channel')
            .addUserOption((option) =>
              option.setName('user').setDescription('User to permit').setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('deny')
            .setDescription('Deny a user from joining your channel')
            .addUserOption((option) =>
              option.setName('user').setDescription('User to deny').setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('trust')
            .setDescription('Trust a user to help manage your channel')
            .addUserOption((option) =>
              option.setName('user').setDescription('User to trust').setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('untrust')
            .setDescription('Remove trust from a user')
            .addUserOption((option) =>
              option.setName('user').setDescription('User to untrust').setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('kick')
            .setDescription('Kick a user from your channel')
            .addUserOption((option) =>
              option.setName('user').setDescription('User to kick').setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('transfer')
            .setDescription('Transfer ownership of your channel to another user')
            .addUserOption((option) =>
              option.setName('user').setDescription('New owner').setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('bitrate')
            .setDescription('Set the bitrate for your channel')
            .addIntegerOption((option) =>
              option
                .setName('bitrate')
                .setDescription('Bitrate in kbps (8-384)')
                .setRequired(true)
                .setMinValue(8)
                .setMaxValue(384)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('region')
            .setDescription('Set the region for your channel')
            .addStringOption((option) =>
              option
                .setName('region')
                .setDescription('Voice region')
                .setRequired(true)
                .addChoices(
                  { name: 'Automatic', value: 'auto' },
                  { name: 'Brazil', value: 'brazil' },
                  { name: 'Hong Kong', value: 'hongkong' },
                  { name: 'India', value: 'india' },
                  { name: 'Japan', value: 'japan' },
                  { name: 'Rotterdam', value: 'rotterdam' },
                  { name: 'Russia', value: 'russia' },
                  { name: 'Singapore', value: 'singapore' },
                  { name: 'South Africa', value: 'southafrica' },
                  { name: 'Sydney', value: 'sydney' },
                  { name: 'US Central', value: 'us-central' },
                  { name: 'US East', value: 'us-east' },
                  { name: 'US South', value: 'us-south' },
                  { name: 'US West', value: 'us-west' }
                )
            )
        )
        .addSubcommand((subcommand) =>
          subcommand.setName('reset').setDescription('Reset your channel to default settings')
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('claim')
            .setDescription('Claim ownership of an abandoned temporary channel')
        )
        .addSubcommand((subcommand) =>
          subcommand.setName('panel').setDescription('Show the control panel for your channel')
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} This command can only be used in a server.`,
        ephemeral: true,
      });
    }

    const guildId = interaction.guild.id;

    // Initialize services lazily
    if (!this.channelService) {
      this.configService = new TempVoiceConfigService(this.container.prisma, this.container.client);
      this.permissionsService = new PermissionsService();
      this.channelService = new TempChannelService(this.container.prisma, this.permissionsService);
      this.controlPanelService = new ControlPanelService(
        this.container.client,
        this.channelService
      );
    }

    const subcommand = interaction.options.getSubcommand();
    const member = interaction.member as GuildMember;

    // Get member's voice channel
    const voiceChannel = member.voice.channel;
    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} You must be in a voice channel to use this command.`,
        ephemeral: true,
      });
    }

    // Check if it's a temp voice channel
    const tempChannel = await this.channelService.getByChannelId(voiceChannel.id);
    if (!tempChannel) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} This is not a temporary voice channel.`,
        ephemeral: true,
      });
    }

    // Check permissions (except for claim)
    if (subcommand !== 'claim') {
      const config = await this.configService.get(guildId);
      const canManage = this.permissionsService.canManageChannel(
        member.id,
        tempChannel.ownerId,
        config.adminRoleIds || [],
        member.roles.cache.map((r) => r.id),
        member.permissions.has('Administrator'),
        (tempChannel.trustedUserIds as string[]) || []
      );
      if (!canManage) {
        return interaction.reply({
          content: `${EMOJI.STATUS.ERROR} You do not have permission to manage this channel.`,
          ephemeral: true,
        });
      }

      // Check if customization is allowed (except for panel/claim/transfer which are always allowed)
      if (!config.allowCustomization && !['panel', 'claim', 'transfer'].includes(subcommand)) {
        return interaction.reply({
          content: `${EMOJI.STATUS.ERROR} Channel customization is disabled in this server.`,
          ephemeral: true,
        });
      }
    }

    // Route to appropriate handler
    switch (subcommand) {
      case 'rename':
        return this.handleRename(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'limit':
        return this.handleLimit(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'lock':
        return this.handleLock(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'unlock':
        return this.handleUnlock(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'hide':
        return this.handleHide(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'show':
        return this.handleShow(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'permit':
        return this.handlePermit(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'deny':
        return this.handleDeny(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'trust':
        return this.handleTrust(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'untrust':
        return this.handleUntrust(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'kick':
        return this.handleKick(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'transfer':
        return this.handleTransfer(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'bitrate':
        return this.handleBitrate(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'region':
        return this.handleRegion(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'reset':
        return this.handleReset(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'claim':
        return this.handleClaim(interaction, tempChannel, voiceChannel as VoiceChannel);
      case 'panel':
        return this.handlePanel(interaction, tempChannel, voiceChannel as VoiceChannel);
      default:
        return interaction.reply({
          content: `${EMOJI.STATUS.ERROR} Unknown subcommand.`,
          ephemeral: true,
        });
    }
  }

  private async handleRename(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    const newName = interaction.options.getString('name', true);

    try {
      await voiceChannel.setName(newName);
      await this.channelService.update(tempChannel.channelId, { customName: newName });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} Channel renamed to **${newName}**`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to rename temp voice channel:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to rename channel. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleLimit(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    const limit = interaction.options.getInteger('limit', true);

    try {
      await voiceChannel.setUserLimit(limit);
      await this.channelService.update(tempChannel.channelId, { customUserLimit: limit });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} User limit set to **${limit === 0 ? 'unlimited' : limit}**`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to set user limit:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to set user limit. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleLock(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    try {
      await voiceChannel.permissionOverwrites.edit(voiceChannel.guild.roles.everyone, {
        Connect: false,
      });
      await this.channelService.update(tempChannel.channelId, { isLocked: true });

      return interaction.reply({
        content: `${EMOJI.CHANNELS.STATE.LOCKED} Channel locked. Only permitted users can join.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to lock channel:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to lock channel. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleUnlock(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    try {
      await voiceChannel.permissionOverwrites.edit(voiceChannel.guild.roles.everyone, {
        Connect: null,
      });
      await this.channelService.update(tempChannel.channelId, { isLocked: false });

      return interaction.reply({
        content: `${EMOJI.CHANNELS.STATE.UNLOCKED} Channel unlocked.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to unlock channel:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to unlock channel. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleHide(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    try {
      await voiceChannel.permissionOverwrites.edit(voiceChannel.guild.roles.everyone, {
        ViewChannel: false,
      });
      await this.channelService.update(tempChannel.channelId, { isHidden: true });

      return interaction.reply({
        content: `${EMOJI.UI.INDICATORS.HIDDEN} Channel hidden from @everyone.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to hide channel:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to hide channel. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleShow(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    try {
      await voiceChannel.permissionOverwrites.edit(voiceChannel.guild.roles.everyone, {
        ViewChannel: null,
      });
      await this.channelService.update(tempChannel.channelId, { isHidden: false });

      return interaction.reply({
        content: `${EMOJI.UI.INDICATORS.VISIBILITY} Channel is now visible to @everyone.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to show channel:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to show channel. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handlePermit(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    const user = interaction.options.getUser('user', true);

    try {
      await voiceChannel.permissionOverwrites.edit(user.id, {
        Connect: true,
        ViewChannel: true,
      });

      // Update allowed users list
      const allowedUsers = (tempChannel.allowedUserIds as string[]) || [];
      if (!allowedUsers.includes(user.id)) {
        allowedUsers.push(user.id);
        await this.channelService.update(tempChannel.channelId, { allowedUserIds: allowedUsers });
      }

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} **${user.tag}** can now join your channel.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to permit user:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to permit user. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleDeny(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    const user = interaction.options.getUser('user', true);

    if (user.id === tempChannel.ownerId) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} You cannot deny the channel owner.`,
        ephemeral: true,
      });
    }

    try {
      await voiceChannel.permissionOverwrites.edit(user.id, {
        Connect: false,
        ViewChannel: false,
      });

      // Kick user if they're currently in the channel
      const member = voiceChannel.guild.members.cache.get(user.id);
      if (member && member.voice.channelId === voiceChannel.id) {
        await member.voice.disconnect('Denied access to temporary voice channel');
      }

      // Update denied users list
      const deniedUsers = (tempChannel.deniedUserIds as string[]) || [];
      if (!deniedUsers.includes(user.id)) {
        deniedUsers.push(user.id);
      }

      // Remove from allowed users if present
      const allowedUsers = (tempChannel.allowedUserIds as string[]) || [];
      const filteredAllowed = allowedUsers.filter((id: string) => id !== user.id);

      // Remove from trusted users if present
      const trustedUsers = (tempChannel.trustedUserIds as string[]) || [];
      const filteredTrusted = trustedUsers.filter((id: string) => id !== user.id);

      await this.channelService.update(tempChannel.channelId, {
        deniedUserIds: deniedUsers,
        allowedUserIds: filteredAllowed,
        trustedUserIds: filteredTrusted,
      });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} **${user.tag}** has been denied access to your channel.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to deny user:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to deny user. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleTrust(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    const user = interaction.options.getUser('user', true);

    if (user.id === tempChannel.ownerId) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} The channel owner is already trusted.`,
        ephemeral: true,
      });
    }

    try {
      const currentTrusted = (tempChannel.trustedUserIds as string[]) || [];

      if (currentTrusted.includes(user.id)) {
        return interaction.reply({
          content: `${EMOJI.STATUS.ERROR} **${user.tag}** is already trusted.`,
          ephemeral: true,
        });
      }

      // Give trusted user permissions
      await voiceChannel.permissionOverwrites.edit(user.id, {
        Connect: true,
        ViewChannel: true,
        Speak: true,
        Stream: true,
        UseVAD: true,
      });

      // Update trusted users list
      const newTrusted = [...currentTrusted, user.id];

      // Also add to allowed users and remove from denied
      const allowedUsers = (tempChannel.allowedUserIds as string[]) || [];
      const newAllowed = [...new Set([...allowedUsers, user.id])];

      const deniedUsers = (tempChannel.deniedUserIds as string[]) || [];
      const newDenied = deniedUsers.filter((id: string) => id !== user.id);

      await this.channelService.update(tempChannel.channelId, {
        trustedUserIds: newTrusted,
        allowedUserIds: newAllowed,
        deniedUserIds: newDenied,
      });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} **${user.tag}** is now trusted and can help manage this channel (except transfer ownership).`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to trust user:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to trust user. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleUntrust(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    const user = interaction.options.getUser('user', true);

    if (user.id === tempChannel.ownerId) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} The channel owner cannot be untrusted.`,
        ephemeral: true,
      });
    }

    try {
      const currentTrusted = (tempChannel.trustedUserIds as string[]) || [];

      if (!currentTrusted.includes(user.id)) {
        return interaction.reply({
          content: `${EMOJI.STATUS.ERROR} **${user.tag}** is not trusted.`,
          ephemeral: true,
        });
      }

      // Remove trusted users list entry
      const newTrusted = currentTrusted.filter((id: string) => id !== user.id);

      await this.channelService.update(tempChannel.channelId, {
        trustedUserIds: newTrusted,
      });

      // Remove permission overrides to respect channel state
      // If user is in allowed list, they'll keep access via those permissions
      const allowedUsers = (tempChannel.allowedUserIds as string[]) || [];
      const deniedUsers = (tempChannel.deniedUserIds as string[]) || [];

      if (!allowedUsers.includes(user.id) && !deniedUsers.includes(user.id)) {
        // No explicit allow/deny, so remove the override entirely
        await voiceChannel.permissionOverwrites.delete(user.id);
      } else if (allowedUsers.includes(user.id)) {
        // Keep as allowed user with basic permissions
        await voiceChannel.permissionOverwrites.edit(user.id, {
          Connect: true,
          ViewChannel: true,
        });
      }
      // If in denied list, permissions are already set correctly

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} **${user.tag}** is no longer trusted but can still access the channel.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to untrust user:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to untrust user. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleKick(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    const user = interaction.options.getUser('user', true);
    const member = voiceChannel.guild.members.cache.get(user.id);

    if (!member) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} User not found in the server.`,
        ephemeral: true,
      });
    }

    if (user.id === tempChannel.ownerId) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} You cannot kick the channel owner.`,
        ephemeral: true,
      });
    }

    if (member.voice.channelId !== voiceChannel.id) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} User is not in your channel.`,
        ephemeral: true,
      });
    }

    try {
      await member.voice.disconnect('Kicked from temporary voice channel');

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} **${user.tag}** has been kicked from your channel.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to kick user:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to kick user. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleTransfer(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    const user = interaction.options.getUser('user', true);
    const member = voiceChannel.guild.members.cache.get(user.id);

    if (!member) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} User not found in the server.`,
        ephemeral: true,
      });
    }

    if (user.id === tempChannel.ownerId) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} This user is already the owner.`,
        ephemeral: true,
      });
    }

    if (member.voice.channelId !== voiceChannel.id) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} The new owner must be in your channel.`,
        ephemeral: true,
      });
    }

    try {
      // Update permissions
      const oldOwnerId = tempChannel.ownerId;
      await voiceChannel.permissionOverwrites.edit(user.id, {
        Connect: true,
        Speak: true,
        MoveMembers: true,
        ManageChannels: true,
      });

      // Remove old owner's special permissions
      await voiceChannel.permissionOverwrites.delete(oldOwnerId);

      // Update database
      await this.channelService.update(tempChannel.channelId, { ownerId: user.id });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} Channel ownership transferred to **${user.tag}**.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to transfer ownership:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to transfer ownership. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleBitrate(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    const bitrate = interaction.options.getInteger('bitrate', true) * 1000; // Convert to bps

    // Validate bitrate based on guild boost level
    const bitrateValidation = this.permissionsService.validateBitrate(
      bitrate,
      voiceChannel.guild.premiumTier
    );
    if (!bitrateValidation.valid) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Maximum bitrate for this server is **${bitrateValidation.maxAllowed / 1000}kbps** based on boost level.`,
        ephemeral: true,
      });
    }

    try {
      await voiceChannel.setBitrate(bitrate);
      await this.channelService.update(tempChannel.channelId, { customBitrate: bitrate });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} Bitrate set to **${bitrate / 1000}kbps**`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to set bitrate:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to set bitrate. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleRegion(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    const region = interaction.options.getString('region', true);
    const rtcRegion = region === 'auto' ? null : region;

    try {
      await voiceChannel.setRTCRegion(rtcRegion);
      await this.channelService.update(tempChannel.channelId, {
        customRegion: rtcRegion || 'auto',
      });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} Region set to **${region}**`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to set region:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to set region. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleReset(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    try {
      // Get guild config for defaults
      const config = await this.configService.get(voiceChannel.guildId);

      // Reset Discord channel settings
      await voiceChannel.edit({
        userLimit: config.defaultUserLimit,
        bitrate: config.defaultBitrate ?? undefined,
        rtcRegion: config.defaultRegion || undefined,
      });

      // Reset permissions to default
      await voiceChannel.permissionOverwrites.set(
        this.permissionsService.buildOverwrites({
          ownerId: tempChannel.ownerId,
          guildId: voiceChannel.guildId,
          isLocked: config.defaultLocked,
          isHidden: config.defaultHidden,
          allowedUserIds: [],
          deniedUserIds: [],
          trustedUserIds: [],
        })
      );

      // Reset database
      await this.channelService.update(tempChannel.channelId, {
        isLocked: config.defaultLocked,
        isHidden: config.defaultHidden,
        customUserLimit: config.defaultUserLimit,
        customBitrate: config.defaultBitrate ?? undefined,
        customRegion: config.defaultRegion || 'auto',
        allowedUserIds: [],
        deniedUserIds: [],
      });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} Channel reset to default settings.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to reset channel:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to reset channel. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handleClaim(
    interaction: Command.ChatInputCommandInteraction,
    tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    const member = interaction.member as GuildMember;

    // Check if owner is still in the channel
    const owner = voiceChannel.members.get(tempChannel.ownerId);
    if (owner) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} The channel owner is still present. You cannot claim this channel.`,
        ephemeral: true,
      });
    }

    try {
      const oldOwnerId = tempChannel.ownerId;

      // Remove old owner's special permissions
      await voiceChannel.permissionOverwrites.delete(oldOwnerId);

      // Give new owner management permissions
      await voiceChannel.permissionOverwrites.edit(member.id, {
        Connect: true,
        ViewChannel: true,
        Speak: true,
        Stream: true,
        MoveMembers: true,
        ManageChannels: true,
      });

      // Update database
      await this.channelService.update(tempChannel.channelId, { ownerId: member.id });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} You are now the owner of this channel.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to claim channel:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to claim channel. Please try again.`,
        ephemeral: true,
      });
    }
  }

  private async handlePanel(
    interaction: Command.ChatInputCommandInteraction,
    _tempChannel: TempVoiceChannel,
    voiceChannel: VoiceChannel
  ) {
    try {
      const member = interaction.member as GuildMember;
      await this.controlPanelService.send(voiceChannel.id, member);

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} Control panel sent to your channel.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to send control panel:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to send control panel. Please try again.`,
        ephemeral: true,
      });
    }
  }
}
