/**
 * Vouch command - Allow users to vouch for each other
 */

import { Command } from '@sapphire/framework';
import {
	EmbedBuilder,
	Colors,
} from 'discord.js';
import { ReputationService } from '#modules/reputation/services/reputation.service';
import { VouchType, REPUTATION_TIERS } from '#modules/reputation/models/reputation.model';
import { CONFIG } from '#config';

export class VouchCommand extends Command {
	private reputationService!: ReputationService;

	public constructor(context: Command.LoaderContext, options: Command.Options) {
		super(context, {
			...options,
			name: 'vouch',
			description: 'Vouch for another member to increase their reputation',
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addUserOption((option) =>
					option
						.setName('user')
						.setDescription('The user you want to vouch for')
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('type')
						.setDescription('What type of vouch is this?')
						.setRequired(true)
						.addChoices(
							{ name: '🤝 Helpful - They helped you or others', value: VouchType.HELPFUL },
							{ name: '😊 Friendly - They\'re welcoming and positive', value: VouchType.FRIENDLY },
							{ name: '⭐ Skilled - They\'re knowledgeable/talented', value: VouchType.SKILLED },
							{ name: '✅ Reliable - They\'re dependable and trustworthy', value: VouchType.RELIABLE }
						)
				)
				.addStringOption((option) =>
					option
						.setName('reason')
						.setDescription('Why are you vouching for them? (optional)')
						.setMaxLength(200)
						.setRequired(false)
				),
			{
				guildIds: CONFIG.NODE_ENV === 'development' && CONFIG.DEV_GUILD_ID ? [CONFIG.DEV_GUILD_ID] : undefined,
			}
		);
	}

	public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		// Initialize service
		if (!this.reputationService) {
			this.reputationService = new ReputationService(this.container.prisma);
		}

		await interaction.deferReply();

		const targetUser = interaction.options.getUser('user', true);
		const vouchType = interaction.options.getString('type', true) as VouchType;
		const reason = interaction.options.getString('reason');

		// Get guild member objects
		const giver = await interaction.guild!.members.fetch(interaction.user.id);
		const receiver = await interaction.guild!.members.fetch(targetUser.id);

		// Validate vouch
		const validation = await this.reputationService.validateVouch(
			interaction.guild!,
			giver,
			receiver,
			vouchType
		);

		if (!validation.isValid) {
			return interaction.editReply({
				content: validation.reason,
			});
		}

		// Submit vouch
		try {
			await this.reputationService.submitVouch(interaction.guildId!, {
				giverUserId: interaction.user.id,
				receiverUserId: targetUser.id,
				vouchType,
				reason: reason || undefined,
				contextType: 'text',
				contextId: interaction.channelId,
			});

			// Get updated stats
			const stats = await this.reputationService.getReputationStats(
				interaction.guildId!,
				targetUser.id
			);

			const tierInfo = REPUTATION_TIERS[stats.currentTier];
			const vouchEmoji = this.getVouchEmoji(vouchType);

			const embed = new EmbedBuilder()
				.setColor(Colors.Green)
				.setTitle('✅ Vouch Submitted!')
				.setDescription(
					`${vouchEmoji} You vouched for ${targetUser} as **${vouchType}**!${
						reason ? `\n\n*"${reason}"*` : ''
					}`
				)
				.addFields(
					{
						name: 'Their Reputation',
						value: `${tierInfo.emoji} **${stats.currentTier}** Tier\n⭐ ${stats.reputationScore} points`,
						inline: true,
					},
					{
						name: 'Total Vouches',
						value: `${stats.vouchesReceived} received\n${stats.vouchesGiven} given`,
						inline: true,
					}
				)
				.setFooter({ text: 'Reputation helps build trust in the community' })
				.setTimestamp();

			// Add next tier progress if applicable
			if (stats.nextTier) {
				const nextTierInfo = REPUTATION_TIERS[stats.nextTier];
				embed.addFields({
					name: 'Next Tier Progress',
					value: `${nextTierInfo.emoji} ${stats.nextTier}: ${stats.progressToNextTier}%\n${this.createProgressBar(stats.progressToNextTier)}`,
					inline: false,
				});
			}

			return interaction.editReply({ embeds: [embed] });
		} catch (error) {
			this.container.logger.error('Failed to submit vouch:', error);
			return interaction.editReply({
				content: '❌ Failed to submit vouch. Please try again later.',
			});
		}
	}

	private getVouchEmoji(type: VouchType): string {
		switch (type) {
			case VouchType.HELPFUL:
				return '🤝';
			case VouchType.FRIENDLY:
				return '😊';
			case VouchType.SKILLED:
				return '⭐';
			case VouchType.RELIABLE:
				return '✅';
			default:
				return '👍';
		}
	}

	private createProgressBar(percentage: number, length: number = 10): string {
		const filled = Math.round((percentage / 100) * length);
		const empty = length - filled;
		return '█'.repeat(filled) + '░'.repeat(empty);
	}
}
