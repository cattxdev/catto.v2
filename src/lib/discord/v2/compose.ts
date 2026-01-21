/**
 * V2 Compose - Functional composition utilities for V2 components
 *
 * This module provides utilities for composing containers and components
 * using functional patterns like pipe, combine, and conditional building.
 *
 * @example
 * ```ts
 * // Pipe multiple transformations
 * const message = pipe(
 *   container(),
 *   withHeader('Welcome'),
 *   withUserInfo(user),
 *   withActions(confirmationRow('ok', 'cancel'))
 * );
 *
 * // Combine multiple containers
 * const combined = combine(
 *   headerContainer,
 *   contentContainer,
 *   footerContainer
 * );
 * ```
 */

import {
  ContainerBuilder,
  type MessageActionRowComponentBuilder,
  ActionRowBuilder,
} from 'discord.js';
import { FluentContainer, container, type AccentColor } from './container.js';

// ============================================================================
// Types
// ============================================================================

/** A function that transforms a FluentContainer */
export type ContainerTransform = (c: FluentContainer) => FluentContainer;

/** A function that transforms a ContainerBuilder */
export type BuilderTransform = (b: ContainerBuilder) => ContainerBuilder;

// ============================================================================
// Pipe & Compose
// ============================================================================

/**
 * Pipe a container through multiple transformations
 *
 * @example
 * ```ts
 * const result = pipe(
 *   container(),
 *   (c) => c.h1('Title'),
 *   (c) => c.text('Content'),
 *   (c) => c.divider(),
 *   withFooter('Powered by Bot')
 * );
 * ```
 */
export function pipe(
  initial: FluentContainer,
  ...transforms: ContainerTransform[]
): FluentContainer {
  return transforms.reduce((c, fn) => fn(c), initial);
}

/**
 * Compose multiple transformations into a single transformation
 *
 * @example
 * ```ts
 * const addHeaderAndFooter = compose(
 *   withHeader('My App'),
 *   withFooter('v1.0.0')
 * );
 *
 * const result = addHeaderAndFooter(container());
 * ```
 */
export function compose(...transforms: ContainerTransform[]): ContainerTransform {
  return (c: FluentContainer) => transforms.reduce((acc, fn) => fn(acc), c);
}

// ============================================================================
// Conditional Transforms
// ============================================================================

/**
 * Apply a transformation only if a condition is true
 *
 * @example
 * ```ts
 * pipe(
 *   container(),
 *   when(isAdmin, (c) => c.text('Admin panel available')),
 *   when(hasNotifications, withNotificationBadge)
 * )
 * ```
 */
export function when(condition: boolean, transform: ContainerTransform): ContainerTransform {
  return (c: FluentContainer) => (condition ? transform(c) : c);
}

/**
 * Apply one of two transformations based on a condition
 *
 * @example
 * ```ts
 * pipe(
 *   container(),
 *   ifElse(
 *     isSuccess,
 *     (c) => c.accent(COLORS.SUCCESS).h1('Success!'),
 *     (c) => c.accent(COLORS.ERROR).h1('Error!')
 *   )
 * )
 * ```
 */
export function ifElse(
  condition: boolean,
  onTrue: ContainerTransform,
  onFalse: ContainerTransform
): ContainerTransform {
  return (c: FluentContainer) => (condition ? onTrue(c) : onFalse(c));
}

/**
 * Apply a transformation for each item in an array
 *
 * @example
 * ```ts
 * pipe(
 *   container(),
 *   forEach(users, (c, user) => c.text(`- ${user.name}`))
 * )
 * ```
 */
export function forEach<T>(
  items: T[],
  transform: (c: FluentContainer, item: T, index: number) => FluentContainer
): ContainerTransform {
  return (c: FluentContainer) => {
    let result = c;
    items.forEach((item, index) => {
      result = transform(result, item, index);
    });
    return result;
  };
}

// ============================================================================
// Common Transforms (Reusable building blocks)
// ============================================================================

/**
 * Add a header section to a container
 */
export function withHeader(title: string, subtitle?: string): ContainerTransform {
  return (c: FluentContainer) => {
    c.h1(title);
    if (subtitle) {
      c.text(subtitle);
    }
    return c.separator();
  };
}

/**
 * Add a footer section to a container
 */
export function withFooter(text: string): ContainerTransform {
  return (c: FluentContainer) => c.divider().text(`-# ${text}`);
}

/**
 * Add action rows to a container
 */
export function withActions(
  ...rows: ActionRowBuilder<MessageActionRowComponentBuilder>[]
): ContainerTransform {
  return (c: FluentContainer) => c.actions(...rows);
}

/**
 * Set the accent color
 */
export function withAccent(color: AccentColor): ContainerTransform {
  return (c: FluentContainer) => c.accent(color);
}

/**
 * Add key-value pairs as a section
 */
export function withKeyValues(
  pairs: Record<string, string | number | boolean | undefined>,
  title?: string
): ContainerTransform {
  return (c: FluentContainer) => {
    if (title) {
      c.h3(title);
    }
    return c.kv(pairs);
  };
}

/**
 * Add a list of items
 */
export function withList(items: string[], title?: string): ContainerTransform {
  return (c: FluentContainer) => c.list(items, title);
}

/**
 * Add a section with a thumbnail
 */
export function withThumbnailSection(content: string, thumbnailUrl: string): ContainerTransform {
  return (c: FluentContainer) => c.sectionWithThumbnail(content, thumbnailUrl);
}

// ============================================================================
// Builder Utilities
// ============================================================================

/**
 * Create a container from a series of transformations
 *
 * @example
 * ```ts
 * const message = build(
 *   withAccent(COLORS.SUCCESS),
 *   withHeader('Success'),
 *   (c) => c.text('Operation completed.'),
 *   withFooter('Powered by Bot')
 * );
 * ```
 */
export function build(...transforms: ContainerTransform[]): ContainerBuilder {
  return pipe(container(), ...transforms).build();
}

/**
 * Create a container with options and transformations
 *
 * @example
 * ```ts
 * const message = buildWith(
 *   { color: COLORS.SUCCESS },
 *   withHeader('Success'),
 *   (c) => c.text('Done!')
 * );
 * ```
 */
export function buildWith(
  options: { color?: AccentColor; spoiler?: boolean },
  ...transforms: ContainerTransform[]
): ContainerBuilder {
  const c = container(options);
  return pipe(c, ...transforms).build();
}

// ============================================================================
// Template Helpers
// ============================================================================

/**
 * Create a reusable template function
 *
 * @example
 * ```ts
 * const userCard = template((user: User) => [
 *   withHeader(user.name),
 *   withKeyValues({
 *     'ID': user.id,
 *     'Status': user.status
 *   }),
 *   withThumbnailSection('Avatar', user.avatarUrl)
 * ]);
 *
 * const card = userCard(someUser);
 * ```
 */
export function template<T>(
  factory: (data: T) => ContainerTransform[]
): (data: T, baseColor?: AccentColor) => ContainerBuilder {
  return (data: T, baseColor?: AccentColor) => {
    const transforms = factory(data);
    const c = baseColor ? container({ color: baseColor }) : container();
    return pipe(c, ...transforms).build();
  };
}

/**
 * Create a template with a fixed accent color
 *
 * @example
 * ```ts
 * const successTemplate = coloredTemplate(COLORS.SUCCESS, (msg: string) => [
 *   withHeader('Success'),
 *   (c) => c.text(msg)
 * ]);
 *
 * const message = successTemplate('Operation completed!');
 * ```
 */
export function coloredTemplate<T>(
  color: AccentColor,
  factory: (data: T) => ContainerTransform[]
): (data: T) => ContainerBuilder {
  return (data: T) => {
    const transforms = factory(data);
    return pipe(container({ color }), ...transforms).build();
  };
}
