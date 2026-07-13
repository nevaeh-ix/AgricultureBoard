import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";


// Connects Prisma to my PostgreSQL database
const adapter = new PrismaPg({

  connectionString: process.env.DATABASE_URL

});


// Creates the Prisma database connection
const prisma = new PrismaClient({

  adapter: adapter

});


export { prisma };