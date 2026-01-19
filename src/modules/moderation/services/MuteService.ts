import { container } from '@sapphire/framework';
import type { Guild, GuildMember } from 'discord.js';
import { MuteType, ModAction } from '@prisma/client';
import {
  type GuildId,
  type UserId,
  type DurationSeconds,
  type MuteResult,
  type MuteData,
  type MuteTextInput,
  type MuteVoiceInput,
  type MuteBothInput,
  asMuteId,
  asCaseNumber,
} from '../domain/types.js';

/**
 * MuteService - Handles text mutes, voice mutes, and combined mutes
 */
export class MuteService {
  /**
   * Apply a text mute to a user (role-based)
   */
  async muteText(
    guild: Guild,
    targetMember: GuildMember,
    moderatorId: UserId,
    moderatorTag: string,
    input: MuteTextInput
  ): Promise<MuteResult> {
    try {
      const config = await this.getConfig(input.guildId);
      const mutedRole = config?.mutedTextRole || config?.muteRoleId;

      if (!mutedRole) {
        return { success: false, error: 'No muted text role configured' };
      }

      // Check if role exists
      const role = await guild.roles.fetch(mutedRole).catch(() => null);
      if (!role) {
        return { success: false, error: 'Muted role not found in server' };
      }

      // Check hierarchy
      const botMember = guild.members.me;
      if (botMember && role.position >= botMember.roles.highest.position) {
        return { success: false, error: 'Muted role is higher than my highest role' };
      }

      // Apply the role
      await targetMember.roles.add(role, `Text mute: ${input.reason} | Moderator: ${moderatorTag}`);

      // Calculate expiration
      const expiresAt = input.duration ? new Date(Date.now() + input.duration * 1000) : null;

      // Create mute record
      const mute = await container.prisma.mute.upsert({
        where: {
          guildId_userId_type: {
            guildId: input.guildId,
            userId: input.userId,
            type: MuteType.TEXT,
          },
        },
        update: {
          createdById: input.createdById,
          reason: input.reason,
          duration: input.duration ?? null,
          expiresAt,
          active: true,
        },
        create: {
          guildId: input.guildId,
          userId: input.userId,
          createdById: input.createdById,
          type: MuteType.TEXT,
          reason: input.reason,
          duration: input.duration ?? null,
          expiresAt,
          active: true,
        },
      });

      // Create mod case
      const caseNumber = await this.createMuteCase(
        input.guildId,
        input.userId,
        targetMember.user.tag,
        moderatorId,
        moderatorTag,
        ModAction.MUTE_TEXT,
        input.reason,
        input.duration,
        expiresAt
      );

      // Schedule unmute if duration set
      if (expiresAt) {
        const { muteScheduler } = await import('./MuteScheduler.js');
        await muteScheduler.scheduleUnmute(
          mute.id,
          input.guildId,
          input.userId,
          MuteType.TEXT,
          input.duration! * 1000
        );
      }

      return { success: true, muteId: asMuteId(mute.id), caseNumber };
    } catch (error) {
      container.logger.error('[MuteService] Failed to mute text:', error);
      return { success: false, error: 'Failed to apply text mute' };
    }
  }

  /**
   * Remove a text mute from a user
   */
  async unmuteText(
    guild: Guild,
    targetMember: GuildMember,
    moderatorId: UserId,
    moderatorTag: string,
    guildId: GuildId,
    userId: UserId,
    reason: string
  ): Promise<MuteResult> {
    try {
      const config = await this.getConfig(guildId);
      const mutedRole = config?.mutedTextRole || config?.muteRoleId;

      if (mutedRole) {
        const role = await guild.roles.fetch(mutedRole).catch(() => null);
        if (role && targetMember.roles.cache.has(role.id)) {
          await targetMember.roles.remove(
            role,
            `Text unmute: ${reason} | Moderator: ${moderatorTag}`
          );
        }
      }

      // Mark mute as inactive
      await container.prisma.mute.updateMany({
        where: {
          guildId,
          userId,
          type: MuteType.TEXT,
          active: true,
        },
        data: { active: false },
      });

      // Cancel any scheduled unmute
      const { muteScheduler } = await import('./MuteScheduler.js');
      await muteScheduler.cancelUnmute(guildId, userId, MuteType.TEXT);

      // Create unmute case
      const caseNumber = await this.createMuteCase(
        guildId,
        userId,
        targetMember.user.tag,
        moderatorId,
        moderatorTag,
        ModAction.UNMUTE_TEXT,
        reason
      );

      return { success: true, caseNumber };
    } catch (error) {
      container.logger.error('[MuteService] Failed to unmute text:', error);
      return { success: false, error: 'Failed to remove text mute' };
    }
  }

  /**
   * Apply a voice mute to a user (server deafen)
   */
  async muteVoice(
    _guild: Guild,
    targetMember: GuildMember,
    moderatorId: UserId,
    moderatorTag: string,
    input: MuteVoiceInput
  ): Promise<MuteResult> {
    try {
      // Server deafen the user if in voice
      if (targetMember.voice.channel) {
        await targetMember.voice.setDeaf(
          true,
          `Voice mute: ${input.reason} | Moderator: ${moderatorTag}`
        );
      }

      // Calculate expiration
      const expiresAt = input.duration ? new Date(Date.now() + input.duration * 1000) : null;

      // Create mute record
      const mute = await container.prisma.mute.upsert({
        where: {
          guildId_userId_type: {
            guildId: input.guildId,
            userId: input.userId,
            type: MuteType.VOICE,
          },
        },
        update: {
          createdById: input.createdById,
          reason: input.reason,
          duration: input.duration ?? null,
          expiresAt,
          active: true,
        },
        create: {
          guildId: input.guildId,
          userId: input.userId,
          createdById: input.createdById,
          type: MuteType.VOICE,
          reason: input.reason,
          duration: input.duration ?? null,
          expiresAt,
          active: true,
        },
      });

      // Create mod case
      const caseNumber = await this.createMuteCase(
        input.guildId,
        input.userId,
        targetMember.user.tag,
        moderatorId,
        moderatorTag,
        ModAction.MUTE_VOICE,
        input.reason,
        input.duration,
        expiresAt
      );

      // Schedule unmute if duration set
      if (expiresAt) {
        const { muteScheduler } = await import('./MuteScheduler.js');
        await muteScheduler.scheduleUnmute(
          mute.id,
          input.guildId,
          input.userId,
          MuteType.VOICE,
          input.duration! * 1000
        );
      }

      return { success: true, muteId: asMuteId(mute.id), caseNumber };
    } catch (error) {
      container.logger.error('[MuteService] Failed to mute voice:', error);
      return { success: false, error: 'Failed to apply voice mute' };
    }
  }

  /**
   * Remove a voice mute from a user
   */
  async unmuteVoice(
    _guild: Guild,
    targetMember: GuildMember,
    moderatorId: UserId,
    moderatorTag: string,
    guildId: GuildId,
    userId: UserId,
    reason: string
  ): Promise<MuteResult> {
    try {
      // Remove server deafen if in voice
      if (targetMember.voice.channel) {
        await targetMember.voice.setDeaf(
          false,
          `Voice unmute: ${reason} | Moderator: ${moderatorTag}`
        );
      }

      // Mark mute as inactive
      await container.prisma.mute.updateMany({
        where: {
          guildId,
          userId,
          type: MuteType.VOICE,
          active: true,
        },
        data: { active: false },
      });

      // Cancel any scheduled unmute
      const { muteScheduler } = await import('./MuteScheduler.js');
      await muteScheduler.cancelUnmute(guildId, userId, MuteType.VOICE);

      // Create unmute case
      const caseNumber = await this.createMuteCase(
        guildId,
        userId,
        targetMember.user.tag,
        moderatorId,
        moderatorTag,
        ModAction.UNMUTE_VOICE,
        reason
      );

      return { success: true, caseNumber };
    } catch (error) {
      container.logger.error('[MuteService] Failed to unmute voice:', error);
      return { success: false, error: 'Failed to remove voice mute' };
    }
  }

  /**
   * Apply both text and voice mute
   */
  async muteBoth(
    guild: Guild,
    targetMember: GuildMember,
    moderatorId: UserId,
    moderatorTag: string,
    input: MuteBothInput
  ): Promise<MuteResult> {
    try {
      const config = await this.getConfig(input.guildId);
      const mutedRole = config?.mutedTextRole || config?.muteRoleId;

      // Apply text mute role
      if (mutedRole) {
        const role = await guild.roles.fetch(mutedRole).catch(() => null);
        if (role) {
          await targetMember.roles.add(
            role,
            `Combined mute: ${input.reason} | Moderator: ${moderatorTag}`
          );
        }
      }

      // Server deafen if in voice
      if (targetMember.voice.channel) {
        await targetMember.voice.setDeaf(
          true,
          `Combined mute: ${input.reason} | Moderator: ${moderatorTag}`
        );
      }

      const expiresAt = input.duration ? new Date(Date.now() + input.duration * 1000) : null;

      // Create mute record
      const mute = await container.prisma.mute.upsert({
        where: {
          guildId_userId_type: {
            guildId: input.guildId,
            userId: input.userId,
            type: MuteType.BOTH,
          },
        },
        update: {
          createdById: input.createdById,
          reason: input.reason,
          duration: input.duration ?? null,
          expiresAt,
          active: true,
        },
        create: {
          guildId: input.guildId,
          userId: input.userId,
          createdById: input.createdById,
          type: MuteType.BOTH,
          reason: input.reason,
          duration: input.duration ?? null,
          expiresAt,
          active: true,
        },
      });

      // Create mod case
      const caseNumber = await this.createMuteCase(
        input.guildId,
        input.userId,
        targetMember.user.tag,
        moderatorId,
        moderatorTag,
        ModAction.MUTE_BOTH,
        input.reason,
        input.duration,
        expiresAt
      );

      // Schedule unmute if duration set
      if (expiresAt) {
        const { muteScheduler } = await import('./MuteScheduler.js');
        await muteScheduler.scheduleUnmute(
          mute.id,
          input.guildId,
          input.userId,
          MuteType.BOTH,
          input.duration! * 1000
        );
      }

      return { success: true, muteId: asMuteId(mute.id), caseNumber };
    } catch (error) {
      container.logger.error('[MuteService] Failed to mute both:', error);
      return { success: false, error: 'Failed to apply combined mute' };
    }
  }

  /**
   * Remove both text and voice mute
   */
  async unmuteBoth(
    guild: Guild,
    targetMember: GuildMember,
    moderatorId: UserId,
    moderatorTag: string,
    guildId: GuildId,
    userId: UserId,
    reason: string
  ): Promise<MuteResult> {
    try {
      const config = await this.getConfig(guildId);
      const mutedRole = config?.mutedTextRole || config?.muteRoleId;

      // Remove text mute role
      if (mutedRole) {
        const role = await guild.roles.fetch(mutedRole).catch(() => null);
        if (role && targetMember.roles.cache.has(role.id)) {
          await targetMember.roles.remove(
            role,
            `Combined unmute: ${reason} | Moderator: ${moderatorTag}`
          );
        }
      }

      // Remove server deafen if in voice
      if (targetMember.voice.channel) {
        await targetMember.voice.setDeaf(
          false,
          `Combined unmute: ${reason} | Moderator: ${moderatorTag}`
        );
      }

      // Mark all mute types as inactive
      await container.prisma.mute.updateMany({
        where: {
          guildId,
          userId,
          active: true,
        },
        data: { active: false },
      });

      // Cancel any scheduled unmutes
      const { muteScheduler } = await import('./MuteScheduler.js');
      await muteScheduler.cancelUnmute(guildId, userId, MuteType.TEXT);
      await muteScheduler.cancelUnmute(guildId, userId, MuteType.VOICE);
      await muteScheduler.cancelUnmute(guildId, userId, MuteType.BOTH);

      // Create unmute case
      const caseNumber = await this.createMuteCase(
        guildId,
        userId,
        targetMember.user.tag,
        moderatorId,
        moderatorTag,
        ModAction.UNMUTE_BOTH,
        reason
      );

      return { success: true, caseNumber };
    } catch (error) {
      container.logger.error('[MuteService] Failed to unmute both:', error);
      return { success: false, error: 'Failed to remove combined mute' };
    }
  }

  /**
   * Get all active mutes for a user in a guild
   */
  async getActiveMutes(guildId: GuildId, userId: UserId): Promise<MuteData[]> {
    const mutes = await container.prisma.mute.findMany({
      where: {
        guildId,
        userId,
        active: true,
      },
    });

    return mutes.map(this.mapMuteToData);
  }

  /**
   * List all active mutes in a guild
   */
  async listActiveMutes(guildId: GuildId, type?: MuteType): Promise<MuteData[]> {
    const mutes = await container.prisma.mute.findMany({
      where: {
        guildId,
        active: true,
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return mutes.map(this.mapMuteToData);
  }

  /**
   * Check if a user has an active mute of a specific type
   */
  async hasActiveMute(guildId: GuildId, userId: UserId, type?: MuteType): Promise<boolean> {
    const count = await container.prisma.mute.count({
      where: {
        guildId,
        userId,
        active: true,
        ...(type && { type }),
      },
    });
    return count > 0;
  }

  /**
   * Reapply voice mute when user joins voice (persistence)
   */
  async reapplyVoiceMute(guildId: GuildId, member: GuildMember): Promise<void> {
    const activeMutes = await container.prisma.mute.findMany({
      where: {
        guildId,
        userId: member.id,
        active: true,
        type: { in: [MuteType.VOICE, MuteType.BOTH] },
      },
    });

    if (activeMutes.length > 0 && member.voice.channel && !member.voice.serverDeaf) {
      try {
        await member.voice.setDeaf(true, 'Reapplying voice mute');
        container.logger.info(
          `[MuteService] Reapplied voice mute to ${member.user.tag} in ${guildId}`
        );
      } catch (error) {
        container.logger.error('[MuteService] Failed to reapply voice mute:', error);
      }
    }
  }

  /**
   * Get mod config for a guild
   */
  private async getConfig(guildId: GuildId) {
    return container.prisma.modConfig.findUnique({
      where: { guildId },
    });
  }

  /**
   * Create a mute-related mod case
   */
  private async createMuteCase(
    guildId: GuildId,
    userId: UserId,
    userTag: string,
    moderatorId: UserId,
    moderatorTag: string,
    action: ModAction,
    reason: string,
    duration?: DurationSeconds,
    expiresAt?: Date | null
  ) {
    const lastCase = await container.prisma.modCase.findFirst({
      where: { guildId },
      orderBy: { caseNumber: 'desc' },
    });

    const caseNumber = asCaseNumber((lastCase?.caseNumber ?? 0) + 1);

    await container.prisma.modCase.create({
      data: {
        caseNumber,
        guildId,
        action,
        targetId: userId,
        targetTag: userTag,
        moderatorId,
        moderatorTag,
        reason,
        duration: duration ?? null,
        expiresAt: expiresAt ?? null,
      },
    });

    return caseNumber;
  }

  private mapMuteToData(mute: {
    id: string;
    guildId: string;
    userId: string;
    createdById: string;
    type: MuteType;
    reason: string;
    duration: number | null;
    expiresAt: Date | null;
    createdAt: Date;
    active: boolean;
  }): MuteData {
    return {
      id: asMuteId(mute.id),
      guildId: mute.guildId,
      userId: mute.userId,
      createdById: mute.createdById,
      type: mute.type,
      reason: mute.reason,
      duration: mute.duration,
      expiresAt: mute.expiresAt,
      createdAt: mute.createdAt,
      active: mute.active,
    };
  }
}

// Export singleton instance
export const muteService = new MuteService();
