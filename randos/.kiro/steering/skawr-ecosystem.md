# Skawr Ecosystem — Master Reference (July 2026)

Canonical reference for AI agents and developers working on any Skawr repo.
Org: **LuqtahTech** on GitHub.

---

## 1. What is Skawr?

Skawr is a Saudi/MENA-focused technology company building five products:

> **IA update (2026):** `skawr.com` (home) is now the **business hub** (was the
> marketplace). The marketplace aggregator moved to `skawr.com/marketplaces`
> (results at `/marketplaces/search`), and the Search SaaS moved from
> `/saas` to `/search`. Old paths 301-redirect (see `skawr-web/next.config.mjs`).

| # | Product | URL | Description |
|---|---------|-----|-------------|
| 1 | **Marketplace Aggregator** | `skawr.com/marketplaces` | AI-powered search across Saudi marketplaces (Haraj, Aqar, Dubizzle, OpenSooq, Mstaml) |
| 2 | **Search SaaS** | `skawr.com/search` | Multi-tenant search-as-a-service with hybrid BM25 + vector search, billing via Polar.sh |
| 3 | **Analytics** | `analytics.skawr.com` | MENA-first product analytics platform (like Amplitude/Mixpanel) |
| 4 | **CRO Service** | `skawr.com/cro` | Conversion Rate Optimization consulting — project-based, 4-pillar framework |
| 5 | **Salla/Shopify Extensions** | Salla App Store / Shopify Theme | Zero-code AI search widgets for e-commerce merchants |

The name comes from Arabic "سكور" (to scour/search).

---

## 2. Repository Map

All repos live under `/Users/smsaleh/Documents/Skawr/` unless noted.

### Active Repos (16)

| Repo | Purpose | Stack | Live URL |
|------|---------|-------|----------|
| `skawr-search` | Core SaaS backend (indexer, billing, Salla/Shopify, search). Also contains `docker-compose.dev.yml` + R2 restore scripts (the "devbox") | Python FastAPI, PostgreSQL, OpenSearch 2.19.5, Redis 7 | `api.skawr.com` |
| `skawr-analytics` | Product analytics platform (backend + frontend) | Next.js 16, FastAPI, PostgreSQL | `analytics.skawr.com` |
| `skawr-dashboards` | Admin + client dashboards for search SaaS | React 19, Vite, TypeScript, Tailwind | `admin.skawr.com` / `dashboard.skawr.com` |
| `skawr-web` | Marketplace frontend + SaaS landing + CRO section | Next.js 16, pnpm, Tailwind 4, Radix UI | `skawr.com` (Amplify) |
| `skawr-login` | Zitadel Login v2 custom UI — unified SSO for all apps | Python FastAPI BFF, Jinja2 templates | `login.skawr.com` |
| `skawr-auth` | Shared auth library (Python + TypeScript). Legacy JWT — being superseded by Zitadel OIDC | JWT, bcrypt | npm + pip packages |
| `skawr-sdks` | SaaS client SDKs (`@skawr/search`, Flutter, RN, PHP) | TypeScript, PHP, Dart | npm/pub |
| `skawr-extension` | Chrome extension for Haraj import | TypeScript, React, Vite, Firebase | — |
| `skawr-deployment` | Docker Compose, Traefik, nginx, cron orchestration for VPS | Docker, Traefik | — |
| `skawr-scraper` | Marketplace crawlers + cron wrappers | Python, Scrapy | VPS crons |
| `skawr-design` | Design system — tokens, colors, fonts, assets | — | — |
| `skawr-docs` | Static HTML documentation site | HTML/CSS | GitHub Pages |
| `skawr-search-ml` | ML research: hybrid Transformer-Mamba architecture | Python | — |
| `skawr-project-management` | Cross-functional planning + tracking | Issues only | — |
| `skawr-salla-theme` | Salla storefront theme customizations | Twig/Salla SDK | — |
| `skawr-shopify-extension` | Shopify theme app extension (widget embed) | JS, CloudFront | — |

### Archived (2)

| Repo | Reason |
|------|--------|
| `skawr-landing` | Content merged into `skawr-web/app/saas/` |
| `skawr-indexer` (standalone) | Merged into `skawr-search/skawr-indexer/` |

### Important Clarification

**`skawr-devbox` is NOT a separate repo.** It refers to the `docker-compose.dev.yml` + R2 restore scripts inside `skawr-search`. Run `docker compose -f docker-compose.dev.yml up` from the `skawr-search` root for a full local dev environment.

---

## 3. Infrastructure & Deployment

### VPS (Contabo: `173.212.246.10`)

All backend services run on a single VPS with Docker + Traefik.

| Component | Version/Details |
|-----------|-----------------|
| Reverse proxy | Traefik (TLS via Let's Encrypt) |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Search engine | OpenSearch 2.19.5 (FAISS scalar quantization) |
| AI embeddings | Fireworks Qwen3 (4096D vectors) |
| AI reranker | Fireworks Qwen3 reranker |
| Deploy strategy | Blue/green (zero-downtime container swaps) |

**Blue/Green Deploys**: The indexer runs two container slots (blue/green). CI builds a new image, starts the inactive slot, health-checks it, then Traefik switches traffic. Rollback = switch back to the previous slot.

### AWS Amplify

All frontends auto-build + deploy on push to `main` (each app has an `amplify.yml`):
- `skawr-web` → `skawr.com`
- `skawr-dashboards` → `admin.skawr.com` (admin) + `dashboard.skawr.com` (client)
- `skawr-analytics` **frontend** → `analytics.skawr.com` (its backend is on the VPS — see Domain Routing)

Vite `VITE_*` vars are baked at build time. The dashboards build with no env injection in CI/Amplify, so their public Zitadel config lives in a committed `.env.production` (the admin dashboard's was missing, which broke SSO with `Error: client_id` until added).

### CI/CD Patterns

| Pattern | Used by |
|---------|---------|
| GHA → docker build → scp tarball → blue/green swap | `skawr-search` (indexer) |
| GHA → docker build → scp → docker load → recreate | `skawr-analytics` **backend only** (frontend is on Amplify) |
| GHA → reusable VPS workflow → git reset on VPS | `skawr-scraper` |
| GHA → docker compose pull → up | `skawr-deployment` |
| AWS Amplify auto-deploy on push to main | `skawr-web`, `skawr-dashboards` (admin + client), `skawr-analytics` frontend |
| npm/pip publish | `skawr-auth`, `skawr-sdks`, analytics SDKs |

### Domain Routing (Post-Consolidation)

| Domain | Service | Notes |
|--------|---------|-------|
| `skawr.com` | skawr-web (Amplify) | Business hub (home) + product landings |
| `skawr.com/marketplaces` | skawr-web | Marketplace aggregator (results at `/marketplaces/search`) |
| `skawr.com/search` | skawr-web | Search SaaS product pages (was `/saas`) |
| `skawr.com/cro` | skawr-web | CRO landing + pricing + audit tool |
| `api.skawr.com` | skawr-indexer (VPS) | Core SaaS API |
| `analytics.skawr.com` | skawr-analytics frontend (AWS Amplify) | Migrated from `analytics.ziyad.one` |
| `analytics-api.skawr.com` | skawr-analytics backend (VPS) | Migrated from `analytics-api.ziyad.one` |
| `login.skawr.com` | skawr-login (VPS) | Zitadel Login v2 custom UI |
| `id.skawr.com` | Zitadel instance | OIDC provider (IdP) — migrated from `id.ziyad.one` |
| `admin.skawr.com` / `dashboard.skawr.com` | skawr-dashboards (AWS Amplify) | Admin + client dashboards (migrated from `admin.ziyad.one`) |
| `umami.ziyad.one` | Umami analytics | Still on ziyad.one — no skawr.com equivalent |
| `errors.ziyad.one` | Error tracking | Still on ziyad.one — no skawr.com equivalent |

---

## 4. Auth Architecture

### Overview

Skawr is migrating from a legacy JWT system (`skawr-auth`) to Zitadel OIDC (`id.skawr.com`) with a custom Login v2 UI (`skawr-login`).

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Any Skawr  │────▶│ login.skawr  │────▶│ id.skawr.com│
│    App      │     │  (skawr-login│     │  (Zitadel)  │
│             │◀────│   FastAPI)   │◀────│   OIDC IdP  │
└─────────────┘     └──────────────┘     └─────────────┘
```

### Components

| Component | Role |
|-----------|------|
| **Zitadel** (`id.skawr.com`) | OIDC identity provider. Manages users, orgs, sessions, MFA. Source of truth for identity. |
| **skawr-login** (`login.skawr.com`) | Custom Login v2 UI. Python/FastAPI BFF that talks to Zitadel's session/OIDC APIs. Renders login/register/MFA/password-reset flows with Skawr branding. All apps redirect here for auth. |
| **skawr-auth** (library) | Legacy shared auth library (Python + TypeScript). Still used for JWT token validation in services that haven't migrated. Being phased out. |

### Migration Status

- **skawr-dashboards**: Migrated to Zitadel SSO ✓
- **skawr-analytics**: Migrated to Zitadel SSO (mandatory) ✓
- **skawr-web**: Still using Supabase auth (migration planned)
- **skawr-indexer (SaaS API)**: API keys + legacy JWT (migration planned)

### Key Auth Rules

1. New services MUST use Zitadel OIDC via `skawr-login` redirect — do NOT implement custom login forms
2. `skawr-auth` library is for backwards compatibility only — do not add new features to it
3. All Zitadel tokens are validated against `id.skawr.com/.well-known/openid-configuration`
4. Analytics tier gating matches the SaaS pricing page. Core product analytics (events, funnels, retention, cohorts, journeys, revenue, surveys) is available on all paid tiers. Heatmaps and Revenue Attribution are Scale-tier. The onboarding widgets (Skawr Bar, Skawr Search Widget, SkawrBot, NPS Surveys) are Pro and Scale only. There is no separate analytics subscription; analytics is bundled with the Search SaaS.

---

## 5. Key Development Conventions

### General

- **No `git push` without explicit human confirmation** — always commit locally first
- **Conventional Commits** across all repos
- **pnpm** for JS/TS repos (skawr-web, skawr-dashboards)
- **Docker health checks** at `/health` (backends) and `/api/v1/health`
- **Alembic migrations** auto-run on container boot — migrations must be idempotent
- **Update docs with the code:** after finishing a piece of work, update any
  documentation it makes stale or incomplete (repo READMEs, `.env.example`,
  ROADMAP, steering files, API/SDK docs, and design docs). Treat documentation
  as part of "done", not a follow-up.

### skawr-search / skawr-indexer

- Python 3.11+, FastAPI, async SQLAlchemy 2.0, Alembic
- OpenSearch 2.19.5 with FAISS scalar quantization for vectors
- Fireworks Qwen3 for embeddings (4096D) and reranking
- `EMBEDDINGS_ENABLED=false` by default in dev
- Billing: Polar.sh integration (subscriptions, dunning, annual billing)
- Build: `make dev-start`, `make validate`
- Tests: pytest + pytest-asyncio + Hypothesis

### skawr-analytics

- Backend: Python 3.12, FastAPI, async SQLAlchemy, PostgreSQL
- Frontend: Next.js 16, React 19, TypeScript — **NO Tailwind** (custom CSS)
- SDK: Published as `@skawr/analytics-react` (renamed from `@luqtahtech/analytics-react`)
- Tier gating matches the pricing page: core analytics on all paid tiers; Heatmaps and Revenue Attribution are Scale-tier; onboarding widgets (Skawr Bar, Search Widget, SkawrBot, NPS Surveys) are Pro+
- Every event carries an `sdk_source` tag. Tool events use tool tags (`skawrbar`, `skawrbot`, `search-widget`, `survey`, `batch-api`); first-party SDK traffic uses the platform tag the SDK sets via `X-SDK-Name` (`react`, `web`, `node`, `python`, `flutter`). The dashboard has a "by tool" breakdown (via `source-label.ts`, which maps every one of these to a friendly name) and a per-tool filter. This is how one merchant sees Skawr Bar clicks, SkawrBot chats, and survey responses side by side. Events with no tag collapse into an "unknown" bucket; the `$identify` sentinel is tagged as of the events.py fix.
- The search indexer forwards storefront tool events into each merchant's own analytics project server-side. It stores the provisioned analytics `project_id` + key on its `APIClient` (see gotcha 17) and posts via `emit_tool_event` / the `/api/v1/telemetry/event` beacon. Analytics keys are never exposed to the browser.
- **UI standard is monitor-first (Phase A2).** Every screen opens with a lead
  KPI band or one lead visual and surfaces the biggest thing first, then puts
  raw tables behind progressive disclosure (collapsible sections). Do not build
  a screen that opens on an unranked table. The neutral zinc-ish warm off-white
  canvas, one coral accent, big friendly KPI numbers, tabular-nums, and the
  Hotjar-style presentation rules live in `skawr-design-system.md` section 8.
- **Friendly names everywhere.** Never surface raw event keys in user-facing UI;
  resolve them through the data dictionary via `useEventLabels`/`eventLabel`.
- **Funnels are a full suite** (see `skawr-analytics/docs/funnels-improvement-scoping.md`):
  saved funnels, ordered/unordered + exclusion steps, OR-steps, time-to-convert
  distribution, revenue-per-step (revenue lost at each drop-off), a node-edge
  "Flow view", conversion-over-time trend, a what-if simulator, a funnel
  conversion **alert** type, and a per-step "See heatmap" drilldown (each step
  carries its `top_page`; heatmaps accept `?page=`).
- **Full feature catalog:** `skawr-analytics/docs/features-catalog.md` lists
  every tab and what it shows. Keep it updated when adding or changing features.

### skawr-dashboards

- React 19, Vite, TypeScript, Tailwind
- Domain migrated from `ziyad.one` → `skawr.com`
- Onboarding UX flow for new SaaS clients
- Zitadel SSO mandatory

### skawr-web

- Next.js 16, React 19, pnpm, Tailwind 4
- Deployed on AWS Amplify
- Bilingual marketing pages (English default + Arabic under `/ar`, RTL) via
  next-intl v4. Locale = cookie → Accept-Language → English (not timezone).
  Marketing routes live under `app/[locale]/`. See `skawr-web/docs/i18n.md`.
- New CRO section (`/cro`, `/cro/pricing`, `/cro/audit`)
- Polar.sh checkout integration for SaaS billing
- DynamoDB + SES integrations for listings and notifications

### skawr-login

- Python 3.12, FastAPI, Jinja2 templates
- BFF pattern — server-side rendering of auth flows
- Talks to Zitadel Login v2 / Session APIs
- Unified SSO entry point for all Skawr apps

---

## 6. Gotchas & Important Notes

1. **skawr-devbox is NOT a repo** — it's `docker-compose.dev.yml` + R2 restore scripts inside `skawr-search`. Don't look for a separate repo.

2. **Blue/green deploys** — The indexer uses blue/green on the VPS. CI scripts reference `DEPLOY_SLOT` env var. Never manually `docker compose up` the indexer in production — use the deploy script.

3. **Domain consolidation happened** — `analytics.ziyad.one` → `analytics.skawr.com`, dashboards moved to `admin.skawr.com` & `dashboard.skawr.com`. Old domains redirect but don't use them in new code.

4. **Zitadel is now at `id.skawr.com`** — The IdP has moved from `id.ziyad.one` to `id.skawr.com`. The custom login UI is at `login.skawr.com`. The only services still on `ziyad.one` are `umami.ziyad.one` (analytics) and `errors.ziyad.one` (error tracking).

5. **CRO product is service-based, not SaaS** — Project-based pricing ($300–$1,200/project). `/cro/audit` is a free instant audit tool (lead gen). Don't add subscription logic.

6. **Polar.sh for billing** — SaaS subscriptions, dunning, and annual billing all go through Polar. Checkout redirects to Polar hosted pages. Users must complete checkout before getting API access.

7. **No free tier, no free trial** — Users must subscribe (pay) before they can use the API. Signup creates an account but API access is blocked (402) until Polar webhook confirms an active subscription.

8. **Analytics bundled with Search SaaS.** No separate analytics billing. Core product analytics is on all paid tiers, but some analytics features are tier-gated to match the pricing page: Heatmaps and Revenue Attribution are Scale-tier, and the onboarding widgets (Skawr Bar, Search Widget, SkawrBot, NPS Surveys) are Pro and Scale only.

9. **OpenSearch is internal-only** — Port 9200 is never exposed publicly. Only accessible via Docker network.

10. **skawr-web still uses Supabase auth** — It hasn't migrated to Zitadel yet. The marketplace frontend auth is separate from the SaaS/dashboard auth.

11. **Identity ladder in analytics** — Uses `COALESCE(user_id, anonymous_id, session_id)`. Most marketplace traffic is anonymous.

12. **iOS app is decommissioned** — Removed from App Store. Don't reference it.

13. **skawr-landing is archived** — All SaaS marketing content lives in `skawr-web/app/saas/`.

14. **The React analytics SDK is `@skawr/analytics-react`** — Renamed from the old `@luqtahtech/analytics-react` package.

15. **No Tailwind in skawr-analytics frontend** — It uses custom CSS. Don't add Tailwind there.

16. **Fireworks AI for embeddings** — No local model weights. The indexer calls Fireworks API (Qwen3, 4096D). `EMBEDDINGS_ENABLED` flag controls this.

17. **Search and Analytics are linked by a stored project id + key, not just email.** On `subscription.created`, the indexer calls the analytics `POST /api/v1/provision/auto` with an `external_client_id` (its own `APIClient.id`), then stores the returned analytics `project_id` and an encrypted analytics API key on `APIClient.analytics_project_id` / `analytics_api_key_encrypted`. The analytics project records the reverse `external_client_id` in its settings. This is what lets the indexer route each merchant's storefront events to the right analytics project. Two "analytics" systems coexist by design and are NOT duplicates: the indexer's own tables (`search_query_logs`, `usage_counters`) power the operational search dashboard and billing, while the skawr-analytics platform is the product-analytics display surface that the indexer pipes tool events into. The search pipe (`analytics_pipe.py`) is now enabled by default and no-ops without a key.

18. **Heatmaps and Revenue Attribution are produced client-side, posting directly to analytics-api.** Unlike the Bar, Bot, and survey tools (whose events are proxied server-side through the indexer so the analytics key stays server-held), the storefront heatmap and attribution producer (`skawr-indexer/app/static/skawranalytics.js`) posts high-volume data straight to analytics-api from the shopper's browser using the merchant's PUBLISHABLE key. That is why auto-provisioned analytics keys are now minted TRACK-ONLY (`permissions: ["track"]`): a browser-exposed key must be ingest-only. The producer is served same-origin from `/static/skawranalytics.js` by default and can be flipped to the CDN (`cdn.skawr.com/analytics/v1/skawranalytics.js`) via the `SKAWR_ANALYTICS_BUNDLE_URL` setting; it is published by skawr-search's `deploy-analytics-cdn.yml` to the same bucket and CloudFront distribution as the search widget (IAM/OIDC in `skawr-deployment/terraform/cdn`, which now trusts both skawr-sdks and skawr-search). Both producers are Scale-tier. Consent: DNT and GPC are always honored, plus an optional Accept/Decline banner gated by the merchant setting `analytics_consent_required` (with `analytics_privacy_policy_url`). See `skawr-indexer/docs/analytics-privacy-pdpl.md` for the PDPL note.
