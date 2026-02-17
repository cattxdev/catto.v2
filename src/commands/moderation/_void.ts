import type { Guild, User } from 'discord.js';
import { CaseStatus } from '@prisma/client';
import type { CommandResponder } from '#lib/discord/index.js';
import { handleCaseClose } from './_caseManagement.js';

export interface VoidOptions {
  caseNumber: number;
  reason?: string;
  guild: Guild;
  guildId: string;
  moderator: User;
}

export async function handleCaseVoid(options: VoidOptions, ctx: CommandResponder) {
  return handleCaseClose(
    {
      caseNumber: options.caseNumber,
      status: CaseStatus.VOID,
      guild: options.guild,
      guildId: options.guildId,
      moderator: options.moderator,
    },
    ctx
  );
}
