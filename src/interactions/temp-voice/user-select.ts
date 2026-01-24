import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { UserSelectMenuInteraction, GuildMember, VoiceChannel } from 'discord.js';
import type { TempVoiceChannel } from '@prisma/client';
import { EMOJIS } from '#lib/emojis';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service';
import { TempVoiceConfigService } from '#modules/temp-voice/services/config.service';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service';
import { UserPreferencesService } from '#modules/temp-voice/services/user-preferences.service';

export class TempVoiceUserSelectHandler extends InteractionHandler {
  private channelService!: TempChannelService;
  private configService!: TempVoiceConfigService;
  private permissionsService!: PermissionsService;
  private userPrefsService!: UserPreferencesService;

  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }

  public override parse(interaction: UserSelectMenuInteraction) {
    if (
      !interaction.customId.startsWith('tempvoice_') ||
      !interaction.customId.includes('_select_')
    ) {
      return this.none();
    }

    return this.some();
  }

  public async run(interaction: UserSelectMenuInteraction) {
    if (!interaction.guild || !interaction.guildId) {
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} This command can only be used in a server.`,
        flags: 64, // Ephemeral
      });
    }

    const guild = interaction.guild;
    const guildId = interaction.guildId;

    // Initialize services lazily
    if (!this.channelService) {
      this.configService = new TempVoiceConfigService(this.container.prisma);
      this.permissionsService = new PermissionsService();
      this.channelService = new TempChannelService(this.container.prisma, this.permissionsService);
      this.userPrefsService = new UserPreferencesService(this.container.prisma);
    }

    // Parse customId: tempvoice_<action>_select_<channelId>
    const parts = interaction.customId.split('_');
    const action = parts[1]; // permit, deny, kick
    const channelId = parts[3];
    if (!channelId) {
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} Invalid user select interaction.`,
        flags: 64, // Ephemeral
      });
    }

    // Get temp channel
    const tempChannel = await this.channelService.getByChannelId(channelId);
    if (!tempChannel) {
      try {
        return await interaction.update({
          content: `${EMOJIS.STATUS.ERROR} This temporary voice channel no longer exists.`,
          components: [],
        });
      } catch {
        return interaction.reply({
          content: `${EMOJIS.STATUS.ERROR} This temporary voice channel no longer exists.`,
          flags: 64, // Ephemeral
        });
      }
    }

    // Check permissions
    const config = await this.configService.get(guildId);
    const member = interaction.member as GuildMember;
    const trustedUserIds = Array.isArray(tempChannel.trustedUserIds)
      ? (tempChannel.trustedUserIds as string[])
      : [];
    const canManage = this.permissionsService.canManageChannel(
      member.user.id,
      tempChannel.ownerId,
      config.adminRoleIds || [],
      member.roles.cache?.map((r) => r.id) || [],
      member.permissions?.has('Administrator') || false,
      trustedUserIds
    );
    if (!canManage) {
      try {
        return await interaction.update({
          content: `${EMOJIS.STATUS.ERROR} You do not have permission to manage this channel.`,
          components: [],
        });
      } catch {
        return interaction.reply({
          content: `${EMOJIS.STATUS.ERROR} You do not have permission to manage this channel.`,
          flags: 64, // Ephemeral
        });
      }
    }

    // Get selected users
    const selectedUsers = interaction.values;

    // Route to appropriate handler
    switch (action) {
      case 'permit':
        return this.handlePermit(
          interaction,
          tempChannel,
          channelId,
          selectedUsers,
          guild,
          guildId
        );
      case 'deny':
        return this.handleDeny(interaction, tempChannel, channelId, selectedUsers, guild, guildId);
      case 'trust':
        return this.handleTrust(interaction, tempChannel, channelId, selectedUsers, guild, guildId);

      case 'transfer':
        return this.handleTransfer(interaction, tempChannel, channelId, selectedUsers, guild);
      default:
        try {
          return await interaction.update({
            content: `${EMOJIS.STATUS.ERROR} Unknown action.`,
            components: [],
          });
        } catch {
          return interaction.reply({
            content: `${EMOJIS.STATUS.ERROR} Unknown action.`,
            flags: 64, // Ephemeral
          });
        }
    }
  }

  private async handlePermit(
    interaction: UserSelectMenuInteraction,
    tempChannel: TempVoiceChannel,
    channelId: string,
    userIds: string[],
    guild: NonNullable<typeof interaction.guild>,
    guildId: string
  ) {
    try {
      // Defer the update to prevent interaction timeout
      await interaction.deferUpdate();

      const voiceChannel = (await guild.channels.fetch(channelId)) as VoiceChannel;
      if (!voiceChannel || !voiceChannel.isVoiceBased()) {
        return interaction.editReply({
          content: `${EMOJIS.STATUS.ERROR} Voice channel not found.`,
          components: [],
        });
      }

      // Add permissions for each user
      for (const userId of userIds) {
        await voiceChannel.permissionOverwrites.edit(userId, {
          Connect: true,
          ViewChannel: true,
        });
      }

      // Update database - remove from denied list and add to allowed list
      const currentAllowed = Array.isArray(tempChannel.allowedUserIds)
        ? (tempChannel.allowedUserIds as string[])
        : [];
      const currentDenied = Array.isArray(tempChannel.deniedUserIds)
        ? (tempChannel.deniedUserIds as string[])
        : [];

      const newAllowed = [...new Set([...currentAllowed, ...userIds])];
      const newDenied = currentDenied.filter((id) => !userIds.includes(id)); // Remove from denied

      await this.channelService.update(channelId, {
        allowedUserIds: newAllowed,
        deniedUserIds: newDenied,
      });

      // Save to user preferences if customization is allowed
      const config = await this.configService.get(guildId);
      if (config.allowCustomization) {
        await this.userPrefsService.save(guildId, tempChannel.ownerId, {
          allowedUserIds: newAllowed,
          deniedUserIds: newDenied,
        });
      }

      const userMentions = userIds.map((id) => `<@${id}>`).join(', ');

      // Refresh control panel
      await this.container.client.emit('tempVoiceRefresh', channelId);
      const controlPanelService = new (
        await import('#modules/temp-voice/services/control-panel.service')
      ).ControlPanelService(this.container.client, this.channelService);
      await controlPanelService.refresh(channelId);

      return interaction.editReply({
        content: `${EMOJIS.STATUS.SUCCESS} Permitted ${userMentions} to access this channel.`,
        components: [],
      });
    } catch (error) {
      this.container.logger.error('Failed to permit users:', error);
      if (!interaction.deferred) {
        return interaction.update({
          content: `${EMOJIS.STATUS.ERROR} Failed to permit users. Make sure the bot has permission to manage this channel.`,
          components: [],
        });
      }
      return interaction.editReply({
        content: `${EMOJIS.STATUS.ERROR} Failed to permit users. Make sure the bot has permission to manage this channel.`,
        components: [],
      });
    }
  }

  private async handleDeny(
    interaction: UserSelectMenuInteraction,
    tempChannel: TempVoiceChannel,
    channelId: string,
    userIds: string[],
    guild: NonNullable<typeof interaction.guild>,
    guildId: string
  ) {
    try {
      // Defer the update to prevent interaction timeout
      await interaction.deferUpdate();

      const voiceChannel = (await guild.channels.fetch(channelId)) as VoiceChannel;
      if (!voiceChannel || !voiceChannel.isVoiceBased()) {
        return interaction.editReply({
          content: `${EMOJIS.STATUS.ERROR} Voice channel not found.`,
          components: [],
        });
      }

      // Add deny permissions for each user
      for (const userId of userIds) {
        // Don't allow denying the owner
        if (userId === tempChannel.ownerId) {
          continue;
        }

        await voiceChannel.permissionOverwrites.edit(userId, {
          Connect: false,
          ViewChannel: false,
        });

        // Kick them if they're in the channel
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member && member.voice.channelId === channelId) {
          await member.voice.disconnect('Denied access to temporary voice channel');
        }
      }

      // Update database - remove from allowed and trusted lists, add to denied list
      const currentDenied = Array.isArray(tempChannel.deniedUserIds)
        ? (tempChannel.deniedUserIds as string[])
        : [];
      const currentAllowed = Array.isArray(tempChannel.allowedUserIds)
        ? (tempChannel.allowedUserIds as string[])
        : [];
      const currentTrusted = Array.isArray(tempChannel.trustedUserIds)
        ? (tempChannel.trustedUserIds as string[])
        : [];

      const validUserIds = userIds.filter((id) => id !== tempChannel.ownerId);
      const newDenied = [...new Set([...currentDenied, ...validUserIds])];
      const newAllowed = currentAllowed.filter((id) => !validUserIds.includes(id)); // Remove from allowed
      const newTrusted = currentTrusted.filter((id) => !validUserIds.includes(id)); // Remove from trusted

      await this.channelService.update(channelId, {
        deniedUserIds: newDenied,
        allowedUserIds: newAllowed,
        trustedUserIds: newTrusted,
      });

      // Save to user preferences if customization is allowed
      const config = await this.configService.get(guildId);
      if (config.allowCustomization) {
        await this.userPrefsService.save(guildId, tempChannel.ownerId, {
          deniedUserIds: newDenied,
          allowedUserIds: newAllowed,
          trustedUserIds: newTrusted,
        });
      }

      const userMentions = userIds
        .filter((id) => id !== tempChannel.ownerId)
        .map((id) => `<@${id}>`)
        .join(', ');

      // Refresh control panel
      const controlPanelService = new (
        await import('#modules/temp-voice/services/control-panel.service')
      ).ControlPanelService(this.container.client, this.channelService);
      await controlPanelService.refresh(channelId);

      return interaction.editReply({
        content: userMentions
          ? `${EMOJIS.STATUS.SUCCESS} Denied ${userMentions} access to this channel.`
          : `${EMOJIS.STATUS.WARNING} Cannot deny the channel owner.`,
        components: [],
      });
    } catch (error) {
      this.container.logger.error('Failed to deny users:', error);
      if (!interaction.deferred) {
        return interaction.update({
          content: `${EMOJIS.STATUS.ERROR} Failed to deny users. Make sure the bot has permission to manage this channel.`,
          components: [],
        });
      }
      return interaction.editReply({
        content: `${EMOJIS.STATUS.ERROR} Failed to deny users. Make sure the bot has permission to manage this channel.`,
        components: [],
      });
    }
  }

  private async handleTrust(
    interaction: UserSelectMenuInteraction,
    tempChannel: TempVoiceChannel,
    channelId: string,
    userIds: string[],
    guild: NonNullable<typeof interaction.guild>,
    guildId: string
  ) {
    try {
      // Defer the update to prevent interaction timeout
      await interaction.deferUpdate();

      const voiceChannel = (await guild.channels.fetch(channelId)) as VoiceChannel;
      if (!voiceChannel || !voiceChannel.isVoiceBased()) {
        return interaction.editReply({
          content: `${EMOJIS.STATUS.ERROR} Voice channel not found.`,
          components: [],
        });
      }

      const currentTrusted = Array.isArray(tempChannel.trustedUserIds)
        ? (tempChannel.trustedUserIds as string[])
        : [];
      const currentAllowed = Array.isArray(tempChannel.allowedUserIds)
        ? (tempChannel.allowedUserIds as string[])
        : [];
      const currentDenied = Array.isArray(tempChannel.deniedUserIds)
        ? (tempChannel.deniedUserIds as string[])
        : [];

      const validUserIds = userIds.filter((id) => id !== tempChannel.ownerId);

      // Separate users to add and remove based on current trust status
      const usersToAdd: string[] = [];
      const usersToRemove: string[] = [];

      for (const userId of validUserIds) {
        if (currentTrusted.includes(userId)) {
          usersToRemove.push(userId);
        } else {
          usersToAdd.push(userId);
        }
      }

      // Add trusted users permissions
      for (const userId of usersToAdd) {
        await voiceChannel.permissionOverwrites.edit(userId, {
          Connect: true,
          ViewChannel: true,
          Speak: true,
          Stream: true,
          UseVAD: true,
        });
      }

      // Remove trusted users permissions (but keep them as allowed users)
      for (const userId of usersToRemove) {
        await voiceChannel.permissionOverwrites.edit(userId, {
          Connect: true,
          ViewChannel: true,
          Speak: null,
          Stream: null,
          UseVAD: null,
        });
      }

      // Update database
      const newTrusted = currentTrusted.filter((id) => !usersToRemove.includes(id));
      newTrusted.push(...usersToAdd);

      const newAllowed = [...new Set([...currentAllowed, ...usersToAdd])]; // Trusted users must be allowed
      const newDenied = currentDenied.filter((id) => !usersToAdd.includes(id)); // Remove from denied

      await this.channelService.update(channelId, {
        trustedUserIds: newTrusted,
        allowedUserIds: newAllowed,
        deniedUserIds: newDenied,
      });

      // Save to user preferences if customization is allowed
      const config = await this.configService.get(guildId);
      if (config.allowCustomization) {
        await this.userPrefsService.save(guildId, tempChannel.ownerId, {
          trustedUserIds: newTrusted,
          allowedUserIds: newAllowed,
          deniedUserIds: newDenied,
        });
      }

      // Build response message
      const addedMentions = usersToAdd.map((id) => `<@${id}>`).join(', ');
      const removedMentions = usersToRemove.map((id) => `<@${id}>`).join(', ');

      let message = '';
      if (addedMentions) {
        message += `${EMOJIS.STATUS.SUCCESS} Trusted ${addedMentions}. They can now manage this channel (except transfer ownership).`;
      }
      if (removedMentions) {
        if (message) message += '\n';
        message += `➖ Removed trust from ${removedMentions}.`;
      }
      if (!message) {
        message = `${EMOJIS.STATUS.WARNING} The channel owner is already trusted.`;
      }

      // Refresh control panel
      const controlPanelService = new (
        await import('#modules/temp-voice/services/control-panel.service')
      ).ControlPanelService(this.container.client, this.channelService);
      await controlPanelService.refresh(channelId);

      return interaction.editReply({
        content: message,
        components: [],
      });
    } catch (error) {
      this.container.logger.error('Failed to manage trusted users:', error);
      if (!interaction.deferred) {
        return interaction.update({
          content: `${EMOJIS.STATUS.ERROR} Failed to manage trusted users. Make sure the bot has permission to manage this channel.`,
          components: [],
        });
      }
      return interaction.editReply({
        content: `${EMOJIS.STATUS.ERROR} Failed to manage trusted users. Make sure the bot has permission to manage this channel.`,
        components: [],
      });
    }
  }

  private async handleTransfer(
    interaction: UserSelectMenuInteraction,
    tempChannel: TempVoiceChannel,
    channelId: string,
    userIds: string[],
    guild: NonNullable<typeof interaction.guild>
  ) {
    try {
      // Defer the update to prevent interaction timeout
      await interaction.deferUpdate();

      // Only allow one user to be selected
      if (userIds.length !== 1) {
        return interaction.editReply({
          content: `${EMOJIS.STATUS.ERROR} You can only transfer ownership to one user.`,
          components: [],
        });
      }

      const newOwnerId = userIds[0];
      if (!newOwnerId) {
        return interaction.editReply({
          content: `${EMOJIS.STATUS.ERROR} Invalid user selection.`,
          components: [],
        });
      }

      // Check if trying to transfer to current owner
      if (newOwnerId === tempChannel.ownerId) {
        return interaction.editReply({
          content: `${EMOJIS.STATUS.ERROR} This user is already the owner.`,
          components: [],
        });
      }

      // Check if the interaction user is the owner (only owner can transfer)
      const member = interaction.member as GuildMember;
      if (member.user.id !== tempChannel.ownerId) {
        return interaction.editReply({
          content: `${EMOJIS.STATUS.ERROR} Only the channel owner can transfer ownership.`,
          components: [],
        });
      }

      const voiceChannel = (await guild.channels.fetch(channelId)) as VoiceChannel;
      if (!voiceChannel || !voiceChannel.isVoiceBased()) {
        return interaction.editReply({
          content: `${EMOJIS.STATUS.ERROR} Voice channel not found.`,
          components: [],
        });
      }

      // Check if new owner is in the channel
      const newOwnerMember = await guild.members.fetch(newOwnerId).catch(() => null);
      if (!newOwnerMember || newOwnerMember.voice.channelId !== channelId) {
        return interaction.editReply({
          content: `${EMOJIS.STATUS.ERROR} The new owner must be in your channel.`,
          components: [],
        });
      }

      // Update permissions - give new owner full permissions
      await voiceChannel.permissionOverwrites.edit(newOwnerId, {
        Connect: true,
        Speak: true,
        MoveMembers: true,
        ManageChannels: true,
        ViewChannel: true,
      });

      // Remove old owner's special permissions
      await voiceChannel.permissionOverwrites.delete(tempChannel.ownerId);

      // Update database
      await this.channelService.update(channelId, { ownerId: newOwnerId });

      // Refresh control panel
      const controlPanelService = new (
        await import('#modules/temp-voice/services/control-panel.service')
      ).ControlPanelService(this.container.client, this.channelService);
      await controlPanelService.refresh(channelId);

      return interaction.editReply({
        content: `${EMOJIS.STATUS.SUCCESS} Channel ownership transferred to <@${newOwnerId}>.`,
        components: [],
      });
    } catch (error) {
      this.container.logger.error('Failed to transfer ownership:', error);
      if (!interaction.deferred) {
        return interaction.update({
          content: `${EMOJIS.STATUS.ERROR} Failed to transfer ownership. Please try again.`,
          components: [],
        });
      }
      return interaction.editReply({
        content: `${EMOJIS.STATUS.ERROR} Failed to transfer ownership. Please try again.`,
        components: [],
      });
    }
  }
}
