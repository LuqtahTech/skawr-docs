# Skawr Tech Stack

> Last updated: July 2026

---

## Public Stack

The "built with" list — what we show on `/stack` and in marketing materials.

### Search & AI
- OpenSearch (hybrid BM25 + vector search)
- Fireworks AI (embeddings & reranking)
- Python / FastAPI

### Frontend
- Next.js / React
- TypeScript
- Tailwind CSS

### Infrastructure
- Docker
- Traefik (reverse proxy + TLS)
- PostgreSQL
- Redis
- GitHub Actions (CI/CD)
- AWS Amplify (static hosting)
- GoDaddy + Route 53 (DNS)

### Identity
- Zitadel (OIDC)

### Integrations
- Salla
- Shopify
- Polar.sh (billing)

### Analytics
- Skawr Analytics (own product)

### SDKs
- JavaScript / TypeScript (browser + Node.js)
- React
- Python
- Flutter / Dart

---

## Detailed Internal Stack

Full reference with versions, providers, and operational details.

### Infrastructure & Hosting

| Component | Details |
|-----------|---------|
| VPS | Contabo (single node, 173.212.246.10, ~$25–30/mo) |
| Reverse Proxy | Traefik v2.11 (TLS via Let's Encrypt, blue/green health-check routing) |
| Containers | Docker Compose (`restart: unless-stopped`) |
| CI/CD | GitHub Actions (build → scp tarball → docker load → blue/green swap) |
| Static Hosting | AWS Amplify (`skawr-web` at skawr.com) |
| DNS | GoDaddy (domain registration) + Route 53 (DNS hosting/CDN routing) |
| Backups | Cloudflare R2 (OpenSearch index backups as gzipped ndjson) |

### Backend Services

| Component | Details |
|-----------|---------|
| Language | Python 3.11+ (indexer), Python 3.12 (analytics, login) |
| Framework | FastAPI (async, uvicorn) |
| ORM | SQLAlchemy 2.0 (async) + Alembic (migrations) |
| Task Scheduling | APScheduler / BackgroundTasks (billing tasks) |
| Rate Limiting | SlowAPI + Redis sliding window |
| Structured Logging | python-json-logger |
| Error Tracking | Sentry SDK → GlitchTip (self-hosted at errors.ziyad.one) |

### Databases & Storage

| Component | Details |
|-----------|---------|
| Primary DB | PostgreSQL 15 (shared: events, auth, billing, search metadata) |
| Search Engine | OpenSearch 2.19.5 (FAISS scalar quantization, kNN vectors) |
| Cache | Redis 7 (sessions, rate limits, query cache) |
| Object Storage | Cloudflare R2 (backups) |
| File Storage | Docker volumes (local to VPS) |

### AI & ML

| Component | Details |
|-----------|---------|
| Embeddings | Fireworks AI API — Qwen3 model (4096-dimensional vectors) |
| Reranker | Fireworks AI API — Qwen3 reranker |
| Query Reformulation | Feature-flagged (Bedrock Titan, not active) |
| Future | Custom Hybrid Transformer-Mamba model (skawr-search-ml, research phase) |

### Frontend

| App | Stack |
|-----|-------|
| skawr-web | Next.js 16, React 19, TypeScript, Tailwind CSS 4, pnpm |
| skawr-analytics | Next.js 16, React 19, TypeScript, custom CSS (NO Tailwind) |
| skawr-dashboards | React 19, Vite, TypeScript, Tailwind, shadcn/ui |
| skawr-login | Jinja2 templates (server-rendered), vanilla JS |

### Auth & Identity

| Component | Details |
|-----------|---------|
| IdP | Zitadel (self-hosted at id.skawr.com) — OIDC, Login v2 |
| Login UI | skawr-login (Python FastAPI BFF at login.skawr.com) |
| Legacy | skawr-auth library (JWT, being phased out) |
| Marketplace Auth | Supabase (skawr-web only) |

### Billing & Payments

| Component | Details |
|-----------|---------|
| Provider | Polar.sh (subscriptions, checkout, webhooks) |
| Trials | 14-day, no CC (custom implementation) |
| Dunning | 7-day grace period (custom) |
| Future | Stripe (post US LLC formation) |

### Analytics & Monitoring

| Component | Details |
|-----------|---------|
| Product Analytics | Skawr Analytics (own product, self-hosted) |
| Web Analytics | Umami (self-hosted at umami.ziyad.one) |
| Error Tracking | GlitchTip (Sentry-compatible, self-hosted) |
| Uptime | ⚠️ None currently (gap) |

### E-commerce Integrations

| Platform | Integration Method |
|----------|-------------------|
| Salla | OAuth 2.0 + webhooks + widget injection |
| Shopify | Theme app extension + OAuth + CloudFront widget delivery |
| Future | WooCommerce, Zid |

### SDKs Published

| Package | Registry | Target |
|---------|----------|--------|
| `@skawr/search` | npm | Browser search SDK |
| `@skawr/analytics-react` | npm | React analytics |
| `@skawr/analytics-web` | npm | Browser analytics |
| `@skawr/analytics-node` | npm | Server analytics |
| `skawr-analytics` | PyPI | Python analytics |
| `skawr_analytics` | pub.dev | Flutter/Dart analytics |

### Scraping

| Component | Details |
|-----------|---------|
| Framework | Scrapy (Python) |
| Scheduling | System cron (`/etc/cron.d/skawr-*`) |
| Sources | Haraj (10min), Aqar (10min), Dubizzle (30min), OpenSooq (30min) |

### Design System

| Component | Details |
|-----------|---------|
| Tokens | `@skawr/design` (CSS vars + JS + Tailwind preset) |
| Fonts | Plus Jakarta Sans, Space Grotesk, JetBrains Mono |
| Icons | lucide-react |
| Components | shadcn/ui (dashboards), custom (analytics, login) |

---

## Future AWS Stack

Planned migration post-revenue. Target: fully managed, auto-scaling infrastructure.

### Compute

| Component | Details |
|-----------|---------|
| Application | ECS Fargate (1vCPU/2GB per service) |
| Scheduled/Event | Lambda (scheduled tasks, webhook processing) |

### Database

| Component | Details |
|-----------|---------|
| Relational | RDS PostgreSQL (Multi-AZ) |
| Search | Amazon OpenSearch Service (t3.small → r6g.large scaling) |
| Cache | ElastiCache Redis |

### Networking

| Component | Details |
|-----------|---------|
| Load Balancer | ALB (Application Load Balancer) |
| DNS | Route 53 |
| CDN | CloudFront (widget delivery) |
| Network | VPC with private subnets |

### CI/CD

| Component | Details |
|-----------|---------|
| Pipeline | CodePipeline + CodeBuild (or keep GitHub Actions → ECR push) |
| Registry | ECR (container registry) |

### Monitoring

| Component | Details |
|-----------|---------|
| Logs & Metrics | CloudWatch Logs + Metrics + Alarms |
| Tracing | X-Ray (distributed tracing) |

### Security

| Component | Details |
|-----------|---------|
| Secrets | Secrets Manager |
| Firewall | WAF (web application firewall) |
| Access | IAM roles (least privilege) |

### Email

| Component | Details |
|-----------|---------|
| Transactional | SES (dunning, welcome, alerts) |

### Billing

| Component | Details |
|-----------|---------|
| Provider | Stripe (replacing Polar.sh — lower fees at scale) |

### Data

| Component | Details |
|-----------|---------|
| Analytics Read Path | ClickHouse (future) |
| Storage | S3 (backups, exports, static assets) |

### Estimated Cost

~$180–200/mo baseline (breakeven at ~3 Growth clients).

---

## Migration Triggers

When to move from VPS → AWS:

| Trigger | Threshold | Rationale |
|---------|-----------|-----------|
| Revenue | ≥3 Growth clients (~$600/mo ARR) | Covers AWS baseline cost |
| Availability needs | First SLA commitment to a client | Single VPS has no failover |
| Traffic | Sustained >50 req/s to search API | Single node saturates at ~80 req/s |
| Compliance | Client requires SOC 2 / data residency | AWS provides compliance controls |
| Team size | >1 engineer deploying regularly | Blue/green on VPS doesn't scale for concurrent deploys |
| Uptime SLA | Contractual 99.9%+ guarantee | Requires Multi-AZ, health checks, auto-recovery |
| Geographic expansion | Users outside MENA needing <200ms latency | Need multi-region or edge deployment |

### Migration Order (recommended)

1. **Database first** — RDS PostgreSQL + ElastiCache Redis (most fragile on VPS)
2. **Search engine** — Amazon OpenSearch Service (largest resource consumer)
3. **Application services** — ECS Fargate (indexer, analytics, login)
4. **DNS cutover** — Route 53 (final step, enables rollback to VPS)

### What stays regardless

- AWS Amplify for `skawr-web` (already there)
- Route 53 for DNS (already there)
- GitHub Actions for CI (portable, works with ECR push)
- Fireworks AI API for embeddings (external API, infrastructure-agnostic)
