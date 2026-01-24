import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ModalSubmitInteraction, GuildMember, Role } from 'discord.js';
import { MessageFlags, VoiceChannel } from 'discord.js';
import { EMOJIS } from '#lib/emojis';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service';
import { TempVoiceConfigService } from '#modules/temp-voice/services/config.service';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service';
import { ControlPanelService } from '#modules/temp-voice/services/control-panel.service';
import { UserPreferencesService } from '#modules/temp-voice/services/user-preferences.service';

export class TempVoiceModalHandler extends InteractionHandler {
  private channelService!: TempChannelService;
  private configService!: TempVoiceConfigService;
  private permissionsService!: PermissionsService;
  private controlPanelService!: ControlPanelService;
  private userPrefsService!: UserPreferencesService;

  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (!interaction.customId.startsWith('tempvoice_')) return this.none();

    return this.some();
  }

  public async run(interaction: ModalSubmitInteraction) {
    if (!interaction.guild || !interaction.guildId) {
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} This command can only be used in a server.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const guild = interaction.guild;
    const guildId = interaction.guildId;

    // Initialize services lazily
    if (!this.channelService) {
      this.configService = new TempVoiceConfigService(this.container.prisma);
      this.permissionsService = new PermissionsService();
      this.channelService = new TempChannelService(this.container.prisma, this.permissionsService);
      this.controlPanelService = new ControlPanelService(
        this.container.client,
        this.channelService
      );
      this.userPrefsService = new UserPreferencesService(this.container.prisma);
    }

    // Parse modal customId: tempvoice_<action>_modal_<channelId>
    const parts = interaction.customId.split('_');
    const action = parts[1];
    const channelId = parts[3];
    if (!channelId) {
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} Invalid modal interaction.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Get temp channel
    const tempChannel = await this.channelService.getByChannelId(channelId);
    if (!tempChannel) {
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} This temporary voice channel no longer exists.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Check permissions
    const config = await this.configService.get(guildId);
    const member = interaction.member as GuildMember;
    const canManage = this.permissionsService.canManageChannel(
      member.user.id,
      tempChannel.ownerId,
      config.adminRoleIds || [],
      member.roles.cache?.map((r: Role) => r.id) || [],
      member.permissions?.has('Administrator') || false,
      (tempChannel.trustedUserIds as string[]) || []
    );
    if (!canManage) {
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} You do not have permission to manage this channel.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Route to appropriate handler
    switch (action) {
      case 'rename':
        return this.handleRenameSubmit(interaction, channelId, guild, guildId);
      case 'limit':
        return this.handleLimitSubmit(interaction, channelId, guild, guildId);
      case 'settings':
        return this.handleSettingsSubmit(interaction, channelId, guild, guildId);
      default:
        return interaction.reply({
          content: `${EMOJIS.STATUS.ERROR} Unknown modal action.`,
          flags: MessageFlags.Ephemeral,
        });
    }
  }

  private async handleRenameSubmit(
    interaction: ModalSubmitInteraction,
    channelId: string,
    guild: NonNullable<typeof interaction.guild>,
    guildId: string
  ) {
    const newName = interaction.fields.getTextInputValue('channel_name').trim();

    if (newName.length < 1 || newName.length > 100) {
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} Channel name must be between 1 and 100 characters.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const voiceChannel = (await guild.channels.fetch(channelId)) as VoiceChannel;
      if (!voiceChannel) {
        return interaction.reply({
          content: `${EMOJIS.STATUS.ERROR} Voice channel not found.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await voiceChannel.setName(newName);
      await this.channelService.update(channelId, { customName: newName });

      // Save user preference if customization is allowed
      const tempChannel = await this.channelService.getByChannelId(channelId);
      if (tempChannel) {
        const config = await this.configService.get(guildId);
        if (config.allowCustomization) {
          await this.userPrefsService.save(guildId, tempChannel.ownerId, {
            customName: newName,
          });
        }
      }

      await this.controlPanelService.refresh(channelId);

      return interaction.reply({
        content: `${EMOJIS.STATUS.SUCCESS} Channel renamed to **${newName}**`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      this.container.logger.error('Failed to rename channel:', error);
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} Failed to rename channel. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  private async handleLimitSubmit(
    interaction: ModalSubmitInteraction,
    channelId: string,
    guild: NonNullable<typeof interaction.guild>,
    guildId: string
  ) {
    const limitStr = interaction.fields.getTextInputValue('user_limit').trim();
    const limit = parseInt(limitStr, 10);

    if (isNaN(limit) || limit < 0 || limit > 99) {
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} User limit must be a number between 0 and 99.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const voiceChannel = (await guild.channels.fetch(channelId)) as VoiceChannel;
      if (!voiceChannel) {
        return interaction.reply({
          content: `${EMOJIS.STATUS.ERROR} Voice channel not found.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await voiceChannel.setUserLimit(limit);
      await this.channelService.update(channelId, { customUserLimit: limit });

      // Save user preference if customization is allowed
      const tempChannel = await this.channelService.getByChannelId(channelId);
      if (tempChannel) {
        const config = await this.configService.get(guildId);
        if (config.allowCustomization) {
          await this.userPrefsService.save(guildId, tempChannel.ownerId, {
            customUserLimit: limit,
          });
        }
      }

      await this.controlPanelService.refresh(channelId);

      return interaction.reply({
        content: `${EMOJIS.STATUS.SUCCESS} User limit set to **${limit === 0 ? 'unlimited' : limit}**`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      this.container.logger.error('Failed to set user limit:', error);
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} Failed to set user limit. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  private async handleSettingsSubmit(
    interaction: ModalSubmitInteraction,
    channelId: string,
    guild: NonNullable<typeof interaction.guild>,
    guildId: string
  ) {
    const bitrateStr = interaction.fields.getTextInputValue('bitrate').trim();
    const region = interaction.fields.getTextInputValue('region').trim() || 'auto';

    const bitrate = parseInt(bitrateStr, 10);
    if (isNaN(bitrate) || bitrate < 8 || bitrate > 384) {
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} Bitrate must be between 8 and 384 kbps.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const bitrateInBps = bitrate * 1000;

    // Validate bitrate based on guild boost level
    const bitrateValidation = this.permissionsService.validateBitrate(
      bitrateInBps,
      guild.premiumTier
    );
    if (!bitrateValidation.valid) {
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} Maximum bitrate for this server is **${bitrateValidation.maxAllowed / 1000}kbps** based on boost level.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const voiceChannel = (await guild.channels.fetch(channelId)) as VoiceChannel;
      if (!voiceChannel) {
        return interaction.reply({
          content: `${EMOJIS.STATUS.ERROR} Voice channel not found.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Update bitrate
      await voiceChannel.setBitrate(bitrateInBps);

      // Update region
      const rtcRegion = region === 'auto' ? null : region;
      await voiceChannel.setRTCRegion(rtcRegion);

      // Update database
      await this.channelService.update(channelId, {
        customBitrate: bitrateInBps,
        customRegion: region,
      });

      // Save user preference if customization is allowed
      const tempChannel = await this.channelService.getByChannelId(channelId);
      if (tempChannel) {
        const config = await this.configService.get(guildId);
        if (config.allowCustomization) {
          await this.userPrefsService.save(guildId, tempChannel.ownerId, {
            customBitrate: bitrate,
            customRegion: region,
          });
        }
      }

      await this.controlPanelService.refresh(channelId);

      return interaction.reply({
        content: `${EMOJIS.STATUS.SUCCESS} Settings updated:\n- Bitrate: **${bitrate}kbps**\n- Region: **${region}**`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      this.container.logger.error('Failed to update settings:', error);
      return interaction.reply({
        content: `${EMOJIS.STATUS.ERROR} Failed to update settings. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
