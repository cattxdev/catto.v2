import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting database seeding...");

  const exampleGuild = await prisma.guild.upsert({
    where: { guildId: "998351254998753402" },
    update: {},
    create: {
      guildId: "998351254998753402",
      name: "Example Guild",
      settings: {
        prefix: "!",
        language: "en",
      },
    },
  });

  console.log("Created example guild:", exampleGuild);
  console.log("Database seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
