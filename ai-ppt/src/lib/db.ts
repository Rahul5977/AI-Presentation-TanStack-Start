import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../generated/prisma/client.js";

function requireDatabaseUrl(): string {
  // Prefer DIRECT_URL (non-pooled) so that pg.Pool's own connection pooling
  // is used and Prisma interactive transactions ($transaction callbacks) work.
  // PgBouncer pooled URLs don't support server-side transaction state and will
  // drop the SSL connection mid-transaction with ERR_SSL_SSLV3_ALERT_BAD_RECORD_MAC.
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url?.trim()) {
    throw new Error(
      "DATABASE_URL is missing. Copy .env.example to .env and paste your Neon connection string from Dashboard → Connect.",
    );
  }
  return normalizeDatabaseUrl(url);
}

function normalizeDatabaseUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  const sslmode = parsed.searchParams.get("sslmode");

  // pg warns that "require" / "verify-ca" semantics are changing;
  // use verify-full explicitly to keep current strict behavior.
  if (sslmode === "prefer" || sslmode === "require" || sslmode === "verify-ca") {
    parsed.searchParams.set("sslmode", "verify-full");
  }

  return parsed.toString();
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
      // Production auth/session queries can hit transient cold-start/network delays.
      // Use a slightly higher timeout to reduce ETIMEDOUT during OAuth/session checks.
      connectionTimeoutMillis: 30_000,
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