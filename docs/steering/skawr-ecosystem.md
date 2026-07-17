# Skawr Ecosystem — Master Reference (July 2026)

Canonical reference for AI agents and developers working on any Skawr repo.
Org: **LuqtahTech** on GitHub.

---

## 1. What is Skawr?

Skawr is a Saudi/MENA-focused technology company building five products:

| # | Product | URL | Description |
|---|---------|-----|-------------|
| 1 | **Marketplace Aggregator** | `skawr.com` | AI-powered search across Saudi marketplaces (Haraj, Aqar, Dubizzle, OpenSooq, Mstaml) |
| 2 | **Search SaaS** | `skawr.com/saas` | Multi-tenant search-as-a-service with hybrid BM25 + vector search, billing via Polar.sh |
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
| `skawr-dashboards` | Admin + client dashboards for search SaaS | React 19, Vite, TypeScript, Tailwind | `app.skawr.com` |
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

- `skawr-web` → `skawr.com` (auto-deploy on push to `main`)

### CI/CD Patterns

| Pattern | Used by |
|---------|---------|
| GHA → docker build → scp tarball → blue/green swap | `skawr-search` (indexer) |
| GHA → docker build → scp → docker load → recreate | `skawr-analytics` |
| GHA → reusable VPS workflow → git reset on VPS | `skawr-scraper` |
| GHA → docker compose pull → up | `skawr-deployment` |
| AWS Amplify auto-deploy on push to main | `skawr-web` |
| npm/pip publish | `skawr-auth`, `skawr-sdks`, analytics SDKs |

### Domain Routing (Post-Consolidation)

| Domain | Service | Notes |
|--------|---------|-------|
| `skawr.com` | skawr-web (Amplify) | Marketplace + SaaS landing + CRO |
| `skawr.com/saas` | skawr-web | SaaS product pages |
| `skawr.com/cro` | skawr-web | CRO landing + pricing + audit tool |
| `api.skawr.com` | skawr-indexer (VPS) | Core SaaS API |
| `analytics.skawr.com` | skawr-analytics frontend (VPS) | Migrated from `analytics.ziyad.one` |
| `login.skawr.com` | skawr-login (VPS) | Zitadel Login v2 custom UI |
| `id.ziyad.one` | Zitadel instance | OIDC provider (IdP) |
| `app.skawr.com` | skawr-dashboards (VPS) | Admin + client dashboards |

---

## 4. Auth Architecture

### Overview

Skawr is migrating from a legacy JWT system (`skawr-auth`) to Zitadel OIDC (`id.ziyad.one`) with a custom Login v2 UI (`skawr-login`).

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Any Skawr  │────▶│ login.skawr  │────▶│ id.ziyad.one│
│    App      │     │  (skawr-login│     │  (Zitadel)  │
│             │◀────│   FastAPI)   │◀────│   OIDC IdP  │
└─────────────┘     └──────────────┘     └─────────────┘
```

### Components

| Component | Role |
|-----------|------|
| **Zitadel** (`id.ziyad.one`) | OIDC identity provider. Manages users, orgs, sessions, MFA. Source of truth for identity. |
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
3. All Zitadel tokens are validated against `id.ziyad.one/.well-known/openid-configuration`
4. Tier gating removed from analytics — all SaaS customers get full analytics access

---

## 5. Key Development Conventions

### General

- **No `git push` without explicit human confirmation** — always commit locally first
- **Conventional Commits** across all repos
- **pnpm** for JS/TS repos (skawr-web, skawr-dashboards)
- **Docker health checks** at `/health` (backends) and `/api/v1/health`
- **Alembic migrations** auto-run on container boot — migrations must be idempotent

### skawr-search / skawr-indexer

- Python 3.11+, FastAPI, async SQLAlchemy 2.0, Alembic
- OpenSearch 2.19.5 with FAISS scalar quantization for vectors
- Fireworks Qwen3 for embeddings (4096D) and reranking
- `EMBEDDINGS_ENABLED=false` by default in dev
- Billing: Polar.sh integration (trials, dunning, annual billing)
- Build: `make dev-start`, `make validate`
- Tests: pytest + pytest-asyncio + Hypothesis

### skawr-analytics

- Backend: Python 3.12, FastAPI, async SQLAlchemy, PostgreSQL
- Frontend: Next.js 16, React 19, TypeScript — **NO Tailwind** (custom CSS)
- SDK: Published as `@skawr/analytics-react` (renamed from `@luqtahtech/analytics-react`)
- Tier gating removed — all SaaS customers get full analytics

### skawr-dashboards

- React 19, Vite, TypeScript, Tailwind
- Domain migrated from `ziyad.one` → `skawr.com`
- Onboarding UX flow for new SaaS clients
- Zitadel SSO mandatory

### skawr-web

- Next.js 16, React 19, pnpm, Tailwind 4
- Deployed on AWS Amplify
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

3. **Domain consolidation happened** — `analytics.ziyad.one` → `analytics.skawr.com`, dashboards moved to `app.skawr.com`. Old domains redirect but don't use them in new code.

4. **Zitadel is at `id.ziyad.one`** — The IdP itself stays on ziyad.one (not skawr.com). The custom login UI is at `login.skawr.com`.

5. **CRO product is service-based, not SaaS** — Project-based pricing ($300–$1,200/project). `/cro/audit` is a free instant audit tool (lead gen). Don't add subscription logic.

6. **Polar.sh for billing** — SaaS subscriptions, trials (14-day, no CC), dunning, and annual billing all go through Polar. Checkout redirects to Polar hosted pages.

7. **No permanent free tier** — Only a 14-day trial. Trial expiry hard-cuts access.

8. **Analytics bundled with Search SaaS** — No separate analytics billing. All SaaS customers get full analytics.

9. **OpenSearch is internal-only** — Port 9200 is never exposed publicly. Only accessible via Docker network.

10. **skawr-web still uses Supabase auth** — It hasn't migrated to Zitadel yet. The marketplace frontend auth is separate from the SaaS/dashboard auth.

11. **Identity ladder in analytics** — Uses `COALESCE(user_id, anonymous_id, session_id)`. Most marketplace traffic is anonymous.

12. **iOS app is decommissioned** — Removed from App Store. Don't reference it.

13. **skawr-landing is archived** — All SaaS marketing content lives in `skawr-web/app/saas/`.

14. **The React analytics SDK is `@skawr/analytics-react`** — Renamed from the old `@luqtahtech/analytics-react` package.

15. **No Tailwind in skawr-analytics frontend** — It uses custom CSS. Don't add Tailwind there.

16. **Fireworks AI for embeddings** — No local model weights. The indexer calls Fireworks API (Qwen3, 4096D). `EMBEDDINGS_ENABLED` flag controls this.
