#!/usr/bin/env node
// Post-build SSG: renders the static public routes to dist/client/<path>/index.html
// so Cloudflare Workers Assets serves them without invoking the SSR worker.
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { pathToFileURL } from "node:url";

const CLIENT_DIR = "dist/client";
const SERVER_ENTRY = "dist/server/index.mjs";
const PATHS_FILE = "src/generated/prerender-paths.json";
const CONCURRENCY = 4;

const MIME = {
  ".json": "application/json",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

if (!existsSync(SERVER_ENTRY)) {
  console.error(`[prerender] ${SERVER_ENTRY} not found — skipping`);
  process.exit(0);
}

const mod = await import(pathToFileURL(SERVER_ENTRY).toString());
const worker = mod.default;
if (typeof worker?.fetch !== "function") {
  console.error("[prerender] server bundle has no fetch handler — skipping");
  process.exit(0);
}

function staticFileFor(pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    rel = pathname;
  }
  const p = join(CLIENT_DIR, rel);
  if (existsSync(p) && statSync(p).isFile()) return p;
  return null;
}

// Local origin server: static assets first (SSR reads /content/*.json via fetch),
// everything else goes through the built worker.
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const file = staticFileFor(url.pathname);
    if (file) {
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(readFileSync(file));
      return;
    }
    const response = await worker.fetch(
      new Request(new URL(url.pathname + url.search, `http://127.0.0.1:${port}`), { method: "GET" }),
      {},
      { waitUntil() {}, passThroughOnException() {} },
    );
    const body = Buffer.from(await response.arrayBuffer());
    const headers = {};
    response.headers.forEach((v, k) => {
      if (k !== "content-encoding" && k !== "content-length") headers[k] = v;
    });
    res.writeHead(response.status, headers);
    res.end(body);
  } catch (error) {
    console.error("[prerender] server error", error);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("error");
  }
});

let port = 0;
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
port = server.address().port;

const paths = JSON.parse(readFileSync(PATHS_FILE, "utf8"));
const failures = [];
let written = 0;

async function render(path) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    headers: { accept: "text/html" },
  });
  const html = await res.text();
  if (res.status !== 200) throw new Error(`status ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/html")) throw new Error(`content-type ${ct}`);
  if (!html.includes("</html>")) throw new Error("incomplete html");
  let rel;
  try {
    rel = decodeURIComponent(path);
  } catch {
    rel = path;
  }
  const out = join(CLIENT_DIR, rel, "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  written++;
}

const queue = [...paths];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const path = queue.shift();
      try {
        await render(path);
      } catch (error) {
        try {
          await render(path);
        } catch (retryError) {
          failures.push(`${path} → ${retryError.message}`);
        }
      }
    }
  }),
);

server.close();

console.log(`[prerender] wrote ${written}/${paths.length} static pages`);
if (failures.length) {
  console.error(`[prerender] ${failures.length} failures:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
