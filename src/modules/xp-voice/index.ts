/**
 * Voice XP Module
 * Time-based experience and leveling system for voice channels
 */

export * from './types/voice-xp.types';
export * from './dtos';
export * from './utils';
export * from './repositories';

// Export only specific services to avoid conflicts with repositories
export { getVoiceLeaderboard, getVoiceUserStats } from './services/voice-xp-leaderboard.service';

export {
  calculateVoiceLevel,
  recalculateAllVoiceLevels,
} from './services/voice-level-calculator.service';

export {
  handleVoiceJoin,
  handleVoiceLeave,
  handleVoiceMove,
  handleVoiceStateUpdate,
  awardPerMinuteXP,
} from './services/voice-xp-session.service';

export {
  getVoiceXPConfig,
  updateVoiceXPConfig,
  deleteVoiceXPConfig,
  isVoiceXPEnabled,
  clearVoiceConfigCache as clearVoiceXPConfigCache,
} from './services/voice-xp-config.service';

export { voiceXPQueue } from './services/voice-xp-queue.service';
