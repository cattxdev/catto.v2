# Architecture

This document describes the system architecture of Catto v2.x and how components interact.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Sapphire v5.5 | Discord.js abstraction with decorators |
| Language | TypeScript 5.7 | Type-safe JavaScript |
| Database | PostgreSQL | Persistent data storage |
| ORM | Prisma v7 | Database operations and migrations |
| Cache | Redis | Caching, rate limiting, pub/sub |
| Queue | BullMQ | Background job processing |
| Validation | Zod | Schema validation |
| i18n | i18next | Internationalization |

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Discord Gateway                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BotClient                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Prisma    │  │    Redis    │  │     Sapphire Plugins    │  │
│  │   Client    │  │   Client    │  │  (API, i18n, Logger)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Commands    │    │   Listeners   │    │    Routes     │
│  (31 files)   │    │  (52 files)   │    │  (REST API)   │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Modules                                │
│  ┌───────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐  │
│  │Moderation │ │   XP    │ │Reputation│ │Rewards │ │TempVoice│  │
│  │  Service  │ │ Service │ │ Service  │ │Service │ │ Service │  │
│  └───────────┘ └─────────┘ └──────────┘ └────────┘ └─────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   PostgreSQL  │    │     Redis     │    │    BullMQ     │
│   (Prisma)    │    │   (Cache)     │    │   (Jobs)      │
└───────────────┘    └───────────────┘    └───────────────┘
```

## Request Flow

### Discord Interaction Flow

```
1. User sends /command in Discord
                │
                ▼
2. InteractionCreate event received
                │
                ▼
3. gateContext listener initializes Gate
                │
                ▼
4. PermissionGate precondition checks auth
                │
                ▼
5. Command handler executes
                │
                ▼
6. Service layer processes business logic
                │
                ▼
7. Database/Cache operations
                │
                ▼
8. Response sent to Discord
```

### REST API Flow

```
1. HTTP request to /api/...
                │
                ▼
2. Sapphire API middleware
                │
                ▼
3. Route handler executes
                │
                ▼
4. Service layer (if needed)
                │
                ▼
5. JSON response returned
```

## Directory Structure

### `/src/commands/`

Commands are organized by category:

```
commands/
├── admin/          # Admin-only commands
│   └── permission.ts
├── general/        # Utility commands
│   ├── ping.ts
│   ├── info.ts
│   ├── help.ts
│   └── language.ts
├── moderation/     # Moderation commands
│   ├── mod.ts      # Main subcommand entry
│   ├── _ban.ts     # Subcommand handlers
│   ├── _kick.ts
│   └── ...
├── reputation/     # Reputation commands
├── rewards/        # Reward commands
└── temp-voice/     # Voice channel commands
```

### `/src/listeners/`

Event handlers for Discord events:

```
listeners/
├── commands/       # Command execution events
├── guilds/         # Guild events (join, leave, update)
├── logs/           # Audit log events (30+ types)
├── temp-voice/     # Voice state events
├── voice-xp/       # Voice XP tracking
├── xp/             # Text XP tracking
└── ready.ts        # Bot ready event
```

### `/src/modules/`

Business logic organized by feature:

```
modules/
├── moderation/
│   ├── services/   # ModerationService, MuteService, etc.
│   ├── handlers/   # Command execution handlers
│   ├── discord/    # Embeds, components, modals
│   └── domain/     # Types and domain logic
├── xp-text/
├── xp-voice/
├── reputation/
├── rewards/
└── temp-voice/
```

### `/src/lib/`

Shared utilities and helpers:

```
lib/
├── validation/     # Gate permission system
├── discord/        # Discord component utilities
│   ├── components/ # Buttons, modals, selects
│   ├── containers/ # Fluent message builders
│   ├── core/       # CustomId, format, reply
│   └── design/     # Colors, emojis
├── cache/          # TypedCache wrapper
├── rateLimit/      # Rate limiting utilities
├── database.ts     # High-level DB helpers
├── redis.ts        # Redis helpers
├── i18n.ts         # Localization helpers
└── types.ts        # Shared types
```

## Key Patterns

### Service Layer Pattern

Business logic is encapsulated in service classes:

```typescript
// src/modules/moderation/services/ModerationService.ts
export class ModerationService {
  async banById(ctx: ModerationContext): Promise<ModActionResult> {
    // Validate, execute, create case, notify
  }
}

export const moderationService = new ModerationService();
```

### Gate Permission System

Custom RBAC for fine-grained permissions:

```typescript
// In command handler
const gate = Gate.from(interaction);
if (!gate || !await gate.requireAuth('mod.ban')) return;

// Gate checks:
// 1. Custom permission grants in database
// 2. Falls back to Discord permissions
```

### Fluent Container Builder

Discord messages built with fluent API:

```typescript
successContainer()
  .h2('User Banned')
  .text(`Banned ${user.tag}`)
  .field('Reason', reason)
  .footer(`Case #${caseNumber}`);
```

### Result Objects

Operations return result objects instead of throwing:

```typescript
interface ModActionResult {
  success: boolean;
  caseNumber?: CaseNumber;
  error?: string;
  userNotified: boolean;
}
```

## Database Schema

Key models in Prisma schema:

| Model | Purpose |
|-------|---------|
| `Guild` | Server configuration |
| `User` | User data per guild |
| `ModCase` | Moderation case tracking |
| `ModConfig` | Server mod settings |
| `Mute` | Active mute tracking |
| `UserXP` | Text message XP |
| `UserVoiceXP` | Voice channel XP |
| `UserReputation` | Reputation scores |
| `TempVoiceChannel` | Temp voice tracking |
| `LogConfig` | Audit log settings |

## Caching Strategy

Redis is used for:

| Purpose | Pattern |
|---------|---------|
| Configuration | Cache-aside with TTL |
| Rate limiting | Sliding window counter |
| Distributed locks | `RedisLock` class |
| Pub/Sub | Event broadcasting |
| Sorted sets | Leaderboards |

## Job Queue

BullMQ handles scheduled tasks:

| Job | Purpose |
|-----|---------|
| `TempbanScheduler` | Scheduled unbans |
| `MuteScheduler` | Scheduled unmutes |
| `LoggingService` | Async log writing |

## Related Documentation

- [BotClient](core/bot-client.md) - Client initialization details
- [Permission Gate](core/permission-gate.md) - RBAC system
- [Database API](api/database.md) - Database helpers
- [Redis API](api/redis.md) - Caching utilities
