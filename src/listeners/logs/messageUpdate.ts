import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import type { Message, PartialMessage } from 'discord.js';
import { LogType, logAction } from '../../lib/logging';

export class MessageUpdateListener extends Listener<typeof Events.MessageUpdate> {
	public constructor(context: Listener.LoaderContext, options: ListenerOptions) {
		super(context, {
			...options,
			event: Events.MessageUpdate
		});
	}

	public async run(oldMessage: Message | PartialMessage, newMessage: Message) {
		// Ignore DMs and bot messages
		if (!newMessage.guild || newMessage.author?.bot) return;

		// Ignore if content didn't change
		if (oldMessage.content === newMessage.content) return;

		await logAction({
			guildId: newMessage.guild.id,
			type: LogType.Messages,
			title: 'Message Edited',
			description: `Message from ${newMessage.author} edited in ${newMessage.channel}`,
			fields: [
				{ name: 'Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
				{ name: 'Channel', value: `${newMessage.channel} (${newMessage.channel.id})`, inline: true },
				...(oldMessage.content ? [{ name: 'Before', value: oldMessage.content.substring(0, 1024) }] : []),
				{ name: 'After', value: newMessage.content?.substring(0, 1024) || '*No content*' },
				{ name: 'Link', value: newMessage.url }
			],
			color: 0xfee75c, // Yellow
			footer: `Message ID: ${newMessage.id}`
		});
	}
}
