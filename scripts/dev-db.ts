import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { execSync, spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WATERMARK_SERVICE_PORT = 3847;

async function startDevEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Error: dev environment script cannot be run in production.');
    process.exit(1);
  }

  console.log('Starting ephemeral development environment...\n');

  let postgresContainer: StartedPostgreSqlContainer | null = null;
  let redisContainer: StartedRedisContainer | null = null;
  let devProcess: ChildProcess | null = null;
  let watermarkProcess: ChildProcess | null = null;
  let isCleaningUp = false;

  const cleanup = async () => {
    if (isCleaningUp) return;
    isCleaningUp = true;

    console.log('\nCleaning up...');

    if (devProcess && !devProcess.killed) {
      devProcess.kill('SIGTERM');
    }

    if (watermarkProcess && !watermarkProcess.killed) {
      watermarkProcess.kill('SIGTERM');
    }

    await Promise.all([postgresContainer?.stop(), redisContainer?.stop()]);

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
    console.log(`Redis: ${redisHost}:${redisPort}`);

    // Start watermark service if available
    const watermarkBinary = join(__dirname, '..', 'services', 'watermark-rs', 'target', 'release', 'watermark-service');
    let watermarkServiceUrl = '';

    if (existsSync(watermarkBinary)) {
      console.log('Starting watermark service...');
      watermarkProcess = spawn(watermarkBinary, [], {
        env: {
          ...process.env,
          WATERMARK_SERVICE_PORT: WATERMARK_SERVICE_PORT.toString(),
          RUST_LOG: 'info',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      watermarkProcess.stdout?.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        if (line) console.log(`[watermark] ${line}`);
      });

      watermarkProcess.stderr?.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        if (line) console.error(`[watermark] ${line}`);
      });

      watermarkProcess.on('error', (err) => {
        console.warn(`Watermark service failed to start: ${err.message}`);
        console.warn('Falling back to Sharp-based watermarking');
      });

      // Wait a moment for the service to start
      await new Promise((resolve) => setTimeout(resolve, 1000));

      watermarkServiceUrl = `http://localhost:${WATERMARK_SERVICE_PORT}`;
      console.log(`Watermark service: ${watermarkServiceUrl}`);
    } else {
      console.log('Watermark service binary not found (run: cd services/watermark-rs && cargo build --release)');
      console.log('Using Sharp-based watermarking fallback');
    }

    console.log('');

    const env = {
      ...process.env,
      DATABASE_URL: dbUrl,
      REDIS_HOST: redisHost,
      REDIS_PORT: redisPort,
      REDIS_PASSWORD: '',
      ...(watermarkServiceUrl && { WATERMARK_SERVICE_URL: watermarkServiceUrl }),
    };

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
