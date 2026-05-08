import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../generated/prisma/client.js";

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    throw new Error(
      "DATABASE_URL is missing. Copy .env.example to .env and paste your Neon connection string from Dashboard → Connect.",
    );
  }
  return url;
}

declare global {
  var __prismaPool: Pool | undefined;
  var __prisma: PrismaClient | undefined;
}

function getPool(): Pool {
  if (!globalThis.__prismaPool) {
    globalThis.__prismaPool = new Pool({
      connectionString: requireDatabaseUrl(),
      max: 10,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalThis.__prismaPool;
}

const adapter = new PrismaPg(getPool());

export const prisma =
  globalThis.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}