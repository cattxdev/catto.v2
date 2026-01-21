/**
 * V1 Embed Builders (Traditional Discord Embeds)
 *
 * This module provides two API styles:
 *
 * 1. **Legacy API** (embeds.ts) - Extension function pattern
 *    ```ts
 *    const e = successEmbed();
 *    withTitle(e, 'Success');
 *    withFields(e, [{ name: 'Status', value: 'OK' }]);
 *    ```
 *
 * 2. **Fluent API** (fluent.ts) - Chainable builder pattern
 *    ```ts
 *    const e = fluentSuccess()
 *      .title('Success')
 *      .field('Status', 'OK')
 *      .build();
 *    ```
 */

// =============================================================================
// Legacy API (embeds.ts)
// =============================================================================
export {
  // Embed factories
  embed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  neutralEmbed,
  // Embed extensions
  withTitle,
  withTimestamp,
  withFooter,
  withAuthor,
  withUserAuthor,
  withThumbnail,
  withUserThumbnail,
  withImage,
  withFields,
  withField,
  // Pre-built templates
  buildSuccessEmbed,
  buildErrorEmbed,
  buildWarningEmbed,
  buildInfoEmbed,
  buildStatsEmbed,
  buildListEmbed,
  buildUserEmbed,
} from './embeds.js';

// =============================================================================
// Fluent API (fluent.ts)
// =============================================================================
export {
  // Fluent embed class
  FluentEmbed,
  type EmbedTransform,
  // Factory functions
  fluentEmbed,
  fluentSuccess,
  fluentError,
  fluentWarning,
  fluentInfo,
  fluentNeutral,
  // Composition utilities
  pipeEmbed,
  composeEmbed,
  whenEmbed,
  ifElseEmbed,
  // Common transforms
  withUser,
  withTimestampFooter,
  withPoweredBy,
} from './fluent.js';
