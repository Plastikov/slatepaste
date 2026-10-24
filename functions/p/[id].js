import { escapeHtml } from "../_lib.js";

const HEADERS = { "x-content-type-options": "nosniff", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer", "cache-control": "no-store" };

// GET /p/:id — anyone with the link can read. ?raw returns plain text.
export async function onRequestGet({ request, env, params }) {
  const id = params.id;
  if (!/^[A-Za-z0-9]{16}$/.test(id)) return notFound();
  const { value, metadata } = await env.PASTES.getWithMetadata(`p:${id}`);
  if (value === null) return notFound();

  if (new URL(request.url).searchParams.has("raw")) {
    return new Response(value, { headers: { ...HEADERS, "content-type": "text/plain; charset=utf-8" } });
  }

  const title = escapeHtml(metadata?.title || "Untitled");
  const created = metadata?.created ? new Date(metadata.created).toISOString() : "";
  const expires = metadata?.expires ? new Date(metadata.expires).toISOString() : "";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title} · slatepaste</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<main class="wrap">
  <header class="bar">
    <a class="brand" href="/">slatepaste</a>
    <div class="actions">
      <button id="copy" class="btn primary">Copy text</button>
      <a class="btn" href="?raw">Raw</a>
    </div>
  </header>
  <h1 class="title">${title}</h1>
  <p class="meta"><span data-time="${created}"></span>${expires ? ` · expires <span data-time="${expires}"></span>` : ""} · ${value.length.toLocaleString("en")} chars</p>
  <pre id="content" class="paste">${escapeHtml(value)}</pre>
</main>
<script>
  for (const el of document.querySelectorAll("[data-time]")) {
    if (el.dataset.time) el.textContent = new Date(el.dataset.time).toLocaleString();
  }
  const btn = document.getElementById("copy");
  btn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(document.getElementById("content").textContent);
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = "Copy text"), 1500);
  });
</script>
</body>
</html>`;
  return new Response(html, { headers: { ...HEADERS, "content-type": "text/html; charset=utf-8" } });
}

function notFound() {
  return new Response("Paste not found (it may have expired).", {
    status: 404,
    headers: { ...HEADERS, "content-type": "text/plain; charset=utf-8" },
  });
}
