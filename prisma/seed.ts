import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Starting database seeding...');

	// Example: Create some initial data
	// You can customize this based on your needs
	
	const exampleGuild = await prisma.guild.upsert({
		where: { guildId: '998351254998753402' },
		update: {},
		create: {
			guildId: '998351254998753402',
			name: 'Example Guild',
			settings: {
				prefix: '!',
				language: 'en',
			},
		},
	});

	console.log('✅ Created example guild:', exampleGuild);

	console.log('🎉 Database seeding completed successfully!');
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error('❌ Error during seeding:', e);
		await prisma.$disconnect();
		process.exit(1);
	});
