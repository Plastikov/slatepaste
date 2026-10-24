# slatepaste

A small, private paste bin that runs on Cloudflare Pages. It has no framework, no build step and no database server: static HTML, three Pages Functions, and Workers KV for storage.

Live instance: https://slatepaste.pages.dev

## How it works

- **Creating, listing and deleting** pastes needs a password, which is stored as a Cloudflare secret. The browser keeps it in `localStorage` after you unlock once.
- **Reading** a paste only needs its link. Each paste gets a random 16-character id (about 95 bits), so links can't be guessed, and you can share one without sharing the password.
- **Expiry** can be never, 1 hour, 1 day, 7 days or 30 days, enforced by KV's TTL. The size limit is 1 MB.
- Pages are marked `noindex` and served with `no-referrer` and `nosniff`. Raw pastes are served as `text/plain`.

```
public/              static UI (index.html, style.css)
functions/
  _lib.js            auth check, id generator, HTML escaping
  api/paste/index.js GET list · POST create      (password)
  api/paste/[id].js  DELETE                      (password)
  p/[id].js          GET /p/:id view · ?raw text (public)
wrangler.toml        project name + KV binding
```

## API

Authenticated requests send the password in the `x-paste-key` header.

| Method | Path | Auth | Body / result |
|---|---|---|---|
| `POST` | `/api/paste` | yes | `{ "content": "...", "title": "...", "expires": "never\|1h\|1d\|7d\|30d" }` → `{ id, url, ... }` |
| `GET` | `/api/paste` | yes | `{ items: [{ id, title, created, size, expires }] }` |
| `DELETE` | `/api/paste/:id` | yes | `{ ok: true }` |
| `GET` | `/p/:id` | no | HTML view (`?raw` for plain text) |

Paste from the command line:

```bash
curl -s https://<your-project>.pages.dev/api/paste \
  -H "x-paste-key: $PASTE_PASSWORD" -H "content-type: application/json" \
  -d "$(jq -n --rawfile c notes.md '{title:"notes", content:$c, expires:"7d"}')"
```

## Host your own

You need a free Cloudflare account and Node 20 or later.

```bash
git clone https://github.com/<you>/slatepaste && cd slatepaste
npm install
npx wrangler login
```

1. **Pick a name.** `name` in `wrangler.toml` becomes `<name>.pages.dev`, and it must be unique across all of Cloudflare. To check whether a name is free, run `curl -I https://<name>.pages.dev`; a DNS failure means it's free.
2. **Create the storage**, then put the `id` it prints into `wrangler.toml` under `[[kv_namespaces]]`. Keep `binding = "PASTES"`.
   ```bash
   npx wrangler kv namespace create slatepaste-pastes
   ```
3. **Create the Pages project:**
   ```bash
   npx wrangler pages project create <name> --production-branch main
   ```
4. **Set the password.** Wrangler prompts for it.
   ```bash
   npx wrangler pages secret put PASTE_PASSWORD --project-name <name>
   ```
5. **Deploy:**
   ```bash
   npm run deploy
   ```

Secrets only take effect on deployments made after you set them. If you change the password, run `npm run deploy` again.

### Or deploy from Git

In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and choose your fork. Then:

- **Build command:** leave empty
- **Build output directory:** `public`
- After the first deploy, add `PASTE_PASSWORD` under **Settings → Variables and Secrets** (type: Secret), then redeploy.

Cloudflare reads the KV binding from `wrangler.toml`, so do step 2 above first. After that, every push to `main` deploys.

## Run locally

```bash
cp .dev.vars.example .dev.vars   # set a local password
npm run dev                      # http://localhost:8788, with local KV storage
```

## Limits and trade-offs

- Anyone who has a paste's link can read it. To lock reading too, put [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) in front of the project.
- There is one shared password and no user accounts.
- The list loads at most 1,000 pastes (pastes still work past that; they just stop appearing in the list).
- KV's free tier allows 1,000 writes a day, which is plenty for personal use.

## License

MIT
