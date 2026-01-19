/**
 * Service for managing control panel messages
 */

import { PrismaClient } from '@prisma/client';
import type {
	Client,
	GuildMember,
	Message,
} from 'discord.js';
import { TempChannelService } from './temp-channel.service';

export class ControlPanelService {
	constructor(
		private _prisma: PrismaClient,
		private _client: Client,
		private _channelService: TempChannelService
	) {}

	/**
	 * Send a control panel message
	 * TODO: Implement in Phase 3
	 */
	async send(_channelId: string, _owner: GuildMember): Promise<Message | null> {
		// TODO: Implement in Phase 3
		throw new Error('Not implemented');
	}

	/**
	 * Update an existing control panel message
	 * TODO: Implement in Phase 3
	 */
	async refresh(_channelId: string): Promise<void> {
		// TODO: Implement in Phase 3
		throw new Error('Not implemented');
	}

	/**
	 * Delete a control panel message
	 * TODO: Implement in Phase 3
	 */
	async delete(_messageId: string, _textChannelId: string): Promise<void> {
		// TODO: Implement in Phase 3
		throw new Error('Not implemented');
	}
}
