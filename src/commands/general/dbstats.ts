import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { getStats } from '#lib/database';

@ApplyOptions<Command.Options>({
	description: 'Shows database statistics',
	requiredUserPermissions: ['Administrator'],
})
export class DBStatsCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.deferReply();

		try {
			const stats = await getStats();

			await interaction.editReply({
				embeds: [
					{
						title: '📊 Database Statistics',
						color: 0x5865f2,
						fields: [
							{
								name: '🏰 Guilds',
								value: stats.guilds.toString(),
								inline: true,
							},
							{
								name: '👥 Users',
								value: stats.users.toString(),
								inline: true,
							},
							{
								name: '📝 Logs',
								value: stats.logs.toString(),
								inline: true,
							},
						],
						timestamp: new Date().toISOString(),
					},
				],
			});
		} catch (error) {
			this.container.logger.error('Failed to fetch database stats:', error);
			await interaction.editReply({
				content: '❌ Failed to fetch database statistics.',
			});
		}
	}
}
