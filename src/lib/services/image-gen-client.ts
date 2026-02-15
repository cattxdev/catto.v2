/**
 * Image Generation Client
 * Communicates with the Rust image-gen-rs microservice.
 */

import { Buffer } from 'node:buffer';
import type { BonkImageData, RankCardData, LeaderboardCardData } from './image-gen-types.js';

/* global AbortController, fetch */

const IMAGE_GEN_SERVICE_URL = process.env.IMAGE_GEN_SERVICE_URL || 'http://localhost:3848';
const SERVICE_TIMEOUT = 15_000; // 15 seconds (longer than watermark due to multi-avatar fetching)

interface ImageGenResult {
  buffer: Buffer;
  usedRustService: boolean;
}

class ImageGenClient {
  private serviceAvailable: boolean | null = null;
  private lastHealthCheck = 0;
  private readonly healthCheckInterval = 60_000; // 1 minute

  /**
   * Check if the Rust image-gen service is available.
   * Caches result for 1 minute to avoid excessive health checks.
   */
  async isServiceAvailable(): Promise<boolean> {
    const now = Date.now();

    if (this.serviceAvailable !== null && now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.serviceAvailable;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${IMAGE_GEN_SERVICE_URL}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      this.serviceAvailable = response.ok;
      this.lastHealthCheck = now;

      return this.serviceAvailable;
    } catch {
      this.serviceAvailable = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  /**
   * Generate a bonk image using the Rust microservice.
   */
  async generateBonk(data: BonkImageData): Promise<Buffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SERVICE_TIMEOUT);

    try {
      const response = await fetch(`${IMAGE_GEN_SERVICE_URL}/bonk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        let message: string;
        try {
          const parsed = JSON.parse(body) as { error?: string };
          message = parsed.error || response.statusText;
        } catch {
          message = body || response.statusText;
        }
        throw new Error(`Image gen service error (${response.status}): ${message}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateBonkWithFallback(data: BonkImageData): Promise<ImageGenResult> {
    const buffer = await this.generateBonk(data);
    return { buffer, usedRustService: true };
  }

  /**
   * Generate a rank card using the Rust microservice.
   */
  async generateRankCard(data: RankCardData): Promise<Buffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SERVICE_TIMEOUT);

    try {
      const response = await fetch(`${IMAGE_GEN_SERVICE_URL}/rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        let message: string;
        try {
          const parsed = JSON.parse(body) as { error?: string };
          message = parsed.error || response.statusText;
        } catch {
          message = body || response.statusText;
        }
        throw new Error(`Image gen service error (${response.status}): ${message}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateRankCardWithFallback(data: RankCardData): Promise<ImageGenResult> {
    const buffer = await this.generateRankCard(data);
    return { buffer, usedRustService: true };
  }

  /**
   * Generate a leaderboard card using the Rust microservice.
   */
  async generateLeaderboard(data: LeaderboardCardData): Promise<Buffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SERVICE_TIMEOUT);

    try {
      const response = await fetch(`${IMAGE_GEN_SERVICE_URL}/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        let message: string;
        try {
          const parsed = JSON.parse(body) as { error?: string };
          message = parsed.error || response.statusText;
        } catch {
          message = body || response.statusText;
        }
        throw new Error(`Image gen service error (${response.status}): ${message}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateLeaderboardWithFallback(data: LeaderboardCardData): Promise<ImageGenResult> {
    const buffer = await this.generateLeaderboard(data);
    return { buffer, usedRustService: true };
  }
}

export const imageGenClient = new ImageGenClient();
