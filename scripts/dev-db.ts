import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";
import { execSync, spawn, type ChildProcess } from "child_process";

async function startDevEnvironment() {
  if (process.env.NODE_ENV === "production") {
    console.error("Error: dev environment script cannot be run in production.");
    process.exit(1);
  }

  console.log("Starting ephemeral development environment...\n");

  let postgresContainer: StartedPostgreSqlContainer | null = null;
  let redisContainer: StartedRedisContainer | null = null;
  let devProcess: ChildProcess | null = null;
  let isCleaningUp = false;

  const cleanup = async () => {
    if (isCleaningUp) return;
    isCleaningUp = true;

    console.log("\nCleaning up...");
    
    if (devProcess && !devProcess.killed) {
      devProcess.kill("SIGTERM");
    }
    
    await Promise.all([
      postgresContainer?.stop(),
      redisContainer?.stop()
    ]);
    
    console.log("Cleanup complete");
    process.exit(0);
  };

  const handleSignal = () => {
    cleanup().catch((err) => {
      console.error("Cleanup failed:", err);
      process.exit(1);
    });
  };

  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);

  try {
    // Start containers in parallel
    console.log("Starting containers...");
    const [postgres, redis] = await Promise.all([
      new PostgreSqlContainer("postgres:17-alpine")
        .withTmpFs({ "/var/lib/postgresql/data": "rw" })
        .start(),
      new RedisContainer("redis:7-alpine").start()
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
      REDIS_PASSWORD: ""
    };

    // Setup database
    console.log("Pushing schema to database...");
    execSync("pnpm prisma db push", { stdio: "inherit", env });

    console.log("Generating Prisma client...");
    execSync("pnpm prisma generate", { stdio: "inherit", env });

    console.log("Seeding database...");
    execSync("pnpm prisma db seed", { stdio: "inherit", env });

    console.log("\nStarting bot in watch mode...\n");
    console.log("-".repeat(50));
    
    // Start the dev server with the ephemeral environment
    devProcess = spawn("pnpm", ["dev"], {
      stdio: "inherit",
      env,
      shell: true
    });

    devProcess.on("exit", (code) => {
      if (code !== null && code !== 0) {
        console.error(`\nDev process exited with code ${code}`);
      }
      cleanup();
    });

  } catch (error) {
    console.error("Failed to start development environment:", error);
    await cleanup();
    process.exit(1);
  }
}

startDevEnvironment();
