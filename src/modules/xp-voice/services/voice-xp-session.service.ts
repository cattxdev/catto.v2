/**
 * Voice XP Session Service
 * Manages voice session lifecycle and XP awards
 */

import type { VoiceState } from 'discord.js';
import type { VoiceValidationContext, SessionAwardResult } from '../types/voice-xp.types';
import { VoiceXPMode } from '../types/voice-xp.types';
import * as sessionTracking from '../utils/session-tracking';
import * as validation from '../utils/validation';
import * as voiceSessionRepository from '../repositories/voice-session.repository';
import * as voiceXPRepository from '../repositories/voice-xp.repository';
import { calculateVoiceLevel } from './voice-level-calculator.service';
import { getVoiceXPConfig } from './voice-xp-config.service';
import { container } from '@sapphire/framework';

export async function handleVoiceJoin(voiceState: VoiceState): Promise<void> {
	const { guild, member, channelId } = voiceState;
	if (!guild || !member || !channelId) return;
	
	const config = await getVoiceXPConfig(guild.id);
	if (!config.enabled) return;
	
	// Check if user is a bot
	if (member.user.bot) return;
	
	// Create database session
	const dbSession = await voiceSessionRepository.createVoiceSession(
		guild.id,
		member.id,
		channelId,
		(voiceState.mute ?? false) || (voiceState.selfMute ?? false),
		(voiceState.deaf ?? false) || (voiceState.selfDeaf ?? false),
		voiceState.streaming ?? false,
		voiceState.selfVideo ?? false
	);
	
	// Start in-memory session tracking
	sessionTracking.startSession({
		guildId: guild.id,
		userId: member.id,
		channelId,
		joinedAt: Date.now(),
		sessionId: dbSession.id,
		isMuted: (voiceState.mute ?? false) || (voiceState.selfMute ?? false),
		isDeafened: (voiceState.deaf ?? false) || (voiceState.selfDeaf ?? false),
		isStreaming: voiceState.streaming ?? false,
		isVideo: voiceState.selfVideo ?? false,
		lastAwardTime: Date.now()
	});
	
	container.logger.info(`[Voice XP] User ${member.user.tag} joined voice in guild ${guild.name}`);
}

export async function handleVoiceLeave(voiceState: VoiceState): Promise<SessionAwardResult | null> {
	const { guild, member } = voiceState;
	if (!guild || !member) return null;
	
	const config = await getVoiceXPConfig(guild.id);
	if (!config.enabled) return null;
	
	// End in-memory session
	const session = sessionTracking.endSession(guild.id, member.id);
	if (!session) {
		container.logger.warn(`[Voice XP] No active session found for ${member.user.tag}`);
		return null;
	}
	
	const durationMinutes = Math.floor((Date.now() - session.joinedAt) / 60000);
	
	// Check minimum duration
	if (durationMinutes < config.minSessionMinutes) {
		await voiceSessionRepository.endVoiceSession(session.sessionId, durationMinutes, 0);
		container.logger.debug(`[Voice XP] Session too short: ${durationMinutes}m < ${config.minSessionMinutes}m`);
		return {
			awarded: false,
			reason: 'Session duration below minimum'
		};
	}
	
	// Validate XP award
	const context: VoiceValidationContext = {
		guildId: guild.id,
		userId: member.id,
		channelId: session.channelId,
		userRoles: member.roles.cache.map(r => r.id),
		isMuted: session.isMuted,
		isDeafened: session.isDeafened,
		isStreaming: session.isStreaming,
		isVideo: session.isVideo,
		isAfkChannel: false // TODO: Check if channel is AFK channel
	};
	
	const validationResult = validation.validateVoiceXPAward(context, config);
	if (!validationResult.valid) {
		await voiceSessionRepository.endVoiceSession(session.sessionId, durationMinutes, 0);
		container.logger.debug(`[Voice XP] Session not awarded: ${validationResult.reason}`);
		return {
			awarded: false,
			reason: validationResult.reason || 'Validation failed'
		};
	}
	
	// Calculate XP award
	const xpAwarded = validation.calculateSessionXP(durationMinutes, config.xpPerMinute);
	
	// Award XP
	const userXP = await voiceXPRepository.getUserVoiceXP(guild.id, member.id);
	const newTotalXP = (userXP?.xp ?? 0) + xpAwarded;
	const levelCalc = calculateVoiceLevel(config, newTotalXP);
	
	const result = await voiceXPRepository.awardVoiceXPSafe(
		guild.id,
		member.id,
		xpAwarded,
		levelCalc.level,
		durationMinutes
	);
	
	// Update database session
	await voiceSessionRepository.endVoiceSession(session.sessionId, durationMinutes, xpAwarded);
	
	container.logger.info(
		`[Voice XP] Awarded ${xpAwarded} XP to ${member.user.tag} for ${durationMinutes}m session (Level ${result.userXP.level})`
	);
	
	return {
		awarded: true,
		xpGained: xpAwarded,
		newXp: result.userXP.xp,
		newLevel: result.userXP.level,
		leveledUp: result.leveledUp,
		previousLevel: result.previousLevel,
		durationMinutes
	};
}

export async function handleVoiceMove(
	oldState: VoiceState,
	newState: VoiceState
): Promise<SessionAwardResult | null> {
	// End old session and start new one
	const leaveResult = await handleVoiceLeave(oldState);
	await handleVoiceJoin(newState);
	return leaveResult;
}

export async function handleVoiceStateUpdate(_oldState: VoiceState, newState: VoiceState): Promise<void> {
	const { guild, member } = newState;
	if (!guild || !member) return;
	
	const session = sessionTracking.getActiveSession(guild.id, member.id);
	if (!session) return;
	
	// Update session state
	session.isMuted = (newState.mute ?? false) || (newState.selfMute ?? false);
	session.isDeafened = (newState.deaf ?? false) || (newState.selfDeaf ?? false);
	session.isStreaming = newState.streaming ?? false;
	session.isVideo = newState.selfVideo ?? false;
}

export async function awardPerMinuteXP(guildId: string): Promise<number> {
	const config = await getVoiceXPConfig(guildId);
	if (!config.enabled || config.xpMode !== VoiceXPMode.PER_MINUTE) return 0;
	
	const activeSessions = sessionTracking.getGuildActiveSessions(guildId);
	let awarded = 0;
	
	for (const session of activeSessions) {
		const minutesSinceLastAward = Math.floor((Date.now() - session.lastAwardTime) / 60000);
		if (minutesSinceLastAward < 1) continue;
		
		// Validate XP award
		const context: VoiceValidationContext = {
			guildId: session.guildId,
			userId: session.userId,
			channelId: session.channelId,
			userRoles: [], // TODO: Fetch member roles
			isMuted: session.isMuted,
			isDeafened: session.isDeafened,
			isStreaming: session.isStreaming,
			isVideo: session.isVideo,
			isAfkChannel: false // TODO: Check if channel is AFK channel
		};
		
		const validationResult = validation.validateVoiceXPAward(context, config);
		if (!validationResult.valid) continue;
		
		// Award XP for 1 minute
		const xpAwarded = config.xpPerMinute;
		const userXP = await voiceXPRepository.getUserVoiceXP(guildId, session.userId);
		const newTotalXP = (userXP?.xp ?? 0) + xpAwarded;
		const levelCalc = calculateVoiceLevel(config, newTotalXP);
		
		await voiceXPRepository.awardVoiceXPSafe(
			guildId,
			session.userId,
			xpAwarded,
			levelCalc.level,
			1 // 1 minute
		);
		
		session.lastAwardTime = Date.now();
		awarded++;
	}
	
	return awarded;
}
