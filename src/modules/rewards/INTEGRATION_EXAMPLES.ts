/**
 * Example: Integrating Rewards with XP Systems
 * 
 * ⚠️ NOTE: This file contains EXAMPLES ONLY and is not meant to be compiled.
 * Copy and adapt the code patterns shown here to your actual XP system files.
 * 
 * This file shows how to integrate the reward system with your existing
 * Text XP and Voice XP modules to automatically grant rewards on level-up.
 */

// @ts-nocheck - This is an example/documentation file
/* eslint-disable */

import { container } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { RewardIntegration } from './integrations/RewardIntegration';
// Note: Import paths will vary based on your actual file structure
// import { awardXP } from '@/modules/xp-text/services/xp-text-award.service';

/**
 * EXAMPLE 1: Text XP Message Listener Integration
 * 
 * Modify your message listener to check for rewards after XP is awarded
 */
export async function handleTextXPWithRewards(message: Message): Promise<void> {
  if (!message.guild || message.author.bot) return;

  // Award XP using your existing service
  // const result = await awardXP({
  //   guildId: message.guild.id,
  //   userId: message.author.id,
  //   channelId: message.channel.id,
  //   messageId: message.id,
  //   content: message.content,
  //   authorRoles: message.member?.roles.cache.map((r) => r.id) ?? [],
  // });

  // Placeholder result for example
  const result: any = { awarded: true, leveledUp: true, newLevel: 10, newXp: 1000 };

  if (!result.awarded) return;

  // Check if user leveled up
  if (result.leveledUp) {
    container.logger.info(
      `User ${message.author.tag} leveled up to ${result.newLevel} in ${message.guild.name}`
    );

    const member = message.member;
    if (!member) return;

    // ✨ NEW: Check and apply rewards
    const rewardResults = await RewardIntegration.onTextLevelUp(
      message.guild.id,
      message.author.id,
      result.newLevel,
      result.newXp,
      message.guild,
      member
    );

    // Format rewards for level-up announcement
    const rewardsSummary = RewardIntegration.formatRewardsSummary(rewardResults);

    // Send level-up message (using your existing announcement system)
    const levelUpMessage =
      `🎉 Congratulations ${message.author}! You've reached **Level ${result.newLevel}**!\n` +
      `**Total XP:** ${result.newXp.toLocaleString()}`;

    // Add rewards summary if any rewards were claimed
    const finalMessage = rewardsSummary
      ? levelUpMessage + rewardsSummary
      : levelUpMessage;

    // Send to channel if it's a text-based channel
    if (message.channel && 'send' in message.channel) {
      await message.channel.send(finalMessage);
    }
  }
}

/**
 * EXAMPLE 2: Voice XP Session End Integration
 * 
 * Modify your voice session end handler to check for rewards
 */
export async function handleVoiceXPWithRewards(
  guildId: string,
  userId: string,
  sessionData: {
    xpAwarded: number;
    newXP: number;
    newLevel: number;
    previousLevel: number;
    leveledUp: boolean;
  }
): Promise<void> {
  if (!sessionData.leveledUp) return;

  const guild = container.client.guilds.cache.get(guildId);
  if (!guild) return;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  container.logger.info(
    `User ${member.user.tag} voice leveled up to ${sessionData.newLevel} in ${guild.name}`
  );

  // ✨ NEW: Check and apply rewards
  const rewardResults = await RewardIntegration.onVoiceLevelUp(
    guildId,
    userId,
    sessionData.newLevel,
    sessionData.newXP,
    guild,
    member
  );

  // Log successful rewards
  const successfulRewards = rewardResults.filter((r) => r.success);
  if (successfulRewards.length > 0) {
    container.logger.info(
      `Applied ${successfulRewards.length} rewards to ${member.user.tag}`
    );
  }

  // You can also send DM or channel notification here if desired
  const rewardsSummary = RewardIntegration.formatRewardsSummary(rewardResults);
  if (rewardsSummary) {
    // Send to a notifications channel or DM
    const notifChannel = guild.channels.cache.find(
      (c) => c.name === 'level-ups'
    );
    if (notifChannel && notifChannel.isTextBased()) {
      await notifChannel.send(
        `🎤 ${member} reached **Voice Level ${sessionData.newLevel}**!${rewardsSummary}`
      );
    }
  }
}

/**
 * EXAMPLE 3: Retroactive Reward Application
 * 
 * Apply rewards to users who already have levels but haven't claimed rewards yet
 * (Useful when first setting up the reward system)
 */
export async function applyRetroactiveRewards(
  guildId: string
): Promise<{ processed: number; rewarded: number }> {
  const { prisma } = container;

  // Get all users with XP in this guild
  const textXPUsers = await prisma.userXP.findMany({
    where: { guildId },
  });

  const voiceXPUsers = await prisma.userVoiceXP.findMany({
    where: { guildId },
  });

  const guild = container.client.guilds.cache.get(guildId);
  if (!guild) {
    throw new Error('Guild not found');
  }

  let processed = 0;
  let rewarded = 0;

  // Process text XP users
  for (const userXP of textXPUsers) {
    if (userXP.level === 0) continue;

    const member = await guild.members.fetch(userXP.userId).catch(() => null);
    if (!member) continue;

    const results = await RewardIntegration.checkMissingRewards(
      guildId,
      userXP.userId,
      userXP.level,
      userXP.xp,
      'TEXT',
      guild,
      member
    );

    processed++;
    const successful = results.filter((r) => r.success).length;
    rewarded += successful;

    if (successful > 0) {
      container.logger.info(
        `Applied ${successful} retroactive text rewards to ${member.user.tag}`
      );
    }
  }

  // Process voice XP users
  for (const userXP of voiceXPUsers) {
    if (userXP.level === 0) continue;

    const member = await guild.members.fetch(userXP.userId).catch(() => null);
    if (!member) continue;

    const results = await RewardIntegration.checkMissingRewards(
      guildId,
      userXP.userId,
      userXP.level,
      userXP.xp,
      'VOICE',
      guild,
      member
    );

    processed++;
    const successful = results.filter((r) => r.success).length;
    rewarded += successful;

    if (successful > 0) {
      container.logger.info(
        `Applied ${successful} retroactive voice rewards to ${member.user.tag}`
      );
    }
  }

  return { processed, rewarded };
}

/**
 * EXAMPLE 4: Command to Manually Claim Rewards
 * 
 * Allow users to manually claim rewards they're eligible for
 */
export async function handleManualRewardClaim(
  guildId: string,
  userId: string
): Promise<string> {
  const { prisma } = container;

  const guild = container.client.guilds.cache.get(guildId);
  if (!guild) return '❌ Guild not found';

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return '❌ Member not found';

  // Check text XP rewards
  const textXP = await prisma.userXP.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });

  let claimedCount = 0;

  if (textXP && textXP.level > 0) {
    const textResults = await RewardIntegration.checkMissingRewards(
      guildId,
      userId,
      textXP.level,
      textXP.xp,
      'TEXT',
      guild,
      member
    );
    claimedCount += textResults.filter((r) => r.success).length;
  }

  // Check voice XP rewards
  const voiceXP = await prisma.userVoiceXP.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });

  if (voiceXP && voiceXP.level > 0) {
    const voiceResults = await RewardIntegration.checkMissingRewards(
      guildId,
      userId,
      voiceXP.level,
      voiceXP.xp,
      'VOICE',
      guild,
      member
    );
    claimedCount += voiceResults.filter((r) => r.success).length;
  }

  if (claimedCount === 0) {
    return '✅ You have claimed all available rewards!';
  }

  return `✅ Successfully claimed ${claimedCount} reward${claimedCount !== 1 ? 's' : ''}!`;
}
