import { PrismaClient } from '../generated/prisma/index.js';

// Prisma Client Singleton
// Prevents multiple instances in development (hot reload)
const prismaClientSingleton = () => {
	return new PrismaClient({
		log: process.env.NODE_ENV === 'development' 
			? ['query', 'error', 'warn'] 
			: ['error'],
		errorFormat: 'pretty',
	});
};

declare global {
	// eslint-disable-next-line no-var
	var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
	globalThis.prismaGlobal = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
	await prisma.$disconnect();
});

process.on('SIGINT', async () => {
	await prisma.$disconnect();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	await prisma.$disconnect();
	process.exit(0);
});
