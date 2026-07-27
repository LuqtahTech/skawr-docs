# Skawr Platform Overview

A guide to the Skawr ecosystem for co-founders, team members, and new hires.
Covers what we build, how it fits together, and where things stand.

---

## What is Skawr?

Skawr (سكور — Arabic for "to scour/search") is a Saudi/MENA tech company building three interconnected products under the **LuqtahTech** organization:

1. **Skawr Marketplace** — A consumer search engine that aggregates listings from Saudi marketplaces (Haraj, Aqar, Dubizzle, OpenSooq) into one search experience.
2. **Skawr Search SaaS** — A B2B product that gives e-commerce merchants AI-powered search for their own stores. Includes a native Salla extension.
3. **Skawr Analytics** — A MENA-first product analytics platform (like Amplitude/Mixpanel but with Arabic UI, local pricing, and smarter insights).

---

## How It All Fits Together

```
┌─────────────────────────────────────────────────────────────────┐
│                        SKAWR PRODUCTS                            │
├─────────────────┬────────────────────┬──────────────────────────┤
│                 │                    │                          │
│  MARKETPLACE    │    SEARCH SaaS     │      ANALYTICS           │
│  (skawr.com)   │  (skawr.com/saas)  │  (analytics.skawr.com)   │
│                 │                    │                          │
│  Consumers      │  Salla merchants   │  Product teams           │
│  search Saudi   │  & e-commerce      │  track user behavior,    │
│  marketplaces   │  stores get AI     │  funnels, retention,     │
│  in one place   │  search for their  │  cohorts, and get        │
│                 │  own products      │  auto-generated insights │
└────────┬────────┴─────────┬──────────┴────────────┬─────────────┘
         │                  │                       │
         ▼                  ▼                       ▼
┌─────────────────────────────────┐    ┌──────────────────────────┐
│     SHARED INFRASTRUCTURE       │    │    ANALYTICS BACKEND     │
│                                 │    │                          │
│  • OpenSearch (search engine)   │    │  • PostgreSQL (events)   │
│  • PostgreSQL (metadata)        │    │  • FastAPI               │
│  • Redis (cache/rate-limits)    │    │  • Insight detection     │
│  • Fireworks AI (embeddings)    │    │  • 5 published SDKs      │
│  • Scrapers (marketplace data)  │    │                          │
└─────────────────────────────────┘    └──────────────────────────┘
```

---

## Product 1: Skawr Marketplace

### What it does
- Users visit `skawr.com` and search across multiple Saudi marketplaces simultaneously
- Results come from Haraj, Aqar, Dubizzle, OpenSooq, and Mstaml — all in one search
- AI-powered: understands Arabic queries, handles typos, semantic meaning (not just keywords)

### How it works
1. **Scrapers** run every 10–30 minutes, pulling new listings from each marketplace
2. Listings are stored in PostgreSQL and indexed into **OpenSearch** (our search engine)
3. Each listing gets an AI-generated **embedding** (a numerical representation of its meaning) so we can do smart matching
4. When a user searches, we combine keyword matching + AI similarity to rank results

### Current status
- Live at `skawr.com`
- Serving real-time results from 4 Saudi marketplaces
- Data refreshes every 10–30 minutes depending on the source

### Team note
The iOS app ("Skawr Marketplace") has been removed from the App Store and is no longer active.

---

## Product 2: Skawr Search SaaS

### What it does
A search-as-a-service platform for e-commerce merchants. They integrate our search into their store and get:
- AI-powered hybrid search (keyword + semantic)
- Arabic language understanding (morphology, dialect tolerance, typo correction)
- Real-time product sync via webhooks
- Search analytics (what customers search for, what converts)

### Two ways merchants use it

**Option A: Salla Extension (zero-code)**
- Merchant installs "Skawr AI Search" from the Salla App Store
- OAuth authorization → products auto-sync → search widget auto-appears
- No code editing, no theme changes. Install and done.
- Pricing: Free (500 products, 1K searches/mo) or Pro (SAR 99/mo, unlimited)

**Option B: Shopify Extension (zero-code)**
- Merchant installs the Skawr app from Shopify
- Enables the "Skawr Search" app embed in Theme Settings
- Widget automatically intercepts the store's native search and returns AI results
- Products auto-sync on first load
- Configurable: color, position, placeholder text, results count
- Fully working with dark mode + responsive design

**Option C: API Integration (developers)**
- Merchant signs up, gets an API key
- Uses our SDK to upload products and call search
- Full control over the search UI
- Pricing: Starter $29 → Growth $99 → Scale $349 (see pricing doc)

### How it works (simplified)
```
Merchant's store                    Skawr
─────────────────                   ─────
                                    
1. Products sync ──────────────►  Index in OpenSearch
   (webhook or bulk upload)         (per-client isolation)
                                    
2. Customer types search ──────►  AI processes query
                                  (Arabic NLP + embeddings)
                                    
3. Results returned ◄──────────   Ranked by relevance
                                  (BM25 + vector similarity)
```

### The Salla integration flow
```
Merchant clicks "Install" in Salla App Store
         │
         ▼
OAuth authorization (merchant approves permissions)
         │
         ▼
Our backend: creates account + search index + API key
         │
         ▼
Initial product sync (pulls all products from Salla API)
         │
         ▼
Widget auto-injected into merchant's store
         │
         ▼
Real-time sync: new/updated/deleted products via webhooks
```

### Current status
- Backend fully implemented (search API, multi-tenant isolation, Salla webhooks)
- Admin + client dashboards built
- Salla app manifest ready
- **Not yet submitted** to Salla App Store for review — this is the fastest path to first B2B revenue
- Running on VPS (will migrate to AWS once we have paying clients)

### Our edge vs competitors (Algolia, Meilisearch, Typesense)
- **Arabic-first**: Deep Arabic NLP that competitors don't have
- **Salla-native**: No competitor integrates with Salla at all
- **Live market intelligence**: We already run search across Saudi marketplaces — that's domain expertise competitors can't replicate quickly
- **Simpler pricing**: No per-record + per-search double billing like Algolia

---

## Product 3: Skawr Analytics

### What it does
Product analytics for web and mobile apps. Same category as Amplitude, Mixpanel, PostHog. Customers drop a tracking SDK into their app, events flow in, and they get:
- Funnels (multi-step conversion analysis)
- Retention curves (do users come back?)
- Cohorts (group users by behavior)
- Dashboards (custom charts and KPIs)
- **Smart insights** (anomaly detection, funnel drop alerts — automatically, no setup)

### What makes us different

| Us | Amplitude/Mixpanel |
|----|--------------------|
| Insights push to you (home screen feed) | You have to go looking for insights |
| Arabic UI, RTL design | No Arabic, no MENA presence |
| SAR/AED pricing, Mada/Tabby payment (planned) | USD only, cards only |
| Event-volume pricing ("never get punished for growing") | MTU pricing (punishes retention) |
| MENA data residency (planned) | No MENA region |
| AI-discovers user behavioral patterns | Only finds patterns you manually define |

### How it works
```
Customer's app                      Skawr Analytics
──────────────                      ───────────────

1. SDK sends events ───────────►  Validate API key
   (pageviews, clicks,              Enrich (device, location, UTM)
    custom events)                  Compute session
                                   Store in PostgreSQL
                                    
2. Dashboard queries ◄──────────  SQL aggregates on events table
   (funnels, retention,             Real-time computation
    cohorts, insights)              Statistical anomaly detection
```

### SDKs available
- **Web** (vanilla JavaScript) — auto-captures pageviews, clicks, forms
- **React** (Next.js/React) — provider + hooks. Auto-captures pageviews by default; click, form, and error capture are opt-in (default off) for privacy as of 0.7.0, enabled per stream
- **Node.js** (server-side) — backend event tracking
- **Python** — sync + async clients
- **Flutter/Dart** — mobile apps

### Current status
- **Live and functional** at `analytics.skawr.com`
- Full event ingestion with enrichment (device, location, UTM parsing)
- Working funnels, retention, cohorts, dashboards, event rules, insights
- 5 SDKs published and usable
- Revenue tracking + multi-touch attribution
- Error tracking (Sentry integration)
- English + Arabic language support

### Not yet built
- Embeddings-based behavioral clustering (vision feature)
- AI event-shape discovery (vision feature)
- Hijri calendar / Ramadan-aware time periods
- Local payment integration
- MENA data residency
- Session replay
- A/B testing
- Peer benchmarks

---

## Infrastructure & Hosting

### Current setup (VPS-first)

Everything runs on a single **Contabo VPS** in Germany (€26–40/month total). This keeps costs near-zero while we find product-market fit.

```
┌────────────────────────── VPS (173.212.246.10) ──────────────────────────┐
│                                                                          │
│  ┌─────────┐     ┌──────────────┐     ┌──────────────────────┐         │
│  │ Traefik │────►│   Services   │     │     Databases         │         │
│  │ (proxy) │     │              │     │                      │         │
│  │ + TLS   │     │ • Indexer    │────►│ • PostgreSQL         │         │
│  └─────────┘     │ • Analytics  │     │ • OpenSearch         │         │
│       │          │ • Dashboards │     │ • Redis              │         │
│       │          └──────────────┘     └──────────────────────┘         │
│       │                                                                  │
│       ├── analytics.skawr.com → Analytics frontend                      │
│       ├── analytics-api.skawr.com → Analytics backend                   │
│       └── api.skawr.com → Search indexer API                            │
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │ Scrapers (cron)  │  Haraj (10min), Aqar (10min),                    │
│  │                  │  Dubizzle (30min), OpenSooq (30min)              │
│  └──────────────────┘                                                   │
└──────────────────────────────────────────────────────────────────────────┘

┌─── AWS Amplify ───┐
│ skawr.com         │  (marketplace frontend)
│ landing page      │  (marketing site)
└───────────────────┘
```

### Future setup (AWS)
Terraform infrastructure is written and ready. We'll switch once B2B revenue justifies the ~$180/month baseline cost. Gives us:
- Auto-scaling
- Better uptime guarantees (SLA for clients)
- MENA data residency option (AWS Bahrain region)

---

## Team & Roles

| Person | Role | Owns |
|--------|------|------|
| **You** (smsaleh) | Co-founder, product + business | Strategy, pricing, sales, product direction |
| **Ziyad** | Backend engineer | skawr-indexer, skawr-ai, model-service, infrastructure, deployment |

---

## Pricing Summary

### Search SaaS

| Tier | Price | Products | Searches/mo | Key features |
|------|-------|----------|-------------|--------------|
| Trial | Free (14 days) | 5,000 | 50,000 | Full access, no credit card |
| Starter | $29/mo (109 ر.س) | 5,000 | 50,000 | Arabic NLP, hybrid search, Salla plugin |
| Growth | $99/mo (369 ر.س) | 50,000 | 500,000 | + AI reranking, personalization, full analytics |
| Scale | $349/mo (1,299 ر.س) | 500,000 | 5,000,000 | + SLA, dedicated support, MENA residency |
| Enterprise | Custom | Unlimited | Unlimited | SSO, custom models, dedicated infra |

**Annual billing**: 2 months free.

### Salla Extension

| Tier | Price | Limits |
|------|-------|--------|
| Free | SAR 0 | 500 products, 1,000 searches/mo |
| Pro | SAR 99/mo | Unlimited, + analytics |

### Analytics (future — bundled for now)
Analytics is currently bundled free with the SaaS product as a differentiator vs Algolia. Standalone pricing TBD once there's demand.

---

## Key Decisions (Current)

1. **VPS-first** — Don't pay for AWS until revenue justifies it. Profitable from client #1 on VPS.
2. **No permanent free tier** — 14-day trial instead. Converts or expires.
3. **First clients should be Growth ($99)** — Early adopters get attention, we get sustainable revenue.
4. **Analytics bundled** — It's a differentiator, not a separate product yet.
5. **Salla extension is the fastest path to revenue** — Get it submitted to the App Store.
6. **Product count is the real cost driver** — Not searches. Price tiers accordingly.

---

## What's Next (Priority Order)

1. **Submit Salla extension** to App Store for review
2. **First B2B client** — likely a Salla merchant via the extension
3. **Harden VPS** for production use (monitoring, backups)
4. **Analytics standalone positioning** — once we have analytics customers separate from search
5. **AWS migration** — when we have 3+ paying clients
6. **MENA-specific features** — Hijri calendar, Arabic docs, local payment

---

## Glossary

| Term | Meaning |
|------|---------|
| **OpenSearch** | Our search engine (like Elasticsearch). Stores products and serves search queries. |
| **Embeddings** | AI-generated numerical representations of text. Lets us match by meaning, not just keywords. |
| **Hybrid search** | Combining keyword matching (BM25) with AI similarity (vector search) for better results. |
| **Salla** | Saudi Arabia's leading e-commerce platform (like Shopify for MENA). |
| **Fireworks AI** | Third-party API we use to generate embeddings cheaply (~$0.02 per 1,000 products). |
| **Multi-tenant** | Multiple clients sharing one infrastructure with isolated data (each client only sees their own). |
| **SDK** | Software Development Kit — code libraries customers drop into their app to send us data. |
| **MTU** | Monthly Tracked Users — how Amplitude/Mixpanel price (penalizes growth). We don't do this. |
| **VPS** | Virtual Private Server — our current hosting ($26–40/mo vs $180+/mo on AWS). |
| **Traefik** | Reverse proxy that routes traffic to the right service based on domain name. |
| **FastAPI** | Python web framework used for all our backend APIs. |
| **Next.js** | React framework used for our web frontends (marketplace + analytics dashboard). |
| **Terraform** | Infrastructure-as-code tool. Our AWS setup is written in Terraform, ready to deploy. |
