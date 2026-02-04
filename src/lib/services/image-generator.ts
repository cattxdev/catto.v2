/**
 * Image Generator Service using Puppeteer
 * Renders HTML templates to images for rank cards, leaderboards, etc.
 * Optimized for speed with page pooling and resource blocking
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Buffer } from 'node:buffer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

export class ImageGeneratorService {
  private browser: Browser | null = null;
  private isInitializing = false;
  private pagePool: Page[] = [];
  private readonly maxPoolSize = 3;
  private avatarCache: Map<string, string> = new Map();
  private rankCardTemplate: string;
  private leaderboardCardTemplate: string;

  constructor() {
    // Load templates on initialization
    // In dist, __dirname will be dist/lib/services, templates are in dist/lib/templates
    try {
      this.rankCardTemplate = readFileSync(
        join(__dirname, '..', 'templates', 'rank-card.html'),
        'utf-8'
      );
      this.leaderboardCardTemplate = readFileSync(
        join(__dirname, '..', 'templates', 'leaderboard-card.html'),
        'utf-8'
      );
    } catch {
      // Fallback: try src path during development
      const srcPath = __dirname.replace(/dist[\\/]/, 'src/');
      this.rankCardTemplate = readFileSync(
        join(srcPath, '..', 'templates', 'rank-card.html'),
        'utf-8'
      );
      this.leaderboardCardTemplate = readFileSync(
        join(srcPath, '..', 'templates', 'leaderboard-card.html'),
        'utf-8'
      );
    }
  }

  /**
   * Initialize the browser instance with performance optimizations
   */
  async initialize(): Promise<void> {
    if (this.browser || this.isInitializing) return;

    this.isInitializing = true;
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-sync',
          '--disable-translate',
          '--disable-default-apps',
          '--disable-breakpad',
          '--disable-client-side-phishing-detection',
          '--disable-component-extensions-with-background-pages',
          '--disable-hang-monitor',
          '--disable-ipc-flooding-protection',
          '--disable-prompt-on-repost',
          '--disable-renderer-backgrounding',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-default-browser-check',
          '--disable-web-security',
          '--hide-scrollbars',
        ],
      });
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Close the browser instance and cleanup resources
   */
  async close(): Promise<void> {
    // Close all pooled pages
    await Promise.all(this.pagePool.map((page) => page.close().catch(() => {})));
    this.pagePool = [];

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    // Clear cache
    this.avatarCache.clear();
  }

  /**
   * Get a page from the pool or create a new one
   */
  private async getPage(): Promise<Page> {
    await this.initialize();

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    // Try to get from pool
    const page = this.pagePool.pop();
    if (page && !page.isClosed()) {
      return page;
    }

    // Create new page with optimizations
    const newPage = await this.browser.newPage();

    // Block unnecessary resources for faster loading (but keep fonts for proper rendering)
    await newPage.setRequestInterception(true);
    newPage.on('request', (request) => {
      const resourceType = request.resourceType();
      // Block heavy resources, but allow fonts and stylesheets for proper rendering
      if (['xhr', 'fetch', 'websocket'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    return newPage;
  }

  /**
   * Return a page to the pool for reuse
   */
  private async releasePage(page: Page): Promise<void> {
    if (this.pagePool.length < this.maxPoolSize && !page.isClosed()) {
      // Clear the page for reuse
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

  /**
   * Convert image URL to base64 data URL for embedding
   */
  private async imageUrlToBase64(url: string): Promise<string> {
    // Check cache first
    const cached = this.avatarCache.get(url);
    if (cached) {
      return cached;
    }

    try {
      // eslint-disable-next-line no-undef
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const contentType = response.headers.get('content-type') || 'image/png';
      const dataUrl = `data:${contentType};base64,${base64}`;

      // Cache it (limit cache size)
      if (this.avatarCache.size > 100) {
        const firstKey = this.avatarCache.keys().next().value as string | undefined;
        if (firstKey) {
          this.avatarCache.delete(firstKey);
        }
      }
      this.avatarCache.set(url, dataUrl);

      return dataUrl;
    } catch {
      // Return fallback
      return url;
    }
  }

  /**
   * Generate a rank card image (optimized)
   */
  async generateRankCard(data: RankCardData): Promise<Buffer> {
    const page = await this.getPage();

    try {
      await page.setViewport({ width: 934, height: 1200 });

      // Convert avatar to base64 for faster loading (no network request)
      const avatarBase64 = await this.imageUrlToBase64(data.avatarUrl);
      const optimizedData = { ...data, avatarUrl: avatarBase64 };

      const html = this.getRankCardTemplate(optimizedData);

      // Use 'load' and wait a bit for fonts to render
      await page.setContent(html, { waitUntil: 'load', timeout: 5000 });
      // Small delay to ensure fonts are loaded
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Get the actual card dimensions
      const cardElement = await page.$('.rank-card');
      if (!cardElement) {
        throw new Error('Rank card element not found');
      }

      const screenshot = await cardElement.screenshot({
        type: 'png',
        omitBackground: false,
      });

      return screenshot as Buffer;
    } finally {
      await this.releasePage(page);
    }
  }

  /**
   * Generate a leaderboard card image (optimized)
   */
  async generateLeaderboardCard(data: LeaderboardCardData): Promise<Buffer> {
    const page = await this.getPage();

    try {
      await page.setViewport({
        width: 700,
        height: Math.min(1200, 300 + data.entries.length * 80),
      });

      // Convert all avatars to base64 in parallel
      const avatarPromises = data.entries.map((entry) => this.imageUrlToBase64(entry.avatarUrl));
      const base64Avatars = await Promise.all(avatarPromises);

      const optimizedData = {
        ...data,
        entries: data.entries.map((entry, index) => ({
          ...entry,
          avatarUrl: base64Avatars[index] || entry.avatarUrl,
        })),
      };

      const html = this.getLeaderboardCardTemplate(optimizedData);

      // Use 'load' instead of 'networkidle0' for faster rendering
      await page.setContent(html, { waitUntil: 'load', timeout: 5000 });
      // Small delay to ensure fonts are loaded
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Get the actual card dimensions
      const cardElement = await page.$('.leaderboard-card');
      if (!cardElement) {
        throw new Error('Leaderboard card element not found');
      }

      const screenshot = await cardElement.screenshot({
        type: 'png',
        omitBackground: false,
      });

      return screenshot as Buffer;
    } finally {
      await this.releasePage(page);
    }
  }

  /**
   * Generate rank card HTML from template
   */
  private getRankCardTemplate(data: RankCardData): string {
    const progressPercentage = (data.currentXP / data.requiredXP) * 100;
    const accentColor = data.accentColor || '#7289DA';
    const isVoice = data.isVoiceCard || false;

    // Calculate XP breakdown
    const messagesXP = data.messagesXP || 0;
    const voiceXP = data.voiceXP || 0;
    const reactionsXP = data.reactionsXP || 0;
    const commandsXP = data.commandsXP || 0;
    const totalBreakdownXP = messagesXP + voiceXP + reactionsXP + commandsXP;

    // Calculate percentages for visual representation (avoid division by zero)
    const messagesPercent = totalBreakdownXP > 0 ? (messagesXP / totalBreakdownXP) * 100 : 0;
    const voicePercent = totalBreakdownXP > 0 ? (voiceXP / totalBreakdownXP) * 100 : 0;
    const reactionsPercent = totalBreakdownXP > 0 ? (reactionsXP / totalBreakdownXP) * 100 : 0;
    const commandsPercent = totalBreakdownXP > 0 ? (commandsXP / totalBreakdownXP) * 100 : 0;

    // Labels based on card type
    const label1 = isVoice ? 'Total Time' : 'Messages';
    const label2 = isVoice ? 'Streaming' : 'Voice';
    const label3 = isVoice ? 'Video' : 'Reactions';
    const label4 = isVoice ? 'Regular' : 'Commands';
    const last7Label = isVoice ? 'Last 7 Days (min)' : 'Last 7 Days';
    const last30Label = isVoice ? 'Last 30 Days (min)' : 'Last 30 Days';
    const xpLabel = isVoice ? 'Voice XP' : 'XP';

    return this.rankCardTemplate
      .replace(/{{username}}/g, this.escapeHtml(data.username))
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
      .replace(/{{mostActiveChannel}}/g, this.escapeHtml(data.mostActiveChannel || 'N/A'))
      .replace(/{{last7DaysXP}}/g, (data.last7DaysXP || 0).toLocaleString())
      .replace(/{{last30DaysXP}}/g, (data.last30DaysXP || 0).toLocaleString())
      .replace(/{{streak}}/g, String(data.streak || 0))
      .replace(/{{memberSince}}/g, this.escapeHtml(data.memberSince || 'Unknown'));
  }

  /**
   * Generate leaderboard card HTML from template
   */
  private getLeaderboardCardTemplate(data: LeaderboardCardData): string {
    const accentColor = data.accentColor || '#7289DA';

    // Calculate stats
    const totalMembers = data.totalMembers || data.entries.length;
    const totalXp = data.totalXp || data.entries.reduce((sum, e) => sum + e.xp, 0);
    const weeklyXp = data.weeklyXp || 0;

    // Calculate XP distribution for bars
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
          <div class="entry-username">${this.escapeHtml(entry.username)}</div>
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
      .replace(/{{guildName}}/g, this.escapeHtml(data.guildName))
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

  /**
   * Get rank icon (medal for top 3)
   */
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

  /**
   * Lighten a hex color
   */
  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, ((num >> 16) & 0xff) + amt);
    const G = Math.min(255, ((num >> 8) & 0xff) + amt);
    const B = Math.min(255, (num & 0xff) + amt);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  }

  /**
   * Darken a hex color
   */
  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, ((num >> 16) & 0xff) - amt);
    const G = Math.max(0, ((num >> 8) & 0xff) - amt);
    const B = Math.max(0, (num & 0xff) - amt);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  }

  /**
   * Add alpha channel to hex color (returns rgba)
   */
  private addAlpha(color: string, alpha: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const R = (num >> 16) & 0xff;
    const G = (num >> 8) & 0xff;
    const B = num & 0xff;
    return `rgba(${R}, ${G}, ${B}, ${alpha})`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m] || m);
  }
}
