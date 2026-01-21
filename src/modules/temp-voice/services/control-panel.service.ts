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

			// Get the voice channel's text chat (Discord automatically creates a linked text channel for voice channels)
			const guild = owner.guild;
			const voiceChan = voiceChannel as VoiceChannel;
			
			// Try to send to the voice channel itself (Discord shows text messages in voice channels)
			let textChannel: TextChannel | VoiceChannel = voiceChan;
			
			// If voice channel doesn't support sending messages, find first accessible text channel
			const botMember = guild.members.me!;
			if (!voiceChan.permissionsFor(botMember)?.has(['SendMessages', 'EmbedLinks'])) {
				const fallbackChannel = guild.channels.cache.find(
					(ch) =>
						ch.type === ChannelType.GuildText &&
						ch.permissionsFor(owner)?.has('ViewChannel') &&
						ch.permissionsFor(botMember)?.has(['SendMessages', 'EmbedLinks'])
				) as TextChannel | undefined;
				
				if (!fallbackChannel) {
					return null;
				}
				textChannel = fallbackChannel;
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
		const usersValue = tempChannel.customUserLimit && tempChannel.customUserLimit > 0
			? `\`${voiceChannel.members.size}/${tempChannel.customUserLimit}\``
			: `\`${voiceChannel.members.size}\``;

		const embed = new EmbedBuilder()
			.setColor(0xFFFFFF) // White color (16777215)
			.setDescription('### <:4767voiceevent:1462964331317825711> VOICE CHANNEL CONTROL PANEL')
			.addFields(
				{
					name: '<:4102owner1:1462962657270169712> Owner',
					value: `<@${owner.id}>`,
					inline: true,
				},
				{
					name: '<:5837members:1462962641105584211> Users',
					value: usersValue,
					inline: true,
				},
				{
					name: '<:8635krispon:1462962615465541642> Bitrate',
					value: `\`${(tempChannel.customBitrate || voiceChannel.bitrate) / 1000}kbps\``,
					inline: true,
				},
				{
					name: '<:9577voiceprivateevent:1462963079485853707> Status',
					value: tempChannel.isLocked ? '`Locked`' : '`Unlocked`',
					inline: true,
				},
				{
					name: '<:3500preview:1462962674542444658> Visibility',
					value: tempChannel.isHidden ? '`Hidden`' : '`Visible`',
					inline: true,
				},
				{
					name: '<:2910eventlocation:1462962693026611281> Region',
					value: `\`${tempChannel.customRegion || voiceChannel.rtcRegion || 'Auto'}\``,
					inline: true,
				}
			)
			.setFooter({
				text: `Channel ID: ${voiceChannel.id}`,
			})
			.setTimestamp();

		return embed;
	}

	/**
	 * Build the control panel buttons
	 */
	private buildButtons(tempChannel: TempVoiceChannel): ActionRowBuilder<ButtonBuilder>[] {
		const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`tempvoice_lock_${tempChannel.channelId}`)
				.setEmoji({ id: '1462963079485853707', name: '9577voiceprivateevent' })
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`tempvoice_hide_${tempChannel.channelId}`)
				.setEmoji({ id: '1462962674542444658', name: '3500preview' })
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`tempvoice_rename_${tempChannel.channelId}`)
				.setEmoji({ id: '1462995803583811725', name: '3639edit' })
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`tempvoice_limit_${tempChannel.channelId}`)
				.setEmoji({ id: '1462962641105584211', name: '5837members' })
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`tempvoice_settings_${tempChannel.channelId}`)
				.setEmoji({ id: '1462995184336765074', name: '2888settings' })
				.setStyle(ButtonStyle.Secondary)
		);

		const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`tempvoice_permit_${tempChannel.channelId}`)
				.setEmoji({ id: '1462996719120945234', name: '1563invitepeople1' })
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`tempvoice_deny_${tempChannel.channelId}`)
				.setEmoji({ id: '1462996737127092305', name: '8056engagedinsuspectedspamactiv1' })
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`tempvoice_trust_${tempChannel.channelId}`)
				.setEmoji({ id: '1463062838179532821', name: '2360cross' })
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(`tempvoice_kick_${tempChannel.channelId}`)
				.setEmoji({ id: '1463001026079621235', name: '8562replay2' })
				.setStyle(ButtonStyle.Secondary), 
			new ButtonBuilder()
				.setCustomId(`tempvoice_refresh_${tempChannel.channelId}`)
				.setEmoji({ id: '1463001053095006293', name: '2636securityfilter' })
				.setStyle(ButtonStyle.Secondary)
				.setLabel('Transfer')
		);

		return [row1, row2];
	}
}
