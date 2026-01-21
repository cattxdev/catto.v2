/**
 * Fluent Reply Helpers for Discord Interactions
 *
 * Provides a clean API for sending component-based messages via Discord interactions.
 * Handles the required flags automatically so you don't have to.
 *
 * @example
 * ```ts
 * // Defer (ephemeral by default)
 * await defer(interaction);
 *
 * // Defer public (visible to everyone)
 * await defer(interaction).public();
 *
 * // Reply with container (ephemeral by default)
 * await reply(interaction, successMessage('Done!'));
 *
 * // Reply public
 * await reply(interaction, container).public();
 *
 * // Edit a deferred reply
 * await editReply(interaction, errorMessage('Failed', 'Something went wrong'));
 * ```
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
import { FluentContainer } from './v2/container.js';

/** Interactions that support defer/reply/editReply */
export type RepliableInteraction =
  | ChatInputCommandInteraction
  | MessageComponentInteraction
  | ModalSubmitInteraction;

/** A container that can be used in messages - either a ContainerBuilder or FluentContainer */
export type MessageContainer = ContainerBuilder | FluentContainer;

// ============================================================================
// Internal Helpers
// ============================================================================

const COMPONENTS_V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL = MessageFlags.Ephemeral;
const COMPONENTS_V2_EPHEMERAL = COMPONENTS_V2 | EPHEMERAL;

function resolveContainer(container: MessageContainer): ContainerBuilder {
  if (container instanceof FluentContainer) {
    return container.build();
  }
  return container;
}

// ============================================================================
// Fluent Defer
// ============================================================================

/**
 * Fluent defer builder - allows chaining .public() before awaiting
 */
class DeferBuilder implements PromiseLike<void> {
  private interaction: RepliableInteraction;
  private isEphemeral = true;

  constructor(interaction: RepliableInteraction) {
    this.interaction = interaction;
  }

  /**
   * Make the deferred reply visible to everyone (non-ephemeral)
   */
  public(): this {
    this.isEphemeral = false;
    return this;
  }

  /**
   * Execute the defer
   */
  private async execute(): Promise<void> {
    const flags = this.isEphemeral ? COMPONENTS_V2_EPHEMERAL : COMPONENTS_V2;
    await this.interaction.deferReply({ flags: flags as number });
  }

  /**
   * Allow await directly on the builder
   */
  then<TResult1 = void, TResult2 = never>(
    onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

/**
 * Defer a reply for later editing.
 * Ephemeral by default. Chain `.public()` for a visible reply.
 *
 * @example
 * ```ts
 * await defer(interaction);           // ephemeral
 * await defer(interaction).public();  // visible to all
 * ```
 */
export function defer(interaction: RepliableInteraction): DeferBuilder {
  return new DeferBuilder(interaction);
}

// ============================================================================
// Fluent Reply
// ============================================================================

/**
 * Fluent reply builder - allows chaining .public() before awaiting
 */
class ReplyBuilder implements PromiseLike<void> {
  private interaction: RepliableInteraction;
  private container: MessageContainer;
  private isEphemeral = true;

  constructor(interaction: RepliableInteraction, container: MessageContainer) {
    this.interaction = interaction;
    this.container = container;
  }

  /**
   * Make the reply visible to everyone (non-ephemeral)
   */
  public(): this {
    this.isEphemeral = false;
    return this;
  }

  /**
   * Execute the reply
   */
  private async execute(): Promise<void> {
    const resolved = resolveContainer(this.container);
    const flags = this.isEphemeral ? COMPONENTS_V2_EPHEMERAL : COMPONENTS_V2;

    const options: InteractionReplyOptions = {
      components: [resolved],
      flags,
    };

    await this.interaction.reply(options);
  }

  /**
   * Allow await directly on the builder
   */
  then<TResult1 = void, TResult2 = never>(
    onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

/**
 * Reply with a container message.
 * Ephemeral by default. Chain `.public()` for a visible reply.
 *
 * @example
 * ```ts
 * await reply(interaction, successMessage('Done!'));           // ephemeral
 * await reply(interaction, container).public();                // visible to all
 * ```
 */
export function reply(
  interaction: RepliableInteraction,
  container: MessageContainer
): ReplyBuilder {
  return new ReplyBuilder(interaction, container);
}

// ============================================================================
// Edit Reply (no fluent needed - flags are set at defer time)
// ============================================================================

/**
 * Edit a previously deferred reply.
 *
 * @example
 * ```ts
 * await defer(interaction);
 * // ... do work ...
 * await editReply(interaction, successMessage('Complete!'));
 * ```
 */
export async function editReply(
  interaction: RepliableInteraction,
  container: MessageContainer
): Promise<void> {
  const resolved = resolveContainer(container);

  const options: InteractionEditReplyOptions = {
    components: [resolved],
    flags: COMPONENTS_V2,
  };

  await interaction.editReply(options);
}
