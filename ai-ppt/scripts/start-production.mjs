import { serve } from "@hono/node-server";

import app from "../dist/server/server.js";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT value: ${process.env.PORT ?? "<empty>"}`);
}

if (!app || typeof app.fetch !== "function") {
  throw new Error(
    "Invalid server entry: expected dist/server/server.js default export to provide fetch().",
  );
}

process.on("uncaughtException", (error) => {
  console.error("[web] Uncaught exception:", error);
  process.exitCode = 1;
});

process.on("unhandledRejection", (reason) => {
  console.error("[web] Unhandled rejection:", reason);
  process.exitCode = 1;
});

serve(
  {
    fetch: (request, env, executionCtx) =>
      app.fetch(request, env, executionCtx),
    hostname: host,
    port,
  },
  (info) => {
    console.log(`[web] Listening on http://${info.address}:${info.port}`);
  },
);
