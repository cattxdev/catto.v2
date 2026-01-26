/**
 * Utility for handling channel name template variables
 */

import type { GuildMember } from 'discord.js';
import { TEMPLATE_VARIABLES } from '../constants.js';

/**
 * Template replacement context
 */
export interface TemplateContext {
  username: string;
  discriminator?: string;
  tag: string;
  n: number;
}

/**
 * Replace template variables in a channel name template
 */
export function replaceTemplateVariables(template: string, context: TemplateContext): string {
  let result = template;

  // Replace {username}
  result = result.replace(
    new RegExp(TEMPLATE_VARIABLES.USERNAME.replace(/[{}]/g, '\\$&'), 'g'),
    context.username
  );

  // Replace {discriminator}
  if (context.discriminator) {
    result = result.replace(
      new RegExp(TEMPLATE_VARIABLES.DISCRIMINATOR.replace(/[{}]/g, '\\$&'), 'g'),
      context.discriminator
    );
  }

  // Replace {tag}
  result = result.replace(
    new RegExp(TEMPLATE_VARIABLES.TAG.replace(/[{}]/g, '\\$&'), 'g'),
    context.tag
  );

  // Replace {n}
  result = result.replace(
    new RegExp(TEMPLATE_VARIABLES.NUMBER.replace(/[{}]/g, '\\$&'), 'g'),
    context.n.toString()
  );

  return result;
}

/**
 * Generate a channel name from a template and guild member
 */
export function generateChannelName(
  template: string,
  member: GuildMember,
  sequenceNumber: number
): string {
  const context: TemplateContext = {
    username: member.displayName || member.user.username,
    discriminator: member.user.discriminator !== '0' ? member.user.discriminator : undefined,
    tag: member.user.tag,
    n: sequenceNumber,
  };

  let name = replaceTemplateVariables(template, context);

  // Truncate to Discord's 100 character limit
  if (name.length > 100) {
    name = name.substring(0, 100);
  }

  return name;
}

/**
 * Extract variables used in a template
 */
export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/\{[^}]+\}/g) || [];
  return [...new Set(matches)];
}

/**
 * Validate template contains at least one variable
 */
export function hasTemplateVariables(template: string): boolean {
  return /\{[^}]+\}/.test(template);
}
