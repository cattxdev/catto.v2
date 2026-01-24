/**
 * Resource Key Resolution
 *
 * Provides a unified way to resolve resource keys (command keys) from any
 * interaction type. This enables consistent authorization across:
 * - Chat input commands
 * - Context menu commands
 * - Button interactions
 * - Modal submissions
 * - Select menu interactions
 *
 * @example
 * ```ts
 * // For any interaction
 * const resourceKey = resolveResourceKey(interaction);
 * await gate.requireAuth(resourceKey);
 * ```
 */

import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';
import type { GateableInteraction } from './Gate.js';
import { buildCommandKey } from './Gate.js';

// =============================================================================
// Types
// =============================================================================

export interface ResourceKeyResolution {
  /** The resolved resource key (e.g., 'mod.warn', 'mod.kick') */
  key: string;
  /** Source of the key resolution */
  source: 'command' | 'context_menu' | 'custom_id' | 'mapped';
  /** Original interaction type */
  interactionType: string;
}

export interface CustomIdParser {
  /** Check if this parser handles the custom ID */
  matches(customId: string): boolean;
  /** Parse the custom ID and return the resource key */
  parse(customId: string): string | null;
  /** Priority (higher = checked first). Built-ins use 0, externals should use negative. */
  priority?: number;
}

// =============================================================================
// Custom ID Parsers Registry
// =============================================================================

/**
 * Registry of custom ID parsers for component interactions.
 * Parsers are checked in priority order (highest first); first match wins.
 */
const customIdParsers: CustomIdParser[] = [];

/**
 * Register a custom ID parser.
 * Parsers are sorted by priority (higher = checked first). Built-ins use 0.
 */
export function registerCustomIdParser(parser: CustomIdParser): void {
  customIdParsers.push(parser);
  customIdParsers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

// =============================================================================
// Built-in Mod Panel/Modal Parsers
// =============================================================================

/**
 * Mod panel action to command key mapping.
 * These map the short action names in custom IDs to full command keys.
 */
const MOD_PANEL_ACTION_MAP: Record<string, string> = {
  // Punitive
  warn: 'mod.warn',
  kick: 'mod.kick',
  ban: 'mod.ban',
  softban: 'mod.softban',
  timeout: 'mod.timeout',
  tempban: 'mod.tempban',
  mutetxt: 'mod.mute.text',
  mutevoice: 'mod.mute.voice',
  unmute: 'mod.unmute.both',
  // Info
  addnote: 'mod.note.add',
  viewnotes: 'mod.note.list',
  viewctx: 'mod.context',
  history: 'mod.history',
  refresh: 'mod.panel',
};

/**
 * Modal prefix to action mapping.
 */
const MODAL_ACTION_MAP: Record<string, Record<string, string>> = {
  modreason: {
    warn: 'mod.warn',
    kick: 'mod.kick',
    ban: 'mod.ban',
    softban: 'mod.softban',
  },
  moddur: {
    timeout: 'mod.timeout',
    tempban: 'mod.tempban',
  },
  modnote: {
    add: 'mod.note.add',
    edit: 'mod.note.edit',
  },
  modmute: {
    text: 'mod.mute.text',
    voice: 'mod.mute.voice',
    both: 'mod.mute.both',
  },
};

// Register built-in mod panel parser
registerCustomIdParser({
  matches: (customId) => customId.startsWith('modpanel:'),
  parse: (customId) => {
    // Format: modpanel:v1:{action}:{targetId}:{nonce}
    const parts = customId.split(':');
    if (parts.length < 3) return null;
    const action = parts[2];
    return action ? (MOD_PANEL_ACTION_MAP[action] ?? null) : null;
  },
});

// Register built-in modal parsers
for (const [prefix, actionMap] of Object.entries(MODAL_ACTION_MAP)) {
  registerCustomIdParser({
    matches: (customId) => customId.startsWith(`${prefix}:`),
    parse: (customId) => {
      // Format: {prefix}:v1:{action}:{targetId}
      const parts = customId.split(':');
      if (parts.length < 3) return null;
      const action = parts[2];
      return action ? (actionMap[action] ?? null) : null;
    },
  });
}

// Register history pagination parser
registerCustomIdParser({
  matches: (customId) => customId.startsWith('modhistory:'),
  parse: () => 'mod.history',
});

// =============================================================================
// Core Resolution Functions
// =============================================================================

/**
 * Resolve the resource key from a chat input command interaction.
 */
export function resolveCommandKey(interaction: ChatInputCommandInteraction): string {
  const commandName = interaction.commandName;
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand(false);
  return buildCommandKey(commandName, subcommandGroup, subcommand);
}

/**
 * Resolve the resource key from a context menu command interaction.
 */
export function resolveContextMenuKey(interaction: ContextMenuCommandInteraction): string {
  // Context menus use the command name directly as the key
  return interaction.commandName;
}

/**
 * Resolve the resource key from a component custom ID.
 * Tries registered parsers in order; returns null if no parser matches.
 */
export function resolveCustomIdKey(customId: string): string | null {
  for (const parser of customIdParsers) {
    if (parser.matches(customId)) {
      return parser.parse(customId);
    }
  }
  return null;
}

/**
 * Resolve the resource key from a button interaction.
 */
export function resolveButtonKey(interaction: ButtonInteraction): string | null {
  return resolveCustomIdKey(interaction.customId);
}

/**
 * Resolve the resource key from a modal submission.
 */
export function resolveModalKey(interaction: ModalSubmitInteraction): string | null {
  return resolveCustomIdKey(interaction.customId);
}

/**
 * Resolve the resource key from a select menu interaction.
 */
export function resolveSelectMenuKey(interaction: StringSelectMenuInteraction): string | null {
  return resolveCustomIdKey(interaction.customId);
}

// =============================================================================
// Unified Resolution
// =============================================================================

/**
 * Resolve the resource key from any gateable interaction.
 *
 * @param interaction - Any gateable interaction
 * @returns Resolution result with key and metadata, or null if unresolvable
 */
export function resolveResourceKey(interaction: GateableInteraction): ResourceKeyResolution | null {
  if (interaction.isChatInputCommand()) {
    return {
      key: resolveCommandKey(interaction),
      source: 'command',
      interactionType: 'ChatInputCommand',
    };
  }

  if (interaction.isContextMenuCommand()) {
    return {
      key: resolveContextMenuKey(interaction),
      source: 'context_menu',
      interactionType: 'ContextMenuCommand',
    };
  }

  if (interaction.isButton()) {
    const key = resolveButtonKey(interaction);
    if (!key) return null;
    return {
      key,
      source: 'custom_id',
      interactionType: 'Button',
    };
  }

  if (interaction.isModalSubmit()) {
    const key = resolveModalKey(interaction);
    if (!key) return null;
    return {
      key,
      source: 'custom_id',
      interactionType: 'ModalSubmit',
    };
  }

  if (interaction.isStringSelectMenu()) {
    const key = resolveSelectMenuKey(interaction);
    if (!key) return null;
    return {
      key,
      source: 'custom_id',
      interactionType: 'StringSelectMenu',
    };
  }

  return null;
}

/**
 * Resolve resource key or throw if unable.
 */
export function resolveResourceKeyOrThrow(interaction: GateableInteraction): string {
  const result = resolveResourceKey(interaction);
  if (!result) {
    throw new Error(`Unable to resolve resource key for interaction type: ${interaction.type}`);
  }
  return result.key;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a custom ID is known/registered.
 */
export function isKnownCustomId(customId: string): boolean {
  return customIdParsers.some((p) => p.matches(customId));
}

/**
 * Get the resource key for a mod panel action.
 * Direct mapping without needing the full custom ID.
 */
export function getModPanelActionKey(action: string): string {
  return MOD_PANEL_ACTION_MAP[action] ?? 'mod.panel';
}
