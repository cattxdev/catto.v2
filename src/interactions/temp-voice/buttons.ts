import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction, GuildMember, Role } from 'discord.js';
import { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, UserSelectMenuBuilder } from 'discord.js';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service';
import { TempVoiceConfigService } from '#modules/temp-voice/services/config.service';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service';
import { ControlPanelService } from '#modules/temp-voice/services/control-panel.service';
import { TempVoiceChannel } from '@prisma/client';

export class TempVoiceButtonHandler extends InteractionHandler {
	private channelService!: TempChannelService;
	private configService!: TempVoiceConfigService;
	private permissionsService!: PermissionsService;
	private controlPanelService!: ControlPanelService;

	public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		if (!interaction.customId.startsWith('tempvoice_')) return this.none();

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
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

		// Parse button customId: tempvoice_<action>_<channelId>
		const parts = interaction.customId.split('_');
		const action = parts[1];
		const channelId = parts[2]!; // Non-null assertion: customId format is guaranteed

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
			member.permissions?.has('Administrator') || false,
			(tempChannel.trustedUserIds as string[]) || []
		);
		if (!canManage) {
			return interaction.reply({
				content: '❌ You do not have permission to manage this channel.',
				flags: MessageFlags.Ephemeral,
			});
		}

		// Route to appropriate handler
		switch (action) {
			case 'lock':
				return this.handleLockToggle(interaction, tempChannel, channelId);
			case 'hide':
				return this.handleHideToggle(interaction, tempChannel, channelId);
			case 'rename':
				return this.handleRenameModal(interaction, channelId);
			case 'limit':
				return this.handleLimitModal(interaction, channelId);
			case 'permit':
				return this.handlePermitModal(interaction);
			case 'deny':
				return this.handleDenyModal(interaction);		case 'trust':
			return this.handleTrustModal(interaction);			case 'kick':
				return this.handleKickModal(interaction);
			case 'settings':
				return this.handleSettingsModal(interaction, tempChannel, channelId);
			case 'transfer':
				return this.handleTransferModal(interaction);
			case 'reset':
				return this.handleReset(interaction, tempChannel, channelId);
			case 'refresh':
				return this.handleRefresh(interaction, channelId);
			default:
				return interaction.reply({
					content: '❌ Unknown action.',
					flags: MessageFlags.Ephemeral,
				});
		}
	}

	private async handleLockToggle(interaction: ButtonInteraction, tempChannel: TempVoiceChannel, channelId: string) {
		try {
			const voiceChannel = await interaction.guild!.channels.fetch(channelId);
			if (!voiceChannel || !voiceChannel.isVoiceBased()) {
				return interaction.reply({
					content: '❌ Voice channel not found.',
					flags: MessageFlags.Ephemeral,
				});
			}

			const newLockState = !tempChannel.isLocked;
			await voiceChannel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
				Connect: newLockState ? false : null,
			});

			await this.channelService.update(channelId, { isLocked: newLockState });
			await this.controlPanelService.refresh(channelId);

			return interaction.reply({
				content: newLockState ? '🔒 Channel locked.' : '🔓 Channel unlocked.',
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			this.container.logger.error('Failed to toggle lock:', error);
			return interaction.reply({
				content: '❌ Failed to toggle lock.',
				flags: MessageFlags.Ephemeral,
			});
		}
	}

	private async handleHideToggle(interaction: ButtonInteraction, tempChannel: TempVoiceChannel, channelId: string) {
		try {
			const voiceChannel = await interaction.guild!.channels.fetch(channelId);
			if (!voiceChannel || !voiceChannel.isVoiceBased()) {
				return interaction.reply({
					content: '❌ Voice channel not found.',
					flags: MessageFlags.Ephemeral,
				});
			}

			const newHiddenState = !tempChannel.isHidden;
			await voiceChannel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
				ViewChannel: newHiddenState ? false : null,
			});

			await this.channelService.update(channelId, { isHidden: newHiddenState });
			await this.controlPanelService.refresh(channelId);

			return interaction.reply({
				content: newHiddenState ? '👁️‍🗨️ Channel hidden.' : '👁️ Channel visible.',
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			this.container.logger.error('Failed to toggle visibility:', error);
			return interaction.reply({
				content: '❌ Failed to toggle visibility.',
				flags: MessageFlags.Ephemeral,
			});
		}
	}

	private async handleRenameModal(interaction: ButtonInteraction, channelId: string) {
		const modal = new ModalBuilder()
			.setCustomId(`tempvoice_rename_modal_${channelId}`)
			.setTitle('Rename Channel');

		const nameInput = new TextInputBuilder()
			.setCustomId('channel_name')
			.setLabel('New Channel Name')
			.setStyle(TextInputStyle.Short)
			.setMinLength(1)
			.setMaxLength(100)
			.setRequired(true);

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
		modal.addComponents(row);

		return interaction.showModal(modal);
	}

	private async handleLimitModal(interaction: ButtonInteraction, channelId: string) {
		const modal = new ModalBuilder()
			.setCustomId(`tempvoice_limit_modal_${channelId}`)
			.setTitle('Set User Limit');

		const limitInput = new TextInputBuilder()
			.setCustomId('user_limit')
			.setLabel('User Limit (0 for unlimited)')
			.setStyle(TextInputStyle.Short)
			.setMinLength(1)
			.setMaxLength(2)
			.setPlaceholder('0-99')
			.setRequired(true);

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput);
		modal.addComponents(row);

		return interaction.showModal(modal);
	}

	private async handlePermitModal(interaction: ButtonInteraction) {
		const channelId = interaction.customId.split('_')[2]!;
		
		const userSelect = new UserSelectMenuBuilder()
			.setCustomId(`tempvoice_permit_select_${channelId}`)
			.setPlaceholder('Select user(s) to permit')
			.setMinValues(1)
			.setMaxValues(10);

		const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);

		return interaction.reply({
			content: '👤 Select the user(s) you want to permit access to this channel:',
			components: [row],
			flags: MessageFlags.Ephemeral,
		});
	}

	private async handleDenyModal(interaction: ButtonInteraction) {
		const channelId = interaction.customId.split('_')[2]!;
		
		const userSelect = new UserSelectMenuBuilder()
			.setCustomId(`tempvoice_deny_select_${channelId}`)
			.setPlaceholder('Select user(s) to deny')
			.setMinValues(1)
			.setMaxValues(10);

		const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);

		return interaction.reply({
			content: '🚫 Select the user(s) you want to deny access to this channel:',
			components: [row],
			flags: MessageFlags.Ephemeral,
		});
	}

	private async handleTrustModal(interaction: ButtonInteraction) {
		const channelId = interaction.customId.split('_')[2]!;
		
		const userSelect = new UserSelectMenuBuilder()
			.setCustomId(`tempvoice_trust_select_${channelId}`)
			.setPlaceholder('Select user(s) to trust')
			.setMinValues(1)
			.setMaxValues(10);

		const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);

		return interaction.reply({
			content: '🤝 Select the user(s) you want to trust with management permissions (they can do everything except transfer ownership):',
			components: [row],
			flags: MessageFlags.Ephemeral,
		});
	}

	private async handleKickModal(interaction: ButtonInteraction) {
		const channelId = interaction.customId.split('_')[2]!;
		
		const userSelect = new UserSelectMenuBuilder()
			.setCustomId(`tempvoice_kick_select_${channelId}`)
			.setPlaceholder('Select user(s) to kick')
			.setMinValues(1)
			.setMaxValues(10);

		const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);

		return interaction.reply({
			content: '👢 Select the user(s) you want to kick from this channel:',
			components: [row],
			flags: MessageFlags.Ephemeral,
		});
	}

	private async handleSettingsModal(interaction: ButtonInteraction, tempChannel: TempVoiceChannel, channelId: string) {
		const modal = new ModalBuilder()
			.setCustomId(`tempvoice_settings_modal_${channelId}`)
			.setTitle('Channel Settings');

		const bitrateInput = new TextInputBuilder()
			.setCustomId('bitrate')
			.setLabel('Bitrate (kbps)')
			.setStyle(TextInputStyle.Short)
			.setMinLength(1)
			.setMaxLength(3)
			.setPlaceholder('8-384')
			.setValue(((tempChannel.customBitrate || 64000) / 1000).toString())
			.setRequired(false);

		const regionInput = new TextInputBuilder()
			.setCustomId('region')
			.setLabel('Region (auto, us-east, etc.)')
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('auto')
			.setValue(tempChannel.customRegion || 'auto')
			.setRequired(false);

		const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(bitrateInput);
		const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(regionInput);
		modal.addComponents(row1, row2);

		return interaction.showModal(modal);
	}

	private async handleTransferModal(interaction: ButtonInteraction) {
		return interaction.reply({
			content: '⚠️ Please use `/tempvoice transfer <user>` command for now. User selection via buttons coming soon!',
			flags: MessageFlags.Ephemeral,
		});
	}

	private async handleReset(interaction: ButtonInteraction, tempChannel: TempVoiceChannel, channelId: string) {
		try {
			const config = await this.configService.get(interaction.guildId!);
			const voiceChannel = await interaction.guild!.channels.fetch(channelId);

			if (!voiceChannel || !voiceChannel.isVoiceBased()) {
				return interaction.reply({
					content: '❌ Voice channel not found.',
					flags: MessageFlags.Ephemeral,
				});
			}

			// Reset Discord channel settings
			await voiceChannel.edit({
				userLimit: config.defaultUserLimit,
				bitrate: config.defaultBitrate ?? undefined,
				rtcRegion: config.defaultRegion || undefined,
			});

			// Reset permissions
			await voiceChannel.permissionOverwrites.set(
				this.permissionsService.buildOverwrites({
					ownerId: tempChannel.ownerId,
					guildId: interaction.guildId!,
					isLocked: config.defaultLocked,
					isHidden: config.defaultHidden,
					allowedUserIds: [],
					deniedUserIds: [],
					trustedUserIds: [],
				})
			);

			// Reset database
			await this.channelService.update(channelId, {
				isLocked: config.defaultLocked,
				isHidden: config.defaultHidden,
				customUserLimit: config.defaultUserLimit,
				customBitrate: config.defaultBitrate ?? undefined,
				customRegion: config.defaultRegion || 'auto',
				allowedUserIds: [],
				deniedUserIds: [],
			});

			await this.controlPanelService.refresh(channelId);

			return interaction.reply({
				content: '✅ Channel reset to default settings.',
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			this.container.logger.error('Failed to reset channel:', error);
			return interaction.reply({
				content: '❌ Failed to reset channel.',
				flags: MessageFlags.Ephemeral,
			});
		}
	}

	private async handleRefresh(interaction: ButtonInteraction, channelId: string) {
		try {
			await this.controlPanelService.refresh(channelId);
			return interaction.reply({
				content: '✅ Control panel refreshed.',
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			this.container.logger.error('Failed to refresh control panel:', error);
			return interaction.reply({
				content: '❌ Failed to refresh control panel.',
				flags: MessageFlags.Ephemeral,
			});
		}
	}
}
