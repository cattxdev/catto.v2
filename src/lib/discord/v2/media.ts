/**
 * V2 Media - Media components for Components V2
 *
 * This module provides factory functions for media-related components:
 * - Thumbnail: Small images displayed as section accessories
 * - MediaGallery: Grid of images/media items
 * - File: File attachment display
 *
 * @example
 * ```ts
 * // Thumbnail
 * thumbnail('https://example.com/avatar.png')
 *
 * // Media gallery with multiple images
 * mediaGallery([
 *   'https://example.com/img1.png',
 *   'https://example.com/img2.png',
 * ])
 *
 * // File attachment
 * file('attachment://document.pdf')
 * ```
 */

import {
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  FileBuilder,
} from 'discord.js';

// ============================================================================
// Types
// ============================================================================

/** Options for creating a thumbnail */
export interface ThumbnailOptions {
  /** Image URL */
  url: string;
  /** Alt text / description */
  description?: string;
  /** Whether to mark as spoiler */
  spoiler?: boolean;
}

/** Options for creating a media gallery item */
export interface MediaGalleryItemOptions {
  /** Image/media URL */
  url: string;
  /** Description/alt text */
  description?: string;
  /** Whether to mark as spoiler */
  spoiler?: boolean;
}

/** Options for creating a file */
export interface FileOptions {
  /** File URL (usually attachment://) */
  url: string;
  /** Whether to mark as spoiler */
  spoiler?: boolean;
}

// ============================================================================
// Thumbnail
// ============================================================================

/**
 * Create a thumbnail component
 *
 * Thumbnails are small images that can be used as section accessories.
 *
 * @example
 * ```ts
 * // Simple thumbnail
 * thumbnail('https://example.com/avatar.png')
 *
 * // With description
 * thumbnail({
 *   url: 'https://example.com/avatar.png',
 *   description: 'User avatar'
 * })
 *
 * // Spoiler thumbnail
 * thumbnail({
 *   url: 'https://example.com/sensitive.png',
 *   spoiler: true
 * })
 * ```
 */
export function thumbnail(options: string | ThumbnailOptions): ThumbnailBuilder {
  const opts = typeof options === 'string' ? { url: options } : options;
  const builder = new ThumbnailBuilder().setURL(opts.url);

  if (opts.description) {
    builder.setDescription(opts.description);
  }

  if (opts.spoiler) {
    builder.setSpoiler(true);
  }

  return builder;
}

/**
 * Create a thumbnail from a user's avatar URL
 *
 * @example
 * ```ts
 * const avatarUrl = user.displayAvatarURL({ size: 256 });
 * userThumbnail(avatarUrl, user.username)
 * ```
 */
export function userThumbnail(avatarUrl: string, username?: string): ThumbnailBuilder {
  return thumbnail({
    url: avatarUrl,
    description: username ? `${username}'s avatar` : undefined,
  });
}

// ============================================================================
// Media Gallery
// ============================================================================

/**
 * Create a media gallery item
 *
 * @example
 * ```ts
 * galleryItem('https://example.com/photo.png')
 *
 * galleryItem({
 *   url: 'https://example.com/photo.png',
 *   description: 'A beautiful sunset'
 * })
 * ```
 */
export function galleryItem(options: string | MediaGalleryItemOptions): MediaGalleryItemBuilder {
  const opts = typeof options === 'string' ? { url: options } : options;
  const builder = new MediaGalleryItemBuilder().setURL(opts.url);

  if (opts.description) {
    builder.setDescription(opts.description);
  }

  if (opts.spoiler) {
    builder.setSpoiler(true);
  }

  return builder;
}

/**
 * Create a media gallery component
 *
 * @example
 * ```ts
 * // Array of URLs
 * mediaGallery([
 *   'https://example.com/img1.png',
 *   'https://example.com/img2.png',
 * ])
 *
 * // Array of gallery items with options
 * mediaGallery([
 *   { url: 'https://example.com/img1.png', description: 'First' },
 *   { url: 'https://example.com/img2.png', description: 'Second' },
 * ])
 *
 * // Array of MediaGalleryItemBuilders
 * mediaGallery([
 *   galleryItem('https://example.com/img1.png'),
 *   galleryItem({ url: 'https://example.com/img2.png', spoiler: true }),
 * ])
 * ```
 */
export function mediaGallery(
  items: (string | MediaGalleryItemOptions | MediaGalleryItemBuilder)[]
): MediaGalleryBuilder {
  const builder = new MediaGalleryBuilder();

  const galleryItems = items.map((item) => {
    if (item instanceof MediaGalleryItemBuilder) {
      return item;
    }
    return galleryItem(item);
  });

  builder.addItems(...galleryItems);

  return builder;
}

/**
 * Create a single-image gallery
 *
 * Useful when you want to display a single large image.
 *
 * @example
 * ```ts
 * singleImage('https://example.com/hero.png', 'Hero banner')
 * ```
 */
export function singleImage(url: string, description?: string): MediaGalleryBuilder {
  return mediaGallery([{ url, description }]);
}

/**
 * Create a gallery with spoiler-tagged images
 *
 * @example
 * ```ts
 * spoilerGallery([
 *   'https://example.com/sensitive1.png',
 *   'https://example.com/sensitive2.png',
 * ])
 * ```
 */
export function spoilerGallery(urls: string[]): MediaGalleryBuilder {
  return mediaGallery(urls.map((url) => ({ url, spoiler: true })));
}

// ============================================================================
// File
// ============================================================================

/**
 * Create a file component
 *
 * Files are typically used with the `attachment://` protocol to reference
 * uploaded attachments.
 *
 * @example
 * ```ts
 * // Reference an attachment
 * file('attachment://document.pdf')
 *
 * // With spoiler
 * file({ url: 'attachment://sensitive.txt', spoiler: true })
 * ```
 */
export function file(options: string | FileOptions): FileBuilder {
  const opts = typeof options === 'string' ? { url: options } : options;
  const builder = new FileBuilder().setURL(opts.url);

  if (opts.spoiler) {
    builder.setSpoiler(true);
  }

  return builder;
}

/**
 * Create a file reference from an attachment name
 *
 * Automatically prepends `attachment://` to the filename.
 *
 * @example
 * ```ts
 * attachment('report.pdf')  // Creates file with URL 'attachment://report.pdf'
 * ```
 */
export function attachment(filename: string, spoiler = false): FileBuilder {
  return file({
    url: `attachment://${filename}`,
    spoiler,
  });
}

// ============================================================================
// Media Gallery Extensions
// ============================================================================

/**
 * Add items to an existing gallery
 */
export function addGalleryItems(
  gallery: MediaGalleryBuilder,
  items: (string | MediaGalleryItemOptions | MediaGalleryItemBuilder)[]
): MediaGalleryBuilder {
  const galleryItems = items.map((item) => {
    if (item instanceof MediaGalleryItemBuilder) {
      return item;
    }
    return galleryItem(item);
  });

  return gallery.addItems(...galleryItems);
}
