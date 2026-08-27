# Skawr Local Development

## Global Prerequisites

- **Node 24** via `mise` (see `/Users/smsaleh/Documents/Skawr/mise.toml`). All Node commands MUST use `/opt/homebrew/bin/mise exec --` prefix to get the correct version.
- **Python 3.12** (installed via mise, available at system level).
- **Docker** for PostgreSQL, Redis, OpenSearch (running via Docker Desktop).
- The global `~/.npmrc` points to Amazon CodeArtifact — this **WILL break** npm/pnpm installs. Always bypass it:
  - For pnpm repos: `/opt/homebrew/bin/mise exec -- pnpm install`
  - For npm repos: `npm install --userconfig /dev/null`
- All repos live under `/Users/smsaleh/Documents/Skawr/`

## Multi-agent safety: never work in a repo another agent is using

Multiple agents may run against the same repos concurrently. Before you start
editing, committing, or switching branches in any repo, **check whether another
agent is already working there**, and if so, isolate your work so you never
touch their working tree.

How to check (run in the repo root before you begin):

```bash
git -P status --short          # any uncommitted/untracked changes = someone is mid-task
git -P branch --show-current   # on an unexpected feature branch = someone parked work there
git -P worktree list           # existing extra worktrees
```

Treat the repo as "in use" if the working tree is dirty or it sits on a feature
branch you did not put it on. In that case, do NOT `git checkout`, `git stash`,
`git reset`, or edit files in that directory. Switching branches or stashing
would clobber or hide their in-progress work.

Instead, isolate:

1. **Preferred: a separate git worktree** (shares the object store, cheap, no
   re-clone). Create it OUTSIDE the repo dir and check out the branch you need:
   ```bash
   git worktree add /Users/smsaleh/Documents/Skawr/<repo>-<task>-wt <branch>
   # ... do your work, commit, push ...
   git worktree remove /Users/smsaleh/Documents/Skawr/<repo>-<task>-wt
   ```
   Creating/removing a worktree does not touch the other agent's checkout. Note
   a fresh worktree has no `node_modules` (npm/pnpm workspaces hoist to the repo
   root), so for string/doc-only edits skip the rebuild, and for changes that
   need a build either install into the worktree or verify another way.
2. **Fallback: a fresh clone** when a worktree is not possible (e.g. you need a
   full install and the workspace hoisting makes a worktree impractical, or the
   branch is already checked out in another worktree):
   ```bash
   git clone <remote-url> /tmp/<repo>-<task> && cd /tmp/<repo>-<task> && git checkout <branch>
   ```

Always clean up the worktree/clone when done, and confirm the other agent's
directory is still on its original branch with its changes intact before you
finish.

## Running Dev Servers via Background Process Tool

The `control_bash_process` tool cannot resolve shell functions like `mise`. Always use the full binary path `/opt/homebrew/bin/mise exec --` when starting background processes.

For npm workspace repos (where `next` is hoisted to root `node_modules`), reference the binary via `../node_modules/.bin/next` from the frontend directory.

---

## skawr-web (Marketplace + SaaS landing)

| Item | Value |
|------|-------|
| Path | `/Users/smsaleh/Documents/Skawr/skawr-web` |
| Package manager | pnpm |
| Port | 3000 |
| Live URL | `skawr.com` |

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null
rm -rf /Users/smsaleh/Documents/Skawr/skawr-web/.next/dev/lock
/opt/homebrew/bin/mise exec -- pnpm install   # if needed
/opt/homebrew/bin/mise exec -- npx next dev --port 3000
```

Background process:
```
command: /opt/homebrew/bin/mise exec -- npx next dev --port 3000
cwd: /Users/smsaleh/Documents/Skawr/skawr-web
```

Key routes: `/` (Search product landing / homepage), `/business` (business hub), `/marketplaces` (aggregator; results at `/marketplaces/search`), `/search/plans` (pricing), `/search/docs`, `/search/import`, `/cro`, `/cro/audit`. `/login` redirects to `dashboard.skawr.com`. Old `/saas*`, `/business` (when it was `/`), and `/search` (bare) paths 301-redirect.

### i18n (English + Arabic / RTL)

The marketing pages are bilingual (English default, Arabic under an `/ar`
prefix) via **next-intl v4** with full RTL. See `skawr-web/docs/i18n.md` for the
full guide. Quick facts:

- Localized marketing routes live under `app/[locale]/`; non-marketing app
  routes (`/search`, `/blog`, `/login`, `/admin`, ...) stay unprefixed and
  English-only.
- Locale selection ladder: `NEXT_LOCALE` cookie (explicit choice) →
  `Accept-Language` (first visit) → English. **Not** timezone/geo based.
- Translations live in `messages/<locale>/<namespace>.json`, one file per page;
  register a namespace in `i18n/request.ts` and add its top-level segment to
  `LOCALIZED_SEGMENTS` in `middleware.ts`.
- `<html lang dir>` is server-rendered from the locale in `app/layout.tsx`
  (no RTL flash). Arabic font is `IBM Plex Sans Arabic` via `next/font`.
- The `EN / ع` toggle is `ui/language-toggle.tsx`, shown in `Header` and
  `BusinessNavbar`.
- `/saas`, `/about`, and `/help` were moved off the (unwired) DynamoDB CMS onto
  next-intl catalogs; the admin "Site Content" editor is now a no-op for those
  pages.
- Localized pages now: home, saas, saas/pricing, saas/docs, saas/import, cro,
  cro/pricing, cro/audit, business, about, channels, contact, help, privacy,
  terms, search, blog. Legal pages (privacy/terms) have Arabic translations that
  should get a counsel review before being relied on.
- `/sell` and `/listings` (not-yet-public seller flow) are hard-hidden via a
  server-side redirect to `/` in `middleware.ts` (they previously only had a
  client-side auth redirect, so they were publicly viewable). Not localized.
- Build gotcha: `pnpm run build`'s dep precheck can fail on ignored build
  scripts. Build with
  `NPM_CONFIG_USERCONFIG=/dev/null /opt/homebrew/bin/mise exec -- node ./node_modules/next/dist/bin/next build`.
- `/analytics` and `/analytics-beta` marketing pages were deleted.

---

## skawr-analytics (Frontend + Backend)

### Frontend

| Item | Value |
|------|-------|
| Path | `/Users/smsaleh/Documents/Skawr/skawr-analytics/frontend` |
| Package manager | npm (workspace — lockfile at repo root) |
| Port | 3000 |
| Live URL | `analytics.skawr.com` |
| API base | `http://localhost:8004/api/v1` (set in `.env.local`) |

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null
cd /Users/smsaleh/Documents/Skawr/skawr-analytics
npm install --userconfig /dev/null   # installs all workspaces (frontend + backend)
```

Background process:
```
command: /opt/homebrew/bin/mise exec -- node ../node_modules/.bin/next dev --port 3000
cwd: /Users/smsaleh/Documents/Skawr/skawr-analytics/frontend
```

Note: `next` is hoisted to root `node_modules` (npm workspace). Use `../node_modules/.bin/next`.

### Backend

| Item | Value |
|------|-------|
| Path | `/Users/smsaleh/Documents/Skawr/skawr-analytics/backend` |
| Port | 8004 |
| Live URL | `analytics-api.skawr.com` |
| Database | `skawr-analytics-postgres` container on port 5433 |

```bash
# Copy .env.example to .env if not present, then adjust:
#   DATABASE_URL=postgresql+asyncpg://analytics:password@localhost:5433/skawr_analytics
# Remove ACCESS_TOKEN_EXPIRE_MINUTES and REFRESH_TOKEN_EXPIRE_DAYS (not in Settings model)
cp backend/.env.example backend/.env  # then edit as above
```

Background process:
```
command: python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8004 --reload
cwd: /Users/smsaleh/Documents/Skawr/skawr-analytics/backend
```

Swagger UI: http://localhost:8004/docs

### Shared Projects (team access) + invite email

A project can have multiple members (`owner/admin/editor/viewer`) via the
analytics-owned `project_members` table (migration `0018`; `0019` adds
`cohorts.is_private`). Authorization funnels through the single
`resolve_project_access` port (`app/core/access.py`); entitlement follows the
project owner (`app/core/entitlement.py`). The projects + members API lives in
`app/api/v1/projects.py` (a local override of the shared skawr-auth router;
skawr-auth is left untouched). The Members UI is `frontend/app/settings/members`.

Invites send a signed, expiring link (`app/services/invites.py`); access is
still gated by SSO login as the invited email (JIT user creation + claim in
`app/auth.py`). Email transport is selected by `INVITE_EMAIL_PROVIDER`: `log`
(default; logs the link, or SMTP when `SMTP_HOST` is set) or `ses`.

**VPS wiring (live):** the analytics backend uses `INVITE_EMAIL_PROVIDER=ses`,
`SES_REGION=us-east-1`, from-address `EMAILS_FROM_EMAIL=alerts@skawr.com`
(the shared global from-address). SES account `664723485685` has the `skawr.com`
domain verified (DKIM ok) and is out of the sandbox. A least-privilege IAM user
`skawr-analytics-ses` (inline policy `AnalyticsInviteSend`: `ses:SendEmail`
scoped to the `skawr.com` identity, `ses:FromAddress` like `*@skawr.com`)
provides the creds; its `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` live only in
`/opt/skawr-analytics/.env` (env-file for the compose `backend` service, so a
`docker compose up -d --force-recreate --wait backend` picks them up). Rotate
the key with `aws --profile skawr iam create-access-key`/`delete-access-key`.

### Docker Dependencies

The analytics backend needs PostgreSQL. A dedicated container already runs:
```
Container: skawr-analytics-postgres (port 5433)
User: analytics / Password: password / DB: skawr_analytics
```

If not running: `docker start skawr-analytics-postgres`

### Demo walkthrough recorder

A Playwright script records a screen walkthrough of the live analytics dashboard
(logs in, selects the "Skawr Analytics Demo" project, clicks through every page).

| Item | Value |
|------|-------|
| Path | `/Users/smsaleh/Documents/Skawr/skawr-analytics/demo-recorder` |
| Run | `cp .env.example .env` (set `DEMO_PASSWORD`), then `./run.sh` (or `npm run go`) |
| Output | `recordings/*.mp4` (+ raw `.webm`) |

`run.sh` is idempotent: it installs deps, installs Chromium, records, and makes an
mp4 if ffmpeg is present. Gotcha: `DEMO_EMAIL` must be the Zitadel **login name**
(`ziyad@zitadel.id.ziyad.one`), not the Gmail (Google-SSO only, 401s on the
password form). Tune pace with `DWELL_MS`, hide the window with `HEADLESS=true`.

### Demo seeder (rich data for every tab)

`backend/scripts/seed_demo_account.py` populates one dedicated project ("Skawr
Analytics Demo", matched by name) with ~7 weeks of deterministic data (fixed
`RNG_SEED`) that lights up **every** analytics tab: funnels, revenue
(multi-currency), attribution, heatmaps, retention (+stickiness/lifecycle),
insights (a deliberate `newsletter_signup` anomaly), cohorts, a dashboard,
event rules, the bilingual **data dictionary**, **surveys** (nps/rating/choice/
text), **alerts** (threshold/anomaly/no-data + history), and the **Behavior**
tab (rage clicks, dead clicks, quick-backs, `$error` events, named element
clicks). Defaults: `--visitors 2500 --heatmap-sessions 1200`.

It is idempotent and **destructive to that one project only**: it wipes and
regenerates the project's events/heatmaps/cohorts/rules/definitions/dashboards/
surveys/alerts. Because of the fixed seed the data is near-identical each run.
It never touches other projects. Pins/dismissals survive (keyed by stable
insight id, not UUID); saved dashboards/cohorts get new UUIDs.

Run locally (needs `skawr-analytics-postgres` up and migrations applied):
```bash
cd /Users/smsaleh/Documents/Skawr/skawr-analytics/backend
PYTHONPATH="$(pwd)" python3 scripts/seed_demo_account.py --email ziyad.alotaibe@gmail.com
```
`PYTHONPATH=<backend dir>` is required, otherwise `ModuleNotFoundError: app`
(running `scripts/x.py` puts `scripts/` on `sys.path`, not the backend root).

Run against the **live VPS demo** (writes to the prod analytics DB — the demo
project is disposable, but this is still a prod write). The seeded data lives in
the persistent DB, so a later code redeploy does NOT wipe it. Steps:
```bash
# 1. Make sure main (with the seeder + any needed migration) is deployed. CI
#    runs can race across concurrent PRs, so the running image's baked
#    scripts/seed_demo_account.py may lag main. Verify before trusting it:
ssh -i ~/Documents/Skawr/vps_ssh_key/id_ed25519 saleh@173.212.246.10 \
  "docker exec skawr-analytics-backend grep -c _build_behavior scripts/seed_demo_account.py"
# 2. If it's stale, copy the correct script into the container (ephemeral,
#    reverts on restart, harmless since it is only a dev script, not the API):
scp -i ~/Documents/Skawr/vps_ssh_key/id_ed25519 \
  backend/scripts/seed_demo_account.py saleh@173.212.246.10:~/seed.py
ssh -i ~/Documents/Skawr/vps_ssh_key/id_ed25519 saleh@173.212.246.10 \
  "docker cp ~/seed.py skawr-analytics-backend:/app/scripts/seed_demo_account.py"
# 3. Run inside the container (it inherits the prod DATABASE_URL; needs PYTHONPATH):
ssh -i ~/Documents/Skawr/vps_ssh_key/id_ed25519 saleh@173.212.246.10 \
  "docker exec -e PYTHONPATH=/app skawr-analytics-backend \
   python3 scripts/seed_demo_account.py --email ziyad.alotaibe@gmail.com \
   --visitors 3000 --heatmap-sessions 1500"
```
The VPS analytics backend container is `skawr-analytics-backend` (workdir
`/app`). Migration `0016_add_event_definitions` must be applied on the target DB
(auto-runs on deploy) or the seeder fails on the `event_definitions` table.

---

## skawr-dashboards (Admin Dashboard)

| Item | Value |
|------|-------|
| Path | `/Users/smsaleh/Documents/Skawr/skawr-dashboards/skawr-dashboard-admin` |
| Package manager | npm |
| Port | 5173 (Vite default) |
| Live URL | `admin.skawr.com` / `dashboard.skawr.com` |

```bash
cd /Users/smsaleh/Documents/Skawr/skawr-dashboards/skawr-dashboard-admin
npm install --userconfig /dev/null
```

Background process:
```
command: /opt/homebrew/bin/mise exec -- npx vite --port 5173
cwd: /Users/smsaleh/Documents/Skawr/skawr-dashboards/skawr-dashboard-admin
```

---

## skawr-login (Auth BFF)

| Item | Value |
|------|-------|
| Path | `/Users/smsaleh/Documents/Skawr/skawr-login` |
| Port | 8080 |
| Live URL | `login.skawr.com` |

```bash
cd /Users/smsaleh/Documents/Skawr/skawr-login
pip install -r requirements.txt   # if not already installed
```

Background process:
```
command: python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
cwd: /Users/smsaleh/Documents/Skawr/skawr-login
```

Requires env vars: `ZITADEL_BASE`, `ZITADEL_ORG_ID`, `ZITADEL_LOGIN_PAT`, `ZITADEL_GOOGLE_IDP_ID`.
Without `ZITADEL_LOGIN_PAT`, all Zitadel API calls will fail.

### Real SSO across apps (browser-persisted session)

skawr-login now persists the Zitadel session in an HttpOnly `skawr_sso` cookie
so a sign-in on one Skawr app signs you in silently on the next (no second
form). Previously each app re-showed the login form because the BFF created a
Zitadel session, used it once to finalize the auth request, then discarded it.
On `GET /login` it now reuses a valid session (honoring `prompt=login` and
`max_age`), and `GET /logout` terminates the shared session. New env vars (all
optional, safe defaults): `SSO_ENABLED` (default `true`, kill switch),
`SSO_SESSION_LIFETIME_HOURS` (default `12`), `SSO_POST_LOGOUT_ALLOWED_HOSTS`
(default `skawr.com,.skawr.com`, open-redirect guard for the post-logout
redirect). See the skawr-login README "Single sign-on" section. Note: the
login-once win needs NO per-app change. Instant cross-app *logout* propagation
is a separate follow-up: the apps are public SPA/PKCE clients (oidc-client-ts /
Next.js client-side), so OIDC back-channel logout does not apply (no server
endpoint); propagating logout to open tabs needs app-side session monitoring or
shorter token lifetimes, plus the Zitadel app config which is provisioned by
`skawr-deployment/spikes/zitadel/setup_projects.py`.

---

## skawr-search / skawr-indexer (Core SaaS API)

| Item | Value |
|------|-------|
| Path | `/Users/smsaleh/Documents/Skawr/skawr-search` (indexer is a subpackage) |
| Port | 8000 |
| Live URL | `api.skawr.com` |

Full local environment via devbox:
```bash
cd /Users/smsaleh/Documents/Skawr/skawr-search
docker compose -f docker-compose.dev.yml up
```

This starts the indexer + PostgreSQL + Redis + OpenSearch together.

Background process (equivalent):
```
command: docker compose -f docker-compose.dev.yml up -d
cwd: /Users/smsaleh/Documents/Skawr/skawr-search
```

**Boots with embeddings/reranker OFF by default** (no Fireworks key required —
construction is gated on `EMBEDDINGS_ENABLED`). Health should be green with
`"embedding_service":"disabled"`, `"billing":"disabled"`.

To run the FULL hybrid + billing stack locally, drop a gitignored `.env` next to
`docker-compose.dev.yml` (injected via the optional `env_file`, PR #334):
```
EMBEDDINGS_ENABLED=true
RERANKER_ENABLED=true
FIREWORKS_API_KEY=fw_...              # dev key only, never prod's
BILLING_ENABLED=true                  # for checkout testing
# plus POLAR_ACCESS_TOKEN / POLAR_ORGANIZATION_ID / POLAR_WEBHOOK_SECRET
# and the 6 POLAR_{GROWTH,PRO,SCALE}_{MONTHLY,ANNUAL}_PRODUCT_ID vars
```
Then `docker compose -f docker-compose.dev.yml up -d indexer` to recreate.

Local end-to-end recipe (create an active client, index, upload, search):
```bash
# 1. make a paid client + secret key (no free tier — inactive clients get 402)
docker exec skawr-dev-indexer python -c "
from app.database import SessionLocal; from app.models import APIClient, APIKey
import hashlib, secrets
db=SessionLocal(); c=APIClient(name='Dev', subscription_status='active', subscription_tier='scale')
db.add(c); db.commit(); db.refresh(c)
k=f'{secrets.token_hex(4)}.{secrets.token_urlsafe(32)}'
db.add(APIKey(client_id=c.id,key_prefix=k[:8],key_hash=hashlib.sha256(k.encode()).hexdigest(),permissions=['search','autocomplete','index']))
db.commit(); print('KEY', k)"
# 2. use X-API-Key header for /api/v1/saas/indices, /indices/{n}/documents, /api/v1/search
```

Gotchas specific to this stack:
- **`requirements-minimal.txt`** (Dockerfile.local) pins must stay aligned with
  `requirements.txt` for httpx/pydantic, or `polar-sdk` breaks pip resolution and
  the image won't build.
- **Local OpenSearch is 2.11, prod is 2.19.5.** Filtered kNN can throw
  `failed to create query: Rewrite first` locally, so vector-hit semantic queries
  may return empty on a dev box. Not a bug — a version artifact.
- Onboarding widgets (Skawr Bar, Search Widget, SkawrBot) are Pro+ (Growth → 403).
- NPS Surveys are Pro+; Heatmaps and Revenue Attribution are Scale-tier.

### Storefront analytics tools (events into the merchant's analytics project)

The indexer feeds each merchant's own analytics project. Two delivery paths, by design:
- **Proxied (key stays server-side):** Skawr Bar, SkawrBot, Search Widget clicks, and NPS
  surveys emit via the indexer. Client beacons hit `POST /api/v1/telemetry/event` (public
  `pk_` key) or the survey proxy, and the indexer forwards to analytics with the merchant's
  server-held key. Events are tagged by tool via `sdk_source`.
- **Direct (publishable key in the browser):** the Heatmaps + Revenue Attribution producer
  (`skawr-indexer/app/static/skawranalytics.js`) posts high-volume data straight to
  analytics-api. It fetches `GET /api/v1/storefront/analytics-config` (returns the merchant's
  publishable track-only key + Scale-tier flags + consent config), then posts to
  `/api/v1/heatmaps/batch` and `/api/v1/events/track`. Served same-origin from
  `/static/skawranalytics.js` by default; set `SKAWR_ANALYTICS_BUNDLE_URL` to the CDN URL
  (`https://cdn.skawr.com/analytics/v1/skawranalytics.js`) to serve it from the CDN once the
  skawr-search `deploy-analytics-cdn.yml` workflow has published it (needs the CDN infra in
  `skawr-deployment/terraform/cdn` applied + repo secrets `AWS_ROLE_ARN`, `CDN_DISTRIBUTION_ID`,
  `vars.CDN_BUCKET`).

Consent: DNT/GPC always suppress the producer. A merchant can require an Accept/Decline banner
by setting `client.settings.analytics_consent_required = true` (and optionally
`analytics_privacy_policy_url`). Local test: seed an active Scale client with a provisioned
analytics key, embed `skawranalytics.js` with `data-skawr-key=<pk_ key>`, and watch
`/api/v1/heatmaps/batch` on the analytics backend. See `skawr-indexer/docs/analytics-privacy-pdpl.md`.

### Store import extraction (`store_extractor.py`, `/api/v1/public/import-from-url`)

The "import your store" onboarding is browserless by design (no Chromium on the
VPS). `extract()` tries, in order: platform fast paths (Shopify/WooCommerce/
Salla/Zid) → sitemap + JSON-LD enumeration → **link-graph crawl** → generic API
discovery → homepage structured data. Key behaviors to know:

- **Failure is classified, not silent.** `ExtractionResult.failure_reason` is one
  of `dns_error`, `tls_blocked`, `connection_error`, `timeout`, `blocked_url`,
  `access_blocked` (401/403), `rate_limited` (429), `http_error`, `no_catalog`
  (reachable but no machine-readable products), or `None` (success). Unreachable
  reasons surface to the merchant as an actionable `status:error`; `no_catalog`
  stays a `done` result routed to the feed/CSV fallback. A non-resolving domain
  returns a friendly 400 (check spelling, .com vs .sa) — a common typo case.
- **Browser-UA fallback.** Many CloudFront/Cloudflare/Akamai-fronted stores 403/429
  the `SkawrBot` UA but serve browsers. `_fetch` retries once with a browser UA on
  a bot-block status (honest-first: SkawrBot on the first hop). It never overrides
  a caller-pinned UA (platform API calls keep their headers).
- **Link-graph crawl (stale-sitemap SPA stores).** Some SPA storefronts migrated
  platforms and left a stale sitemap listing dead legacy URLs. When the sitemap
  yields no products, `_collect_urls_from_links` seeds discovery from the store's
  own nav (`<a href>` in the raw homepage HTML), then enumerates category/product
  pages. SPA **category** pages embed products in Next.js flight/hydration state
  that `parse_structured_products` already reads, so a category page yields
  products with no browser.
- **Canonical test case: `goldenscent.com`.** Custom Next.js, CloudFront-fronted,
  stale Magento sitemap (all 404), server-rendered nav. Exercises browser-UA
  fallback + link_crawl end to end (0 → dozens of priced products, Arabic titles +
  SAR). Note: the products/category **sitemaps are stale**; real URLs are `/c/…`
  and `/p/…` from the nav only. Set `ENVIRONMENT=local` to run `extract()` with the
  SSRF guard off; give heavy SPA pages a real timeout (their category pages are
  ~3MB, so `timeout<8` starves them).
- **Known limitation (still open):** stores whose **navigation itself** is
  client-rendered (no `<a href>` in raw HTML, e.g. 6thstreet, half-million) can't
  be seeded browserlessly — these are the deferred headless-render case. A flagged,
  render-to-discover-URLs step (Playwright, or a lighter engine like Lightpanda, or
  a hosted rendering API) is the documented next option if we decide the coverage
  is worth the infra cost.

---

## Common Docker Containers on This Machine

| Container | Port | Purpose |
|-----------|------|---------|
| `skawr-dev-postgres` | 5432 | Devbox/indexer shared DB |
| `skawr-analytics-postgres` | 5433 | Analytics-specific DB |
| `opensearch` | 9200 (internal) | Search index |
| `redis` | 6379 | Cache/sessions |

Check running containers: `docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"`

---

## Troubleshooting

- **`npm install` fails with E401**: The `~/.npmrc` CodeArtifact token is interfering. Use `--userconfig /dev/null` to bypass.
- **`mise exec` not found in background process**: Use full path `/opt/homebrew/bin/mise exec --`.
- **Port already in use**: Kill it with `lsof -ti:<PORT> | xargs kill -9 2>/dev/null`.
- **`next` binary not found**: In npm workspace repos, `next` is hoisted to root. Use `../node_modules/.bin/next` from the frontend dir.
- **Pydantic validation error on backend start**: The `.env.example` may have fields the Settings model doesn't accept. Compare with `app/core/config.py` and remove extras.
- **OIDC redirect won't work on localhost**: The Zitadel redirect URIs are registered for production domains. Local testing of auth flows requires either changing the redirect URI env var or testing via the production URL.
- **Traefik route lag after recreating a VPS container**: for ~5–10s after `docker rm -f` + `docker run`, `https://<service>` returns **404** while Traefik's docker provider re-registers the router. Don't panic — re-check after a few seconds (the container's own `docker ps` health can already be `healthy` while the external route is still catching up).

---

## skawr-growth (Growth Studio)

| Item | Value |
|------|-------|
| Path | `/Users/smsaleh/Documents/Skawr/skawr-growth` |
| Port | 8010 |
| Live URL | `growth-api.skawr.com` (VPS) |
| Database | `skawr-growth-postgres` on port 5434 |
| Redis | `skawr-growth-redis` on port 6380 |

```bash
cd /Users/smsaleh/Documents/Skawr/skawr-growth
docker compose up -d   # starts Postgres + Redis + API + workers
```

Background process (API only, for dev with reload):
```
command: .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
cwd: /Users/smsaleh/Documents/Skawr/skawr-growth
```

Key env vars (`.env`):
- `GROWTH_DATABASE_URL=postgresql+asyncpg://growth:password@localhost:5434/skawr_growth`
- `GROWTH_REDIS_URL=redis://localhost:6380/0`
- `GROWTH_FIREWORKS_API_KEY`, `GROWTH_HUBSPOT_API_TOKEN`, `GROWTH_SHEETS_*` (all set)
- `GROWTH_WEB_INGRESS_KEYS=web-1:<secret>` (for signed skawr-web events)

Seed data: `python3 scripts/seed.py`
E2E validation: `python3 scripts/e2e_validate.py`
Tests: `.venv/bin/python -m pytest -q` (needs `GROWTH_TEST_DATABASE_URL`)

### CRM adapter — Google Sheets (VPS, live + verified)

The approval-gated export adapter (`app/integrations/sheets_adapter.py`, registered
as `sheets_export` in `action_dispatch.py`) writes approved account rows to a Google
Sheet via `gspread`. It is fully wired on the VPS:

| Item | Value |
|------|-------|
| Sheet | "Skawr CRM" — `https://docs.google.com/spreadsheets/d/1_BkRp3R086QyYxyTOrTea1mEkTAz8-oO_GITmpZtQxY` |
| Spreadsheet ID env | `GROWTH_SHEETS_SPREADSHEET_ID=1_BkRp3R086QyYxyTOrTea1mEkTAz8-oO_GITmpZtQxY` |
| Credentials env | `GROWTH_SHEETS_CREDENTIALS_PATH=/credentials/sheets-sa.json` (mounted in container) |
| Service account | `skawr-growth-sheets@skawr-502114.iam.gserviceaccount.com` (GCP project `skawr-502114`) |
| Cred file on VPS | `/opt/skawr-deployment/growth/credentials/sheets-sa.json` |
| Target worksheet | `Growth Exports` (auto-created with a header row on first append) |

Key points:
- The sheet MUST be shared (Editor) with the service-account email above, or `open_by_key` 403s.
- Each appended row is prefixed with the `idempotency_key` in column 1; `reconcile()`
  finds an existing row by that key so a retried export never duplicates (effectively-once).
- No bulk send: one approved export = one row. Exports only fire through the human
  approval + actions API path, never automatically from a workflow node.
- Verified end-to-end on 2026-07-23: `execute()` appends, `reconcile()` detects the
  existing row, dedup confirmed. `gspread 6.1.4` is installed in the container.

---

## VPS Access & Deployment

### Deployment principle (READ FIRST): deploy backends via PR + CI, not direct SSH

**Always deploy backend code changes by merging a PR to `main` and letting CI/CD
build and deploy. Do NOT hand-build an image and push it to the VPS over SSH
unless that is the only option.** This applies to every backend on the VPS
(skawr-search/indexer, skawr-analytics backend, skawr-growth, skawr-login, etc.).

Why:
- The VPS deploy dirs are a **GitOps mirror**. A manually SSH-deployed image is
  untracked state that the next CI deploy from `main` silently reverts (same trap
  as the analytics demo seeder). PR + CI keeps the running code == `main`.
- PRs give review, test gating, and an audit trail. Direct SSH deploys have none.
- CI runs the tested, reproducible build path (correct `linux/amd64`, pinned deps,
  migrations on boot). Ad-hoc local builds drift from it.

Standard flow for a backend change:
1. Branch, implement, run the package's tests locally.
2. Commit (Conventional Commits), open a PR to `main`, get it green.
3. Merge. CI builds and deploys automatically. Verify health + the specific
   behavior afterwards.

Direct SSH image-tarball deploy is a **fallback only**, allowed when:
- the repo is private and the box can't pull it AND there is no working CI path
  (e.g. skawr-login, whose `deploy.sh` is broken, see its section below), or
- CI/CD is down and a fix genuinely cannot wait for it.

If you must SSH-deploy: say so and why, keep changes minimal, and **still open a PR
and merge the same change to `main` immediately after** so the GitOps mirror
matches and the next CI run doesn't revert it. Never hand-edit tracked files
(compose, `.env` schema) directly on the box; config/secret values in an untracked
`.env` are the only expected on-box edits.

Config-only changes (e.g. adding an env var to a service `.env`) are not code
deploys; those are edited on the box and the container recreated, since env files
are gitignored by design. Still prefer the documented `.env` location and back it
up first.

### Same principle for IdP / infra / IaC-managed config (not just code)

The rule above is not limited to backend code. It applies to **any production
state that has a tracked source of truth**: Zitadel apps/projects/roles, Traefik
and compose config, DNS, cloud/Terraform resources, etc. Change them through the
tracked source + a PR, not by hand on the box or in a console.

- **Zitadel is the concrete example that bit us.** The `admin`/`client` dashboard
  OIDC apps must be public PKCE clients (`app_type = user_agent`,
  `auth_method = none`). They were flipped to confidential (`web`/`basic`) by an
  automated change (both apps changed in the same second), which broke SSO with
  `empty client secret`. If Zitadel apps are provisioned by automation (Terraform
  / a bootstrap script), fix them THERE via a PR, because a manual Console or
  Management-API change is untracked drift that the next apply reverts.
- **Auth/IdP changes are high-impact.** Editing an OIDC app, auth method, roles,
  or token config affects every user of that app. Get explicit human
  confirmation before making one, even as a fallback.
- **Direct API/Console change is a flagged fallback only**, allowed when a user is
  locked out and there is no working tracked path to apply the fix in time. If you
  do it: say so and why up front, get confirmation, then **reconcile it into the
  tracked source (PR) immediately after** so it is reviewed and does not regress.
- Never hand-edit tracked infra files on the box (compose, Traefik labels). Those
  live in `skawr-deployment` and change via PR; `deploy.sh` resets the box to
  `origin/main`, so on-box edits to tracked files are blown away.

| Item | Value |
|------|-------|
| Host | `173.212.246.10` (Contabo) |
| User | `saleh` |
| SSH key | `/Users/smsaleh/Documents/Skawr/vps_ssh_key/id_ed25519` |
| Docker access | `saleh` is in `docker` group (no sudo needed) |
| Group | `skawrops` — can write to `/opt/skawr-deployment/*` but not create new `/opt/` dirs |
| Deployment dir | `/opt/skawr-deployment/` (docker-compose + .env for all services) |
| Growth dir | `/opt/skawr-deployment/growth/` (.env + credentials) |

```bash
# SSH to VPS
ssh -i ~/Documents/Skawr/vps_ssh_key/id_ed25519 saleh@173.212.246.10

# Check running services
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

# Growth API health
curl http://localhost:8010/health/ready

# Growth logs
docker logs skawr-growth-api --tail 50

# Restart Growth
docker restart skawr-growth-api

# Full redeploy (build + load + recreate)
# Option A: CI/CD (automatic on push to main)
# Option B: Manual image push:
#   local: docker buildx build --platform linux/amd64 -t skawr-growth-api:latest --load .
#   local: docker save skawr-growth-api:latest | gzip > /tmp/img.tar.gz
#   local: scp -i ~/Documents/Skawr/vps_ssh_key/id_ed25519 /tmp/img.tar.gz saleh@173.212.246.10:/opt/skawr-deployment/growth/
#   vps:   gunzip -c /opt/skawr-deployment/growth/img.tar.gz | docker load
#   vps:   docker rm -f skawr-growth-api && docker run -d --name skawr-growth-api --env-file /opt/skawr-deployment/growth/.env --network host --restart unless-stopped skawr-growth-api:latest
```

### skawr-login deploy (VPS) — `deploy.sh` is broken; use the image-tarball flow

**`/opt/skawr-login/deploy.sh` does not work when run as `saleh`.** Its `git fetch/checkout/pull`
fails because `/opt/skawr-login/.git` is **root-owned** (git dubious-ownership refusal), and it
can't write its `/tmp/skawr-login-build.log` (also root-owned). It fails *before* the
`docker rm -f` line, so a failed run does **not** cause an outage (old container keeps running) —
but it also means **no new code is deployed**. skawr-login is a **private repo**, so the box can't
`git pull` it as `saleh` regardless.

Deploy skawr-login the same way as Growth — build `linux/amd64` locally, ship the image, recreate:

```bash
# local (repo on the merged commit)
cd /Users/smsaleh/Documents/Skawr/skawr-login
docker buildx build --platform linux/amd64 -t skawr-login:latest --load .
docker save skawr-login:latest | gzip > /tmp/skawr-login.tar.gz
scp -i ~/Documents/Skawr/vps_ssh_key/id_ed25519 /tmp/skawr-login.tar.gz saleh@173.212.246.10:~/

# vps — recreate with the EXACT Traefik labels + env-file (bundled network, not host)
gunzip -c ~/skawr-login.tar.gz | docker load
docker rm -f skawr-login
docker run -d --name skawr-login --restart unless-stopped \
  --network skawr-deployment_skawr \
  --env-file /opt/skawr-login/.env \
  --label traefik.enable=true \
  --label 'traefik.http.routers.skawr-login.rule=Host(`login.skawr.com`)' \
  --label traefik.http.routers.skawr-login.entrypoints=websecure \
  --label traefik.http.routers.skawr-login.tls.certresolver=letsencrypt \
  --label traefik.http.services.skawr-login.loadbalancer.server.port=8080 \
  --label traefik.docker.network=skawr-deployment_skawr \
  skawr-login:latest
# verify: curl -s -o /dev/null -w '%{http_code}' https://login.skawr.com/health   (expect 200)
```

`skawr-login` env lives at **`/opt/skawr-login/.env`** (NOT `/opt/skawr-deployment/.env`). Since
AUTH-C002 it also needs: `INDEXER_BASE_URL=https://api.skawr.com`, `SERVICE_API_TOKEN` (same shared
secret as the indexer — see below), `SWEEP_DEACTIVATE_DAYS=30`, `SWEEP_DELETE_DAYS=90`,
`SWEEP_INTERVAL_HOURS=24`, `SWEEP_ENABLED` (currently `true` — the expiry sweep is enabled). A
missing `SERVICE_API_TOKEN` fails **safe** (accounts retained, never deleted; gateway still boots).
To eyeball a sweep before/without the loop: `docker exec skawr-login python -m app.sweep` (single
pass; safe — a first-ever pass can only deactivate, never delete). Monitor:
`docker logs skawr-login | grep expiry_sweep`.

### Key VPS paths

| Path | Contents |
|------|----------|
| `/opt/skawr-deployment/.env` | Shared env for Search indexer (has SERVICE_API_TOKEN, REDIS_URL, etc.) |
| `/opt/skawr-deployment/growth/.env` | Growth-specific env (all secrets including Fernet, ingress, HubSpot) |
| `/opt/skawr-deployment/growth/credentials/sheets-sa.json` | Google Sheets service account |
| `/opt/skawr-deployment/docker-compose.yml` | Main compose (indexer, login, Zitadel, Traefik, etc.) |

### Zitadel (id.skawr.com)

| Item | Value |
|------|-------|
| Container | `zitadel` |
| External domain | `id.skawr.com` |
| Masterkey | `b71c3374930c86763366bfa16b209f10` |
| Admin PAT | in `/opt/skawr-login/.env` as `ZITADEL_LOGIN_PAT` |
| Growth project ID | `382657839283306507` |
| Growth app client ID | `382657867838128139` |
| Growth audience | `382657839283306507` (same as project ID) |
| Roles | viewer, operator, reviewer, publisher, administrator, outreach_approver |

### Important notes

- **Cannot create `/opt/skawr-growth/`** — `saleh` doesn't have root write to `/opt`. Use `/opt/skawr-deployment/growth/` instead (group-writable via `skawrops`).
- **Docker images must be `linux/amd64`** — the VPS is AMD64, local Mac is ARM. Always `docker buildx build --platform linux/amd64`.
- **SERVICE_API_TOKEN** is a global shared secret between Search and Growth (NOT per-customer). Value: `40e602af818f76ebc67c4aae73adccaade65c70ca2105e7de689b0f46c7b04e4`
- **Private repos require auth on VPS** — can't `git clone` directly. Use the image-tarball method or configure a deploy key.
- **skawr-login `deploy.sh` is broken for `saleh`** (root-owned `.git` + root-owned `/tmp` build log) — it can't pull the private repo and never deploys new code, though it fails safely before recreating the container. Deploy skawr-login via the image-tarball flow above, not `deploy.sh`. (Fix candidate: `chown` the repo to `saleh`/`skawrops` or rewrite `deploy.sh` to the tarball model.)
- **skawr-login is NOT on the compose file's GitOps flow** — it runs as a standalone `docker run` (own `/opt/skawr-login/.env` + Traefik labels), so recreating it is a manual `docker run`, not `docker compose up`.
- **`TOKEN_ENCRYPTION_KEY` is BOOT-CRITICAL for the indexer** (since skawr-search #319 / SRCH-C007). The `backend`/indexer fail-closes and refuses to start if it's missing or invalid, so a `docker compose up -d` recreate without it takes `api.skawr.com` DOWN (not a blip). It must be a valid Fernet key — generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` (NOT `openssl rand -hex`, which is invalid). Keep it stable (rotating invalidates stored OAuth tokens). Lives only in `/opt/skawr-deployment/.env`, never in git. `deploy.sh` preflights this key before recreating containers.
- **`SHOPIFY_CLIENT_SECRET` is NOT boot-blocking** — if unset, Shopify webhooks are rejected (500) at request time but the indexer still starts. Set it before onboarding Shopify merchants.
- **VPS deploy dir is a GitOps mirror** — never hand-edit `/opt/skawr-deployment/docker-compose.yml` on the box; changes go through PRs. `deploy.sh`/`deploy.yml` reset the working tree to `origin/main` on deploy, so VPS-local edits to tracked files are blown away.

---

## skawr-devbox (full local stack + self-contained SSO)

`skawr-devbox` is the one-command local stack. Its key value over running each
app alone: it stands up a **fully local Zitadel + the real branded skawr-login
UI**, so SSO works end to end on localhost with **no VPS dependency**. This is
the way to click through auth-gated apps (client dashboard, admin, account)
locally, since the production Zitadel only has redirect URIs for prod domains.

| Item | Value |
|------|-------|
| Repo | `https://github.com/LuqtahTech/skawr-devbox` (private) |
| Local path | `/Users/smsaleh/Documents/Skawr/skawr-devbox` |
| Submodules | `skawr-search`, `skawr-web`, `skawr-dashboards`, `skawr-login` (each tracks its own `main`) |

### Services (after `make up`)

| Service | URL | Notes |
|---------|-----|-------|
| web | http://localhost:3000 | skawr-web (Next dev) |
| client dashboard | http://localhost:3001 | skawr-dashboard-client (Vite dev) |
| admin dashboard | http://localhost:3002 | skawr-dashboard-admin (Vite dev) |
| account | http://localhost:3003 | skawr-account (Vite dev) |
| backend | http://localhost:8000 | skawr-indexer API |
| zitadel | http://localhost:8080 | local OIDC IdP (console at `/ui/console`) |
| login | http://localhost:8081 | branded Skawr login (same app as `login.skawr.com`) |

### Setup

```bash
cd /Users/smsaleh/Documents/Skawr/skawr-devbox
cp .env.example .env      # then fill values (see below)
make up                   # builds + starts everything; bootstraps Zitadel headlessly
make hydrate              # OPTIONAL: pull a subset of prod data from R2 into OpenSearch
```

`.env` values:
- `FIREWORKS_API_KEY` is required for the backend to boot. For a **UI/SSO-only
  demo** a placeholder (e.g. `local-dev-placeholder`) is enough: the backend
  starts and auth works; only live search/embeddings calls fail. Use a real key
  for actual search.
- `R2_ACCESS_KEY` / `R2_SECRET_KEY` are only needed by `make hydrate` (loading
  data), not to run the stack.
- `ZITADEL_MASTERKEY` default is fine (must be exactly 32 bytes).

### Login (local SSO)

SSO is mandatory. Any app redirects to the local Zitadel, which hands off to the
branded login at `localhost:8081` (Zitadel's `loginV2.baseUri`, exactly how prod
points at `login.skawr.com`). Sign in with the seeded local admin:

- **Email:** `admin@local.dev`
- **Password:** `LocalAdmin123!`

Or register a new local account via the signup flow. Manage users/apps at the
Zitadel console `http://localhost:8080/ui/console` (same credentials).

### How SSO bootstraps (no manual steps)

`make up` runs a headless 4-stage Zitadel boot: db-init, schema init, first
setup (creates the admin + an IAM_OWNER machine user whose PAT lands in the
shared volume), then a bootstrap that creates the three OIDC apps
(client/admin/account, SPA + PKCE + devMode) with localhost redirect URIs, writes
their client IDs to `/shared/zitadel.env`, and points Zitadel's login hand-off at
the local skawr-login. Each dashboard sources `/shared/zitadel.env` before Vite
starts, so client IDs are auto-discovered. It is idempotent (repeat `make up` is
a no-op).

### Previewing a feature branch of a dashboard (important gotcha)

`make up` runs `git submodule update --remote`, which **resets every submodule to
its latest `main`**. So to preview an unmerged branch (e.g. a client-dashboard
PR), do NOT use `make up`. Instead, check the branch out in the submodule and
bring the services up with `docker compose` directly (the dashboard image is
built from the submodule working tree via `Dockerfile.dashboards`):

```bash
cd /Users/smsaleh/Documents/Skawr/skawr-devbox/skawr-dashboards
git fetch origin <branch> && git checkout <branch>
cd /Users/smsaleh/Documents/Skawr/skawr-devbox
docker compose up -d --build dashboard login   # pulls in backend + zitadel chain
# client dashboard → http://localhost:3001  (login → admin@local.dev / LocalAdmin123!)
```

Bringing up `dashboard` also starts its deps (backend, OpenSearch, Postgres, the
Zitadel bootstrap chain); `login` serves the branded UI at :8081. Rebuild after
new commits with `docker compose up -d --build dashboard`.

### Teardown

```bash
docker compose down     # stop, keep data volumes  (or: make down)
docker compose down -v  # stop + wipe local data volumes (fresh start)  (or: make nuke)
```

### Gotchas

- `make up` force-resets submodules to `main` (see the feature-branch note above).
- The devbox `postgres`/`opensearch` are internal-only (no published host port),
  so they do not clash with `skawr-dev-postgres` (5432) or
  `skawr-analytics-postgres` (5433). Host ports it does use: 3000-3003, 8000,
  8080, 8081. Free 3001 first if a stray Vite server holds it.
- `zitadel` reachable in-cluster only as `localhost:8080` (its registered
  ExternalDomain); other service names 404. The compose already sends
  `Host: localhost:8080` where needed (backend, login).

---

## skawr.com/saas live self-demo (dogfooding the whole system)

The `/saas` landing page runs as a live demo of the Skawr product system:
skawr.com is provisioned as its own paying customer. A toggle activates
SkawrBar, SkawrBot, the Search Widget (over a seeded demo store), an NPS survey,
and a live-analytics panel + a full public dashboard. Implementation lives in
`skawr-web/app/saas/_components/demo/*` (UI) and `skawr-web/app/api/saas-demo/*`
(server-side BFF that holds the secret indexer key). See
`skawr-web/docs/saas-live-demo.md`.

Two backing accounts, both provisioned by idempotent scripts (run inside the
prod containers via `docker exec`, copying the script in if the running image
predates it, same pattern as the analytics demo seeder):

1. **Indexer client "Skawr SaaS Demo"** (Scale/active) with a bilingual demo
   catalog indexed to a per-client SaaS index and a Skawr FAQ pack for SkawrBot.
   Script: `skawr-search/skawr-indexer/scripts/setup_saas_demo_client.py`
   (env `SAAS_DEMO_CLIENT_KEY`, a SECRET search key). Gotcha: seeding the catalog
   is not enough. SaaS search resolves a per-client `SearchIndex`, so the demo
   also needs a SaaS index created (`POST /api/v1/saas/indices`) and documents
   uploaded (`POST /api/v1/saas/indices/{name}/documents`); creating the index
   auto-binds the client's key to it. Client id: `ad38fcf9-d1ae-436f-a9dd-d6dd9c30d046`.
2. **Analytics project "Skawr Product System Landing"** with a track-only key, an
   NPS survey (+responses), a seeded 30-day event dataset, and a `full_access`
   public share token. Script:
   `skawr-analytics/backend/scripts/setup_landing_demo.py` (async; reads
   `DATABASE_URL`). Project id: `8e602e6e-a8b0-4a2d-a6d2-d32f20bc38ae`.

The secret indexer key + the (publishable) analytics track key + public token
live only in `skawr-web/.env.local` (gitignored); the scripts print them. Env
var names are in `skawr-web/.env.example`.

**Public analytics share (new backend capability).** `public_shares` tokens mint
read access to a project's public analytics. Two endpoints:
`GET /api/v1/public-analytics/{token}` (aggregates-only, no PII, safe default for
any project) and `GET /api/v1/public-analytics/{token}/full` (row-level + identity
fields + surveys, gated behind the token's `full_access` flag). `full_access`
must ONLY ever be set for a no-PII project like this landing demo. The public,
no-login dashboard page is `analytics-frontend /shared/[token]`
(`analytics.skawr.com/shared/{token}`). Mint/list/revoke aggregates tokens via
`POST/GET/DELETE /api/v1/projects/{id}/public-shares` (owner/admin).

**CloudFront gotcha:** `analytics-api.skawr.com` sits behind CloudFront, which
caches 404s. If you hit `/public-analytics/{token}` before the token exists, the
edge caches that 404 and keeps serving it after the token is minted (until TTL).
`/full` was never 404-cached, so the skawr-web analytics BFF calls `/full` (a
superset) to dodge it.

**Migration discipline (learned the hard way):** an analytics migration once
shipped with a stale `revision`/`down_revision` (the edit was never staged into
the merge commit), creating dual Alembic heads and crash-looping
`analytics-api` on boot. Always verify the COMMITTED migration content
(`git show HEAD:<path>`) and a single `alembic heads`, not just the working tree.
