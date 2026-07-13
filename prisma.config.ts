import "dotenv/config";
import { defineConfig } from "prisma/config";


// This connects Prisma to my database
export default defineConfig({

  schema: "prisma/schema.prisma",

  datasource: {

    url: process.env.DATABASE_URL

  }

});