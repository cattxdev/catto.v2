/**
 * Voice XP Configuration Service
 * Manages voice XP configuration with caching
 */

import type { GuildVoiceXPConfig } from '@prisma/client';
import type { UpdateVoiceXPConfigDTO } from '../dtos';
import type { VoiceConfigCacheEntry } from '../types/voice-xp.types';
import * as voiceXPConfigRepository from '../repositories/voice-xp-config.repository';

const configCache = new Map<string, VoiceConfigCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getVoiceXPConfig(guildId: string, skipCache = false): Promise<GuildVoiceXPConfig> {
	if (!skipCache) {
		const cached = configCache.get(guildId);
		if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
			return cached.config;
		}
	}
	
	const config = await voiceXPConfigRepository.getVoiceXPConfig(guildId);
	
	configCache.set(guildId, {
		config,
		cachedAt: Date.now()
	});
	
	return config;
}

export async function updateVoiceXPConfig(
	guildId: string,
	data: UpdateVoiceXPConfigDTO
): Promise<GuildVoiceXPConfig> {
	const config = await voiceXPConfigRepository.updateVoiceXPConfig(guildId, data);
	
	configCache.set(guildId, {
		config,
		cachedAt: Date.now()
	});
	
	return config;
}

export async function deleteVoiceXPConfig(guildId: string): Promise<void> {
	await voiceXPConfigRepository.deleteVoiceXPConfig(guildId);
	configCache.delete(guildId);
}

export async function isVoiceXPEnabled(guildId: string): Promise<boolean> {
	const config = await getVoiceXPConfig(guildId);
	return config.enabled;
}

export function clearVoiceConfigCache(guildId?: string): void {
	if (guildId) {
		configCache.delete(guildId);
	} else {
		configCache.clear();
	}
}
