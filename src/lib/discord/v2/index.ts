/**
 * V2 Component Factory - Discord Components V2
 *
 * A composable component factory for building Discord Components V2 messages.
 *
 * ## Usage Examples
 *
 * ### Fluent API
 * ```ts
 * import { v2 } from '#lib/discord';
 *
 * const message = v2.container()
 *   .accent(COLORS.SUCCESS)
 *   .h1('Welcome!')
 *   .divider()
 *   .kv({ 'Members': 1000 })
 *   .build();
 * ```
 *
 * ### Quick Builders
 * ```ts
 * import { v2 } from '#lib/discord';
 *
 * // Success message
 * v2.successMessage('Done!', 'Your changes have been saved.')
 *
 * // Error message
 * v2.errorMessage('Error', 'Something went wrong.')
 * ```
 *
 * ### Functional Composition
 * ```ts
 * import { v2 } from '#lib/discord';
 *
 * const message = v2.pipe(
 *   v2.container(),
 *   v2.withHeader('Dashboard'),
 *   v2.when(hasNotifications, (c) => c.text('New notifications!')),
 *   v2.withFooter('Last updated: now')
 * ).build();
 * ```
 */

// =============================================================================
// Fluent Container - Composable container builder
// =============================================================================
export {
  container,
  FluentContainer,
  // Preset factories
  successContainer,
  errorContainer,
  warningContainer,
  infoContainer,
  primaryContainer,
  neutralContainer,
  // Quick builders
  simpleMessage,
  successMessage,
  errorMessage,
  warningMessage,
  infoMessage,
  // Types
  type ContainerComponent,
  type ContainerOptions,
  type AccentColor,
} from './container.js';

// =============================================================================
// Primitives - Base building blocks
// =============================================================================
export {
  // Text display
  textDisplay,
  text as textPrimitive,
  heading1,
  heading2,
  heading3,
  // Text formatting (returns strings)
  bold as boldText,
  italic as italicText,
  underline,
  strikethrough,
  code as inlineCode,
  codeBlock as codeBlockText,
  quote as quoteText,
  spoiler,
  bulletList,
  numberedList,
  // Discord mentions & timestamps
  timestamp,
  userMention,
  channelMention,
  roleMention,
  // Separators
  separator,
  smallSeparator as smallSep,
  largeSeparator as largeSep,
  divider as dividerSep,
  largeDivider,
  // Utilities
  toTextDisplay,
  joinText,
  keyValue,
  keyValues,
  truncate,
  escapeMarkdown,
  // Types
  type SpacingSize,
  type TextContent,
  type SeparatorOptions,
} from './primitives.js';

// =============================================================================
// Section - Sections with accessories
// =============================================================================
export {
  section,
  sectionWithButton,
  sectionWithThumbnail,
  titledSection,
  kvSection,
  listSection,
  numberedSection,
  // Extensions
  addSectionText,
  withButton,
  withThumbnail,
  // Types
  type SectionContent,
  type SectionAccessory,
  type SectionOptions,
} from './section.js';

// =============================================================================
// Media - Thumbnails, galleries, files
// =============================================================================
export {
  // Thumbnail
  thumbnail,
  userThumbnail,
  // Media gallery
  galleryItem,
  mediaGallery,
  singleImage,
  spoilerGallery,
  addGalleryItems,
  // File
  file,
  attachment,
  // Types
  type ThumbnailOptions,
  type MediaGalleryItemOptions,
  type FileOptions,
} from './media.js';

// =============================================================================
// Compose - Functional composition utilities
// =============================================================================
export {
  // Core composition
  pipe,
  compose,
  // Conditional
  when,
  ifElse,
  forEach,
  // Common transforms
  withHeader,
  withFooter,
  withActions,
  withAccent,
  withKeyValues,
  withList,
  withThumbnailSection,
  // Builders
  build,
  buildWith,
  // Templates
  template,
  coloredTemplate,
  // Types
  type ContainerTransform,
  type BuilderTransform,
} from './compose.js';
