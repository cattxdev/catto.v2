/**
 * Voice XP Configuration Repository
 */

import { container } from '@sapphire/framework';
import type { GuildVoiceXPConfig } from '@prisma/client';
import type { UpdateVoiceXPConfigDTO } from '../dtos';

export async function getVoiceXPConfig(guildId: string): Promise<GuildVoiceXPConfig> {
  return await container.prisma.guildVoiceXPConfig.upsert({
    where: { guildId },
    update: {},
    create: {
      guildId,
      enabled: true,
      xpPerMinute: 5,
      minSessionMinutes: 1,
      xpMode: 'PER_MINUTE',
      allowedChannels: [],
      ignoredChannels: [],
      awardMuted: false,
      awardDeafened: false,
      awardStreaming: true,
      awardVideo: true,
      ignoreAfkChannel: true,
      ignoredRoles: [],
      announceLevelUp: true,
      announceChannelId: null,
      messageTemplate: '🎤 {user} reached voice level {level}!',
      embedEnabled: true,
      embedColor: 5814783,
      levelCurveType: 'FORMULA',
      formulaBase: 5.0,
      formulaExponent: 2.0,
      formulaOffset: 50.0,
      tableThresholds: [],
    },
  });
}

export async function updateVoiceXPConfig(
  guildId: string,
  data: UpdateVoiceXPConfigDTO
): Promise<GuildVoiceXPConfig> {
  await getVoiceXPConfig(guildId);

  return await container.prisma.guildVoiceXPConfig.update({
    where: { guildId },
    data,
  });
}

export async function deleteVoiceXPConfig(guildId: string): Promise<void> {
  await container.prisma.guildVoiceXPConfig.delete({
    where: { guildId },
  });
}

export async function isVoiceXPEnabled(guildId: string): Promise<boolean> {
  const config = await getVoiceXPConfig(guildId);
  return config.enabled;
}

export async function getAllVoiceXPConfigs(
  limit: number = 100,
  offset: number = 0
): Promise<GuildVoiceXPConfig[]> {
  return await container.prisma.guildVoiceXPConfig.findMany({
    take: limit,
    skip: offset,
  });
}
