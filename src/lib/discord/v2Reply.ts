/**
 * V2 Reply Helpers
 *
 * Standardized helpers for sending Components V2 messages via Discord interactions.
 * These helpers ensure that the correct flags are always set to avoid
 * DiscordAPIError 50035 (UNION_TYPE_CHOICES) when using V2 containers.
 *
 * The key issue: When using ContainerBuilder (Components V2), Discord requires
 * the `MessageFlags.IsComponentsV2` flag to be set. Without it, Discord
 * interprets the payload as legacy components and rejects it.
 */

import {
  MessageFlags,
  ContainerBuilder,
  type ChatInputCommandInteraction,
  type MessageComponentInteraction,
  type ModalSubmitInteraction,
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
} from 'discord.js';

// Enable verbose logging for V2 reply payloads.
// This is intentionally opt-in because payloads can be large and noisy.
const V2_DEBUG = process.env.CATTO_V2_DEBUG === '1';

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function v2Debug(interaction: RepliableInteraction, message: string, extra?: unknown): void {
  if (!V2_DEBUG) return;

  const logger = (
    interaction as unknown as { client?: { logger?: { debug?: (...a: unknown[]) => void } } }
  ).client?.logger;
  const log = logger?.debug ? logger.debug.bind(logger) : console.debug.bind(console);

  if (extra === undefined) {
    log(`[v2Reply] ${message}`);
    return;
  }

  log(`[v2Reply] ${message} :: ${safeJson(extra)}`);
}

// ============================================================================
// Types
// ============================================================================

/** Interactions that support defer/reply/editReply */
type RepliableInteraction =
  | ChatInputCommandInteraction
  | MessageComponentInteraction
  | ModalSubmitInteraction;

/** Options for V2 edit reply */
export interface V2EditReplyOptions {
  container: ContainerBuilder;
}

/** Options for V2 reply */
export interface V2ReplyOptions {
  container: ContainerBuilder;
  ephemeral?: boolean;
}

// ============================================================================
// Flag Helpers
// ============================================================================

/**
 * Combine MessageFlags.IsComponentsV2 with MessageFlags.Ephemeral
 */
export const V2_EPHEMERAL_FLAGS = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

/**
 * Just MessageFlags.IsComponentsV2 (for non-ephemeral V2 messages)
 */
export const V2_FLAGS = MessageFlags.IsComponentsV2;

// ============================================================================
// Defer Helpers
// ============================================================================

/**
 * Defer a reply with Components V2 + Ephemeral flags.
 * Use this when you plan to edit the reply with a V2 container later.
 */
export async function deferV2Ephemeral(interaction: RepliableInteraction): Promise<void> {
  // Cast required because discord.js types are overly restrictive for IsComponentsV2
  v2Debug(interaction, 'deferV2Ephemeral() start', {
    flags: V2_EPHEMERAL_FLAGS,
    hasIsComponentsV2: (V2_EPHEMERAL_FLAGS & MessageFlags.IsComponentsV2) !== 0,
    hasEphemeral: (V2_EPHEMERAL_FLAGS & MessageFlags.Ephemeral) !== 0,
  });
  await interaction.deferReply({ flags: V2_EPHEMERAL_FLAGS as number });
  v2Debug(interaction, 'deferV2Ephemeral() done', {
    deferred: interaction.deferred,
    replied: interaction.replied,
  });
}

/**
 * Defer a reply with only Components V2 flag (non-ephemeral).
 * Use this when you plan to edit the reply with a V2 container later.
 */
export async function deferV2(interaction: RepliableInteraction): Promise<void> {
  // Cast required because discord.js types are overly restrictive for IsComponentsV2
  v2Debug(interaction, 'deferV2() start', {
    flags: V2_FLAGS,
    hasIsComponentsV2: (V2_FLAGS & MessageFlags.IsComponentsV2) !== 0,
  });
  await interaction.deferReply({ flags: V2_FLAGS as number });
  v2Debug(interaction, 'deferV2() done', {
    deferred: interaction.deferred,
    replied: interaction.replied,
  });
}

// ============================================================================
// Reply Helpers
// ============================================================================

/**
 * Reply with a V2 container (ephemeral by default).
 * Use this for immediate V2 responses without deferring.
 */
export async function replyV2(
  interaction: RepliableInteraction,
  container: ContainerBuilder,
  options?: { ephemeral?: boolean }
): Promise<void> {
  const ephemeral = options?.ephemeral ?? true;
  const flags = ephemeral ? V2_EPHEMERAL_FLAGS : V2_FLAGS;

  const replyOptions: InteractionReplyOptions = {
    components: [container],
    flags,
  };

  v2Debug(interaction, 'replyV2() payload', {
    ephemeral,
    flags,
    container: container.toJSON(),
  });

  validateV2ContainerJson(interaction, container.toJSON());
  await interaction.reply(replyOptions);
}

/**
 * Reply with a V2 container (ephemeral).
 * Convenience function for ephemeral V2 replies.
 */
export async function replyV2Ephemeral(
  interaction: RepliableInteraction,
  container: ContainerBuilder,
  _content?: string
): Promise<void> {
  // Components V2 messages cannot use legacy `content`. The third argument is kept
  // for backward-compat but is intentionally ignored.
  await replyV2(interaction, container, { ephemeral: true });
}

// ============================================================================
// Edit Reply Helpers
// ============================================================================

/**
 * Edit a deferred reply with a V2 container.
 * IMPORTANT: The interaction must have been deferred with V2 flags.
 *
 * Note: flags cannot be changed after deferring, so make sure to use
 * deferV2Ephemeral() or deferV2() when deferring.
 */
export async function editReplyV2(
  interaction: RepliableInteraction,
  container: ContainerBuilder,
  _options?: { content?: string }
): Promise<void> {
  const editOptions: InteractionEditReplyOptions = {
    components: [container],
    // Discord requires the message to be flagged as Components V2 when editing
    // with a ContainerBuilder payload. Defer flags are not always sufficient.
    flags: MessageFlags.IsComponentsV2,
  };

  v2Debug(interaction, 'editReplyV2() start', {
    deferred: interaction.deferred,
    replied: interaction.replied,
    flags: MessageFlags.IsComponentsV2,
    container: container.toJSON(),
  });

  validateV2ContainerJson(interaction, container.toJSON());

  try {
    await interaction.editReply(editOptions);
    v2Debug(interaction, 'editReplyV2() done');
  } catch (error) {
    v2Debug(interaction, 'editReplyV2() failed', {
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
      editOptions: {
        container: container.toJSON(),
      },
    });
    throw error;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create reply options for a V2 container response.
 * Useful when you need to build the options object manually.
 */
export function createV2ReplyOptions(
  container: ContainerBuilder,
  options?: { ephemeral?: boolean }
): InteractionReplyOptions {
  const ephemeral = options?.ephemeral ?? true;
  const flags = ephemeral ? V2_EPHEMERAL_FLAGS : V2_FLAGS;

  return {
    components: [container],
    flags,
  };
}

/**
 * Create edit reply options for a V2 container response.
 */
export function createV2EditOptions(
  container: ContainerBuilder,
  _options?: { content?: string }
): InteractionEditReplyOptions {
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

// ---------------------------------------------------------------------------
// Strict V2 Debug Validator
// ---------------------------------------------------------------------------

function validateV2ContainerJson(interaction: RepliableInteraction, json: unknown): void {
  if (!V2_DEBUG) return;

  const visit = (value: unknown, path: string) => {
    if (!value || typeof value !== 'object') return;

    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (key === 'typpe' || key === 'contentt' || key === 'componeents') {
        v2Debug(interaction, 'INVALID V2 JSON KEY DETECTED', {
          path,
          key,
          obj,
          stack: new Error().stack,
        });
      }
    }

    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v)) {
        v.forEach((child, i) => visit(child, `${path}.${k}[${i}]`));
      } else if (v && typeof v === 'object') {
        visit(v, `${path}.${k}`);
      }
    }
  };

  visit(json, 'container');
}
