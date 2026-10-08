import { defineConfig } from "prisma/config";
import { loadEnv } from "./src/env";

loadEnv();

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  migrations: {
    path: "src/prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
