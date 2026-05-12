import { serve } from "@hono/node-server";
import { readFile } from "node:fs/promises";
import path from "node:path";

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

const clientRoot = path.resolve(process.cwd(), "dist/client");
const publicRoot = path.resolve(process.cwd(), "public");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safeJoin(root, pathname) {
  const target = path.resolve(root, `.${pathname}`);
  if (!target.startsWith(root)) return null;
  return target;
}

async function maybeServeStatic(request) {
  const { pathname } = new URL(request.url);
  const candidates = [];
  const isAssetRequest = pathname.startsWith("/assets/");

  if (isAssetRequest) {
    const target = safeJoin(clientRoot, pathname);
    if (target) candidates.push(target);
  }

  // Serve common public files directly.
  if (
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest.json"
  ) {
    const publicTarget = safeJoin(publicRoot, pathname);
    const clientTarget = safeJoin(clientRoot, pathname);
    if (publicTarget) candidates.push(publicTarget);
    if (clientTarget) candidates.push(clientTarget);
  }

  for (const candidate of candidates) {
    try {
      const body = await readFile(candidate);
      const ext = path.extname(candidate).toLowerCase();
      const contentType =
        MIME_TYPES[ext] ?? "application/octet-stream";
      const headers = new Headers({
        "Content-Type": contentType,
      });

      // Cache immutable hashed build assets aggressively.
      if (pathname.startsWith("/assets/")) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      }

      return new Response(body, { status: 200, headers });
    } catch {
      // Continue trying next candidate/path.
    }
  }

  if (isAssetRequest) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return null;
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
    fetch: async (request, env, executionCtx) => {
      const staticResponse = await maybeServeStatic(request);
      if (staticResponse) return staticResponse;

      const response = await app.fetch(request, env, executionCtx);
      const contentType = response.headers.get("Content-Type") ?? "";

      if (!contentType.startsWith("text/html")) {
        return response;
      }

      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
    hostname: host,
    port,
  },
  (info) => {
    console.log(`[web] Listening on http://${info.address}:${info.port}`);
  },
);
