/**
 * Voice XP Level Calculator Service
 * Calculates levels based on XP using formula or table
 */

import type { GuildVoiceXPConfig } from '@prisma/client';
import type { VoiceLevelCalculation } from '../types/voice-xp.types';
import { VoiceLevelCurveType } from '../types/voice-xp.types';

export function calculateVoiceLevel(
  config: GuildVoiceXPConfig,
  currentXP: number
): VoiceLevelCalculation {
  if (config.levelCurveType === VoiceLevelCurveType.TABLE) {
    return calculateLevelFromTable(config, currentXP);
  } else {
    return calculateLevelFromFormula(config, currentXP);
  }
}

function calculateLevelFromFormula(
  config: GuildVoiceXPConfig,
  currentXP: number
): VoiceLevelCalculation {
  const base = config.formulaBase;
  const exponent = config.formulaExponent;
  const offset = config.formulaOffset;

  // Formula: XP(level) = base * level^exponent + offset
  // Solve for level: level = ((XP - offset) / base)^(1/exponent)
  let level = 0;
  if (currentXP >= offset) {
    level = Math.floor(Math.pow((currentXP - offset) / base, 1 / exponent));
  }

  const currentLevelXP = Math.floor(base * Math.pow(level, exponent) + offset);
  const nextLevelXP = Math.floor(base * Math.pow(level + 1, exponent) + offset);
  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const progress = xpNeededForLevel > 0 ? (xpInCurrentLevel / xpNeededForLevel) * 100 : 0;

  return {
    level,
    currentLevelXp: currentLevelXP,
    nextLevelXp: nextLevelXP,
    progress,
    xpIntoLevel: xpInCurrentLevel,
  };
}

function calculateLevelFromTable(
  config: GuildVoiceXPConfig,
  currentXP: number
): VoiceLevelCalculation {
  const thresholds = config.tableThresholds;

  if (!thresholds || thresholds.length === 0) {
    return {
      level: 0,
      currentLevelXp: 0,
      nextLevelXp: 0,
      progress: 0,
      xpIntoLevel: 0,
    };
  }

  let level = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (currentXP >= (thresholds[i] ?? 0)) {
      level = i + 1;
    } else {
      break;
    }
  }

  const currentLevelXP = level > 0 ? (thresholds[level - 1] ?? 0) : 0;
  const nextLevelXP =
    level < thresholds.length
      ? (thresholds[level] ?? currentLevelXP + 1000)
      : currentLevelXP + 1000;
  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const progress = xpNeededForLevel > 0 ? (xpInCurrentLevel / xpNeededForLevel) * 100 : 0;

  return {
    level,
    currentLevelXp: currentLevelXP,
    nextLevelXp: nextLevelXP,
    progress,
    xpIntoLevel: xpInCurrentLevel,
  };
}

export function recalculateAllVoiceLevels(
  config: GuildVoiceXPConfig,
  users: Array<{ userId: string; xp: number }>
): Array<{ userId: string; newLevel: number }> {
  return users.map((user) => ({
    userId: user.userId,
    newLevel: calculateVoiceLevel(config, user.xp).level,
  }));
}
