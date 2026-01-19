/**
 * Service for managing control panel messages
 */

import { TempVoiceChannel } from '@prisma/client';
import type {
	Client,
	GuildMember,
	Message,
	TextChannel,
	VoiceChannel,
} from 'discord.js';
import {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	Colors,
} from 'discord.js';
import { TempChannelService } from './temp-channel.service';

export class ControlPanelService {
	constructor(

		private _client: Client,
		private _channelService: TempChannelService
	) {}

	/**
	 * Send a control panel message to the text channel associated with the voice channel
	 */
	async send(channelId: string, owner: GuildMember): Promise<Message | null> {
		try {
			const tempChannel = await this._channelService.getByChannelId(channelId);
			if (!tempChannel) {
				return null;
			}

			const voiceChannel = await this._client.channels.fetch(channelId);
			if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
				return null;
			}

			// Find a text channel to send the panel to (preferably the first text channel the user can see)
			const guild = owner.guild;
			const textChannel = guild.channels.cache.find(
				(ch) =>
					ch.type === ChannelType.GuildText &&
					ch.permissionsFor(owner)?.has('ViewChannel') &&
					ch.permissionsFor(guild.members.me!)?.has(['SendMessages', 'EmbedLinks'])
			) as TextChannel | undefined;

			if (!textChannel) {
				return null;
			}

			const embed = this.buildEmbed(tempChannel, voiceChannel as VoiceChannel, owner);
			const rows = this.buildButtons(tempChannel);

			const message = await textChannel.send({
				embeds: [embed],
				components: rows,
			});

			// Store message info in database
			await this._channelService.update(channelId, {
				controlPanelMessageId: message.id,
				controlPanelChannelId: textChannel.id,
			});

			return message;
		} catch (error) {
			console.error('Failed to send control panel:', error);
			return null;
		}
	}

	/**
	 * Update an existing control panel message
	 */
	async refresh(channelId: string): Promise<void> {
		try {
			const tempChannel = await this._channelService.getByChannelId(channelId);
			if (!tempChannel || !tempChannel.controlPanelMessageId || !tempChannel.controlPanelChannelId) {
				return;
			}

			const textChannel = (await this._client.channels.fetch(
				tempChannel.controlPanelChannelId
			)) as TextChannel;
			if (!textChannel) {
				return;
			}

			const message = await textChannel.messages.fetch(tempChannel.controlPanelMessageId);
			if (!message) {
				return;
			}

			const voiceChannel = (await this._client.channels.fetch(channelId)) as VoiceChannel;
			if (!voiceChannel) {
				return;
			}

			const owner = await textChannel.guild.members.fetch(tempChannel.ownerId);
			const embed = this.buildEmbed(tempChannel, voiceChannel, owner);
			const rows = this.buildButtons(tempChannel);

			await message.edit({
				embeds: [embed],
				components: rows,
			});
		} catch (error) {
			console.error('Failed to refresh control panel:', error);
		}
	}

	/**
	 * Delete a control panel message
	 */
	async delete(messageId: string, textChannelId: string): Promise<void> {
		try {
			const textChannel = (await this._client.channels.fetch(textChannelId)) as TextChannel;
			if (!textChannel) {
				return;
			}

			const message = await textChannel.messages.fetch(messageId);
			if (message) {
				await message.delete();
			}
		} catch (error) {
			console.error('Failed to delete control panel:', error);
		}
	}

	/**
	 * Build the control panel embed
	 */
	private buildEmbed(
		tempChannel: TempVoiceChannel,
		voiceChannel: VoiceChannel,
		owner: GuildMember
	): EmbedBuilder {
		const embed = new EmbedBuilder()
			.setColor(Colors.Blue)
			.setTitle('🎙️ Voice Channel Control Panel')
			.setDescription(`Control panel for **${voiceChannel.name}**`)
			.addFields(
				{
					name: '👑 Owner',
					value: `<@${owner.id}>`,
					inline: true,
				},
				{
					name: '👥 Users',
					value: `${voiceChannel.members.size}${tempChannel.customUserLimit && tempChannel.customUserLimit > 0 ? `/${tempChannel.customUserLimit}` : ''}`,
					inline: true,
				},
				{
					name: '📊 Bitrate',
					value: `${(tempChannel.customBitrate || voiceChannel.bitrate) / 1000}kbps`,
					inline: true,
				},
				{
					name: '🔒 Status',
					value: tempChannel.isLocked ? '🔒 Locked' : '🔓 Unlocked',
					inline: true,
				},
				{
					name: '👁️ Visibility',
					value: tempChannel.isHidden ? '👁️‍🗨️ Hidden' : '👁️ Visible',
					inline: true,
				},
				{
					name: '🌍 Region',
					value: tempChannel.customRegion || 'Auto',
					inline: true,
				}
			)
			.setFooter({
				text: `Channel ID: ${voiceChannel.id}`,
			})
			.setTimestamp();

		// Add allowed/denied users if any
		const allowedUserIds = tempChannel.allowedUserIds as unknown as string[];
		const deniedUserIds = tempChannel.deniedUserIds as unknown as string[];

		if (allowedUserIds && allowedUserIds.length > 0) {
			embed.addFields({
				name: '✅ Allowed Users',
				value: allowedUserIds.map((id: string) => `<@${id}>`).join(', '),
				inline: false,
			});
		}

		if (deniedUserIds && deniedUserIds.length > 0) {
			embed.addFields({
				name: '⛔ Denied Users',
				value: deniedUserIds.map((id: string) => `<@${id}>`).join(', '),
				inline: false,
			});
		}

		return embed;
	}

	/**
	 * Build the control panel buttons
	 */
	private buildButtons(tempChannel: TempVoiceChannel): ActionRowBuilder<ButtonBuilder>[] {
		const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`tempvoice_lock_${tempChannel.channelId}`)
				.setLabel(tempChannel.isLocked ? 'Unlock' : 'Lock')
				.setEmoji(tempChannel.isLocked ? '🔓' : '🔒')
				.setStyle(tempChannel.isLocked ? ButtonStyle.Success : ButtonStyle.Danger),
			new ButtonBuilder()
				.setCustomId(`tempvoice_hide_${tempChannel.channelId}`)
				.setLabel(tempChannel.isHidden ? 'Show' : 'Hide')
				.setEmoji(tempChannel.isHidden ? '👁️' : '👁️‍🗨️')
				.setStyle(tempChannel.isHidden ? ButtonStyle.Success : ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`tempvoice_rename_${tempChannel.channelId}`)
				.setLabel('Rename')
				.setEmoji('✏️')
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId(`tempvoice_limit_${tempChannel.channelId}`)
				.setLabel('User Limit')
				.setEmoji('👥')
				.setStyle(ButtonStyle.Primary)
		);

		const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`tempvoice_permit_${tempChannel.channelId}`)
				.setLabel('Permit User')
				.setEmoji('✅')
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId(`tempvoice_deny_${tempChannel.channelId}`)
				.setLabel('Deny User')
				.setEmoji('⛔')
				.setStyle(ButtonStyle.Danger),
			new ButtonBuilder()
				.setCustomId(`tempvoice_kick_${tempChannel.channelId}`)
				.setLabel('Kick User')
				.setEmoji('👢')
				.setStyle(ButtonStyle.Danger),
			new ButtonBuilder()
				.setCustomId(`tempvoice_settings_${tempChannel.channelId}`)
				.setLabel('Settings')
				.setEmoji('⚙️')
				.setStyle(ButtonStyle.Secondary)
		);

		const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`tempvoice_transfer_${tempChannel.channelId}`)
				.setLabel('Transfer')
				.setEmoji('🔄')
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId(`tempvoice_reset_${tempChannel.channelId}`)
				.setLabel('Reset')
				.setEmoji('🔄')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`tempvoice_refresh_${tempChannel.channelId}`)
				.setLabel('Refresh')
				.setEmoji('🔄')
				.setStyle(ButtonStyle.Secondary)
		);

		return [row1, row2, row3];
	}
}
