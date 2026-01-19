/**
 * Listener for when channels are deleted to clean up temp voice records
 */

import { Listener } from '@sapphire/framework';
import type { GuildChannel } from 'discord.js';
import { Events } from 'discord.js';
import { container } from '@sapphire/framework';
import { TempChannelService } from '../../modules/temp-voice/services/temp-channel.service';
import { TempVoiceConfigService } from '../../modules/temp-voice/services/config.service';
import { PermissionsService } from '../../modules/temp-voice/services/permissions.service';

export class ChannelDeleteListener extends Listener {
	private configService!: TempVoiceConfigService;
	private channelService!: TempChannelService;

	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, {
			...options,
			event: Events.ChannelDelete,
		});
	}

	public async run(channel: GuildChannel): Promise<void> {
		// Initialize services (lazy initialization)
		if (!this.configService) {
			this.configService = new TempVoiceConfigService(container.prisma);
			this.channelService = new TempChannelService(
				container.prisma,
				new PermissionsService()
			);
		}

		try {
			// Check if this was a temp voice channel
			const tempChannel = await this.channelService.getByChannelId(channel.id);

			if (tempChannel) {
				// Clean up the database record
				await this.channelService.delete(channel.id);

				this.container.logger.info(
					`[TempVoice] Cleaned up database record for externally deleted channel ${channel.id}`
				);
			}
		} catch (error) {
			this.container.logger.error(
				`[TempVoice] Error handling channel deletion for ${channel.id}:`,
				error
			);
		}
	}
}
