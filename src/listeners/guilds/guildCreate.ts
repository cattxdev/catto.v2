import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Guild } from 'discord.js';

@ApplyOptions<Listener.Options>({
	event: 'guildCreate'
})
export class GuildCreateListener extends Listener {
	public override async run(guild: Guild) {
		this.container.logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

		try {
			// Add guild to database
			await this.container.prisma.guild.create({
				data: {
					guildId: guild.id,
					name: guild.name,
					language: 'en-US',
					settings: {
						prefix: '!',
						welcomeMessage: true
					}
				}
			});

			this.container.logger.info(`Successfully added guild ${guild.name} to database`);
		} catch (error) {
			// If guild already exists, update it
			if ((error as any).code === 'P2002') {
				await this.container.prisma.guild.update({
					where: { guildId: guild.id },
					data: {
						name: guild.name,
						updatedAt: new Date()
					}
				});
				this.container.logger.info(`Updated existing guild ${guild.name} in database`);
			} else {
				this.container.logger.error('Failed to add guild to database:', error);
			}
		}

		// Log the event
		await this.container.prisma.log.create({
			data: {
				level: 'info',
				message: `Bot joined guild: ${guild.name}`,
				metadata: {
					guildId: guild.id,
					guildName: guild.name,
					memberCount: guild.memberCount
				} as any
			}
		}).catch(err => this.container.logger.error('Failed to log guild create:', err));
	}
}
