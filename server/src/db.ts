// busy-timeout mechanism: passed `timeout: 5000` to better-sqlite3 via PrismaBetterSqlite3 adapter
import { PrismaClient } from "./generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { loadEnv } from "./env";

loadEnv(); // ./server/.env — every entry point imports this module first

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL!, timeout: 5000 });

export const prisma = new PrismaClient({ adapter });
