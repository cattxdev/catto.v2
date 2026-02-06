/**
 * Name Moderation Orchestrator Service
 * Coordinates normalization, validation, and action execution for channel name moderation
 */

import type { VoiceChannel } from 'discord.js';
import type { PrismaClient } from '@prisma/client';
import type { TempVoiceConfig } from '../../models/config.model.js';
import type {
  ModerationResult,
  ModerationContext,
  ValidationResult,
  RenameContext,
  RenameResult,
} from '../../models/name-moderation.model.js';
import { ModerationAction } from '../../models/name-moderation.model.js';
import { NameValidationService } from './name-validation.service.js';
import { AutoRenameService } from './auto-rename.service.js';

/**
 * Rate limit entry for tracking rename attempts
 */
interface RateLimitEntry {
  channelId: string;
  attempts: number;
  lastAttempt: number;
  botRenames: Set<string>; // Set of names bot has renamed to
}

/**
 * Service for orchestrating name moderation pipeline
 */
export class NameModerationService {
  private validationService: NameValidationService;
  private autoRenameService: AutoRenameService;
  private rateLimitMap: Map<string, RateLimitEntry>;

  // Rate limit configuration
  private readonly MAX_ATTEMPTS_PER_MINUTE = 5;
  private readonly RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

  constructor(private prisma: PrismaClient) {
    this.validationService = new NameValidationService();
    this.autoRenameService = new AutoRenameService();
    this.rateLimitMap = new Map();
  }

  /**
   * Moderate a channel name change
   * @param channel - Voice channel
   * @param oldName - Previous channel name
   * @param newName - New channel name
   * @param config - Guild moderation config
   * @param userId - User who changed the name
   * @returns Moderation result
   */
  async moderateChannelName(
    channel: VoiceChannel,
    oldName: string,
    newName: string,
    config: TempVoiceConfig,
    userId: string
  ): Promise<ModerationResult | null> {
    const startTime = Date.now();

    // Skip if moderation is disabled
    if (!config.moderationEnabled) {
      return null;
    }

    // Check if this is a bot-initiated rename (prevent loops)
    if (this.isBotRename(channel.id, newName)) {
      return null;
    }

    // Check rate limit
    if (this.isRateLimited(channel.id)) {
      console.warn(`Rate limit exceeded for channel ${channel.id}`);
      // Still allow the rename but log the warning
      // In production, you might want to block further attempts
    }

    // Build moderation context
    const context: ModerationContext = {
      guildId: channel.guild.id,
      channelId: channel.id,
      userId,
      previousName: oldName,
      strictMode: config.strictMode,
      allowListEnabled: config.allowListEnabled,
      customPatterns: config.customPatterns,
      allowedKeywords: config.allowedKeywords,
    };

    // Normalize and validate the name
    const validation = await this.validationService.validate(newName, context);

    // Determine action
    let actionTaken: ModerationAction;
    let finalName = newName;
    let renameResult = undefined;

    if (!validation.isAllowed) {
      // Name is not allowed, take configured action
      switch (config.moderationAction) {
        case 'AUTO_RENAME': {
          actionTaken = ModerationAction.AUTO_RENAME;
          const result = await this.executeAutoRename(channel, newName, validation);
          if (result) {
            finalName = result.finalName;
            renameResult = result.renameResult;
          } else {
            // Auto-rename failed, fall back to blocking
            actionTaken = ModerationAction.BLOCK;
            finalName = await this.executeBlock(channel, oldName);
          }
          break;
        }
        case 'BLOCK': {
          actionTaken = ModerationAction.BLOCK;
          finalName = await this.executeBlock(channel, oldName);
          break;
        }
        case 'WARN_ONLY':
        default: {
          actionTaken = ModerationAction.WARN_ONLY;
          await this.executeWarn(channel, validation);
          break;
        }
      }
    } else {
      // Name is allowed
      actionTaken = ModerationAction.WARN_ONLY; // No action needed
    }

    const result: ModerationResult = {
      validation,
      actionTaken,
      renameResult,
      finalName,
      processingTimeMs: Date.now() - startTime,
      timestamp: new Date(),
    };

    // Log the moderation event
    await this.logModerationEvent(channel, oldName, result, userId);

    // Update rate limit tracking
    this.updateRateLimit(channel.id);

    return result;
  }

  /**
   * Execute auto-rename action
   * @param channel - Voice channel
   * @param problematicName - Name that was flagged
   * @param validation - Validation result
   * @returns Rename result or null if failed
   */
  private async executeAutoRename(
    channel: VoiceChannel,
    problematicName: string,
    validation: ValidationResult
  ): Promise<{ finalName: string; renameResult: RenameResult } | null> {
    try {
      // Get existing channel names for collision detection
      const existingChannelNames = channel.guild.channels.cache
        .filter((c) => c.isVoiceBased())
        .map((c) => c.name);

      // Build rename context
      const renameContext: RenameContext = {
        originalName: problematicName,
        normalizedName: validation.normalizedName,
        guildId: channel.guild.id,
        channelId: channel.id,
        userId: channel.guild.ownerId, // Use guild owner as fallback
        reasonCodes: validation.reasonCodes,
        existingChannelNames,
      };

      // Generate safe name
      const renameResult = await this.autoRenameService.generateSafeName(renameContext);

      // Mark this as a bot rename to prevent loop
      this.markAsBotRename(channel.id, renameResult.suggestedName);

      // Actually rename the channel
      await channel.setName(renameResult.suggestedName);

      return {
        finalName: renameResult.suggestedName,
        renameResult,
      };
    } catch (error) {
      console.error('Failed to auto-rename channel:', error);
      return null;
    }
  }

  /**
   * Execute block action (revert to previous name)
   * @param channel - Voice channel
   * @param previousName - Previous safe name
   * @returns Final name
   */
  private async executeBlock(channel: VoiceChannel, previousName: string): Promise<string> {
    try {
      // Mark this as a bot rename to prevent loop
      this.markAsBotRename(channel.id, previousName);

      // Revert to previous name
      await channel.setName(previousName);

      return previousName;
    } catch (error) {
      console.error('Failed to block channel rename:', error);
      return channel.name; // Return current name if revert failed
    }
  }

  /**
   * Execute warn action (log only, no action)
   * @param channel - Voice channel
   * @param validation - Validation result
   */
  private async executeWarn(channel: VoiceChannel, validation: ValidationResult): Promise<void> {
    // Just log a warning
    console.warn(
      `[Name Moderation] Warning for channel ${channel.id} (${channel.name}):`,
      validation.reasonCodes
    );

    // In production, you might want to send a message to a mod channel
    // or create a notification for moderators
  }

  /**
   * Log moderation event to database
   * @param channel - Voice channel
   * @param originalName - Original name before moderation
   * @param result - Moderation result
   * @param userId - User who changed the name
   */
  private async logModerationEvent(
    channel: VoiceChannel,
    originalName: string,
    result: ModerationResult,
    userId: string
  ): Promise<void> {
    try {
      await this.prisma.tempVoiceModerationLog.create({
        data: {
          guildId: channel.guild.id,
          channelId: channel.id,
          userId,
          originalName,
          normalizedName: result.validation.normalizedName,
          finalName: result.finalName,
          isAllowed: result.validation.isAllowed,
          reasonCodes: JSON.stringify(result.validation.reasonCodes),
          matchedPatterns: JSON.stringify(result.validation.matchedPatterns || []),
          heuristicScore: result.validation.heuristicScore,
          actionTaken: result.actionTaken,
          strategyUsed: result.renameResult?.strategyUsed || null,
          processingTimeMs: result.processingTimeMs,
          metadata: JSON.stringify({
            timestamp: result.timestamp.toISOString(),
            collisionChecked: result.renameResult?.collisionChecked,
            collisionAttempts: result.renameResult?.collisionAttempts,
          }),
        },
      });
    } catch (error) {
      console.error('Failed to log moderation event:', error);
      // Don't throw - logging failure shouldn't break moderation
    }
  }

  /**
   * Check if a rename is bot-initiated (to prevent loops)
   * @param channelId - Channel ID
   * @param newName - New name
   * @returns True if this is a bot rename
   */
  private isBotRename(channelId: string, newName: string): boolean {
    const entry = this.rateLimitMap.get(channelId);
    if (!entry) return false;

    return entry.botRenames.has(newName);
  }

  /**
   * Mark a name as bot-initiated
   * @param channelId - Channel ID
   * @param name - Name that bot set
   */
  private markAsBotRename(channelId: string, name: string): void {
    let entry = this.rateLimitMap.get(channelId);
    if (!entry) {
      entry = {
        channelId,
        attempts: 0,
        lastAttempt: Date.now(),
        botRenames: new Set(),
      };
      this.rateLimitMap.set(channelId, entry);
    }

    entry.botRenames.add(name);

    // Clean up old bot renames after 5 minutes
    setTimeout(() => {
      const e = this.rateLimitMap.get(channelId);
      if (e) {
        e.botRenames.delete(name);
      }
    }, 300_000);
  }

  /**
   * Check if channel is rate limited
   * @param channelId - Channel ID
   * @returns True if rate limited
   */
  private isRateLimited(channelId: string): boolean {
    const entry = this.rateLimitMap.get(channelId);
    if (!entry) return false;

    const now = Date.now();
    const timeSinceLastAttempt = now - entry.lastAttempt;

    // Reset if outside window
    if (timeSinceLastAttempt > this.RATE_LIMIT_WINDOW_MS) {
      entry.attempts = 0;
      entry.lastAttempt = now;
      return false;
    }

    // Check if exceeded limit
    return entry.attempts >= this.MAX_ATTEMPTS_PER_MINUTE;
  }

  /**
   * Update rate limit tracking
   * @param channelId - Channel ID
   */
  private updateRateLimit(channelId: string): void {
    let entry = this.rateLimitMap.get(channelId);
    if (!entry) {
      entry = {
        channelId,
        attempts: 0,
        lastAttempt: Date.now(),
        botRenames: new Set(),
      };
      this.rateLimitMap.set(channelId, entry);
    }

    entry.attempts++;
    entry.lastAttempt = Date.now();
  }

  /**
   * Clean up rate limit entries (call periodically)
   */
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [channelId, entry] of this.rateLimitMap.entries()) {
      if (now - entry.lastAttempt > this.RATE_LIMIT_WINDOW_MS) {
        this.rateLimitMap.delete(channelId);
      }
    }
  }
}
