import { PrismaClient } from "./generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

process.loadEnvFile(); // ./server/.env — every entry point imports this module first

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });

export const prisma = new PrismaClient({ adapter });
