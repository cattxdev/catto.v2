# Contributing to Catto

This guide outlines the development standards and workflow for the project.

## Development Workflow

### 1. Local Setup
Ensure you have followed the setup instructions in the [README.md](README.md). The fastest way to get started is using the ephemeral environment script:

```bash
pnpm dev:env
```

This command starts temporary PostgreSQL and Redis instances in RAM, applies migrations, and seeds the database automatically. It will provide you with the connection details needed for your `.env` file, though the containers are fully managed by the script.

For persistent development, you can use the traditional Docker Compose flow:
```bash
docker-compose up -d
pnpm prisma:migrate
```

### 2. Branching Strategy
Use descriptive branch names for all changes:

- `feature/description` for new features
- `fix/description` for bug fixes
- `refactor/description` for code improvements
- `docs/description` for documentation changes

```bash
git checkout -b feature/my-new-feature
```

### 3. Development Standards
While developing, use the dev mode to get instant feedback:

```bash
pnpm dev
```

**Key Guidelines:**
- **Type Safety:** Always provide proper types. Avoid using `any` unless absolutely necessary.
- **Documentation:** Comment complex logic and keep JSDoc comments updated.
- **Code Style:** We use ESLint and Prettier. Your editor should pick up the configurations automatically.
- **Prisma Changes:** If you modify `prisma/schema.prisma`, run `pnpm prisma:migrate` and update database helpers in `src/lib/database.ts` accordingly.

### 4. Commit Style
We follow [Conventional Commits](https://www.conventionalcommits.org/) to maintain a clean history.

Example: `feat(moderation): add warn command` or `fix(database): resolve connection timeout`

## Technical Architecture

- **Sapphire Framework:** We use Sapphire. Refer to [Sapphire's Documentation](https://www.sapphirejs.dev/docs/Guide/getting-started/introduction).
- **Database:** Prisma is our ORM. High-level DB interactions should be placed in `src/lib/database.ts`.
- **Caching:** Redis is used for ephemeral data. Helper functions are in `src/lib/redis.ts`.
- **Internationalization:** Use the i18n plugin for user-facing strings in `src/languages/`.
