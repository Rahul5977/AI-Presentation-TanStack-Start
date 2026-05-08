import { createFileRoute } from "@tanstack/react-router";

import { json } from "@tanstack/react-start";

import { prisma } from "@/lib/db";

export const Route = createFileRoute("/api/db-health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return json({ ok: true as const });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Database connection failed";
          return json({ ok: false as const, error: message }, { status: 503 });
        }
      },
    },
  },
});
