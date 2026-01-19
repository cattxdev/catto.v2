/**
 * XP Award Listener for Text Messages
 * Listens to messageCreate events and awards XP based on guild configuration
 */

import { Listener, Events } from '@sapphire/framework';
import { Message, EmbedBuilder, TextChannel, NewsChannel } from 'discord.js';
import { awardService, configService } from '../../modules/xp-text/services';
import { parseTemplate } from '../../modules/xp-text/utils/templates';
import type { ValidationContext } from '../../modules/xp-text/types/xp-text.types';

export class MessageCreateXPListener extends Listener {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, {
			...options,
			event: Events.MessageCreate
		});
	}

	public async run(message: Message) {
		// Quick checks before processing
		if (message.author.bot) return;
		if (!message.guild) return;
		if (!message.member) return;

		const guildId = message.guild.id;
		const userId = message.author.id;

		try {
			// Check if XP system is enabled (uses cache)
			const enabled = await configService.isEnabled(guildId);
			if (!enabled) return;

			// Build validation context
			const context: ValidationContext = {
				guildId,
				userId,
				channelId: message.channel.id,
				messageContent: message.content,
				userRoles: message.member.roles.cache.map(role => role.id),
				isBot: message.author.bot,
				isDM: false
			};

			// Award XP with all validation and safety checks
			const result = await awardService.awardXP(context);

			// If not awarded, silently return (cooldown, filters, etc.)
			if (!result.awarded) {
				return;
			}

			// Handle level-up announcement
			if (result.leveledUp && result.newLevel) {
				await this.handleLevelUpAnnouncement(
					message,
					guildId,
					userId,
					result.newLevel,
					result.xpGained ?? 0,
					result.newXp ?? 0
				);
			}

		} catch (error) {
			this.container.logger.error('Error in XP award listener:', error);
		}
	}

	/**
	 * Handle level-up announcement
	 */
	private async handleLevelUpAnnouncement(
		message: Message,
		guildId: string,
		userId: string,
		newLevel: number,
		xpGained: number,
		totalXp: number
	): Promise<void> {
		try {
			// Get guild configuration
			const config = await configService.getConfig(guildId);

			// Check if announcements are enabled
			if (!config.announceLevelUp) return;

			// Determine announcement channel
			let announcementChannel = message.channel;
			if (config.announceChannelId) {
				const customChannel = message.guild?.channels.cache.get(config.announceChannelId);
				if (customChannel && (customChannel instanceof TextChannel || customChannel instanceof NewsChannel)) {
					announcementChannel = customChannel;
				}
			}

			// Ensure we have a sendable channel
			if (!(announcementChannel instanceof TextChannel || announcementChannel instanceof NewsChannel)) {
				return;
			}

			// Build template variables
			const variables = {
				user: `<@${userId}>`,
				userId,
				username: message.author.username,
				level: newLevel,
				xpGain: xpGained,
				totalXp,
				nextLevelXp: 0, // Will be calculated if needed
				progress: 0
			};

			// Use custom template or fallback
			const template = config.messageTemplate || '🎉 {user} reached level {level}!';
			const messageText = parseTemplate(template, variables);

			// Send announcement
			if (config.embedEnabled) {
				const embed = new EmbedBuilder()
					.setColor(config.embedColor)
					.setDescription(messageText)
					.setTimestamp();

				await announcementChannel.send({ embeds: [embed] });
			} else {
				await announcementChannel.send(messageText);
			}

		} catch (error) {
			this.container.logger.error('Error sending level-up announcement:', error);
		}
	}
}
