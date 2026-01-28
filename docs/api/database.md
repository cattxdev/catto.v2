# Database API

> Location: `src/lib/database.ts`

High-level Prisma helper functions for common database operations.

## Accessing Prisma Directly

```typescript
import { container } from '@sapphire/framework';

// Direct Prisma access
const guild = await container.prisma.guild.findUnique({
  where: { guildId: '123456789' }
});
```

## Helper Functions

### Guild Operations

#### `saveGuild(guild, language?)`

Store or update guild information in the database.

```typescript
import { saveGuild } from '#lib/database.js';

// In a listener
public async run(guild: DiscordGuild) {
  await saveGuild(guild, 'en-US');
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `guild` | `Discord.Guild` | Discord guild object |
| `language` | `string` | Language code (default: `'en-US'`) |

**Returns:** `Promise<Guild>` - The upserted guild record

---

#### `getGuild(guildId)`

Retrieve a guild from the database with its users.

```typescript
import { getGuild } from '#lib/database.js';

const guild = await getGuild('123456789');
if (guild) {
  console.log(guild.name, guild.users.length);
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `guildId` | `string` | Discord guild ID (Snowflake) |

**Returns:** `Promise<Guild & { users: User[] } | null>`

---

#### `updateGuildLanguage(guildId, language)`

Update the language setting for a guild.

```typescript
import { updateGuildLanguage } from '#lib/database.js';

await updateGuildLanguage('123456789', 'es-ES');
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `guildId` | `string` | Discord guild ID |
| `language` | `string` | Language code |

**Returns:** `Promise<Guild>`

---

#### `deleteGuild(guildId)`

Delete a guild and all related data (cascade delete).

```typescript
import { deleteGuild } from '#lib/database.js';

await deleteGuild('123456789');
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `guildId` | `string` | Discord guild ID |

**Returns:** `Promise<Guild>`

---

#### `getGuildUsers(guildId)`

Get all users associated with a guild.

```typescript
import { getGuildUsers } from '#lib/database.js';

const users = await getGuildUsers('123456789');
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `guildId` | `string` | Discord guild ID |

**Returns:** `Promise<User[]>`

---

### User Operations

#### `saveUser(user, guildId?)`

Store or update user information.

```typescript
import { saveUser } from '#lib/database.js';

await saveUser(interaction.user, interaction.guildId);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | `Discord.User` | Discord user object |
| `guildId` | `string?` | Optional guild ID to associate |

**Returns:** `Promise<User>`

---

#### `getUser(userId)`

Retrieve a user from the database with their guild.

```typescript
import { getUser } from '#lib/database.js';

const user = await getUser('123456789');
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | `string` | Discord user ID |

**Returns:** `Promise<User & { guild: Guild | null } | null>`

---

### Logging Operations

#### `createLog(level, message, metadata?)`

Log an event to the database.

```typescript
import { createLog } from '#lib/database.js';

await createLog('info', 'User banned', {
  moderatorId: moderator.id,
  targetId: target.id,
  reason: 'Spam'
});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `level` | `string` | Log level (`'info'`, `'warn'`, `'error'`) |
| `message` | `string` | Log message |
| `metadata` | `Record<string, unknown>?` | Optional metadata object |

**Returns:** `Promise<Log>`

---

#### `getRecentLogs(limit?)`

Retrieve recent logs ordered by date.

```typescript
import { getRecentLogs } from '#lib/database.js';

const logs = await getRecentLogs(50);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | `number` | Max logs to return (default: `100`) |

**Returns:** `Promise<Log[]>`

---

### Statistics

#### `getStats()`

Get database statistics (counts).

```typescript
import { getStats } from '#lib/database.js';

const stats = await getStats();
// { guilds: 150, users: 5000, logs: 12000 }
```

**Returns:** `Promise<{ guilds: number; users: number; logs: number }>`

---

## Prisma Schema Reference

Key models in `prisma/schema.prisma`:

```prisma
model Guild {
  id        Int      @id @default(autoincrement())
  guildId   String   @unique
  name      String
  language  String   @default("en-US")
  settings  Json     @default("{}")
  users     User[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model User {
  id        Int      @id @default(autoincrement())
  userId    String   @unique
  username  String
  guild     Guild?   @relation(fields: [guildId], references: [id])
  guildId   Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Log {
  id        Int      @id @default(autoincrement())
  level     String
  message   String
  metadata  Json?
  createdAt DateTime @default(now())
}
```

## Related

- [Redis/Cache API](redis.md) - For caching database results
- [Architecture](../architecture.md) - Overall system design
