---
inclusion: manual
---

# Skawr Search Platform — Technical Reference

> Steering file for the `skawr-search/skawr-indexer` backend.

---

## 1. Architecture Overview

The **skawr-indexer** is a FastAPI service that serves as the entire SaaS platform backend. Despite its name, it handles far more than indexing:

- Multi-tenant search (hybrid BM25 + vector)
- Billing and subscription management (Polar.sh)
- Multi-tenant client management and quota enforcement
- Salla OAuth, webhooks, and widget injection
- Shopify theme app extension backend
- Admin APIs
- Rate limiting and usage tracking

**Port**: 8000  
**Deploy model**: VPS blue/green swap (GHA → Docker image → scp → load → health check)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Python 3.11+ |
| Framework | FastAPI (async) |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Search engine | OpenSearch 2.19.5 (FAISS scalar quantization) |
| Cache / rate-limit | Redis 7 |
| Database | PostgreSQL 15 |
| Embeddings | Fireworks AI — Qwen3 4096-dimensional embeddings |
| Reranker | Fireworks AI — Qwen3 reranker |

---

## 3. Key API Endpoints

### Public Search

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/search` | Hybrid search (BM25 + vector) |
| GET | `/api/v1/autocomplete` | Autocomplete suggestions |
| POST | `/api/v1/search/track-click` | Click tracking for personalization |

### SaaS Management

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/saas/indices` | Create a search index |
| POST | `/api/v1/saas/indices/{index}/documents` | Upload/upsert documents |
| POST | `/api/v1/saas/products/bulk` | Bulk product upload |
| GET | `/api/v1/saas/api-keys` | List API keys |
| POST | `/api/v1/saas/api-keys` | Create API key |
| GET | `/api/v1/saas/usage` | Usage statistics |

### Billing

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/billing/checkout/public` | Initiate Polar.sh checkout |
| POST | `/api/v1/billing/subscription` | Manage subscription |
| POST | `/api/v1/billing/cancel` | Cancel subscription |
| POST | `/api/v1/billing/webhooks/polar` | Polar.sh webhook receiver |

### Import

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/import/from-url` | Import products from URL |
| POST | `/api/v1/import/csv` | Import from CSV |
| GET | `/api/v1/import/{job_id}` | Check import job status |

### Salla Integration

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/salla/oauth/authorize` | Initiate OAuth flow |
| GET | `/v1/salla/oauth/callback` | Handle OAuth callback |
| POST | `/v1/salla/webhook` | Receive Salla webhooks |
| POST | `/v1/salla/sync/products` | Manual bulk product sync |
| GET | `/v1/salla/store/info` | Store info + stats |
| POST | `/v1/salla/widget/config` | Widget configuration |

### Shopify Integration

| Method | Path | Purpose |
|--------|------|---------|
| — | `/v1/shopify/widget/config` | Widget configuration |
| — | `/v1/shopify/widget/sync` | Product sync |
| — | `/v1/shopify/oauth/callback` | OAuth callback |

### Admin

| Method | Path | Purpose |
|--------|------|---------|
| — | `/api/v1/admin/billing/clients` | Manage billing clients |

---

## 4. Multi-Tenancy

- **Index isolation**: Each client gets its own OpenSearch index: `client_{uuid}_{index_name}`
- **API key format**: `prefix.suffix`
  - **Prefix** (8 characters): Safe for frontend use, grants search-only access
  - **Full key** (prefix + suffix): Backend use, grants full CRUD access
- Rate limiting is Redis-based sliding window, enforced per subscription tier

---

## 5. Search Features

| Feature | Details |
|---------|---------|
| Hybrid search | BM25 (lexical) + vector (semantic) combined scoring |
| AI reranking | Fireworks Qwen3 reranker (Growth+ tier only) |
| Relevance threshold | 0.15 minimum score cutoff |
| Title stratification | Title matches boosted above body matches |
| Recency boost | Newer documents receive a score bonus |
| Personalization | User-specific signals from click tracking history |
| Click tracking | `POST /api/v1/search/track-click` feeds personalization |
| Query reformulation | LLM-powered query expansion (feature-flagged) |

---

## 6. Billing

### Integration

Billing is handled via **Polar.sh**. The checkout flow:
1. Frontend POSTs to `/api/v1/billing/checkout/public` with selected tier
2. Backend creates Polar checkout session → returns redirect URL
3. User completes payment on Polar.sh hosted checkout
4. Polar webhook (`/api/v1/billing/webhooks/polar`) fires → backend provisions account

### Tier Configuration

| Tier | Price | Duration |
|------|-------|----------|
| Growth | $99/mo | Ongoing |
| Scale | $349/mo | Ongoing |
| Enterprise | Custom | Custom |

No free tier, no free trial. API access is blocked (402) until subscription is active.

### Dunning

- **7-day grace period** after payment failure before access is suspended

### Annual Discount

- 2 months free (Growth: $990/yr, Scale: $3,490/yr)

### Environment Variables

```
POLAR_ACCESS_TOKEN=...
POLAR_ORGANIZATION_ID=...
POLAR_WEBHOOK_SECRET=...
POLAR_GROWTH_MONTHLY_PRODUCT_ID=...
POLAR_GROWTH_ANNUAL_PRODUCT_ID=...
POLAR_SCALE_MONTHLY_PRODUCT_ID=...
POLAR_SCALE_ANNUAL_PRODUCT_ID=...
```

---

## 7. Salla Integration

### Flow

1. Merchant installs from Salla App Store → `GET /v1/salla/oauth/authorize`
2. OAuth callback creates merchant account + search index + API key
3. Initial bulk product sync triggered
4. Widget loader JS auto-injected into merchant's storefront
5. Real-time updates via webhooks

### Webhooks Handled

| Event | Action |
|-------|--------|
| `app.store.authorize` | Initial setup + bulk sync |
| `product.created` | Index new product |
| `product.updated` | Re-index product |
| `product.deleted` | Remove from index |
| `app.uninstalled` | Cleanup merchant data |

### Environment Variables

```
SALLA_CLIENT_ID=...
SALLA_CLIENT_SECRET=...
SALLA_WEBHOOK_SECRET=...
```

---

## 8. Local Development

Start the full stack:

```bash
make dev-start
```

This runs `docker-compose.dev.yml` with:

| Service | Port |
|---------|------|
| PostgreSQL | 5432 |
| Redis | 6379 |
| OpenSearch | 9200 |
| skawr-indexer | 8000 |

### Restore Production Data Subset

```bash
python scripts/r2_restore.py
```

Pulls a subset of production data from R2 for local testing.

---

## 9. Deploy

```
Push to main → GHA builds Docker image → scp to VPS → blue/green swap → health check
```

The deploy process:
1. Push to `main` triggers GitHub Actions workflow
2. Docker image is built and exported as tarball
3. Tarball is `scp`'d to VPS
4. `docker load` imports the new image
5. Blue/green container swap (new container starts, old stops)
6. Health check verifies the new container is responding

---

## 10. Key Configuration

Feature flags and service config controlled via environment variables:

| Variable | Purpose |
|----------|---------|
| `EMBEDDINGS_ENABLED` | Toggle vector embedding generation on indexing |
| `RERANKER_ENABLED` | Toggle AI reranking in search results |
| `FIREWORKS_API_KEY` | Fireworks AI API authentication |
| `BILLING_ENABLED` | Toggle billing/checkout flows |
| `SENTRY_DSN` | Error tracking (Sentry/GlitchTip) |
| `ENABLE_RATE_LIMITING` | Toggle Redis-based rate limiting |
| `ENABLE_USAGE_TRACKING` | Toggle per-client usage metering |

---

## 11. Onboarding widgets and SkawrBot (Pro+ features)

The pricing page advertises three embeddable storefront widgets, gated to the
Pro and Scale tiers (Growth is denied 403):

| Widget | Backend | Serving |
|--------|---------|---------|
| Skawr Bar | `app/api/skawrbar_routes.py` (`/api/v1/skawrbar/*`) | `app/static/skawrbar.js` |
| Skawr Search Widget | Salla loader `/v1/salla/widget/loader.js` + config; Shopify config | CDN bundle `cdn.skawr.com/widget/v1/skawr-widget.js` |
| SkawrBot | `app/api/skawrbot_routes.py` (`/api/v1/skawrbot/config`, `/api/v1/skawrbot/message`) | `app/static/skawrbot.js` |

**SkawrBot** is a simple, static Q&A assistant (not an LLM). `/message` answers
from, in priority order: merchant-configured custom FAQ pairs, a built-in FAQ set
(shipping, returns, etc., with per-topic overrides), and a best-effort product
search on product-intent messages. Config is stored on the client and edited via
`/config`. All three widget route groups enforce the Pro+ tier gate directly.

## 12. Recent hardening (2026-07, pricing-feature E2E pass)

End-to-end validation of every pricing-page feature landed these fixes (PR #333):

- **Personalization** now captures anonymous shoppers' clicks: `POST /api/v1/search/track-click`
  accepts `anonymous_id` and resolves docs from the search index (not the SQL Product
  table), so ranking reflects prior clicks for unauthenticated shoppers.
- **Skawr Bar** tier gate is enforced (was previously usable by Growth).
- **Search** reconciles `total_results`/`total_pages` on the hybrid/reranked path
  (the semantic path previously reported 0 while returning hits).
- **SaaS create-index** accepts a `schema_definition.embedding` config
  (`{"embedding":{"enabled":true,"text_fields":[...]}}`) to auto-generate Qwen3
  doc vectors on upload.

## 13. Local dev flow (updated)

- `docker-compose.dev.yml` boots with embeddings/reranker OFF by default (no
  Fireworks key needed) — embedding-service construction is gated on
  `EMBEDDINGS_ENABLED` in both the DI container and `ElasticsearchSearchService`.
- To run the full hybrid stack locally, drop a gitignored `.env` next to the
  compose file with `EMBEDDINGS_ENABLED=true`, `RERANKER_ENABLED=true`,
  `FIREWORKS_API_KEY=...`. For billing/checkout, add `BILLING_ENABLED=true` and
  the `POLAR_*` vars (access token, org id, webhook secret, and the 6 tier product
  IDs). The compose injects this via an optional `env_file` (PR #334).
- `requirements-minimal.txt` (Dockerfile.local) must keep its httpx/pydantic pins
  aligned with `requirements.txt`, or polar-sdk fails pip resolution.
- **Caveat**: local OpenSearch is 2.11 vs prod 2.19.5. Filtered kNN can throw
  `failed to create query: Rewrite first` locally, so vector-hit semantic queries
  may return empty on a dev box. This is a local version artifact, not a bug.

## 14. Widget production-hardening (PR #338)

Skawr Bar + SkawrBot were hardened for real merchant-domain embedding:

- **Public CORS**: `app/middleware/public_cors.py` (`PublicWidgetCORSMiddleware`)
  reflects any Origin, credential-less, for ONLY the public widget endpoints
  (`/api/v1/skawrbar/active`, `/api/v1/skawrbot/config`, `/api/v1/skawrbot/message`)
  plus public search (`/api/v1/search`, `/api/v1/autocomplete`). Every other path
  keeps the strict skawr.com allowlist + credentialed CORS. Path predicate lives
  in `auth_exemptions.is_public_widget_cors_path`.
- **Entitlement gate**: `app/api/widget_gating.py` (`ensure_widget_entitlement`)
  gates both widgets on tier AND `subscription_status` (active, or cancelled/grace
  within period), mirroring the quota layer. A churned Pro/Scale customer's widgets
  stop rendering (non-200 → the JS silently hides them). No storefront disruption.
- **Rate limit**: `POST /api/v1/skawrbot/message` is per-key + per-IP limited
  (`SKAWRBOT_MESSAGE_RATE_PER_MINUTE`, default 30/min, Redis fixed-window, fails open).
- **FAQ bulk load**: `PUT /api/v1/skawrbot/faqs` (replace/append, caps 200 pairs).
  Merchants manage FAQ from the client dashboard (skawr-dashboards PR #35).
- **Browser key**: widgets MUST use a public `pk_` key (never a secret key).
  Multi-store clients pass `store_id` when minting.
- **Widget JS**: `skawrbar.js`/`skawrbot.js` now derive API base from the script
  origin (prod/staging/local), support RTL/Arabic layout, and SkawrBot honors
  `theme_color` + `position` (bottom-right/bottom-left).
- **Dashboard**: SkawrBot now has a full client-dashboard page (config, FAQ
  management + bulk load, live preview, pk_ embed snippet) — skawr-dashboards PR #35.
