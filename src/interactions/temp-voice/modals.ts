import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ModalSubmitInteraction, GuildMember, Role } from 'discord.js';
import { MessageFlags, VoiceChannel } from 'discord.js';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service';
import { TempVoiceConfigService } from '#modules/temp-voice/services/config.service';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service';
import { ControlPanelService } from '#modules/temp-voice/services/control-panel.service';

export class TempVoiceModalHandler extends InteractionHandler {
	private channelService!: TempChannelService;
	private configService!: TempVoiceConfigService;
	private permissionsService!: PermissionsService;
	private controlPanelService!: ControlPanelService;

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
		// Initialize services lazily
		if (!this.channelService) {
			this.configService = new TempVoiceConfigService(this.container.prisma);
			this.permissionsService = new PermissionsService();
			this.channelService = new TempChannelService(
				this.container.prisma,
				this.permissionsService
			);
			this.controlPanelService = new ControlPanelService(
				this.container.client,
				this.channelService
			);
		}

		// Parse modal customId: tempvoice_<action>_modal_<channelId>
		const parts = interaction.customId.split('_');
		const action = parts[1];
		const channelId = parts[3]!; // Non-null assertion: customId format is guaranteed

		// Get temp channel
		const tempChannel = await this.channelService.getByChannelId(channelId);
		if (!tempChannel) {
			return interaction.reply({
				content: '❌ This temporary voice channel no longer exists.',
				flags: MessageFlags.Ephemeral,
			});
		}

		// Check permissions
		const config = await this.configService.get(interaction.guildId!);
		const member = interaction.member as GuildMember;
		const canManage = this.permissionsService.canManageChannel(
			member.user.id,
			tempChannel.ownerId,
			config.adminRoleIds || [],
			member.roles.cache?.map((r: Role) => r.id) || [],
			member.permissions?.has('Administrator') || false
		);
		if (!canManage) {
			return interaction.reply({
				content: '❌ You do not have permission to manage this channel.',
				flags: MessageFlags.Ephemeral,
			});
		}

		// Route to appropriate handler
		switch (action) {
			case 'rename':
				return this.handleRenameSubmit(interaction, channelId);
			case 'limit':
				return this.handleLimitSubmit(interaction, channelId);
			case 'settings':
				return this.handleSettingsSubmit(interaction, channelId);
			default:
				return interaction.reply({
					content: '❌ Unknown modal action.',
					flags: MessageFlags.Ephemeral,
				});
		}
	}

	private async handleRenameSubmit(interaction: ModalSubmitInteraction, channelId: string) {
		const newName = interaction.fields.getTextInputValue('channel_name').trim();

		if (newName.length < 1 || newName.length > 100) {
			return interaction.reply({
				content: '❌ Channel name must be between 1 and 100 characters.',
				flags: MessageFlags.Ephemeral,
			});
		}

		try {
			const voiceChannel = (await interaction.guild!.channels.fetch(channelId)) as VoiceChannel;
			if (!voiceChannel) {
				return interaction.reply({
					content: '❌ Voice channel not found.',
					flags: MessageFlags.Ephemeral,
				});
			}

			await voiceChannel.setName(newName);
			await this.channelService.update(channelId, { customName: newName });
			await this.controlPanelService.refresh(channelId);

			return interaction.reply({
				content: `✅ Channel renamed to **${newName}**`,
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			this.container.logger.error('Failed to rename channel:', error);
			return interaction.reply({
				content: '❌ Failed to rename channel. Please try again.',
				flags: MessageFlags.Ephemeral,
			});
		}
	}

	private async handleLimitSubmit(interaction: ModalSubmitInteraction, channelId: string) {
		const limitStr = interaction.fields.getTextInputValue('user_limit').trim();
		const limit = parseInt(limitStr, 10);

		if (isNaN(limit) || limit < 0 || limit > 99) {
			return interaction.reply({
				content: '❌ User limit must be a number between 0 and 99.',
				flags: MessageFlags.Ephemeral,
			});
		}

		try {
			const voiceChannel = (await interaction.guild!.channels.fetch(channelId)) as VoiceChannel;
			if (!voiceChannel) {
				return interaction.reply({
					content: '❌ Voice channel not found.',
					flags: MessageFlags.Ephemeral,
				});
			}

			await voiceChannel.setUserLimit(limit);
			await this.channelService.update(channelId, { customUserLimit: limit });
			await this.controlPanelService.refresh(channelId);

			return interaction.reply({
				content: `✅ User limit set to **${limit === 0 ? 'unlimited' : limit}**`,
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			this.container.logger.error('Failed to set user limit:', error);
			return interaction.reply({
				content: '❌ Failed to set user limit. Please try again.',
				flags: MessageFlags.Ephemeral,
			});
		}
	}

	private async handleSettingsSubmit(interaction: ModalSubmitInteraction, channelId: string) {
		const bitrateStr = interaction.fields.getTextInputValue('bitrate').trim();
		const region = interaction.fields.getTextInputValue('region').trim() || 'auto';

		const bitrate = parseInt(bitrateStr, 10);
		if (isNaN(bitrate) || bitrate < 8 || bitrate > 384) {
			return interaction.reply({
				content: '❌ Bitrate must be between 8 and 384 kbps.',
				flags: MessageFlags.Ephemeral,
			});
		}

		const bitrateInBps = bitrate * 1000;

		// Validate bitrate based on guild boost level
		const bitrateValidation = this.permissionsService.validateBitrate(
			bitrateInBps,
			interaction.guild!.premiumTier
		);
		if (!bitrateValidation.valid) {
			return interaction.reply({
				content: `❌ Maximum bitrate for this server is **${bitrateValidation.maxAllowed / 1000}kbps** based on boost level.`,
				flags: MessageFlags.Ephemeral,
			});
		}

		try {
			const voiceChannel = (await interaction.guild!.channels.fetch(channelId)) as VoiceChannel;
			if (!voiceChannel) {
				return interaction.reply({
					content: '❌ Voice channel not found.',
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

			await this.controlPanelService.refresh(channelId);

			return interaction.reply({
				content: `✅ Settings updated:\n- Bitrate: **${bitrate}kbps**\n- Region: **${region}**`,
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			this.container.logger.error('Failed to update settings:', error);
			return interaction.reply({
				content: '❌ Failed to update settings. Please try again.',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}
