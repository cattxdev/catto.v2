/**
 * Listener for bot ready event to run temp voice recovery
 */

import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { container } from '@sapphire/framework';
import { TempVoiceConfigService } from '../../modules/temp-voice/services/config.service';
import { CleanupService } from '../../modules/temp-voice/services/cleanup.service';
import { RecoveryService } from '../../modules/temp-voice/services/recovery.service';

export class TempVoiceReadyListener extends Listener {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, {
			...options,
			name: 'tempVoiceReady',
			once: true,
			event: Events.ClientReady,
		});
	}

	public async run(): Promise<void> {
		try {
			// Initialize services
			const configService = new TempVoiceConfigService(container.prisma);
			const cleanupService = new CleanupService(
				container.prisma,
				this.container.client,
				configService
			);
			const recoveryService = new RecoveryService(
				container.prisma,
				this.container.client,
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
