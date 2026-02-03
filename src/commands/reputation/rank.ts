/**
 * Rank command - Display user XP rank with a custom generated card
 */

import { Command } from '@sapphire/framework';
import { AttachmentBuilder, EmbedBuilder, Colors } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { ImageGeneratorService } from '#lib/image-generator.js';
import * as leaderboardService from '#modules/xp-text/services/xp-text-leaderboard.service.js';
import * as voiceLeaderboardService from '#modules/xp-voice/services/voice-xp-leaderboard.service.js';

export class RankCommand extends Command {
  private imageGenerator: ImageGeneratorService;

  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'rank',
      description: "View your or another user's XP rank card",
    });

    this.imageGenerator = new ImageGeneratorService();
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand((subcommand) =>
          subcommand
            .setName('text')
            .setDescription('View text/message XP rank card')
            .addUserOption((option) =>
              option
                .setName('user')
                .setDescription('The user to view rank for (defaults to yourself)')
                .setRequired(false)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('voice')
            .setDescription('View voice XP rank card')
            .addUserOption((option) =>
              option
                .setName('user')
                .setDescription('The user to view rank for (defaults to yourself)')
                .setRequired(false)
            )
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();

    // Ensure command is run in a guild
    if (!interaction.guild || !interaction.guildId) {
      return interaction.editReply({
        content: `${EMOJI.STATUS.ERROR} This command can only be used in a server.`,
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user') || interaction.user;

    // Check if bot
    if (targetUser.bot) {
      return interaction.editReply({
        content: `${EMOJI.STATUS.ERROR} Bots don't earn XP!`,
      });
    }

    if (subcommand === 'voice') {
      return this.handleVoiceRank(interaction, targetUser, interaction.guildId);
    } else {
      return this.handleTextRank(interaction, targetUser, interaction.guildId);
    }
  }

  /**
   * Handle text/message XP rank card
   */
  private async handleTextRank(
    interaction: Command.ChatInputCommandInteraction,
    targetUser: NonNullable<ReturnType<typeof interaction.options.getUser>>,
    guildId: string
  ) {
    try {
      // Get user stats
      const stats = await leaderboardService.getUserStats(guildId, targetUser.id);

      if (!stats) {
        return interaction.editReply({
          content: `${EMOJI.STATUS.ERROR} ${targetUser.id === interaction.user.id ? 'You have' : 'This user has'} not earned any XP yet. Start chatting to earn XP!`,
        });
      }

      // Get total members for context
      const totalMembers = await leaderboardService.getTotalUsers(guildId);

      // Calculate XP needed for next level
      const xpNeededForNextLevel = stats.nextLevelXp - stats.currentLevelXp;
      const xpInCurrentLevel = stats.xp - stats.currentLevelXp;

      // Get user avatar
      const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });

      // Determine accent color based on level
      const accentColor = this.getLevelColor(stats.level);

      // Fetch detailed XP breakdown data
      const xpBreakdown = await this.getXPBreakdown(guildId, targetUser.id);
      const activityData = await this.getActivityData(guildId, targetUser.id);

      // Get member join date
      const memberSince = await this.getMemberSince(guildId, targetUser.id);

      // Generate rank card
      const cardImage = await this.imageGenerator.generateRankCard({
        username: targetUser.username,
        avatarUrl: avatarUrl,
        level: stats.level,
        currentXP: xpInCurrentLevel,
        requiredXP: xpNeededForNextLevel,
        rank: stats.rank ?? 0,
        totalMembers: totalMembers,
        accentColor: accentColor,
        messagesXP: xpBreakdown.messagesXP,
        voiceXP: xpBreakdown.voiceXP,
        reactionsXP: xpBreakdown.reactionsXP,
        commandsXP: xpBreakdown.commandsXP,
        mostActiveChannel: activityData.mostActiveChannel,
        last7DaysXP: activityData.last7DaysXP,
        last30DaysXP: activityData.last30DaysXP,
        streak: activityData.streak,
        memberSince: memberSince,
      });

      // Create attachment
      const attachment = new AttachmentBuilder(cardImage, { name: 'rank-card.png' });

      // Send the image
      return interaction.editReply({
        files: [attachment],
      });
    } catch (error) {
      this.container.logger.error('Error generating rank card:', error);

      // Fallback to text-based embed
      const stats = await leaderboardService.getUserStats(guildId, targetUser.id);

      if (!stats) {
        return interaction.editReply({
          content: `${EMOJI.STATUS.ERROR} Failed to retrieve user stats.`,
        });
      }

      const totalMembers = await leaderboardService.getTotalUsers(guildId);
      const xpNeededForNextLevel = stats.nextLevelXp - stats.currentLevelXp;
      const xpInCurrentLevel = stats.xp - stats.currentLevelXp;

      const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setAuthor({
          name: `${targetUser.username}'s Rank`,
          iconURL: targetUser.displayAvatarURL(),
        })
        .setDescription(
          `🎯 **Level ${stats.level}**\n` +
            `✨ **${stats.xp.toLocaleString()}** Total XP\n` +
            `📊 **Rank #${stats.rank ?? 'N/A'}** of ${totalMembers}`
        )
        .addFields({
          name: 'Progress to Next Level',
          value: `${xpInCurrentLevel.toLocaleString()} / ${xpNeededForNextLevel.toLocaleString()} XP (${stats.progress.toFixed(1)}%)`,
        })
        .setFooter({ text: 'Card generation failed, showing text-based stats' })
        .setTimestamp();

      return interaction.editReply({
        embeds: [embed],
        content: `${EMOJI.STATUS.WARNING} Image generation failed, showing text-based stats instead.`,
      });
    }
  }

  /**
   * Handle voice XP rank card
   */
  private async handleVoiceRank(
    interaction: Command.ChatInputCommandInteraction,
    targetUser: NonNullable<ReturnType<typeof interaction.options.getUser>>,
    guildId: string
  ) {
    try {
      // Get voice stats
      const stats = await voiceLeaderboardService.getVoiceUserStats(guildId, targetUser.id);

      if (!stats) {
        return interaction.editReply({
          content: `${EMOJI.STATUS.ERROR} ${targetUser.id === interaction.user.id ? 'You have' : 'This user has'} not earned any voice XP yet. Join voice channels to earn voice XP!`,
        });
      }

      // Get total members for context
      const totalMembers = await this.container.prisma.userVoiceXP.count({
        where: { guildId },
      });

      // Calculate XP needed for next level
      const xpNeededForNextLevel = stats.nextLevelXp - stats.currentLevelXp;
      const xpInCurrentLevel = stats.xp - stats.currentLevelXp;

      // Get user avatar
      const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });

      // Determine accent color based on level
      const accentColor = this.getLevelColor(stats.level);

      // Fetch detailed voice XP breakdown data
      const voiceBreakdown = await this.getVoiceXPBreakdown(guildId, targetUser.id);
      const voiceActivityData = await this.getVoiceActivityData(guildId, targetUser.id);

      // Get member join date
      const memberSince = await this.getMemberSince(guildId, targetUser.id);

      // Generate rank card
      const cardImage = await this.imageGenerator.generateRankCard({
        username: targetUser.username,
        avatarUrl: avatarUrl,
        level: stats.level,
        currentXP: xpInCurrentLevel,
        requiredXP: xpNeededForNextLevel,
        rank: stats.rank ?? 0,
        totalMembers: totalMembers,
        accentColor: accentColor,
        messagesXP: voiceBreakdown.totalTimeXP,
        voiceXP: voiceBreakdown.streamingXP,
        reactionsXP: voiceBreakdown.videoXP,
        commandsXP: voiceBreakdown.regularXP,
        mostActiveChannel: voiceActivityData.mostActiveChannel,
        last7DaysXP: voiceActivityData.last7DaysMinutes,
        last30DaysXP: voiceActivityData.last30DaysMinutes,
        streak: voiceActivityData.streak,
        memberSince: memberSince,
        // Voice-specific labels
        isVoiceCard: true,
      });

      // Create attachment
      const attachment = new AttachmentBuilder(cardImage, { name: 'voice-rank-card.png' });

      // Send the image
      return interaction.editReply({
        files: [attachment],
      });
    } catch (error) {
      this.container.logger.error('Error generating voice rank card:', error);

      // Fallback to text-based embed
      const stats = await voiceLeaderboardService.getVoiceUserStats(guildId, targetUser.id);

      if (!stats) {
        return interaction.editReply({
          content: `${EMOJI.STATUS.ERROR} Failed to retrieve voice stats.`,
        });
      }

      const totalMembers = await this.container.prisma.userVoiceXP.count({
        where: { guildId },
      });
      const xpNeededForNextLevel = stats.nextLevelXp - stats.currentLevelXp;
      const xpInCurrentLevel = stats.xp - stats.currentLevelXp;

      const embed = new EmbedBuilder()
        .setColor(Colors.Purple)
        .setAuthor({
          name: `${targetUser.username}'s Voice Rank`,
          iconURL: targetUser.displayAvatarURL(),
        })
        .setDescription(
          `🎙️ **Level ${stats.level}**\n` +
            `✨ **${stats.xp.toLocaleString()}** Total Voice XP\n` +
            `⏱️ **${stats.minutesInVoice.toLocaleString()}** minutes in voice\n` +
            `📊 **Rank #${stats.rank ?? 'N/A'}** of ${totalMembers}`
        )
        .addFields({
          name: 'Progress to Next Level',
          value: `${xpInCurrentLevel.toLocaleString()} / ${xpNeededForNextLevel.toLocaleString()} XP (${stats.progress.toFixed(1)}%)`,
        })
        .setFooter({ text: 'Card generation failed, showing text-based stats' })
        .setTimestamp();

      return interaction.editReply({
        embeds: [embed],
        content: `${EMOJI.STATUS.WARNING} Image generation failed, showing text-based stats instead.`,
      });
    }
  }

  /**
   * Get color based on user level
   */
  private getLevelColor(level: number): string {
    if (level >= 100) return '#FFD700'; // Gold
    if (level >= 75) return '#E74C3C'; // Red
    if (level >= 50) return '#9B59B6'; // Purple
    if (level >= 25) return '#3498DB'; // Blue
    if (level >= 10) return '#2ECC71'; // Green
    return '#7289DA'; // Discord blurple (updated)
  }

  /**
   * Get XP breakdown by source
   */
  private async getXPBreakdown(
    guildId: string,
    userId: string
  ): Promise<{ messagesXP: number; voiceXP: number; reactionsXP: number; commandsXP: number }> {
    try {
      const prisma = this.container.prisma;

      // Get text/message XP (from UserXP)
      const textXP = await prisma.userXP.findUnique({
        where: { guildId_userId: { guildId, userId } },
        select: { xp: true },
      });

      // Get voice XP (from UserVoiceXP)
      const voiceXP = await prisma.userVoiceXP.findUnique({
        where: { guildId_userId: { guildId, userId } },
        select: { xp: true },
      });

      // Get breakdown from event logs
      const events = await prisma.xPEventLog.findMany({
        where: {
          guildId,
          userId,
          eventType: 'AWARD',
        },
        select: { xpChange: true, reason: true, metadata: true },
      });

      // Categorize XP by source
      let messagesXP = 0;
      let reactionsXP = 0;
      let commandsXP = 0;

      for (const event of events) {
        const reason = event.reason?.toLowerCase() || '';
        const metadata = event.metadata as { source?: string } | null;
        const source = metadata?.source?.toLowerCase() || reason;

        if (source.includes('reaction')) {
          reactionsXP += event.xpChange;
        } else if (source.includes('command')) {
          commandsXP += event.xpChange;
        } else if (source.includes('message') || source.includes('text')) {
          messagesXP += event.xpChange;
        } else {
          // Default to message XP
          messagesXP += event.xpChange;
        }
      }

      const voiceXPValue = voiceXP?.xp ?? 0;

      // Fallback: if no event logs, use current text XP as messages
      if (events.length === 0 && textXP) {
        messagesXP = textXP.xp;
      }

      return {
        messagesXP,
        voiceXP: voiceXPValue,
        reactionsXP,
        commandsXP,
      };
    } catch (error) {
      this.container.logger.error('Error fetching XP breakdown:', error);
      return { messagesXP: 0, voiceXP: 0, reactionsXP: 0, commandsXP: 0 };
    }
  }

  /**
   * Get activity data for user
   */
  private async getActivityData(
    guildId: string,
    userId: string
  ): Promise<{
    mostActiveChannel: string;
    last7DaysXP: number;
    last30DaysXP: number;
    streak: number;
  }> {
    try {
      const prisma = this.container.prisma;

      // Calculate date ranges
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get XP changes from event logs
      const last7DaysEvents = await prisma.xPEventLog.findMany({
        where: {
          guildId,
          userId,
          createdAt: { gte: sevenDaysAgo },
          eventType: 'AWARD',
        },
        select: { xpChange: true, metadata: true, createdAt: true },
      });

      const last30DaysEvents = await prisma.xPEventLog.findMany({
        where: {
          guildId,
          userId,
          createdAt: { gte: thirtyDaysAgo },
          eventType: 'AWARD',
        },
        select: { xpChange: true, metadata: true, createdAt: true },
      });

      // Sum XP changes
      let last7DaysXP = last7DaysEvents.reduce((sum, event) => sum + event.xpChange, 0);
      let last30DaysXP = last30DaysEvents.reduce((sum, event) => sum + event.xpChange, 0);

      // Fallback: if no event logs, estimate from lastAwardAt
      if (last7DaysEvents.length === 0 || last30DaysEvents.length === 0) {
        const userXP = await prisma.userXP.findUnique({
          where: { guildId_userId: { guildId, userId } },
          select: { lastAwardAt: true },
        });

        // If user was active recently but no logs, show 0 (data not available)
        // This indicates the event logging system wasn't enabled
        if (userXP?.lastAwardAt) {
          const daysSinceLastActive = Math.floor(
            (now.getTime() - userXP.lastAwardAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          // If active within timeframe but no logs, keep at 0 to show data unavailable
          if (daysSinceLastActive <= 7 && last7DaysXP === 0) {
            last7DaysXP = 0; // Keep 0 to indicate no tracking data
          }
          if (daysSinceLastActive <= 30 && last30DaysXP === 0) {
            last30DaysXP = 0;
          }
        }
      }

      // Find most active channel from metadata
      const channelCounts = new Map<string, number>();
      for (const event of last30DaysEvents) {
        const metadata = event.metadata as { channelId?: string } | null;
        const channelId = metadata?.channelId;
        if (channelId) {
          channelCounts.set(channelId, (channelCounts.get(channelId) || 0) + 1);
        }
      }

      let mostActiveChannel = 'N/A';
      let maxCount = 0;
      for (const [channelId, count] of channelCounts) {
        if (count > maxCount) {
          maxCount = count;
          try {
            const channel = await this.container.client.channels.fetch(channelId);
            if (channel?.isTextBased() && 'name' in channel) {
              mostActiveChannel = `#${channel.name}`;
            }
          } catch {
            // Channel not accessible
          }
        }
      }

      // Calculate streak (days with activity)
      const streak = await this.calculateStreak(guildId, userId);

      return {
        mostActiveChannel,
        last7DaysXP,
        last30DaysXP,
        streak,
      };
    } catch (error) {
      this.container.logger.error('Error fetching activity data:', error);
      return { mostActiveChannel: 'N/A', last7DaysXP: 0, last30DaysXP: 0, streak: 0 };
    }
  }

  /**
   * Calculate user's daily activity streak
   */
  private async calculateStreak(guildId: string, userId: string): Promise<number> {
    try {
      const prisma = this.container.prisma;

      // Get all activity dates in descending order
      const events = await prisma.xPEventLog.findMany({
        where: {
          guildId,
          userId,
          eventType: 'AWARD',
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      });

      if (events.length === 0) return 0;

      // Get unique dates (YYYY-MM-DD format)
      const uniqueDates = new Set<string>();
      for (const event of events) {
        const dateStr = event.createdAt.toISOString().split('T')[0];
        if (dateStr) uniqueDates.add(dateStr);
      }

      const sortedDates = Array.from(uniqueDates).sort().reverse();

      // Count consecutive days from today
      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Start checking from today or yesterday
      let expectedDate =
        sortedDates[0] === today || sortedDates[0] === yesterday ? sortedDates[0] : null;

      if (!expectedDate) return 0;

      for (const date of sortedDates) {
        if (date === expectedDate) {
          streak++;
          // Calculate next expected date (previous day)
          const currentDate: Date = new Date(date + 'T00:00:00Z');
          const previousDay: Date = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
          expectedDate = previousDay.toISOString().split('T')[0] ?? null;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      this.container.logger.error('Error calculating streak:', error);
      return 0;
    }
  }

  /**
   * Get member join date formatted as "MMM YYYY"
   */
  private async getMemberSince(guildId: string, userId: string): Promise<string> {
    try {
      const guild = await this.container.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);

      if (member.joinedAt) {
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        const month = monthNames[member.joinedAt.getMonth()];
        const year = member.joinedAt.getFullYear();
        return `${month} ${year}`;
      }

      return 'Unknown';
    } catch (error) {
      this.container.logger.error('Error fetching member join date:', error);
      return 'Unknown';
    }
  }

  /**
   * Get voice XP breakdown by activity type
   */
  private async getVoiceXPBreakdown(
    guildId: string,
    userId: string
  ): Promise<{ totalTimeXP: number; streamingXP: number; videoXP: number; regularXP: number }> {
    try {
      const prisma = this.container.prisma;

      // Get total voice XP
      const userVoiceXP = await prisma.userVoiceXP.findUnique({
        where: { guildId_userId: { guildId, userId } },
        select: { xp: true },
      });

      const totalTimeXP = userVoiceXP?.xp ?? 0;

      if (totalTimeXP === 0) {
        return { totalTimeXP: 0, streamingXP: 0, videoXP: 0, regularXP: 0 };
      }

      // Try to use event logs for accurate breakdown
      const events = await prisma.voiceXPEventLog.findMany({
        where: {
          guildId,
          userId,
          eventType: 'AWARD',
        },
        select: {
          xpChange: true,
          metadata: true,
        },
      });

      // If we have event logs, calculate from them
      if (events.length > 0) {
        let streamingXP = 0;
        let videoXP = 0;
        let regularXP = 0;

        for (const event of events) {
          const metadata = event.metadata as { wasStreaming?: boolean; wasVideo?: boolean } | null;

          if (metadata?.wasStreaming) {
            streamingXP += event.xpChange;
          } else if (metadata?.wasVideo) {
            videoXP += event.xpChange;
          } else {
            regularXP += event.xpChange;
          }
        }

        return { totalTimeXP, streamingXP, videoXP, regularXP };
      }

      // Fallback: Get voice sessions to calculate proportions
      const sessions = await prisma.voiceSession.findMany({
        where: {
          guildId,
          userId,
          leftAt: { not: null },
        },
        select: {
          wasStreaming: true,
          wasVideo: true,
          durationMinutes: true,
        },
      });

      // Calculate time spent in each mode
      let totalMinutes = 0;
      let streamingMinutes = 0;
      let videoMinutes = 0;
      let regularMinutes = 0;

      for (const session of sessions) {
        totalMinutes += session.durationMinutes;

        if (session.wasStreaming) {
          streamingMinutes += session.durationMinutes;
        } else if (session.wasVideo) {
          videoMinutes += session.durationMinutes;
        } else {
          regularMinutes += session.durationMinutes;
        }
      }

      // Distribute XP proportionally based on time spent
      let streamingXP = 0;
      let videoXP = 0;
      let regularXP = 0;

      if (totalMinutes > 0) {
        streamingXP = Math.round((streamingMinutes / totalMinutes) * totalTimeXP);
        videoXP = Math.round((videoMinutes / totalMinutes) * totalTimeXP);
        regularXP = Math.round((regularMinutes / totalMinutes) * totalTimeXP);

        // Adjust for rounding errors
        const difference = totalTimeXP - (streamingXP + videoXP + regularXP);
        regularXP += difference;
      } else {
        // No session data, assume all regular
        regularXP = totalTimeXP;
      }

      return {
        totalTimeXP,
        streamingXP,
        videoXP,
        regularXP,
      };
    } catch (error) {
      this.container.logger.error('Error fetching voice XP breakdown:', error);
      return { totalTimeXP: 0, streamingXP: 0, videoXP: 0, regularXP: 0 };
    }
  }

  /**
   * Get voice activity data for user
   */
  private async getVoiceActivityData(
    guildId: string,
    userId: string
  ): Promise<{
    mostActiveChannel: string;
    last7DaysMinutes: number;
    last30DaysMinutes: number;
    streak: number;
  }> {
    try {
      const prisma = this.container.prisma;

      // Calculate date ranges
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Try to use event logs first for more accurate tracking
      const last7DaysEvents = await prisma.voiceXPEventLog.findMany({
        where: {
          guildId,
          userId,
          eventType: 'AWARD',
          createdAt: { gte: sevenDaysAgo },
        },
        select: { metadata: true, createdAt: true },
      });

      const last30DaysEvents = await prisma.voiceXPEventLog.findMany({
        where: {
          guildId,
          userId,
          eventType: 'AWARD',
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { metadata: true, createdAt: true },
      });

      let last7DaysMinutes = 0;
      let last30DaysMinutes = 0;
      const channelCounts = new Map<string, number>();

      // Calculate from event logs if available
      if (last30DaysEvents.length > 0) {
        for (const event of last7DaysEvents) {
          const metadata = event.metadata as { minutesGained?: number; channelId?: string } | null;
          last7DaysMinutes += metadata?.minutesGained ?? 0;
        }

        for (const event of last30DaysEvents) {
          const metadata = event.metadata as { minutesGained?: number; channelId?: string } | null;
          last30DaysMinutes += metadata?.minutesGained ?? 0;

          const channelId = metadata?.channelId;
          if (channelId) {
            channelCounts.set(
              channelId,
              (channelCounts.get(channelId) || 0) + (metadata?.minutesGained ?? 0)
            );
          }
        }
      } else {
        // Fallback to session data
        const last7DaysSessions = await prisma.voiceSession.findMany({
          where: {
            guildId,
            userId,
            joinedAt: { gte: sevenDaysAgo },
          },
          select: { durationMinutes: true, channelId: true, leftAt: true, joinedAt: true },
        });

        const last30DaysSessions = await prisma.voiceSession.findMany({
          where: {
            guildId,
            userId,
            joinedAt: { gte: thirtyDaysAgo },
          },
          select: { durationMinutes: true, channelId: true, leftAt: true, joinedAt: true },
        });

        // Sum minutes (including active sessions)
        last7DaysMinutes = last7DaysSessions.reduce((sum, session) => {
          if (!session.leftAt) {
            const durationSoFar = Math.floor(
              (now.getTime() - session.joinedAt.getTime()) / (1000 * 60)
            );
            return sum + durationSoFar;
          }
          return sum + session.durationMinutes;
        }, 0);

        last30DaysMinutes = last30DaysSessions.reduce((sum, session) => {
          if (!session.leftAt) {
            const durationSoFar = Math.floor(
              (now.getTime() - session.joinedAt.getTime()) / (1000 * 60)
            );
            return sum + durationSoFar;
          }
          return sum + session.durationMinutes;
        }, 0);

        // Count channel minutes
        for (const session of last30DaysSessions) {
          const minutes = session.leftAt
            ? session.durationMinutes
            : Math.floor((now.getTime() - session.joinedAt.getTime()) / (1000 * 60));
          channelCounts.set(
            session.channelId,
            (channelCounts.get(session.channelId) || 0) + minutes
          );
        }
      }

      let mostActiveChannel = 'N/A';
      let maxMinutes = 0;
      for (const [channelId, minutes] of channelCounts) {
        if (minutes > maxMinutes) {
          maxMinutes = minutes;
          try {
            const channel = await this.container.client.channels.fetch(channelId);
            if (channel?.isVoiceBased() && 'name' in channel) {
              mostActiveChannel = `🔊 ${channel.name}`;
            }
          } catch {
            mostActiveChannel = '🔊 Voice Channel';
          }
        }
      }

      // Calculate voice streak (days with voice activity)
      const streak = await this.calculateVoiceStreak(guildId, userId);

      return {
        mostActiveChannel,
        last7DaysMinutes,
        last30DaysMinutes,
        streak,
      };
    } catch (error) {
      this.container.logger.error('Error fetching voice activity data:', error);
      return { mostActiveChannel: 'N/A', last7DaysMinutes: 0, last30DaysMinutes: 0, streak: 0 };
    }
  }

  /**
   * Calculate user's daily voice activity streak
   */
  private async calculateVoiceStreak(guildId: string, userId: string): Promise<number> {
    try {
      const prisma = this.container.prisma;

      // Get all voice sessions
      const sessions = await prisma.voiceSession.findMany({
        where: {
          guildId,
          userId,
        },
        select: { joinedAt: true, leftAt: true },
        orderBy: { joinedAt: 'desc' },
      });

      if (sessions.length === 0) return 0;

      // Get unique dates (YYYY-MM-DD format) - use joinedAt as primary, leftAt as fallback
      const uniqueDates = new Set<string>();
      for (const session of sessions) {
        const dateStr = session.joinedAt.toISOString().split('T')[0];
        if (dateStr) uniqueDates.add(dateStr);

        // Also add leftAt date if different (for sessions spanning multiple days)
        if (session.leftAt) {
          const leftDateStr = session.leftAt.toISOString().split('T')[0];
          if (leftDateStr && leftDateStr !== dateStr) {
            uniqueDates.add(leftDateStr);
          }
        }
      }

      const sortedDates = Array.from(uniqueDates).sort().reverse();

      // Count consecutive days from today
      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Start checking from today or yesterday
      let expectedDate =
        sortedDates[0] === today || sortedDates[0] === yesterday ? sortedDates[0] : null;

      if (!expectedDate) return 0;

      for (const date of sortedDates) {
        if (date === expectedDate) {
          streak++;
          // Calculate next expected date (previous day)
          const currentDate: Date = new Date(date + 'T00:00:00Z');
          const previousDay: Date = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
          expectedDate = previousDay.toISOString().split('T')[0] ?? null;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      this.container.logger.error('Error calculating voice streak:', error);
      return 0;
    }
  }
}
