/**
 * Evidence Service - Core business logic for the evidence management system
 *
 * Handles file uploads, URL evidence, message snapshot capture,
 * integrity verification, and evidence queries.
 */

import { container } from '@sapphire/framework';
import type { Evidence, EvidenceAmendment, MessageSnapshot } from '@prisma/client';
import type { Guild, TextChannel } from 'discord.js';
import { Buffer } from 'node:buffer';
import axios from 'axios';
import { storageService, StorageService } from '#lib/storage/StorageService.js';
import { signingService, SigningService } from '#lib/storage/SigningService.js';
import { WeightGate } from '#lib/validation/WeightGate.js';
import { CONFIG } from '#config.js';
import type {
  UploadInitParams,
  UploadInitResult,
  UrlEvidenceParams,
  CaptureParams,
  AmendParams,
  EvidenceSummary,
  MessageSnapshotEntry,
  SerializedAttachment,
  SerializedSticker,
  SerializedReaction,
} from '../domain/evidence-types.js';
import { mimeToEvidenceType, isDiscordUrl } from '../domain/evidence-types.js';

export class EvidenceService {
  // ─── Upload Flow ───

  /**
   * Step 1: Initiate upload — creates a PENDING evidence record and returns a presigned upload URL.
   */
  async initiateUpload(params: UploadInitParams): Promise<UploadInitResult> {
    // Find the case
    const modCase = await container.prisma.modCase.findFirst({
      where: { guildId: params.guildId, caseNumber: params.caseNumber },
    });
    if (!modCase)
      throw new Error(`Case #${params.caseNumber} not found in guild ${params.guildId}`);

    // Determine evidence type from MIME
    const type = mimeToEvidenceType(params.mimeType);

    // Create PENDING evidence record
    const evidence = await container.prisma.evidence.create({
      data: {
        guildId: params.guildId,
        caseId: modCase.id,
        caseNumber: params.caseNumber,
        uploadedById: params.uploadedById,
        uploadedByTag: params.uploadedByTag,
        type,
        status: 'PENDING',
        originalFilename: params.filename,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        storageBucket: CONFIG.B2_BUCKET_NAME ?? null,
        description: params.description,
      },
    });

    // Generate storage key
    const storageKey = StorageService.buildKey(
      params.guildId,
      params.caseNumber,
      evidence.id,
      params.filename
    );

    // Update evidence with storage key
    await container.prisma.evidence.update({
      where: { id: evidence.id },
      data: { storageKey },
    });

    // Generate presigned upload URL
    let uploadUrl = '';
    const uploadFields: Record<string, string> = {};

    if (storageService.isConfigured) {
      const presigned = await storageService.generateUploadUrl(
        storageKey,
        params.mimeType,
        params.sizeBytes
      );
      uploadUrl = presigned.uploadUrl;
    }

    container.logger.debug(
      `[EvidenceService.initiateUpload] evidenceId=${evidence.id}, storageKey=${storageKey}, hasUploadUrl=${!!uploadUrl}`
    );

    return {
      evidenceId: evidence.id,
      uploadUrl,
      uploadFields,
    };
  }

  /**
   * Step 2: Confirm upload — verifies hash, signs, and sets status to VERIFIED.
   */
  async confirmUpload(evidenceId: string, contentHash: string): Promise<Evidence> {
    const evidence = await container.prisma.evidence.findUnique({
      where: { id: evidenceId },
    });
    if (!evidence) throw new Error('Evidence not found');
    if (evidence.status !== 'PENDING' && evidence.status !== 'PROCESSING') {
      throw new Error(`Evidence is in ${evidence.status} state, cannot confirm`);
    }

    // Verify file exists in storage
    if (evidence.storageKey) {
      if (!storageService.isConfigured) {
        throw new Error(
          'Storage is not configured but evidence has a storage key — cannot verify upload'
        );
      }
      const exists = await storageService.verifyUpload(evidence.storageKey);
      container.logger.debug(
        `[EvidenceService.confirmUpload] storageConfigured=${storageService.isConfigured}, verifyResult=${exists}`
      );
      if (!exists) throw new Error('File not found in storage');
    }

    // Sign the content
    let hmacSignature: string | null = null;
    if (signingService.isConfigured) {
      const metadata = SigningService.buildMetadata(evidence);
      hmacSignature = signingService.sign(contentHash, metadata);
    }

    // Record upload weight
    if (evidence.sizeBytes) {
      await WeightGate.recordUpload(evidence.uploadedById, evidence.guildId, evidence.sizeBytes);
    }

    // Update to VERIFIED
    return container.prisma.evidence.update({
      where: { id: evidenceId },
      data: {
        status: 'VERIFIED',
        contentHash,
        hmacSignature,
      },
    });
  }

  // ─── URL Evidence ───

  /**
   * Add URL-type evidence to a case.
   * DISCORD_URL type is marked as "weak evidence" — if a case has only
   * DISCORD_URL evidence, the dashboard will show a warning.
   */
  async addUrlEvidence(params: UrlEvidenceParams): Promise<Evidence> {
    const modCase = await container.prisma.modCase.findFirst({
      where: { guildId: params.guildId, caseNumber: params.caseNumber },
    });
    if (!modCase) throw new Error(`Case #${params.caseNumber} not found`);

    // Auto-detect Discord URLs
    const type = params.type === 'URL' && isDiscordUrl(params.url) ? 'DISCORD_URL' : params.type;

    return container.prisma.evidence.create({
      data: {
        guildId: params.guildId,
        caseId: modCase.id,
        caseNumber: params.caseNumber,
        uploadedById: params.uploadedById,
        uploadedByTag: params.uploadedByTag,
        type,
        status: 'VERIFIED', // URLs are immediately verified
        url: params.url,
        description: params.description,
      },
    });
  }

  // ─── Message Snapshot ───

  /**
   * Capture a range of messages as evidence.
   *
   * 1. Fetches messages in the range
   * 2. Serializes each message
   * 3. Downloads and archives attachments to B2
   * 4. Computes integrity hashes
   * 5. Creates MessageSnapshot + Evidence records
   * 6. Optionally deletes original messages
   */
  async captureMessageRange(
    guild: Guild,
    params: CaptureParams
  ): Promise<{ snapshot: MessageSnapshot; evidence: Evidence }> {
    const channel = await guild.channels.fetch(params.channelId);
    if (!channel?.isTextBased()) throw new Error('Channel not found or not text-based');

    const textChannel = channel as TextChannel;

    // Fetch messages
    const fetchOptions: { limit: number; after?: string; before?: string } = { limit: 100 };
    if (params.lastMessageId) {
      fetchOptions.after = params.firstMessageId;
      // We'll filter to include only messages up to lastMessageId
    }

    let messages;
    if (params.lastMessageId) {
      messages = await textChannel.messages.fetch({
        after: params.firstMessageId,
        limit: 100,
      });
      // Filter to only include messages up to lastMessageId
      messages = messages.filter(
        (m) => m.id <= params.lastMessageId! && m.id >= params.firstMessageId
      );
    } else {
      // Single message capture
      const msg = await textChannel.messages.fetch(params.firstMessageId);
      messages = new Map([[msg.id, msg]]);
    }

    // Sort by creation time
    const sortedMessages = [...messages.values()].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    if (sortedMessages.length === 0) throw new Error('No messages found in the specified range');

    // Find the case
    const modCase = await container.prisma.modCase.findFirst({
      where: { guildId: params.guildId, caseNumber: params.caseNumber },
    });
    if (!modCase) throw new Error(`Case #${params.caseNumber} not found`);

    // Serialize messages
    const snapshotEntries: MessageSnapshotEntry[] = [];
    const mediaStorageKeys: string[] = [];

    for (const msg of sortedMessages) {
      const attachments: SerializedAttachment[] = [];

      for (const [, attachment] of msg.attachments) {
        const serialized: SerializedAttachment = {
          url: attachment.url,
          proxyUrl: attachment.proxyURL,
          filename: attachment.name ?? 'unknown',
          size: attachment.size,
          contentType: attachment.contentType,
        };

        // Archive attachment to B2 if storage is configured
        if (storageService.isConfigured) {
          try {
            const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
            if (response.status === 200) {
              const buffer = Buffer.from(response.data);
              const snapshotId = `pre_${Date.now()}`; // Temporary, will be updated
              const key = StorageService.buildSnapshotMediaKey(
                params.guildId,
                snapshotId,
                attachment.name ?? `attachment_${attachment.id}`
              );
              await storageService.uploadBuffer(
                key,
                buffer,
                attachment.contentType ?? 'application/octet-stream'
              );
              serialized.storageKey = key;
              mediaStorageKeys.push(key);
            }
          } catch {
            container.logger.warn(`Failed to archive attachment ${attachment.id}`);
          }
        }

        attachments.push(serialized);
      }

      const stickers: SerializedSticker[] = [...msg.stickers.values()].map((s) => ({
        id: s.id,
        name: s.name,
        format: s.format.toString(),
        url: s.url,
      }));

      const reactions: SerializedReaction[] = [...msg.reactions.cache.values()].map((r) => ({
        emoji: r.emoji.toString(),
        count: r.count,
      }));

      snapshotEntries.push({
        messageId: msg.id,
        authorId: msg.author.id,
        authorTag: msg.author.tag,
        authorAvatarUrl: msg.author.displayAvatarURL(),
        content: msg.content,
        embeds: msg.embeds.map((e) => e.toJSON()),
        attachments,
        stickers,
        reactions,
        messageUrl: msg.url,
        createdAt: msg.createdAt.toISOString(),
        editedAt: msg.editedAt?.toISOString() ?? null,
      });
    }

    // Compute integrity hash
    const snapshotJson = JSON.stringify(snapshotEntries);
    const contentHash = SigningService.sha256(Buffer.from(snapshotJson));

    // Create a temporary signing metadata
    const tempId = `snapshot_${Date.now()}`;
    let hmacSignature = '';
    if (signingService.isConfigured) {
      hmacSignature = signingService.sign(contentHash, {
        evidenceId: tempId,
        guildId: params.guildId,
        caseId: modCase.id,
        uploadedById: params.capturedById,
        timestamp: new Date().toISOString(),
      });
    }

    // Create MessageSnapshot
    const snapshot = await container.prisma.messageSnapshot.create({
      data: {
        guildId: params.guildId,
        channelId: params.channelId,
        capturedById: params.capturedById,
        capturedByTag: params.capturedByTag,
        firstMessageId: params.firstMessageId,
        lastMessageId: params.lastMessageId ?? null,
        messageCount: sortedMessages.length,
        snapshotData: snapshotEntries as unknown as import('@prisma/client').Prisma.InputJsonValue,
        mediaStorageKeys: mediaStorageKeys.length > 0 ? mediaStorageKeys : undefined,
        contentHash,
        hmacSignature,
      },
    });

    // Create Evidence record linked to the snapshot
    const evidence = await container.prisma.evidence.create({
      data: {
        guildId: params.guildId,
        caseId: modCase.id,
        caseNumber: params.caseNumber,
        uploadedById: params.capturedById,
        uploadedByTag: params.capturedByTag,
        type: 'MESSAGE_SNAPSHOT',
        status: 'VERIFIED',
        snapshotId: snapshot.id,
        contentHash,
        hmacSignature,
        description: `Message snapshot: ${sortedMessages.length} message(s) from #${textChannel.name}`,
      },
    });

    // Delete original messages if requested
    if (params.deleteAfterCapture && sortedMessages.length > 0) {
      try {
        if (sortedMessages.length === 1 && sortedMessages[0]) {
          await sortedMessages[0].delete();
        } else {
          // Bulk delete (only works for messages < 14 days old)
          const messageIds = sortedMessages.map((m) => m.id);
          await textChannel.bulkDelete(messageIds).catch(async () => {
            // Fallback to individual deletion if bulk fails
            for (const msg of sortedMessages) {
              await msg.delete().catch(() => {});
            }
          });
        }
      } catch {
        container.logger.warn('Failed to delete captured messages');
      }
    }

    return { snapshot, evidence };
  }

  // ─── Queries ───

  /**
   * Get all evidence for a case.
   */
  async getEvidenceForCase(guildId: string, caseNumber: number): Promise<Evidence[]> {
    return container.prisma.evidence.findMany({
      where: { guildId, caseNumber },
      orderBy: { createdAt: 'asc' },
      include: { snapshot: true },
    });
  }

  /**
   * Get paginated evidence for an entire guild with optional filters.
   */
  async getEvidenceForGuild(
    guildId: string,
    options: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
      caseNumber?: number;
    }
  ): Promise<{ evidence: Evidence[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { guildId };
    if (options.type) where.type = options.type;
    if (options.status) where.status = options.status;
    if (options.caseNumber) where.caseNumber = options.caseNumber;

    const [evidence, total] = await Promise.all([
      container.prisma.evidence.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { snapshot: true },
      }),
      container.prisma.evidence.count({ where }),
    ]);

    return {
      evidence,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get a single evidence item by ID.
   */
  async getEvidenceById(evidenceId: string): Promise<Evidence | null> {
    return container.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { snapshot: true, amendments: { orderBy: { createdAt: 'asc' } } },
    });
  }

  /**
   * Get amendment history for an evidence item.
   */
  async getEvidenceHistory(evidenceId: string): Promise<EvidenceAmendment[]> {
    return container.prisma.evidenceAmendment.findMany({
      where: { evidenceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get evidence summary for a case (for embeds).
   */
  async getEvidenceSummary(guildId: string, caseNumber: number): Promise<EvidenceSummary> {
    const items = await container.prisma.evidence.findMany({
      where: { guildId, caseNumber },
      select: { type: true, status: true, sizeBytes: true, createdAt: true },
    });

    const byType: Partial<Record<string, number>> = {};
    const byStatus: Partial<Record<string, number>> = {};
    let totalSizeBytes = 0;
    let latestAt: Date | null = null;
    let hasNonDiscordUrl = false;

    for (const item of items) {
      byType[item.type] = (byType[item.type] ?? 0) + 1;
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
      totalSizeBytes += item.sizeBytes ?? 0;
      if (!latestAt || item.createdAt > latestAt) latestAt = item.createdAt;
      if (item.type !== 'DISCORD_URL') hasNonDiscordUrl = true;
    }

    return {
      total: items.length,
      byType: byType as EvidenceSummary['byType'],
      byStatus: byStatus as EvidenceSummary['byStatus'],
      totalSizeBytes,
      latestAt,
      hasWeakEvidenceOnly: items.length > 0 && !hasNonDiscordUrl,
    };
  }

  // ─── Amendments ───

  /**
   * Add an amendment to an evidence item (append-only history).
   */
  async amendEvidence(params: AmendParams): Promise<EvidenceAmendment> {
    const evidence = await container.prisma.evidence.findUnique({
      where: { id: params.evidenceId },
    });
    if (!evidence) throw new Error('Evidence not found');

    // Record previous value based on action type
    let previousValue: string | undefined;
    if (params.action === 'DESCRIPTION_UPDATED') {
      previousValue = JSON.stringify({ description: evidence.description });
    }

    const amendment = await container.prisma.evidenceAmendment.create({
      data: {
        evidenceId: params.evidenceId,
        amendedById: params.amendedById,
        amendedByTag: params.amendedByTag,
        action: params.action,
        previousValue,
        newValue: params.newValue,
        reason: params.reason,
      },
    });

    // Apply the amendment
    if (params.action === 'DESCRIPTION_UPDATED' && params.newValue) {
      await container.prisma.evidence.update({
        where: { id: params.evidenceId },
        data: { description: params.newValue },
      });
    } else if (params.action === 'FLAGGED') {
      await container.prisma.evidence.update({
        where: { id: params.evidenceId },
        data: { status: 'FLAGGED' },
      });
    } else if (params.action === 'UNFLAGGED') {
      await container.prisma.evidence.update({
        where: { id: params.evidenceId },
        data: { status: 'VERIFIED' },
      });
    }

    return amendment;
  }

  // ─── View URLs ───

  /**
   * Generate a time-limited view URL for an evidence file.
   */
  async generateViewUrl(evidenceId: string): Promise<string> {
    const evidence = await container.prisma.evidence.findUnique({
      where: { id: evidenceId },
    });
    if (!evidence) throw new Error('Evidence not found');

    if (evidence.url) return evidence.url;

    if (evidence.storageKey && storageService.isConfigured) {
      return storageService.generateViewUrl(evidence.storageKey);
    }

    container.logger.debug(
      `[EvidenceService.generateViewUrl] evidenceId=${evidenceId}, hasUrl=${!!evidence.url}, hasStorageKey=${!!evidence.storageKey}, storageConfigured=${storageService.isConfigured}`
    );
    throw new Error('No viewable content for this evidence item');
  }

  /**
   * Generate a time-limited download URL for an evidence file.
   */
  async generateDownloadUrl(evidenceId: string): Promise<string> {
    const evidence = await container.prisma.evidence.findUnique({
      where: { id: evidenceId },
    });
    if (!evidence) throw new Error('Evidence not found');

    if (!evidence.storageKey) throw new Error('No downloadable file for this evidence item');
    if (!storageService.isConfigured) throw new Error('Storage is not configured');

    const filename = evidence.originalFilename ?? `evidence_${evidenceId}`;
    return storageService.generateDownloadUrl(evidence.storageKey, filename);
  }

  // ─── Dashboard URL Generation ───

  /**
   * Generate a dashboard URL for a case's evidence page.
   */
  generateCaseUrl(guildId: string, caseNumber: number): string {
    return `${CONFIG.DASHBOARD_URL}/mod/${guildId}/cases/${caseNumber}`;
  }

  /**
   * Generate a dashboard URL for adding evidence to a case.
   */
  generateEvidenceListUrl(guildId: string, caseNumber: number): string {
    return `${CONFIG.DASHBOARD_URL}/mod/${guildId}/cases/${caseNumber}/evidence`;
  }
}

export const evidenceService = new EvidenceService();
