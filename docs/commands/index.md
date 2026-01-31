# Commands

This section documents the command system and how to create new commands.

## Overview

Commands are built using the Sapphire Framework. The bot supports:

- **Slash commands** - Discord's native command system
- **Message commands** - Traditional prefix-based commands
- **Subcommands** - Nested command structures

## Command Categories

| Category | Location | Commands |
|----------|----------|----------|
| General | `src/commands/general/` | ping, info, help, language, dbstats, redis |
| Admin | `src/commands/admin/` | permission |
| Moderation | `src/commands/moderation/` | mod (with 20+ subcommands) |
| Reputation | `src/commands/reputation/` | rep, reputation |
| Rewards | `src/commands/rewards/` | rewards |
| Temp Voice | `src/commands/temp-voice/` | tempvoice |

## Command Structure

```
src/commands/
├── admin/
│   └── permission.ts
├── general/
│   ├── ping.ts
│   ├── info.ts
│   ├── help.ts
│   └── language.ts
├── moderation/
│   ├── mod.ts           # Main subcommand entry
│   ├── _ban.ts          # Subcommand handler
│   ├── _kick.ts
│   └── ...
└── ...
```

## Quick Start

See [Creating Commands](creating-commands.md) for detailed instructions.

```typescript
import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Command.Options>({
  name: 'hello',
  description: 'Say hello',
})
export class HelloCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description)
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    return interaction.reply('Hello!');
  }
}
```

## Topics

- [Creating Commands](creating-commands.md) - Step-by-step guide
- [Preconditions](preconditions.md) - Permission checks and guards
