import { CaseStatus } from '@prisma/client';
import type { CommandResponder } from '#lib/discord/index.js';
import type { VoidOptions } from '#lib/interaction/typedOptions.js';
import { handleCaseClose } from './_caseManagement.js';
import { caseService } from '../../modules/moderation/services/CaseService.js';
import { asGuildId } from '../../modules/moderation/domain/types.js';

export type { VoidOptions };

export async function handleCaseVoid(options: VoidOptions, ctx: CommandResponder) {
  // If a reason was provided, update the case reason before voiding
  if (options.reason) {
    await caseService.editReason(
      asGuildId(options.guildId),
      options.caseNumber,
      `[VOIDED] ${options.reason}`
    );
  }

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
