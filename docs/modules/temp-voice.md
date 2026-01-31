# Temp Voice Module

> Location: `src/modules/temp-voice/`

Temporary voice channel system with join-to-create.

## Features

- **Join-to-Create** - Users create channels by joining
- **Auto-cleanup** - Channels deleted when empty
- **User Control** - Channel owners manage permissions
- **Control Panel** - Interactive UI for management
- **User Preferences** - Custom default settings
- **Permission Management** - Allow/deny specific users

## Structure

```
src/modules/temp-voice/
├── services/
│   ├── TempChannelService.ts    # Channel management
│   ├── ConfigService.ts         # Guild configuration
│   ├── PermissionsService.ts    # Channel permissions
│   └── ControlPanelService.ts   # Interactive UI
├── models/
│   └── temp-voice.models.ts     # Type definitions
├── utils/
│   └── channel.utils.ts         # Helper functions
├── validation/
│   └── config.validation.ts     # Config validation
└── index.ts
```

## TempChannelService

Manage temporary channels:

```typescript
import { tempChannelService } from '#modules/temp-voice/index.js';

// Create temp channel for user
const channel = await tempChannelService.createChannel({
  guildId,
  ownerId: user.id,
  name: `${user.username}'s Channel`,
  parentId: categoryId,
  userLimit: 10,
});

// Get channel
const tempChannel = await tempChannelService.getChannel(channelId);

// Delete channel
await tempChannelService.deleteChannel(channelId);

// Transfer ownership
await tempChannelService.transferOwnership(channelId, newOwnerId);

// Update channel settings
await tempChannelService.updateChannel(channelId, {
  name: 'New Name',
  userLimit: 5,
});
```

## ConfigService

Manage guild configuration:

```typescript
import { tempVoiceConfigService } from '#modules/temp-voice/index.js';

// Get config
const config = await tempVoiceConfigService.getConfig(guildId);

// Create/update config
await tempVoiceConfigService.setConfig({
  guildId,
  categoryId,
  joinChannelIds: ['123456'],
  defaultUserLimit: 10,
  namingPattern: '{username}\'s Channel',
});

// Add join channel
await tempVoiceConfigService.addJoinChannel(guildId, channelId);

// Remove join channel
await tempVoiceConfigService.removeJoinChannel(guildId, channelId);

// Check if join channel
const isJoinChannel = await tempVoiceConfigService.isJoinChannel(guildId, channelId);
```

## PermissionsService

Manage channel permissions:

```typescript
import { tempVoicePermissionsService } from '#modules/temp-voice/index.js';

// Allow user
await tempVoicePermissionsService.allowUser(channelId, userId);

// Deny user
await tempVoicePermissionsService.denyUser(channelId, userId);

// Reset user
await tempVoicePermissionsService.resetUser(channelId, userId);

// Lock channel
await tempVoicePermissionsService.lockChannel(channelId);

// Unlock channel
await tempVoicePermissionsService.unlockChannel(channelId);

// Hide channel
await tempVoicePermissionsService.hideChannel(channelId);

// Unhide channel
await tempVoicePermissionsService.unhideChannel(channelId);
```

## ControlPanelService

Interactive control panel:

```typescript
import { controlPanelService } from '#modules/temp-voice/index.js';

// Send control panel
await controlPanelService.sendPanel(channel, owner);

// Handle button interaction
await controlPanelService.handleButton(interaction);
```

## Configuration Options

### TempVoiceConfig

```typescript
interface TempVoiceConfig {
  guildId: string;
  enabled: boolean;
  categoryId: string;           // Category for temp channels
  joinChannelIds: string[];     // Join-to-create channels
  defaultUserLimit: number;     // Default user limit (0 = unlimited)
  namingPattern: string;        // Channel name pattern
  allowRename: boolean;         // Users can rename
  allowUserLimit: boolean;      // Users can set limit
  allowPermissions: boolean;    // Users can manage permissions
  bitrate: number;              // Default bitrate
  maxChannelsPerUser: number;   // Limit channels per user
}
```

### Naming Pattern Variables

| Variable | Description |
|----------|-------------|
| `{username}` | User's username |
| `{displayName}` | User's display name |
| `{tag}` | User's tag (username#0000) |
| `{game}` | User's current game |
| `{count}` | Channel number |

## Types

### TempVoiceChannel

```typescript
interface TempVoiceChannel {
  id: string;
  guildId: string;
  channelId: string;
  ownerId: string;
  name: string;
  userLimit: number;
  locked: boolean;
  hidden: boolean;
  createdAt: Date;
}
```

### ChannelPermission

```typescript
interface ChannelPermission {
  channelId: string;
  userId: string;
  allowed: boolean;
}
```

## Listeners

### VoiceStateUpdate

`src/listeners/temp-voice/voiceStateUpdate.ts`:

```typescript
public async run(oldState: VoiceState, newState: VoiceState) {
  // User joined a join-to-create channel
  if (newState.channel && await isJoinChannel(newState.channel.id)) {
    await tempChannelService.createChannel({
      ownerId: newState.member.id,
      // ...
    });
    await newState.member.voice.setChannel(newChannel);
  }

  // User left a temp channel - check if empty
  if (oldState.channel && await isTempChannel(oldState.channel.id)) {
    if (oldState.channel.members.size === 0) {
      await tempChannelService.deleteChannel(oldState.channel.id);
    }
  }
}
```

### ChannelDelete

`src/listeners/temp-voice/channelDelete.ts`:

Cleans up database when channels are manually deleted.

## Database Models

### TempVoiceConfig

```prisma
model TempVoiceConfig {
  id               Int      @id @default(autoincrement())
  guildId          String   @unique
  enabled          Boolean  @default(true)
  categoryId       String
  joinChannelIds   String[]
  defaultUserLimit Int      @default(0)
  namingPattern    String   @default("{username}'s Channel")
  allowRename      Boolean  @default(true)
  allowUserLimit   Boolean  @default(true)
  allowPermissions Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

### TempVoiceChannel

```prisma
model TempVoiceChannel {
  id        Int      @id @default(autoincrement())
  guildId   String
  channelId String   @unique
  ownerId   String
  name      String
  userLimit Int      @default(0)
  locked    Boolean  @default(false)
  hidden    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([guildId])
}
```

## REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/guilds/:id/temp-voice/config` | GET | Get config |
| `/guilds/:id/temp-voice/config` | POST | Create config |
| `/guilds/:id/temp-voice/config` | PATCH | Update config |
| `/guilds/:id/temp-voice/config` | DELETE | Delete config |
| `/guilds/:id/temp-voice/channels` | GET | List channels |
| `/guilds/:id/temp-voice/stats` | GET | Statistics |
| `/guilds/:id/temp-voice/setup` | POST | Quick setup |

## Commands

| Command | Description |
|---------|-------------|
| `/tempvoice setup` | Set up temp voice |
| `/tempvoice config` | View/edit config |
| `/tempvoice panel` | Show control panel |
| `/tempvoice rename` | Rename your channel |
| `/tempvoice limit` | Set user limit |
| `/tempvoice lock` | Lock channel |
| `/tempvoice unlock` | Unlock channel |
| `/tempvoice allow` | Allow user |
| `/tempvoice deny` | Deny user |
| `/tempvoice transfer` | Transfer ownership |

## Interactions

### Buttons

Located in `src/interactions/temp-voice/buttons.ts`:
- Rename, limit, lock/unlock, hide/show
- Allow/deny user, transfer ownership

### Modals

Located in `src/interactions/temp-voice/modals.ts`:
- Channel rename modal
- User limit modal

### User Select

Located in `src/interactions/temp-voice/user-select.ts`:
- Select user to allow/deny/transfer

## Related

- [Listeners](../listeners/creating-listeners.md) - Voice state handling
- [Discord Components](../core/discord-components.md) - Control panel UI
