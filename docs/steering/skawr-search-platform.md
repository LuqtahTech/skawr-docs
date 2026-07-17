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
| — | `/api/v1/admin/billing/provision-trial` | Provision trial for a client |

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
| Trial | $0 | 14 days (hard cutoff) |
| Growth | $99/mo | Ongoing |
| Scale | $349/mo | Ongoing |
| Enterprise | Custom | Custom |

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
| `TRIALS_ENABLED` | Toggle trial provisioning |
| `SENTRY_DSN` | Error tracking (Sentry/GlitchTip) |
| `ENABLE_RATE_LIMITING` | Toggle Redis-based rate limiting |
| `ENABLE_USAGE_TRACKING` | Toggle per-client usage metering |
