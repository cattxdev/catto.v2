/**
 * Service for managing control panel messages
 */

import { PrismaClient } from '@prisma/client';
import type {
	Client,
	GuildMember,
	Message,
	VoiceChannel,
	TextChannel,
} from 'discord.js';
import { TempChannelService } from './temp-channel.service';

export class ControlPanelService {
	constructor(
		private prisma: PrismaClient,
		private client: Client,
		private channelService: TempChannelService
	) {}

	/**
	 * Send a control panel message
	 * TODO: Implement in Phase 3
	 */
	async send(channelId: string, owner: GuildMember): Promise<Message | null> {
		// TODO: Implement in Phase 3
		throw new Error('Not implemented');
	}

	/**
	 * Update an existing control panel message
	 * TODO: Implement in Phase 3
	 */
	async refresh(channelId: string): Promise<void> {
		// TODO: Implement in Phase 3
		throw new Error('Not implemented');
	}

	/**
	 * Delete a control panel message
	 * TODO: Implement in Phase 3
	 */
	async delete(messageId: string, textChannelId: string): Promise<void> {
		// TODO: Implement in Phase 3
		throw new Error('Not implemented');
	}
}
