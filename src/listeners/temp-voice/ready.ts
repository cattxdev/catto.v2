/**
 * Listener for bot ready event to run temp voice recovery
 */

import { Listener, ListenerOptions } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { Events } from 'discord.js';
import { container } from '@sapphire/framework';
import { TempChannelService } from '../../modules/temp-voice/services/temp-channel.service';
import { TempVoiceConfigService } from '../../modules/temp-voice/services/config.service';
import { CleanupService } from '../../modules/temp-voice/services/cleanup.service';
import { RecoveryService } from '../../modules/temp-voice/services/recovery.service';
import { PermissionsService } from '../../modules/temp-voice/services/permissions.service';

@ApplyOptions<ListenerOptions>({
	event: Events.ClientReady,
	once: true,
})
export class TempVoiceReadyListener extends Listener {
	public async run(): Promise<void> {
		try {
			// Initialize services
			const configService = new TempVoiceConfigService(container.prisma);
			const channelService = new TempChannelService(
				container.prisma,
				configService,
				new PermissionsService()
			);
			const cleanupService = new CleanupService(
				container.prisma,
				this.container.client,
				channelService,
				configService
			);
			const recoveryService = new RecoveryService(
				container.prisma,
				this.container.client,
				channelService,
				cleanupService
			);

			// Run recovery
			await recoveryService.reconcileChannels();

			// Get stats
			const stats = await recoveryService.getRecoveryStats();
			this.container.logger.info(
				`[TempVoice] Recovery stats - Active: ${stats.totalRecovered}, Scheduled for deletion: ${stats.scheduledForDeletion}`
			);
		} catch (error) {
			this.container.logger.error('[TempVoice] Error during startup recovery:', error);
		}
	}
}
