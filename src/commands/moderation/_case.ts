import { Subcommand } from '@sapphire/plugin-subcommands';
import { EmbedBuilder, Colors } from 'discord.js';
import { getCase, formatDuration } from '../../lib/moderation.js';

export async function handleCase(interaction: Subcommand.ChatInputCommandInteraction) {
	if (!interaction.guild) {
		await interaction.reply({
			content: '❌ This command can only be used in a server.',
			ephemeral: true
		});
		return;
	}

	await interaction.deferReply({ ephemeral: true });

	try {
		const caseNumber = interaction.options.getInteger('number', true);

		const modCase = await getCase(interaction.guild.id, caseNumber);

		if (!modCase) {
			await interaction.editReply({
				content: `❌ Case #${caseNumber} not found.`
			});
			return;
		}

		const embed = new EmbedBuilder()
			.setColor(Colors.Blue)
			.setTitle(`📋 Case #${modCase.caseNumber}`)
			.addFields(
				{
					name: '🔨 Action',
					value: modCase.action,
					inline: true
				},
				{
					name: '👤 Target',
					value: `${modCase.targetTag}\n(\`${modCase.targetId}\`)`,
					inline: true
				},
				{
					name: '👮 Moderator',
					value: `${modCase.moderatorTag}\n(\`${modCase.moderatorId}\`)`,
					inline: true
				},
				{
					name: '📝 Reason',
					value: modCase.reason || 'No reason provided',
					inline: false
				},
				{
					name: '📅 Date',
					value: `<t:${Math.floor(modCase.createdAt.getTime() / 1000)}:F>`,
					inline: true
				}
			);

		if (modCase.duration) {
			embed.addFields({
				name: '⏱️ Duration',
				value: formatDuration(modCase.duration),
				inline: true
			});
		}

		if (modCase.expiresAt) {
			embed.addFields({
				name: '⏰ Expires',
				value: `<t:${Math.floor(modCase.expiresAt.getTime() / 1000)}:R>`,
				inline: true
			});
		}

		embed.setFooter({
			text: `Guild ID: ${modCase.guildId}`
		});

		await interaction.editReply({
			embeds: [embed]
		});
	} catch (error) {
		interaction.client.logger.error('Error in case command:', error);
		await interaction.editReply({
			content: '❌ An unexpected error occurred while fetching the case.'
		}).catch(() => {});
	}
}
