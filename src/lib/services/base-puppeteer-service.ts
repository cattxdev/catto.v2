/**
 * Base Puppeteer Service
 * Shared browser lifecycle, avatar caching, and asset loading for image generation services.
 */

import puppeteer, { type Browser } from 'puppeteer';
import { readFileSync } from 'fs';
import { Buffer } from 'node:buffer';

const PUPPETEER_ARGS = [
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
  '--hide-scrollbars',
];

export abstract class BasePuppeteerService {
  protected browser: Browser | null = null;
  private isInitializing = false;
  private avatarCache = new Map<string, string>();
  private readonly maxCacheSize: number;

  constructor(maxCacheSize = 100) {
    this.maxCacheSize = maxCacheSize;
  }

  async initialize(): Promise<void> {
    if (this.browser || this.isInitializing) return;
    this.isInitializing = true;
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: PUPPETEER_ARGS,
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

  protected async imageUrlToBase64(url: string): Promise<string> {
    const cached = this.avatarCache.get(url);
    if (cached) return cached;

    try {
      // eslint-disable-next-line no-undef
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/png';
      const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;

      if (this.avatarCache.size > this.maxCacheSize) {
        const firstKey = this.avatarCache.keys().next().value as string | undefined;
        if (firstKey) this.avatarCache.delete(firstKey);
      }
      this.avatarCache.set(url, dataUrl);
      return dataUrl;
    } catch {
      return url;
    }
  }

  /** Read a file with dist→src fallback for development. */
  protected readAsset(filePath: string): Buffer {
    try {
      return readFileSync(filePath);
    } catch {
      return readFileSync(filePath.replace(/dist[\\/]/, 'src/'));
    }
  }

  protected readTemplate(filePath: string): string {
    return this.readAsset(filePath).toString('utf-8');
  }

  protected fileToBase64(filePath: string): string {
    const buffer = this.readAsset(filePath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
}
