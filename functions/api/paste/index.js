import { json, authorized, newId } from "../../_lib.js";

const MAX_BYTES = 1024 * 1024; // KV values can be larger, but 1 MB is plenty for a paste
const TTLS = { "1h": 3600, "1d": 86400, "7d": 604800, "30d": 2592000 };

// GET /api/paste — list recent pastes (password required).
export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);
  const { keys } = await env.PASTES.list({ prefix: "p:", limit: 1000 });
  const items = keys
    .map((k) => ({ id: k.name.slice(2), ...(k.metadata || {}) }))
    .sort((a, b) => (b.created || 0) - (a.created || 0));
  return json({ items });
}

// POST /api/paste — create a paste (password required).
export async function onRequestPost({ request, env }) {
  if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const content = typeof body.content === "string" ? body.content : "";
  if (!content.trim()) return json({ error: "empty paste" }, 400);
  if (new TextEncoder().encode(content).length > MAX_BYTES) return json({ error: "paste over 1 MB" }, 413);

  const id = newId();
  const title = String(body.title || "").slice(0, 200) || "Untitled";
  const created = Date.now();
  const ttl = TTLS[body.expires];
  const metadata = { title, created, size: content.length, expires: ttl ? created + ttl * 1000 : null };
  await env.PASTES.put(`p:${id}`, content, { metadata, ...(ttl ? { expirationTtl: ttl } : {}) });
  return json({ id, url: new URL(`/p/${id}`, request.url).href, ...metadata }, 201);
}
