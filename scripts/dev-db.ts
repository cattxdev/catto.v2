import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { execSync, spawn, type ChildProcess } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
const ENV_KEYS_TO_MANAGE = ['DATABASE_URL', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD'] as const;
let previousEnvValues: Record<string, string | undefined> | null = null;

const splitEnvValue = (rawValue: string) => {
  let inQuotes = false;
  let quoteChar: '"' | "'" | null = null;

  for (let i = 0; i < rawValue.length; i += 1) {
    const char = rawValue[i];
    if ((char === '"' || char === "'") && rawValue[i - 1] !== '\\') {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (quoteChar === char) {
        inQuotes = false;
        quoteChar = null;
      }
    }

    if (!inQuotes && char === '#') {
      return {
        value: rawValue.slice(0, i).trimEnd(),
        comment: rawValue.slice(i),
      };
    }
  }

  return { value: rawValue.trimEnd(), comment: '' };
};

const formatEnvValue = (value: string, existingValue?: string) => {
  const trimmed = existingValue?.trim();
  if (trimmed?.startsWith('"') && trimmed.endsWith('"')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  if (trimmed?.startsWith("'") && trimmed.endsWith("'")) {
    return `'${value.replace(/'/g, "\\'")}'`;
  }
  return value;
};

const readEnvValues = (keys: readonly string[]): Record<string, string | undefined> => {
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, 'utf8');
  const result: Record<string, string | undefined> = {};

  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const equalsIndex = line.indexOf('=');
    const key = line.slice(0, equalsIndex).trim();
    if (keys.includes(key)) {
      const { value } = splitEnvValue(line.slice(equalsIndex + 1));
      result[key] = value;
    }
  }

  return result;
};

const restoreEnvFile = () => {
  if (!previousEnvValues) return;

  const updates: Record<string, string> = {};
  for (const key of ENV_KEYS_TO_MANAGE) {
    if (previousEnvValues[key] !== undefined) {
      updates[key] = previousEnvValues[key];
    }
  }

  if (Object.keys(updates).length > 0) {
    previousEnvValues = null; // prevent re-entrance from triggering another write
    updateEnvFile(updates);
    console.log('Restored previous .env values.');
  }
};

const updateEnvFile = (updates: Record<string, string>) => {
  if (process.env.CI || (process.env.NODE_ENV && process.env.NODE_ENV !== 'development')) {
    return;
  }

  const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const lines = existing ? existing.split(/\r?\n/) : [];
  const pending = new Map(Object.entries(updates));

  const updatedLines = lines.map((line) => {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) {
      return line;
    }

    const equalsIndex = line.indexOf('=');
    const key = line.slice(0, equalsIndex).trim();

    if (!pending.has(key)) {
      return line;
    }

    const { value: existingValue, comment } = splitEnvValue(line.slice(equalsIndex + 1));
    const nextValue = formatEnvValue(pending.get(key)!, existingValue);
    pending.delete(key);

    return `${key}=${nextValue}${comment}`;
  });

  for (const [key, value] of pending) {
    updatedLines.push(`${key}=${value}`);
  }

  if (!updatedLines.length) {
    return;
  }

  const output = updatedLines.join('\n');
  const nextContent = output.endsWith('\n') ? output : `${output}\n`;

  if (existing === nextContent) {
    return;
  }

  writeFileSync(envPath, nextContent);
  console.log('Updated .env with ephemeral connection details.');
};

async function startDevEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Error: dev environment script cannot be run in production.');
    process.exit(1);
  }

  console.log('Starting ephemeral development environment...\n');

  let postgresContainer: StartedPostgreSqlContainer | null = null;
  let redisContainer: StartedRedisContainer | null = null;
  let devProcess: ChildProcess | null = null;
  let isCleaningUp = false;

  const cleanup = async () => {
    if (isCleaningUp) return;
    isCleaningUp = true;

    console.log('\nCleaning up...');

    if (devProcess && !devProcess.killed) {
      devProcess.kill('SIGTERM');
    }

    await Promise.all([postgresContainer?.stop(), redisContainer?.stop()]);

    restoreEnvFile();

    console.log('Cleanup complete');
    process.exit(0);
  };

  const handleSignal = () => {
    cleanup().catch((err) => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  try {
    // Start containers in parallel
    console.log('Starting containers...');
    const [postgres, redis] = await Promise.all([
      new PostgreSqlContainer('postgres:17-alpine')
        .withTmpFs({ '/var/lib/postgresql/data': 'rw' })
        .start(),
      new RedisContainer('redis:7-alpine').start(),
    ]);

    postgresContainer = postgres;
    redisContainer = redis;

    const dbUrl = postgres.getConnectionUri();
    const redisHost = redis.getHost();
    const redisPort = redis.getMappedPort(6379).toString();

    console.log(`PostgreSQL: ${dbUrl}`);
    console.log(`Redis: ${redisHost}:${redisPort}\n`);

    const env = {
      ...process.env,
      DATABASE_URL: dbUrl,
      REDIS_HOST: redisHost,
      REDIS_PORT: redisPort,
      REDIS_PASSWORD: '',
    };

    previousEnvValues = readEnvValues(ENV_KEYS_TO_MANAGE);

    updateEnvFile({
      DATABASE_URL: dbUrl,
      REDIS_HOST: redisHost,
      REDIS_PORT: redisPort,
      REDIS_PASSWORD: '',
    });

    // Setup database
    console.log('Pushing schema to database...');
    execSync('pnpm prisma db push', { stdio: 'inherit', env });

    console.log('Generating Prisma client...');
    execSync('pnpm prisma generate', { stdio: 'inherit', env });

    console.log('Seeding database...');
    execSync('pnpm prisma db seed', { stdio: 'inherit', env });

    console.log('\nStarting bot in watch mode...\n');
    console.log('-'.repeat(50));

    // Start the dev server with the ephemeral environment
    devProcess = spawn('pnpm', ['dev'], {
      stdio: 'inherit',
      env,
      shell: true,
    });

    devProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        console.error(`\nDev process exited with code ${code}`);
      }
      cleanup();
    });
  } catch (error) {
    console.error('Failed to start development environment:', error);
    await cleanup();
    process.exit(1);
  }
}

startDevEnvironment();
