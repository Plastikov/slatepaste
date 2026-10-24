import { json, authorized } from "../../_lib.js";

// DELETE /api/paste/:id — remove a paste (password required).
export async function onRequestDelete({ request, env, params }) {
  if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);
  await env.PASTES.delete(`p:${params.id}`);
  return json({ ok: true });
}
