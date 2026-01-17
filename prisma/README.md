# Prisma Setup Documentation

## Overview
This project uses Prisma 7.2.0 as the ORM with PostgreSQL database.

## Features Enabled
- **Prisma Client**: Type-safe database client
- **Migrations**: Track database schema changes
- **Prisma Config**: Modern Prisma 7 configuration with `prisma.config.ts`
- **Preview Features**:
  - `relationJoins`: Optimized relation queries

## Prisma 7 Changes

Prisma 7 introduced a new configuration approach:
- Database URL is now in `prisma.config.ts` instead of `schema.prisma`
- Cleaner separation of concerns between schema and configuration
- Better support for different environments

## Database Configuration

### 1. Update Environment Variables
Edit your `.env` file with your PostgreSQL credentials:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

Example:
```env
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/catto_bot?schema=public"
```

### 2. Generate Prisma Client
After modifying the schema, generate the client:

```bash
pnpm prisma:generate
```

### 3. Create Your First Migration
Create and apply your first database migration:

```bash
pnpm prisma:migrate
# Enter a name when prompted, e.g., "init"
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm prisma:generate` | Generate Prisma Client |
| `pnpm prisma:migrate` | Create and apply migrations |
| `pnpm prisma:studio` | Open Prisma Studio (database GUI) |
| `pnpm prisma:push` | Push schema to database (development) |
| `pnpm prisma:pull` | Pull schema from existing database |
| `pnpm prisma:seed` | Seed database with initial data |
| `pnpm prisma:reset` | Reset database and rerun migrations |

## Schema Structure

The schema includes example models:
- **Guild**: Stores Discord guild/server information
- **User**: Stores user data with guild relationships
- **Log**: Application logging table

Modify these models in `prisma/schema.prisma` to fit your needs.

## Using Prisma in Your Code

Import the Prisma client from the utility file:

```typescript
import { prisma } from '#lib/prisma';

// Example: Create a guild
const guild = await prisma.guild.create({
  data: {
    guildId: '123456789',
    name: 'My Server',
    settings: { prefix: '!' }
  }
});

// Example: Find users
const users = await prisma.user.findMany({
  where: { guildId: guild.id },
  include: { guild: true }
});
```

## Best Practices

1. **Always use migrations** in production
2. **Use transactions** for related operations
3. **Add indexes** for frequently queried fields
4. **Use select/include** to limit data fetching
5. **Handle errors** appropriately with try-catch

## Prisma Studio

Launch the visual database editor:

```bash
pnpm prisma:studio
```

This opens a web interface at `http://localhost:5555` to view and edit your data.

## Seeding

The seed file (`prisma/seed.ts`) helps populate initial data. Customize it and run:

```bash
pnpm prisma:seed
```

## Troubleshooting

### Connection Issues
- Verify DATABASE_URL format
- Ensure PostgreSQL is running
- Check firewall/network settings

### Migration Conflicts
```bash
pnpm prisma:reset  # Resets database (CAUTION: data loss)
```

### Schema Drift
If schema and migrations are out of sync:
```bash
pnpm prisma migrate dev --create-only
# Review the migration file
pnpm prisma migrate dev
```

## Resources
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Connection String](https://www.prisma.io/docs/reference/database-reference/connection-urls)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
