import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { ChatInputCommandDeniedPayload, UserError } from '@sapphire/framework';
import { Prisma } from '@prisma/client';

@ApplyOptions<Listener.Options>({
	event: 'chatInputCommandDenied'
})
export class ChatInputCommandDeniedListener extends Listener {
	public override async run(error: UserError, payload: ChatInputCommandDeniedPayload) {
		// Log command denials
		await this.container.prisma.log.create({
			data: {
				level: 'warn',
				message: `Command denied: ${payload.command.name}`,
				metadata: {
					userId: payload.interaction.user.id,
					username: payload.interaction.user.username,
					guildId: payload.interaction.guildId,
					commandName: payload.command.name,
					reason: error.identifier
				} satisfies Prisma.JsonObject
			}
		}).catch(err => this.container.logger.error('Failed to log command denial:', err));
	}
}
