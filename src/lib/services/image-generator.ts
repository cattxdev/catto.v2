/**
 * Image Generator Service using Puppeteer
 * Renders HTML templates to images for rank cards, leaderboards, etc.
 * Optimized for speed with page pooling and resource blocking
 */

import type { Page } from 'puppeteer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Buffer } from 'node:buffer';
import { BasePuppeteerService } from './base-puppeteer-service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface RankCardData {
  username: string;
  discriminator?: string;
  avatarUrl: string;
  level: number;
  currentXP: number;
  requiredXP: number;
  rank: number;
  totalMembers: number;
  accentColor?: string;
  backgroundColor?: string;
  messagesXP?: number;
  voiceXP?: number;
  reactionsXP?: number;
  commandsXP?: number;
  mostActiveChannel?: string;
  last7DaysXP?: number;
  last30DaysXP?: number;
  streak?: number;
  memberSince?: string;
  isVoiceCard?: boolean;
}

export interface LeaderboardCardData {
  guildName: string;
  guildIcon?: string;
  entries: {
    rank: number;
    username: string;
    avatarUrl: string;
    level: number;
    xp: number;
  }[];
  accentColor?: string;
  totalMembers?: number;
  totalXp?: number;
  weeklyXp?: number;
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (m) => HTML_ESCAPE_MAP[m] ?? m);
}

export class ImageGeneratorService extends BasePuppeteerService {
  private pagePool: Page[] = [];
  private readonly maxPoolSize = 3;
  private rankCardTemplate: string;
  private leaderboardCardTemplate: string;

  constructor() {
    super(100);
    const templatesDir = join(__dirname, '..', 'templates');
    this.rankCardTemplate = this.readTemplate(join(templatesDir, 'rank-card.html'));
    this.leaderboardCardTemplate = this.readTemplate(join(templatesDir, 'leaderboard-card.html'));
  }

  override async close(): Promise<void> {
    await Promise.all(this.pagePool.map((page) => page.close().catch(() => {})));
    this.pagePool = [];
    await super.close();
  }

  private async getPage(): Promise<Page> {
    await this.initialize();
    if (!this.browser) throw new Error('Browser not initialized');

    const page = this.pagePool.pop();
    if (page && !page.isClosed()) return page;

    const newPage = await this.browser.newPage();
    await newPage.setRequestInterception(true);
    newPage.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['xhr', 'fetch', 'websocket'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    return newPage;
  }

  private async releasePage(page: Page): Promise<void> {
    if (this.pagePool.length < this.maxPoolSize && !page.isClosed()) {
      try {
        await page.setContent('', { waitUntil: 'domcontentloaded' });
        this.pagePool.push(page);
      } catch {
        await page.close().catch(() => {});
      }
    } else {
      await page.close().catch(() => {});
    }
  }

  async generateRankCard(data: RankCardData): Promise<Buffer> {
    const page = await this.getPage();

    try {
      await page.setViewport({ width: 934, height: 1200 });

      const avatarBase64 = await this.imageUrlToBase64(data.avatarUrl);
      const optimizedData = { ...data, avatarUrl: avatarBase64 };
      const html = this.getRankCardTemplate(optimizedData);

      await page.setContent(html, { waitUntil: 'load', timeout: 5000 });
      await new Promise((resolve) => setTimeout(resolve, 200));

      const cardElement = await page.$('.rank-card');
      if (!cardElement) throw new Error('Rank card element not found');

      const screenshot = await cardElement.screenshot({
        type: 'png',
        omitBackground: false,
      });

      return screenshot as Buffer;
    } finally {
      await this.releasePage(page);
    }
  }

  async generateLeaderboardCard(data: LeaderboardCardData): Promise<Buffer> {
    const page = await this.getPage();

    try {
      await page.setViewport({
        width: 700,
        height: Math.min(1200, 300 + data.entries.length * 80),
      });

      const base64Avatars = await Promise.all(
        data.entries.map((entry) => this.imageUrlToBase64(entry.avatarUrl))
      );

      const optimizedData = {
        ...data,
        entries: data.entries.map((entry, index) => ({
          ...entry,
          avatarUrl: base64Avatars[index] || entry.avatarUrl,
        })),
      };

      const html = this.getLeaderboardCardTemplate(optimizedData);

      await page.setContent(html, { waitUntil: 'load', timeout: 5000 });
      await new Promise((resolve) => setTimeout(resolve, 200));

      const cardElement = await page.$('.leaderboard-card');
      if (!cardElement) throw new Error('Leaderboard card element not found');

      const screenshot = await cardElement.screenshot({
        type: 'png',
        omitBackground: false,
      });

      return screenshot as Buffer;
    } finally {
      await this.releasePage(page);
    }
  }

  private getRankCardTemplate(data: RankCardData): string {
    const progressPercentage = (data.currentXP / data.requiredXP) * 100;
    const accentColor = data.accentColor || '#7289DA';
    const isVoice = data.isVoiceCard || false;

    const messagesXP = data.messagesXP || 0;
    const voiceXP = data.voiceXP || 0;
    const reactionsXP = data.reactionsXP || 0;
    const commandsXP = data.commandsXP || 0;
    const totalBreakdownXP = messagesXP + voiceXP + reactionsXP + commandsXP;

    const messagesPercent = totalBreakdownXP > 0 ? (messagesXP / totalBreakdownXP) * 100 : 0;
    const voicePercent = totalBreakdownXP > 0 ? (voiceXP / totalBreakdownXP) * 100 : 0;
    const reactionsPercent = totalBreakdownXP > 0 ? (reactionsXP / totalBreakdownXP) * 100 : 0;
    const commandsPercent = totalBreakdownXP > 0 ? (commandsXP / totalBreakdownXP) * 100 : 0;

    const label1 = isVoice ? 'Total Time' : 'Messages';
    const label2 = isVoice ? 'Streaming' : 'Voice';
    const label3 = isVoice ? 'Video' : 'Reactions';
    const label4 = isVoice ? 'Regular' : 'Commands';
    const last7Label = isVoice ? 'Last 7 Days (min)' : 'Last 7 Days';
    const last30Label = isVoice ? 'Last 30 Days (min)' : 'Last 30 Days';
    const xpLabel = isVoice ? 'Voice XP' : 'XP';

    return this.rankCardTemplate
      .replace(/{{username}}/g, escapeHtml(data.username))
      .replace(/{{avatarUrl}}/g, data.avatarUrl)
      .replace(/{{level}}/g, String(data.level))
      .replace(/{{nextLevel}}/g, String(data.level + 1))
      .replace(/{{rank}}/g, String(data.rank))
      .replace(/{{totalMembers}}/g, String(data.totalMembers))
      .replace(/{{currentXP}}/g, data.currentXP.toLocaleString())
      .replace(/{{requiredXP}}/g, data.requiredXP.toLocaleString())
      .replace(/{{totalXP}}/g, (data.currentXP + data.level * data.requiredXP).toLocaleString())
      .replace(/{{progressPercent}}/g, progressPercentage.toFixed(1))
      .replace(/{{progress}}/g, String(Math.max(progressPercentage, 2)))
      .replace(/{{accentColor}}/g, accentColor)
      .replace(/{{accentColorLight}}/g, this.lightenColor(accentColor, 20))
      .replace(/{{accentColorDark}}/g, this.darkenColor(accentColor, 15))
      .replace(/{{accentColorAlpha}}/g, this.addAlpha(accentColor, 0.15))
      .replace(/{{messagesXP}}/g, messagesXP.toLocaleString())
      .replace(/{{voiceXP}}/g, voiceXP.toLocaleString())
      .replace(/{{reactionsXP}}/g, reactionsXP.toLocaleString())
      .replace(/{{commandsXP}}/g, commandsXP.toLocaleString())
      .replace(/{{messagesPercent}}/g, messagesPercent.toFixed(0))
      .replace(/{{voicePercent}}/g, voicePercent.toFixed(0))
      .replace(/{{reactionsPercent}}/g, reactionsPercent.toFixed(0))
      .replace(/{{commandsPercent}}/g, commandsPercent.toFixed(0))
      .replace(/{{label1}}/g, label1)
      .replace(/{{label2}}/g, label2)
      .replace(/{{label3}}/g, label3)
      .replace(/{{label4}}/g, label4)
      .replace(/{{last7Label}}/g, last7Label)
      .replace(/{{last30Label}}/g, last30Label)
      .replace(/{{xpLabel}}/g, xpLabel)
      .replace(/{{mostActiveChannel}}/g, escapeHtml(data.mostActiveChannel || 'N/A'))
      .replace(/{{last7DaysXP}}/g, (data.last7DaysXP || 0).toLocaleString())
      .replace(/{{last30DaysXP}}/g, (data.last30DaysXP || 0).toLocaleString())
      .replace(/{{streak}}/g, String(data.streak || 0))
      .replace(/{{memberSince}}/g, escapeHtml(data.memberSince || 'Unknown'));
  }

  private getLeaderboardCardTemplate(data: LeaderboardCardData): string {
    const accentColor = data.accentColor || '#7289DA';
    const totalMembers = data.totalMembers || data.entries.length;
    const totalXp = data.totalXp || data.entries.reduce((sum, e) => sum + e.xp, 0);
    const weeklyXp = data.weeklyXp || 0;
    const topXp = data.entries[0]?.xp || 0;
    const secondXp = data.entries[1]?.xp || 0;
    const thirdXp = data.entries[2]?.xp || 0;
    const secondPercent = topXp > 0 ? (secondXp / topXp) * 100 : 0;
    const thirdPercent = topXp > 0 ? (thirdXp / topXp) * 100 : 0;

    const entriesHtml = data.entries
      .map((entry, index) => {
        const rankClass =
          index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '';
        const rankDisplay = this.getRankIcon(entry.rank);

        return `
      <div class="leaderboard-entry ${rankClass}">
        <div class="entry-rank">${rankDisplay}</div>
        <img src="${entry.avatarUrl}" alt="Avatar" class="entry-avatar">
        <div class="entry-info">
          <div class="entry-username">${escapeHtml(entry.username)}</div>
          <div class="entry-messages">${entry.xp.toLocaleString()} XP</div>
        </div>
        <div class="entry-xp">
          <div class="entry-xp-value">${entry.xp.toLocaleString()}</div>
          <div class="entry-xp-label">XP</div>
        </div>
        <div class="entry-level">
          <div class="entry-level-value">${entry.level}</div>
          <div class="entry-level-label">Level</div>
        </div>
      </div>`;
      })
      .join('');

    return this.leaderboardCardTemplate
      .replace(/{{guildName}}/g, escapeHtml(data.guildName))
      .replace(/{{entriesCount}}/g, String(data.entries.length))
      .replace(/{{totalMembers}}/g, totalMembers.toLocaleString())
      .replace(/{{totalXp}}/g, totalXp.toLocaleString())
      .replace(/{{weeklyXp}}/g, weeklyXp.toLocaleString())
      .replace(/{{topXp}}/g, topXp.toLocaleString())
      .replace(/{{secondXp}}/g, secondXp.toLocaleString())
      .replace(/{{thirdXp}}/g, thirdXp.toLocaleString())
      .replace(/{{secondPercent}}/g, secondPercent.toFixed(0))
      .replace(/{{thirdPercent}}/g, thirdPercent.toFixed(0))
      .replace(/{{entries}}/g, entriesHtml)
      .replace(/{{accentColor}}/g, accentColor);
  }

  private getRankIcon(rank: number): string {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, ((num >> 16) & 0xff) + amt);
    const G = Math.min(255, ((num >> 8) & 0xff) + amt);
    const B = Math.min(255, (num & 0xff) + amt);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, ((num >> 16) & 0xff) - amt);
    const G = Math.max(0, ((num >> 8) & 0xff) - amt);
    const B = Math.max(0, (num & 0xff) - amt);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  }

  private addAlpha(color: string, alpha: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const R = (num >> 16) & 0xff;
    const G = (num >> 8) & 0xff;
    const B = num & 0xff;
    return `rgba(${R}, ${G}, ${B}, ${alpha})`;
  }
}
