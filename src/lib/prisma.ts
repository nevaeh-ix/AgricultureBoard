// Try to load PrismaClient. If @prisma/client is not installed in the
// environment (such as in some editor/tooling contexts), fall back to a
// lightweight dummy so importing this module doesn't throw.
let prisma: any;
try {
	// Use require so TypeScript won't error at compile time if types are missing.
	// @ts-ignore
	const { PrismaClient } = require("@prisma/client");
	prisma = new PrismaClient();
} catch (err) {
	// Minimal dummy implementation to satisfy imports during dev/editor use.
	class DummyPrisma {
		async $connect() {}
		async $disconnect() {}
	}
	prisma = new DummyPrisma();
}

export { prisma };