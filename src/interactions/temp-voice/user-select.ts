import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { UserSelectMenuInteraction, GuildMember, VoiceChannel } from 'discord.js';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service';
import { TempVoiceConfigService } from '#modules/temp-voice/services/config.service';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service';

export class TempVoiceUserSelectHandler extends InteractionHandler {
	private channelService!: TempChannelService;
	private configService!: TempVoiceConfigService;
	private permissionsService!: PermissionsService;

	public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.SelectMenu,
		});
	}

	public override parse(interaction: UserSelectMenuInteraction) {
		if (!interaction.customId.startsWith('tempvoice_') || 
		    !interaction.customId.includes('_select_')) {
			return this.none();
		}

		return this.some();
	}

	public async run(interaction: UserSelectMenuInteraction) {
		// Initialize services lazily
		if (!this.channelService) {
			this.configService = new TempVoiceConfigService(this.container.prisma);
			this.permissionsService = new PermissionsService();
			this.channelService = new TempChannelService(
				this.container.prisma,
				this.permissionsService
			);
		}

		// Parse customId: tempvoice_<action>_select_<channelId>
		const parts = interaction.customId.split('_');
		const action = parts[1]; // permit, deny, kick
		const channelId = parts[3]!;

		// Get temp channel
		const tempChannel = await this.channelService.getByChannelId(channelId);
		if (!tempChannel) {
			try {
				return await interaction.update({
					content: '❌ This temporary voice channel no longer exists.',
					components: [],
				});
			} catch {
				return interaction.reply({
					content: '❌ This temporary voice channel no longer exists.',
					flags: 64, // Ephemeral
				});
			}
		}

		// Check permissions
		const config = await this.configService.get(interaction.guildId!);
		const member = interaction.member as GuildMember;
		const canManage = this.permissionsService.canManageChannel(
			member.user.id,
			tempChannel.ownerId,
			config.adminRoleIds || [],
			member.roles.cache?.map((r) => r.id) || [],
			member.permissions?.has('Administrator') || false,
			(tempChannel.trustedUserIds as string[]) || []
		);
		if (!canManage) {
			try {
				return await interaction.update({
					content: '❌ You do not have permission to manage this channel.',
					components: [],
				});
			} catch {
				return interaction.reply({
					content: '❌ You do not have permission to manage this channel.',
					flags: 64, // Ephemeral
				});
			}
		}

		// Get selected users
		const selectedUsers = interaction.values;

		// Route to appropriate handler
		switch (action) {
			case 'permit':
				return this.handlePermit(interaction, tempChannel, channelId, selectedUsers);
			case 'deny':
				return this.handleDeny(interaction, tempChannel, channelId, selectedUsers);
			case 'trust':
				return this.handleTrust(interaction, tempChannel, channelId, selectedUsers);
			case 'kick':
				return this.handleKick(interaction, channelId, selectedUsers);
			default:
				try {
					return await interaction.update({
						content: '❌ Unknown action.',
						components: [],
					});
				} catch {
					return interaction.reply({
						content: '❌ Unknown action.',
						flags: 64, // Ephemeral
					});
				}
		}
	}

	private async handlePermit(
		interaction: UserSelectMenuInteraction,
		tempChannel: any,
		channelId: string,
		userIds: string[]
	) {
		try {
			// Defer the update to prevent interaction timeout
			await interaction.deferUpdate();

			const voiceChannel = await interaction.guild!.channels.fetch(channelId) as VoiceChannel;
			if (!voiceChannel || !voiceChannel.isVoiceBased()) {
				return interaction.editReply({
					content: '❌ Voice channel not found.',
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

			// Update database
			const currentAllowed = tempChannel.allowedUserIds || [];
			const newAllowed = [...new Set([...currentAllowed, ...userIds])];
			await this.channelService.update(channelId, { allowedUserIds: newAllowed });

			const userMentions = userIds.map(id => `<@${id}>`).join(', ');
			return interaction.editReply({
				content: `✅ Permitted ${userMentions} to access this channel.`,
				components: [],
			});
		} catch (error) {
			this.container.logger.error('Failed to permit users:', error);
			if (!interaction.deferred) {
				return interaction.update({
					content: '❌ Failed to permit users. Make sure the bot has permission to manage this channel.',
					components: [],
				});
			}
			return interaction.editReply({
				content: '❌ Failed to permit users. Make sure the bot has permission to manage this channel.',
				components: [],
			});
		}
	}

	private async handleDeny(
		interaction: UserSelectMenuInteraction,
		tempChannel: any,
		channelId: string,
		userIds: string[]
	) {
		try {
			// Defer the update to prevent interaction timeout
			await interaction.deferUpdate();

			const voiceChannel = await interaction.guild!.channels.fetch(channelId) as VoiceChannel;
			if (!voiceChannel || !voiceChannel.isVoiceBased()) {
				return interaction.editReply({
					content: '❌ Voice channel not found.',
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
				const member = await interaction.guild!.members.fetch(userId).catch(() => null);
				if (member && member.voice.channelId === channelId) {
					await member.voice.disconnect('Denied access to temporary voice channel');
				}
			}

			// Update database
			const currentDenied = tempChannel.deniedUserIds || [];
			const newDenied = [...new Set([...currentDenied, ...userIds.filter(id => id !== tempChannel.ownerId)])];
			await this.channelService.update(channelId, { deniedUserIds: newDenied });

			const userMentions = userIds.filter(id => id !== tempChannel.ownerId).map(id => `<@${id}>`).join(', ');
			return interaction.editReply({
				content: userMentions 
					? `✅ Denied ${userMentions} access to this channel.`
					: '⚠️ Cannot deny the channel owner.',
				components: [],
			});
		} catch (error) {
			this.container.logger.error('Failed to deny users:', error);
			if (!interaction.deferred) {
				return interaction.update({
					content: '❌ Failed to deny users. Make sure the bot has permission to manage this channel.',
					components: [],
				});
			}
			return interaction.editReply({
				content: '❌ Failed to deny users. Make sure the bot has permission to manage this channel.',
				components: [],
			});
		}
	}

	private async handleTrust(
		interaction: UserSelectMenuInteraction,
		tempChannel: any,
		channelId: string,
		userIds: string[]
	) {
		try {
			// Defer the update to prevent interaction timeout
			await interaction.deferUpdate();

			const voiceChannel = await interaction.guild!.channels.fetch(channelId) as VoiceChannel;
			if (!voiceChannel || !voiceChannel.isVoiceBased()) {
				return interaction.editReply({
					content: '❌ Voice channel not found.',
					components: [],
				});
			}

			// Add trusted users permissions (same as owner)
			for (const userId of userIds) {
				// Don't allow trusting the owner (they already have full access)
				if (userId === tempChannel.ownerId) {
					continue;
				}

				await voiceChannel.permissionOverwrites.edit(userId, {
					Connect: true,
					ViewChannel: true,
					Speak: true,
					Stream: true,
					UseVAD: true,
				});
			}

			// Update database
			const currentTrusted = (tempChannel.trustedUserIds as string[]) || [];
			const newTrusted = [...new Set([...currentTrusted, ...userIds.filter(id => id !== tempChannel.ownerId)])];
			await this.channelService.update(channelId, { trustedUserIds: newTrusted });

			const userMentions = userIds.filter(id => id !== tempChannel.ownerId).map(id => `<@${id}>`).join(', ');
			return interaction.editReply({
				content: userMentions 
					? `✅ Trusted ${userMentions}. They can now manage this channel (except transfer ownership).`
					: '⚠️ The channel owner is already trusted.',
				components: [],
			});
		} catch (error) {
			this.container.logger.error('Failed to trust users:', error);
			if (!interaction.deferred) {
				return interaction.update({
					content: '❌ Failed to trust users. Make sure the bot has permission to manage this channel.',
					components: [],
				});
			}
			return interaction.editReply({
				content: '❌ Failed to trust users. Make sure the bot has permission to manage this channel.',
				components: [],
			});
		}
	}

	private async handleKick(
		interaction: UserSelectMenuInteraction,
		channelId: string,
		userIds: string[]
	) {
		try {
			// Defer the update to prevent interaction timeout
			await interaction.deferUpdate();

			const voiceChannel = await interaction.guild!.channels.fetch(channelId) as VoiceChannel;
			if (!voiceChannel || !voiceChannel.isVoiceBased()) {
				return interaction.editReply({
					content: '❌ Voice channel not found.',
					components: [],
				});
			}

			let kickedCount = 0;
			const failedUsers: string[] = [];

			for (const userId of userIds) {
				try {
					const member = await interaction.guild!.members.fetch(userId);
					if (member.voice.channelId === channelId) {
						await member.voice.disconnect('Kicked from temporary voice channel');
						kickedCount++;
					}
				} catch (error) {
					failedUsers.push(userId);
				}
			}

			const failedMentions = failedUsers.length > 0 
				? `\n⚠️ Failed to kick: ${failedUsers.map(id => `<@${id}>`).join(', ')}`
				: '';

			return interaction.editReply({
				content: `✅ Kicked ${kickedCount} user(s) from the channel.${failedMentions}`,
				components: [],
			});
		} catch (error) {
			this.container.logger.error('Failed to kick users:', error);
			if (!interaction.deferred) {
				return interaction.update({
					content: '❌ Failed to kick users. Make sure the bot has permission to manage this channel.',
					components: [],
				});
			}
			return interaction.editReply({
				content: '❌ Failed to kick users. Make sure the bot has permission to manage this channel.',
				components: [],
			});
		}
	}
}
