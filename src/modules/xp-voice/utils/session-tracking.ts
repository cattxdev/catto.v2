/**
 * Voice Session Tracking Utilities
 */

import type { ActiveSession } from '../types/voice-xp.types';

/**
 * In-memory active session tracker
 * Key: `${guildId}:${userId}`
 */
const activeSessions = new Map<string, ActiveSession>();

/**
 * Create session key
 */
export function getSessionKey(guildId: string, userId: string): string {
	return `${guildId}:${userId}`;
}

/**
 * Start tracking a voice session
 */
export function startSession(session: ActiveSession): void {
	const key = getSessionKey(session.guildId, session.userId);
	activeSessions.set(key, session);
}

/**
 * Get active session for a user
 */
export function getActiveSession(guildId: string, userId: string): ActiveSession | null {
	const key = getSessionKey(guildId, userId);
	return activeSessions.get(key) ?? null;
}

/**
 * End and remove a session
 */
export function endSession(guildId: string, userId: string): ActiveSession | null {
	const key = getSessionKey(guildId, userId);
	const session = activeSessions.get(key);
	if (session) {
		activeSessions.delete(key);
		return session;
	}
	return null;
}

/**
 * Calculate session duration in minutes
 */
export function calculateSessionDuration(joinedAt: Date, leftAt: Date = new Date()): number {
	const durationMs = leftAt.getTime() - joinedAt.getTime();
	return Math.floor(durationMs / 1000 / 60);
}

/**
 * Check if minimum session duration is met
 */
export function meetsMinimumDuration(joinedAt: Date, minMinutes: number): boolean {
	const duration = calculateSessionDuration(joinedAt);
	return duration >= minMinutes;
}

/**
 * Get all active sessions for a guild
 */
export function getGuildActiveSessions(guildId: string): ActiveSession[] {
	const sessions: ActiveSession[] = [];
	for (const [, session] of activeSessions.entries()) {
		if (session.guildId === guildId) {
			sessions.push(session);
		}
	}
	return sessions;
}

/**
 * Clear all sessions (useful for bot restarts)
 */
export function clearAllSessions(): void {
	activeSessions.clear();
}

/**
 * Get session count
 */
export function getSessionCount(): number {
	return activeSessions.size;
}
