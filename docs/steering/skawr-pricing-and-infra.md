# Skawr Pricing & Infrastructure Reference

Canonical reference for AI agents making code changes that touch pricing, billing, infrastructure, or tier logic.

---

## 1. Search Plugin Pricing (with Bundled Analytics)

Analytics is bundled into the Search Plugin — no separate analytics billing.

| Tier | Price | Products | Searches/mo | Notes |
|------|-------|----------|-------------|-------|
| Trial | $0 (14 days) | 5,000 | 50,000 | No credit card. Hard-cut on expiry. |
| Growth | $99/mo | 50,000 | 500,000 | Search + Funnel analytics |
| Scale | $349/mo | 500,000 | 5,000,000 | Full analytics + export |
| Enterprise | Custom | Custom | Custom | Contact sales |

**Key constraints:**
- No permanent free tier — trial only (14 days, then access cut)
- No Starter tier — minimum paid tier is Growth ($99/mo)
- Annual billing: 2 months free → Growth $990/yr, Scale $3,490/yr
- Overage: Growth $0.50/1K extra products, Scale $0.30/1K extra products
- Do NOT add tier recommendation badges ("Most Popular", etc.)

---

## 2. CRO Service Pricing

Project-based, not subscription. All tiers cover the full 4-pillar framework (Traffic → Pricing → Brand → Data).

| Tier | Price | Target | Timeline |
|------|-------|--------|----------|
| Essential | $300/project | Simple sites, single conversion path | 1–2 weeks |
| Commerce | $700/project | Small-medium e-commerce, multiple funnels | 3–4 weeks |
| Performance | $1,200/project | Large brands, substantial experimentation | 6–8 weeks |
| Enterprise | Custom | Large operations (Jarir, Extra, SACO) | Custom |

**Key constraints:**
- Price scales with business complexity, not features
- All tiers get all 4 pillars — difference is scope of experimentation
- CRO upsells Skawr products (Search Plugin, Analytics) for Commerce/Performance clients
- Do NOT add tier recommendation badges
- Traffic pillar is diagnostic only — we do NOT do marketing/acquisition

---

## 3. Salla App Store Pricing

Separate from core SaaS. Limits enforced independently.

| Tier | Price | Products | Searches/mo |
|------|-------|----------|-------------|
| Free | $0 | 500 | 1,000 |
| Pro | SAR 99/mo | Unlimited | Unlimited |

- Salla extension limits are configurable separately from core SaaS tier limits
- This is the only context where a permanent free tier exists

---

## 4. Infrastructure Strategy

### Current State: Contabo VPS (~$25–30/mo)
- All services on a single VPS
- Docker Compose + Traefik (reverse proxy, TLS via Let's Encrypt)
- `restart: unless-stopped` + health checks
- PostgreSQL handles both write and read paths (events + auth + billing)
- No queue, no separate warehouse
- OpenSearch on internal Docker network (port 9200 NOT public)

### Future State: AWS (planned, not active)
- Migration when revenue justifies ~$180/mo baseline
- Terraform written and ready (`infrastructure/skawr-indexer/`)
- Trigger: 2+ Growth clients or equivalent revenue
- ClickHouse planned for read-path migration (schema must remain portable)

### Rules for Infrastructure Code
- Keep Postgres as the single data store for now
- Avoid Postgres-specific types — must remain portable to ClickHouse
- Health check endpoints: `/health` (backend) and `/api/v1/health`
- Docker entrypoint runs `alembic upgrade head` before uvicorn
- Migrations must be idempotent (safe to re-run)

---

## 5. OpenSearch Scaling Thresholds

| Total Products (all clients) | Node Class | Trigger |
|------------------------------|-----------|---------|
| < 200K | t3.small.search (2 GB) | Baseline |
| 200K–1M | t3.medium.search (4 GB) | Index > 15 GB or p99 > 500 ms |
| 1M–5M | r6g.large.search (16 GB) | JVM pressure > 80% |
| 5M+ | Multi-node cluster | Enterprise territory |

### Index Size Estimates
- 10K products ≈ 20–40 MB
- 50K products ≈ 100–200 MB
- 200K products ≈ 400–800 MB

### Monitoring Alarm Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| JVM memory pressure | > 75% | > 85% (upgrade immediately) |
| Search p99 latency | > 500 ms | — (investigate) |
| Disk usage | > 80% | Increase volume |
| CPU sustained | > 70% | Scale out |

---

## 6. Embedding Costs

- Provider: Fireworks AI
- Model: Qwen3 (4096-dimensional vectors)
- Cost: ~$4 per 1M tokens
- Embedding is one-time per product (re-embed only on update)
- 50K products ≈ $1.00 total embedding cost
- Monthly re-embedding (5% catalog churn) is negligible — do not meter separately
- `EMBEDDINGS_ENABLED` flag controls whether indexing generates embeddings

---

## 7. Key Rules for Code Changes

1. **Product count is the cost driver, not search volume** — quota logic and tier upgrades gate on indexed product count
2. **No permanent free tier** — trial expiry logic must hard-cut access after 14 days
3. **No tier recommendation badges** — do not visually highlight any tier as "recommended" or "most popular"
4. **CRO upsells Skawr products** — recommend Search Plugin and Analytics as add-ons for Commerce/Performance clients
5. **Analytics is bundled** — no separate billing logic for analytics
6. **Single-client 200K+ products** triggers dedicated infrastructure consideration — surface as an alert
7. **Salla has its own pricing** — keep Salla extension limits configurable separately from core tier limits
8. **Annual billing** gives 2 months free — billing code must support monthly and annual cycles

---

## 8. Pricing Page Structure

> IA update (2026): home = business hub; marketplace at /marketplaces; search product at /search (was /saas). Old paths 301-redirect.

| URL | Purpose | CTA Destination |
|-----|---------|-----------------|
| `/search/pricing` | Search Plugin pricing | Polar.sh checkout flow |
| `/cro/pricing` | CRO service pricing | cal.com/skawr booking links |
| `/pricing` | Marketplace price comparison tool | Consumer feature, NOT billing |

- No unified pricing page combining search + CRO
- Navbar pricing link is context-dependent:
  - On search/SaaS pages → `/search/pricing`
  - On CRO pages → `/cro/pricing`
- "Get Started" CTAs go to `/search/pricing`, NOT `/search/import`

---

## 9. Billing Integration

### Provider: Polar.sh

Handles SaaS subscriptions (Search Plugin).

### Checkout Flow
1. User selects tier on `/search/pricing`
2. Frontend calls `POST /api/v1/billing/checkout/public` on indexer
3. Backend validates request, returns Polar.sh checkout URL
4. User redirected to Polar hosted checkout page
5. On payment success: Polar fires webhook → backend creates `APIClient` with correct tier

### Trials
- Duration: 14 days
- No credit card required
- Hard-cut on expiry (access revoked, not downgraded)

### Dunning
- 7-day grace period on failed payments before access cut

### Annual Pricing
| Tier | Monthly | Annual (2 months free) |
|------|---------|------------------------|
| Growth | $99/mo | $990/yr |
| Scale | $349/mo | $3,490/yr |

### Redirect Security
- Polar redirect URLs validated against trusted domain allowlist
- Dual currency display: USD + SAR
