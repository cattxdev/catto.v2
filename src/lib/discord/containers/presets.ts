/**
 * Container Presets - Quick message builders
 */

import {
  container,
  successContainer,
  errorContainer,
  warningContainer,
  infoContainer,
  type FluentContainer,
} from './container.js';
import { EMOJI } from '../design.js';
/**
 * Simple message with multiple text lines
 */
export function simpleMessage(...lines: string[]): FluentContainer {
  const c = container();
  for (const line of lines) c.text(line);
  return c;
}

/**
 * Success message with title and optional description
 */
export function successMessage(title: string, description?: string): FluentContainer {
  const c = successContainer().h2(`${EMOJI.SUCCESS} ${title}`);
  if (description) c.text(description);
  return c;
}

/**
 * Error message with title and optional description
 */
export function errorMessage(title: string, description?: string): FluentContainer {
  const c = errorContainer().h2(`${EMOJI.ERROR} ${title}`);
  if (description) c.text(description);
  return c;
}

/**
 * Warning message with title and optional description
 */
export function warningMessage(title: string, description?: string): FluentContainer {
  const c = warningContainer().h2(`${EMOJI.WARNING} ${title}`);
  if (description) c.text(description);
  return c;
}

/**
 * Info message with title and optional description
 */
export function infoMessage(title: string, description?: string): FluentContainer {
  const c = infoContainer().h2(`${EMOJI.INFO} ${title}`);
  if (description) c.text(description);
  return c;
}

/**
 * Loading message
 */
export function loadingMessage(message: string = 'Loading...'): FluentContainer {
  return container().text(message);
}
