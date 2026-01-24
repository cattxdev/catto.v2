import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import type { StageInstance } from 'discord.js';
import { LogType, logAction } from '../../lib/logging';

export class StageInstanceDeleteListener extends Listener<typeof Events.StageInstanceDelete> {
  public constructor(context: Listener.LoaderContext, options: ListenerOptions) {
    super(context, {
      ...options,
      event: Events.StageInstanceDelete,
    });
  }

  public async run(stageInstance: StageInstance) {
    await logAction({
      guildId: stageInstance.guild?.id || stageInstance.guildId,
      type: LogType.Stage,
      title: 'Stage Ended',
      description: `A stage was ended in <#${stageInstance.channelId}>`,
      fields: [
        { name: 'Topic', value: stageInstance.topic, inline: true },
        { name: 'Channel', value: `<#${stageInstance.channelId}>`, inline: true },
      ],
      color: 0xed4245, // Red
    });
  }
}
