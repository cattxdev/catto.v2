import { container } from '@sapphire/framework';
import { z } from 'zod';

function assertRedisAvailable(): void {
  const redis = (container as unknown as { redis?: unknown }).redis;
  if (!redis) {
    throw new Error('Redis is not configured (container.redis is missing).');
  }
}

/**
 * Set a JSON value in Redis with schema validation
 * @param key - Cache key
 * @param schema - Zod schema for validation
 * @param value - Value to store (must match schema)
 * @param ttlSeconds - Optional TTL in seconds
 */
export async function setJson<T extends z.ZodType>(
  key: string,
  schema: T,
  value: z.input<T>,
  ttlSeconds?: number
): Promise<void> {
  assertRedisAvailable();
  // Validate before storing
  const validated = schema.parse(value);
  const serialized = JSON.stringify(validated);

  if (ttlSeconds && ttlSeconds > 0) {
    await container.redis.setex(key, ttlSeconds, serialized);
  } else {
    await container.redis.set(key, serialized);
  }
}

/**
 * Get a JSON value from Redis with schema validation
 * @param key - Cache key
 * @param schema - Zod schema for validation
 * @returns Parsed and validated value, or null if not found or invalid
 */
export async function getJson<T extends z.ZodType>(
  key: string,
  schema: T
): Promise<z.output<T> | null> {
  assertRedisAvailable();
  const value = await container.redis.get(key);

  if (value === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    const result = schema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    // Log validation failure but don't throw
    container.logger.warn(`Cache validation failed for key ${key}:`, result.error.message);
    return null;
  } catch (error) {
    container.logger.warn(`Cache parse error for key ${key}:`, error);
    return null;
  }
}

/**
 * Get a JSON value, or compute and cache it if not found
 * @param key - Cache key
 * @param schema - Zod schema for validation
 * @param compute - Function to compute the value if not cached
 * @param ttlSeconds - Optional TTL in seconds
 */
export async function getOrSetJson<T extends z.ZodType>(
  key: string,
  schema: T,
  compute: () => Promise<z.input<T>>,
  ttlSeconds?: number
): Promise<z.output<T>> {
  assertRedisAvailable();
  const cached = await getJson(key, schema);

  if (cached !== null) {
    return cached;
  }

  const computed = await compute();
  await setJson(key, schema, computed, ttlSeconds);

  return schema.parse(computed);
}

/**
 * Delete a cached value
 */
export async function deleteJson(key: string): Promise<void> {
  assertRedisAvailable();
  await container.redis.del(key);
}

/**
 * Check if a key exists
 */
export async function hasJson(key: string): Promise<boolean> {
  assertRedisAvailable();
  const exists = await container.redis.exists(key);
  return exists === 1;
}

/**
 * Set multiple JSON values atomically
 */
export async function setJsonMulti<T extends z.ZodType>(
  entries: Array<{ key: string; schema: T; value: z.input<T>; ttlSeconds?: number }>
): Promise<void> {
  assertRedisAvailable();
  const pipeline = container.redis.pipeline();

  for (const entry of entries) {
    const validated = entry.schema.parse(entry.value);
    const serialized = JSON.stringify(validated);

    if (entry.ttlSeconds && entry.ttlSeconds > 0) {
      pipeline.setex(entry.key, entry.ttlSeconds, serialized);
    } else {
      pipeline.set(entry.key, serialized);
    }
  }

  await pipeline.exec();
}

/**
 * Cache key builder for common patterns
 */
export const CacheKey = {
  modConfig: (guildId: string) => `mod:config:${guildId}`,
  modCase: (guildId: string, caseNumber: number) => `mod:case:${guildId}:${caseNumber}`,
  userCases: (guildId: string, userId: string) => `mod:usercases:${guildId}:${userId}`,
  guildSettings: (guildId: string) => `guild:settings:${guildId}`,
  permissionGrants: (guildId: string) => `permissions:grants:${guildId}`,
  // Voice-related keys
  voiceMemberPresence: (guildId: string, userId: string) =>
    `guild:${guildId}:voice:member:${userId}`,
  voiceChannelMembers: (guildId: string, channelId: string) =>
    `guild:${guildId}:voice:channel:${channelId}:members`,
  voiceWatch: (guildId: string, interactionId: string) => `voiceWatch:${guildId}:${interactionId}`,
  voiceTrack: (guildId: string, interactionId: string) => `voiceTrack:${guildId}:${interactionId}`,
  voiceWatchByTarget: (guildId: string, targetId: string) =>
    `voiceWatch:target:${guildId}:${targetId}`,
  voiceTrackByChannel: (guildId: string, channelId: string) =>
    `voiceTrack:channel:${guildId}:${channelId}`,
  // Voice mute-all toggle keys
  voiceMuteAllState: (guildId: string, channelId: string) =>
    `voiceMuteAll:state:${guildId}:${channelId}`,
  voiceMuteAllIgnore: (guildId: string, channelId: string) =>
    `voiceMuteAll:ignore:${guildId}:${channelId}`,
  voiceMuteAllAffected: (guildId: string, channelId: string) =>
    `voiceMuteAll:affected:${guildId}:${channelId}`,
  // Discord OAuth token cache keys (keyed by truncated SHA-256 hash of token)
  discordUser: (tokenHash: string) => `discord:user:${tokenHash}`,
  discordGuilds: (tokenHash: string) => `discord:guilds:${tokenHash}`,
} as const;
