import { Subcommand } from '@sapphire/plugin-subcommands';
import { EmbedBuilder, Colors } from 'discord.js';
import { getUserCases, ModAction } from '../../lib/moderation.js';

export async function handleHistory(interaction: Subcommand.ChatInputCommandInteraction) {
	if (!interaction.guild) {
		await interaction.reply({
			content: '❌ This command can only be used in a server.',
			ephemeral: true
		});
		return;
	}

	await interaction.deferReply({ ephemeral: true });

	try {
		const target = interaction.options.getUser('target', true);

		const cases = await getUserCases(interaction.guild.id, target.id);

		if (cases.length === 0) {
			await interaction.editReply({
				content: `📋 **${target.tag}** has no moderation history.`
			});
			return;
		}

		const stats = {
			bans: cases.filter(c => c.action === ModAction.BAN).length,
			kicks: cases.filter(c => c.action === ModAction.KICK).length,
			timeouts: cases.filter(c => c.action === ModAction.TIMEOUT).length,
			warns: cases.filter(c => c.action === ModAction.WARN).length
		};

		const embed = new EmbedBuilder()
			.setColor(Colors.Orange)
			.setTitle(`📋 Moderation History for ${target.tag}`)
			.setThumbnail(target.displayAvatarURL())
			.setDescription(
				`**Total Cases:** ${cases.length}\n` +
				`**Bans:** ${stats.bans}\n` +
				`**Kicks:** ${stats.kicks}\n` +
				`**Timeouts:** ${stats.timeouts}\n` +
				`**Warns:** ${stats.warns}`
			);

		const recentCases = cases.slice(0, 10);
		const caseList = recentCases.map((c) => {
			const timestamp = `<t:${Math.floor(c.createdAt.getTime() / 1000)}:d>`;
			return `**Case #${c.caseNumber}** - ${c.action}\n${timestamp} • ${c.reason || 'No reason'}`;
		}).join('\n\n');

		embed.addFields({
			name: `Recent Cases (Showing ${recentCases.length} of ${cases.length})`,
			value: caseList || 'No cases',
			inline: false
		});

		if (cases.length > 10) {
			embed.setFooter({
				text: `Showing 10 of ${cases.length} total cases. Use /mod case <number> to view specific cases.`
			});
		}

		await interaction.editReply({
			embeds: [embed]
		});
	} catch (error) {
		interaction.client.logger.error('Error in history command:', error);
		await interaction.editReply({
			content: '❌ An unexpected error occurred while fetching the history.'
		}).catch(() => {});
	}
}
