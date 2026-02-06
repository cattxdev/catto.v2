/**
 * Bonk Image Generator Service
 * Generates bonk meme images with avatar overlays using Puppeteer
 */

import puppeteer, { type Browser } from 'puppeteer';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Buffer } from 'node:buffer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type BonkStyle = 'doge' | 'cat' | 'lions' | 'rabbit' | 'doge_fatality';

export interface BonkVisualConfig {
  bonkText: string;
  fontSize: number;
  starCount: number;
  showSpeedLines: boolean;
  showDamageNumber: boolean;
  textColor: string;
  glowColor: string;
  textStrokeWidth: number;
}

export const DEFAULT_VISUALS: BonkVisualConfig = {
  bonkText: '*BONK!*',
  fontSize: 44,
  starCount: 0,
  showSpeedLines: false,
  showDamageNumber: false,
  textColor: '#FFD700',
  glowColor: 'rgba(255,165,0,0.3)',
  textStrokeWidth: 3,
};

export interface BonkImageData {
  bonkerAvatarUrl: string;
  bonkedAvatarUrl: string;
  style: BonkStyle;
  visuals?: BonkVisualConfig;
}

interface PositionConfig {
  bonkerCenterX: number;
  bonkerCenterY: number;
  bonkerSize: number;
  bonkedCenterX: number;
  bonkedCenterY: number;
  bonkedSize: number;
  bonkTextX: number;
  bonkTextY: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 534;

const pct = (percent: number, total: number) => Math.round((percent / 100) * total);

/**
 * Position configs (percentage-based) for each bonk style.
 * The bat overlay is the same dimensions as the source and stacks directly on top.
 */
const POSITIONS: Record<BonkStyle, PositionConfig> = {
  doge: {
    bonkerCenterX: 35,
    bonkerCenterY: 25,
    bonkerSize: 25,
    bonkedCenterX: 70,
    bonkedCenterY: 48,
    bonkedSize: 17,
    bonkTextX: 55,
    bonkTextY: 3,
  },
  cat: {
    bonkerCenterX: 37,
    bonkerCenterY: 25,
    bonkerSize: 17,
    bonkedCenterX: 71,
    bonkedCenterY: 55,
    bonkedSize: 14,
    bonkTextX: 54,
    bonkTextY: 2,
  },
  lions: {
    bonkerCenterX: 36,
    bonkerCenterY: 24,
    bonkerSize: 25,
    bonkedCenterX: 70,
    bonkedCenterY: 45,
    bonkedSize: 19,
    bonkTextX: 55,
    bonkTextY: 3,
  },
  rabbit: {
    bonkerCenterX: 35,
    bonkerCenterY: 35,
    bonkerSize: 25,
    bonkedCenterX: 68,
    bonkedCenterY: 52,
    bonkedSize: 17,
    bonkTextX: 54,
    bonkTextY: 2,
  },
  doge_fatality: {
    bonkerCenterX: 35,
    bonkerCenterY: 25,
    bonkerSize: 25,
    bonkedCenterX: 86,
    bonkedCenterY: 65,
    bonkedSize: 15,
    bonkTextX: 55,
    bonkTextY: 10,
  },
};

export class BonkImageService {
  private browser: Browser | null = null;
  private isInitializing = false;
  private template: string;
  private sourceImages: Record<BonkStyle, string>;
  private batBase64: string;
  private avatarCache: Map<string, string> = new Map();

  constructor() {
    const templatesDir = join(__dirname, '..', 'templates');
    const assetsDir = join(__dirname, '..', 'assets', 'bonk');

    try {
      this.template = readFileSync(join(templatesDir, 'bonk-card.html'), 'utf-8');
      this.sourceImages = this.loadSourceImages(assetsDir);
      this.batBase64 = this.fileToBase64(join(assetsDir, 'bonk_bat.png'));
    } catch {
      // Fallback: try src path during development
      const srcTemplatesDir = templatesDir.replace(/dist[\\/]/, 'src/');
      const srcAssetsDir = assetsDir.replace(/dist[\\/]/, 'src/');

      this.template = readFileSync(join(srcTemplatesDir, 'bonk-card.html'), 'utf-8');
      this.sourceImages = this.loadSourceImages(srcAssetsDir);
      this.batBase64 = this.fileToBase64(join(srcAssetsDir, 'bonk_bat.png'));
    }
  }

  private loadSourceImages(dir: string): Record<BonkStyle, string> {
    return {
      doge: this.fileToBase64(join(dir, 'doge_bonk_source.png')),
      cat: this.fileToBase64(join(dir, 'cat_bonk_source.png')),
      lions: this.fileToBase64(join(dir, 'lions_bonk_source.png')),
      rabbit: this.fileToBase64(join(dir, 'rabbit_bonk_source.png')),
      doge_fatality: this.fileToBase64(join(dir, 'doge_bonk_fatality.png')),
    };
  }

  private fileToBase64(filePath: string): string {
    const buffer = readFileSync(filePath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

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
        ],
      });
    } finally {
      this.isInitializing = false;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.avatarCache.clear();
  }

  private async imageUrlToBase64(url: string): Promise<string> {
    const cached = this.avatarCache.get(url);
    if (cached) return cached;

    try {
      // eslint-disable-next-line no-undef
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/png';
      const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;

      if (this.avatarCache.size > 50) {
        const firstKey = this.avatarCache.keys().next().value as string | undefined;
        if (firstKey) this.avatarCache.delete(firstKey);
      }
      this.avatarCache.set(url, dataUrl);
      return dataUrl;
    } catch {
      return url;
    }
  }

  async generateBonkImage(data: BonkImageData): Promise<Buffer> {
    await this.initialize();
    if (!this.browser) throw new Error('Browser not initialized');

    const page = await this.browser.newPage();
    try {
      await page.setViewport({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

      const config = POSITIONS[data.style];
      const sourceImage = this.sourceImages[data.style];
      const visuals = data.visuals ?? DEFAULT_VISUALS;

      const [bonkerAvatar, bonkedAvatar] = await Promise.all([
        this.imageUrlToBase64(data.bonkerAvatarUrl),
        this.imageUrlToBase64(data.bonkedAvatarUrl),
      ]);

      const bonkerSizePx = pct(config.bonkerSize, CANVAS_WIDTH);
      const bonkerLeftPx = pct(config.bonkerCenterX, CANVAS_WIDTH) - Math.round(bonkerSizePx / 2);
      const bonkerTopPx = pct(config.bonkerCenterY, CANVAS_HEIGHT) - Math.round(bonkerSizePx / 2);

      const bonkedSizePx = pct(config.bonkedSize, CANVAS_WIDTH);
      const bonkedLeftPx = pct(config.bonkedCenterX, CANVAS_WIDTH) - Math.round(bonkedSizePx / 2);
      const bonkedTopPx = pct(config.bonkedCenterY, CANVAS_HEIGHT) - Math.round(bonkedSizePx / 2);

      const impactEffects = this.generateImpactEffects(visuals, config);
      const isMultiLine = visuals.bonkText.includes('<br>');

      const html = this.template
        .replace(/\{\{sourceImage\}\}/g, sourceImage)
        .replace(/\{\{bonkerAvatar\}\}/g, bonkerAvatar)
        .replace(/\{\{bonkedAvatar\}\}/g, bonkedAvatar)
        .replace(/\{\{batImage\}\}/g, this.batBase64)
        .replace(/\{\{bonkerSize\}\}/g, String(bonkerSizePx))
        .replace(/\{\{bonkerLeft\}\}/g, String(bonkerLeftPx))
        .replace(/\{\{bonkerTop\}\}/g, String(bonkerTopPx))
        .replace(/\{\{bonkedSize\}\}/g, String(bonkedSizePx))
        .replace(/\{\{bonkedLeft\}\}/g, String(bonkedLeftPx))
        .replace(/\{\{bonkedTop\}\}/g, String(bonkedTopPx))
        .replace(/\{\{bonkText\}\}/g, visuals.bonkText)
        .replace(/\{\{bonkFontSize\}\}/g, String(visuals.fontSize))
        .replace(/\{\{bonkTextLeft\}\}/g, String(pct(config.bonkTextX, CANVAS_WIDTH)))
        .replace(/\{\{bonkTextTop\}\}/g, String(pct(config.bonkTextY, CANVAS_HEIGHT)))
        .replace(/\{\{bonkTextColor\}\}/g, visuals.textColor)
        .replace(/\{\{bonkGlowColor\}\}/g, visuals.glowColor)
        .replace(/\{\{textStrokeWidth\}\}/g, String(visuals.textStrokeWidth))
        .replace(
          /\{\{bonkTextTransform\}\}/g,
          isMultiLine ? 'translate(-50%, 0) rotate(-12deg)' : 'rotate(-12deg)'
        )
        .replace(
          /\{\{bonkTextExtraStyle\}\}/g,
          isMultiLine ? 'white-space:normal;text-align:center;line-height:1.1;' : ''
        )
        .replace(
          /\{\{batExtraStyle\}\}/g,
          data.style === 'doge_fatality'
            ? 'transform-origin:30% 20%;transform:rotate(15deg) translateX(10%);'
            : ''
        )
        .replace(/\{\{impactEffects\}\}/g, impactEffects);

      await page.setContent(html, { waitUntil: 'load', timeout: 5000 });
      await new Promise((resolve) => setTimeout(resolve, 150));

      const element = await page.$('.bonk-scene');
      if (!element) throw new Error('Bonk scene element not found');

      const screenshot = await element.screenshot({
        type: 'png',
        omitBackground: true,
      });

      return screenshot as Buffer;
    } finally {
      await page.close();
    }
  }

  private generateImpactEffects(visuals: BonkVisualConfig, config: PositionConfig): string {
    if (visuals.starCount === 0 && !visuals.showSpeedLines && !visuals.showDamageNumber) {
      return '';
    }

    let effects = '';
    const impactX = Math.round((config.bonkedCenterX / 100) * CANVAS_WIDTH);
    const impactY = Math.round((config.bonkedCenterY / 100) * CANVAS_HEIGHT);

    // Impact stars scattered around the bonked's head
    const starChars = [
      '\u2726',
      '\u2605',
      '\u2727',
      '\u2606',
      '\u2736',
      '\u273B',
      '*',
      '\u00D7',
      '+',
    ];
    for (let i = 0; i < visuals.starCount; i++) {
      const angle = (i / visuals.starCount) * 2 * Math.PI + Math.random() * 0.5;
      const radius = 50 + Math.random() * 70;
      const x = Math.max(0, Math.min(CANVAS_WIDTH, impactX + Math.cos(angle) * radius));
      const y = Math.max(0, Math.min(CANVAS_HEIGHT, impactY + Math.sin(angle) * radius));
      const size = 16 + Math.random() * 24;
      const starIdx = Math.floor(Math.random() * starChars.length);
      const star = starChars[starIdx] ?? '\u2726';
      effects += `<span class="impact-star" style="left:${Math.round(x)}px;top:${Math.round(y)}px;font-size:${Math.round(size)}px;">${star}</span>\n`;
    }

    // Speed lines radiating from impact
    if (visuals.showSpeedLines) {
      for (let i = 0; i < 5; i++) {
        const angle = -40 + Math.random() * 25;
        const x = impactX - 30 + Math.random() * 60;
        const y = impactY - 30 + Math.random() * 60;
        const len = 25 + Math.random() * 45;
        effects += `<div class="speed-line" style="left:${Math.round(x)}px;top:${Math.round(y)}px;width:${Math.round(len)}px;height:3px;transform:rotate(${Math.round(angle)}deg);"></div>\n`;
      }
    }

    // Floating damage number
    if (visuals.showDamageNumber) {
      const damage = Math.floor(Math.random() * 9000) + 1000;
      const dmgX = impactX + 40 > CANVAS_WIDTH - 150 ? impactX - 140 : impactX + 40;
      effects += `<div class="damage-number" style="left:${dmgX}px;top:${impactY - 60}px;font-size:32px;transform:rotate(-15deg);">${damage}!</div>\n`;
    }

    return effects;
  }
}
