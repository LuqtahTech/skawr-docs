# Skawr — Gap Analysis & Body of Work

A full inventory of gaps, missing pieces, and potential projects across all Skawr products. Organized by product, then by priority. Use this to assign work to interns and developers.

**Date**: July 2026
**Based on**: Full codebase analysis of all 6 workspace repos

---

## Product 1: Search SaaS + E-commerce Extensions

### Critical (Revenue-Blocking)

| # | Gap | Description | Effort | Skills needed |
|---|-----|-------------|--------|---------------|
| 1 | **Salla App Store submission** | App is built but not submitted for review. Need screenshots, demo video, Arabic/English description, and to go through Salla's review process. | 2–3 days | Product/business (non-dev) + Ziyad for demo store setup |
| 2 | **Shopify App Store submission** | Same as above but for Shopify. Need a working demo store, screenshots, privacy policy, and app listing copy. | 3–5 days | Product/business + dev for testing |
| 3 | **End-to-end testing (Salla)** | Test the full flow with a real Salla dev store: install → OAuth → product sync → search works → widget renders. Confirm env vars work. | 1–2 days | Backend dev (Ziyad) |
| 4 | **End-to-end testing (Shopify)** | Same for Shopify dev store. Test OAuth → product sync → widget intercepts search → results render correctly. | 1–2 days | Backend dev |
| 5 | **VPS production hardening** | Before first client: UptimeRobot monitoring, daily Postgres backups to S3, OpenSearch snapshots, documented recovery plan. | 1 day | Backend dev |
| 6 | **Salla/Shopify environment variables** | Set actual credentials on VPS (`SALLA_CLIENT_ID/SECRET`, Shopify client secret). Currently placeholder or missing. | 30 min | Backend dev (needs Salla Dev Portal + Shopify Partner account access) |

### High Priority (First 3 Months)

| # | Gap | Description | Effort | Skills needed |
|---|-----|-------------|--------|---------------|
| 7 | **Shopify billing integration** | Shopify apps need to use Shopify's Billing API for recurring charges. Currently no billing enforcement — merchants use it free. Need `shopify.billing` integration for tier limits. | 3–5 days | Backend dev (Python + Shopify API) |
| 8 | **Rate limiting enforcement** | Redis-based rate limiting is defined in code but marked `ENABLE_RATE_LIMITING=false` in production. Need to enable, test, and handle 429 responses gracefully in the widget. | 2–3 days | Backend dev |
| 9 | **Usage tracking & analytics dashboard** | The admin dashboard exists but usage tracking (`ENABLE_USAGE_TRACKING=false`) is disabled. Enable it so you can show clients their search volume, top queries, zero-result queries. | 3–5 days | Backend dev |
| 10 | **SaaS onboarding flow** | No guided onboarding for API clients. Need: signup → API key shown → code snippet → "send your first search" → success confirmation. The dashboard exists but lacks this wizard. | 1 week | Frontend dev (React/Vite) |
| 11 | **Pricing page implementation** | `skawr-landing` has a Pricing component but it needs to reflect the final 3-tier pricing with SAR, link to signup, and handle the 14-day trial logic. | 2–3 days | Frontend dev |
| 12 | **Client-facing search analytics** | The `/v1/salla/analytics/search` endpoint exists but the actual analytics (top queries, zero-results, CTR) needs to be computed and stored. Currently may return placeholder data. | 1 week | Backend dev |
| 13 | **Product sync reliability** | What happens when a Salla/Shopify webhook fails? Need retry logic, dead-letter handling, and an admin view of failed syncs. | 3–5 days | Backend dev |
| 14 | **Multi-language widget** | The Shopify widget only has English locale (`en.default.json`). Need Arabic locale + RTL support in the widget CSS/layout for Saudi merchants. | 2–3 days | Frontend dev + Arabic speaker |

### Medium Priority (3–6 Months)

| # | Gap | Description | Effort | Skills needed |
|---|-----|-------------|--------|---------------|
| 15 | **WooCommerce integration** | The SAAS_MIGRATION_PLAN mentions WooCommerce webhooks but nothing is built. A WooCommerce plugin that syncs products to Skawr would open the WordPress market. | 2–3 weeks | Backend dev + WordPress/PHP |
| 16 | **Zid integration** | Zid is Saudi Arabia's #2 e-commerce platform after Salla. Similar architecture to the Salla extension — OAuth + webhooks + widget. | 2–3 weeks | Backend dev (Python) |
| 17 | **Synonyms & search rules UI** | The backend supports custom synonyms and search rules per index, but there's no UI for merchants to manage them. Needs a settings panel in the client dashboard. | 1 week | Frontend dev (React) |
| 18 | **Search A/B testing** | Let merchants test different search configurations (e.g., vector weight 30% vs 50%) and compare conversion rates. Backend needs experiment framework + analytics. | 2–3 weeks | Full-stack |
| 19 | **Autocomplete/suggestions UI** | The API has `/api/v1/autocomplete` but the Shopify widget only uses full search. Add typeahead suggestions as the user types. | 3–5 days | Frontend dev (JavaScript) |
| 20 | **AI reranking toggle** | Growth tier includes AI reranking but the indexer has it disabled (`RERANKER_ENABLED=false`). Need to enable it conditionally per-client based on their tier, and measure latency impact. | 1 week | Backend dev |
| 21 | **Image search** | The indexer README mentions image search as a future feature. Upload a photo → find similar products. Would differentiate from Algolia. | 3–4 weeks | ML engineer |

---

## Product 2: Skawr Analytics

### Critical

| # | Gap | Description | Effort | Skills needed |
|---|-----|-------------|--------|---------------|
| 22 | **Demo project on signup** | The MVP direction requires a pre-loaded demo project so new users see data immediately. Not implemented — new users see empty states. | 3–5 days | Full-stack (seed data + frontend empty-state handling) |
| 23 | **Time-to-first-event UX** | The onboarding flow (signup → SDK snippet → see first event) needs to be < 5 minutes. Currently no guided wizard after signup. Need: platform detection, copy-paste snippet, real-time "waiting for your first event" indicator. | 1 week | Frontend dev (Next.js) |
| 24 | **Error tracking for production** | Sentry is integrated but `SENTRY_DSN` may not be configured in production. Verify it's actually capturing errors. Set up GlitchTip (self-hosted Sentry) if budget is a concern. | 1 day | Backend dev |

### High Priority

| # | Gap | Description | Effort | Skills needed |
|---|-----|-------------|--------|---------------|
| 25 | **ClickHouse migration** | Events table is in Postgres (works but won't scale past ~10M rows). The schema is designed for portability. Need: ClickHouse setup, dual-write period, read-path migration, verify all analytics queries work. | 3–4 weeks | Backend dev (SQL + ClickHouse) |
| 26 | **User profiles page** | Route `/users/[userId]` exists but needs implementation — show a user's full event timeline, properties, sessions, cohort memberships. | 1 week | Full-stack |
| 27 | **Stickiness & lifecycle (re-enable UI)** | Backend endpoints exist (`/stickiness`, `/lifecycle`). Frontend components exist (`lifecycle-panel.tsx`, `stickiness-panel.tsx`) but were hidden in MVP trim (PR #77). Re-enable and polish. | 2–3 days | Frontend dev |
| 28 | **Paths/journeys UI** | Backend `/api/v1/analytics/paths` works (returns Sankey data). No frontend visualization. Need a Sankey/flow diagram component. | 1 week | Frontend dev (data viz) |
| 29 | **Revenue dashboard UI** | Backend `/api/v1/analytics/revenue` works. No frontend page. Need charts: revenue over time, top events by revenue, top users by revenue, AOV. | 3–5 days | Frontend dev |
| 30 | **Attribution UI** | Backend `/api/v1/analytics/attribution` works (5 models). No frontend. Need: model selector, channel breakdown charts, comparison view. | 1 week | Frontend dev |
| 31 | **Insight actions (re-enable UI)** | Backend has `/insights/hero`, `/insights/feed`, pin/dismiss actions. The home page uses these but the insight panel was trimmed. Re-enable the full insight feed with pin/dismiss/deep-dive. | 3–5 days | Frontend dev |
| 32 | **Event rules UI** | Backend has `/event-rules/` CRUD. No frontend management page. Need: rule builder (match_type + pattern), test-against-recent-events preview, enable/disable toggle. | 1 week | Frontend dev |
| 33 | **Discovered funnels UI** | Backend has `/discovered-funnels/` with promote/dismiss. No frontend. Need: list of AI-suggested funnels, conversion metrics, promote-to-dashboard action. | 3–5 days | Frontend dev |

### Medium Priority (Vision Features)

| # | Gap | Description | Effort | Skills needed |
|---|-----|-------------|--------|---------------|
| 34 | **Embeddings behavioral clustering** | Vision Pillar 2. Encode user event sequences → vector → cluster → surface unusual cohorts. Infra exists (Fireworks). Need: pipeline to compute per-user vectors, HDBSCAN clustering, insight surfacing. | 4–6 weeks | ML engineer + backend dev |
| 35 | **AI-derived event-shape discovery** | Vision Pillar 4. Inspect client's events → propose funnels/cohorts/dashboards. Need: shape detection algorithm, event vocabulary analysis, proposal UI. | 4–6 weeks | ML engineer + full-stack |
| 36 | **Hijri calendar + Ramadan awareness** | Non-negotiable for MENA positioning but not yet built. Need: Hijri date conversion, Ramadan period detection, comparison-period warnings ("this period overlaps Ramadan"). | 2–3 weeks | Full-stack + Arabic/Islamic calendar expertise |
| 37 | **Session replay** | Planned but deferred. Record user sessions (DOM snapshots + events) and tie to analytics events. Massive feature — consider integrating an open-source recorder (rrweb). | 8–12 weeks | Full-stack + significant infra |
| 38 | **A/B testing / experimentation** | Deferred. Feature flag + experiment assignment + statistical significance calculation + results dashboard. | 6–8 weeks | Full-stack |
| 39 | **Peer benchmarks** | Compare a client's metrics to anonymized peers with similar event shapes. Requires multiple clients first. | 4–6 weeks | Backend + data science |
| 40 | **MENA data residency** | Deploy to AWS me-south-1 (Bahrain). Terraform supports it but nothing is deployed there. Need: region-specific deployment, data routing per client. | 2–3 weeks | DevOps/infra |

---

## Product 3: Marketplace Aggregator (skawr.com/marketplaces)

### High Priority

| # | Gap | Description | Effort | Skills needed |
|---|-----|-------------|--------|---------------|
| 41 | **Remove legacy per-request scrapers** | The `main` branch still has TS scraper clients (`lib/integration/`) that run at request time. The `staging` branch uses the indexer only. Promote staging → main and delete the dead code. | 1–2 days | Frontend dev |
| 42 | **Mobile responsiveness** | The marketplace frontend (`skawr-web`) needs mobile QA. Test all pages on mobile viewports, fix layout issues. | 3–5 days | Frontend dev |
| 43 | **SEO optimization** | Add proper meta tags, structured data (JSON-LD for products), sitemap generation, OpenGraph tags for social sharing. Next.js supports all of this but it needs to be implemented per-page. | 1 week | Frontend dev |
| 44 | **Arabic language support** | The marketplace frontend is English-only. Need RTL layout, Arabic translations, language switcher. | 2–3 weeks | Frontend dev + Arabic speaker |
| 45 | **User accounts & saved searches** | Currently using Supabase auth but limited features. Need: save searches, favorites, alerts ("notify me when X appears"), search history. | 2–3 weeks | Full-stack |
| 46 | **Price tracking / price drops** | The scrapers run every 10–30 min. Track price changes over time, alert users when a listing drops in price. | 2–3 weeks | Backend dev + frontend |
| 47 | **Product deduplication** | Same listing appears on multiple marketplaces. Need deduplication logic (title similarity + image similarity + price range). | 2–3 weeks | Backend dev + ML |
| 48 | **Mstaml scraper** | Listed as a supported marketplace but unclear if the scraper is active. Verify and fix if needed. | 3–5 days | Backend dev (Python/Scrapy) |

---

## Cross-Cutting / Infrastructure

| # | Gap | Description | Effort | Skills needed |
|---|-----|-------------|--------|---------------|
| 49 | **Unified auth system** | `skawr-auth` is shared but the analytics product and the SaaS product have separate user tables/sessions. A user signing up for analytics can't use the same account for the SaaS dashboard. Need unified identity. | 2–3 weeks | Backend dev |
| 50 | **CI/CD for all services** | Analytics has GHA deploy. Indexer has GHA deploy. But dashboards (admin/client) are built manually and copied. Need automated build+deploy for dashboard services. | 1 week | DevOps |
| 51 | **Automated testing pipeline** | Both repos have tests (`pytest`, `vitest`) but no CI step that runs them on PR. Add test gates to GitHub Actions. | 2–3 days | DevOps |
| 52 | **Staging environment** | No staging environment exists. Everything goes straight to production. Need at minimum a staging VPS or docker-compose on a second port range. | 1 week | DevOps |
| 53 | **Documentation site update** | `skawr-docs` is outdated static HTML. Needs to reflect current products, APIs, and SDK docs. Consider migrating to a docs framework (Docusaurus, Mintlify, or GitBook). | 1–2 weeks | Technical writer / frontend dev |
| 54 | **API documentation (OpenAPI)** | The indexer has `/docs` (FastAPI auto-generated). The analytics backend has `/docs`. But there's no public-facing, polished API docs site for clients. Need to publish and customize. | 1 week | Technical writer |
| 55 | **Error handling standardization** | Different services return errors in different formats. Need a consistent error response schema across indexer + analytics + SDKs. | 3–5 days | Backend dev |
| 56 | **Logging & observability** | Sentry/GlitchTip for errors. But no centralized logging (e.g., structured logs to a searchable system). On VPS this is fine; on AWS, need CloudWatch or similar. | 1 week | DevOps |
| 57 | **Security audit** | No formal security review has been done. Checklist: API key rotation, rate limiting, CORS policies, SQL injection (SQLAlchemy handles this but verify), HMAC verification on all webhooks, secret rotation. | 1 week | Security-minded dev |
| 58 | **Load testing** | No load tests exist. Before first paying client, need to verify: How many searches/sec can the VPS handle? At what point does OpenSearch lag? What's the max concurrent webhook rate? | 3–5 days | Backend dev |

---

## Marketing & Business (Non-Dev)

| # | Gap | Description | Effort | Skills needed |
|---|-----|-------------|--------|---------------|
| 59 | **Pricing page (skawr.com/search or landing)** | Pricing is decided but not published publicly. Need a designed pricing page with SAR/USD toggle, feature comparison, FAQ. | 3–5 days | Designer + frontend dev |
| 60 | **Competitor comparison content** | The `docs/` folder has great competitive analysis but none of it is public-facing. Turn it into website content: "Skawr vs Algolia", "Skawr vs Meilisearch". | 1 week | Copywriter |
| 61 | **Case study / demo video** | Needed for both Salla and Shopify app store submissions. Record a video showing: install → search working → analytics visible. | 1–2 days | Product/marketing |
| 62 | **Arabic marketing content** | Landing page, docs, and all customer-facing content is English-only. The MENA positioning requires Arabic versions. | 2–3 weeks | Arabic copywriter + frontend |
| 63 | **Privacy policy & terms** | Required for app store submissions (both Salla and Shopify). Need data processing docs, PDPL compliance statement. | 2–3 days | Legal/compliance |
| 64 | **Client onboarding documentation** | Step-by-step guide for a new SaaS client: signup → API key → upload products → test search → go live. Currently only exists as SDK INTEGRATION.md (developer-facing). | 3–5 days | Technical writer |

---

## Intern-Friendly Projects (Self-Contained, Low Risk)

These are good for interns because they're isolated, have clear scope, and won't break production:

| # | Project | Repo | Difficulty | Duration |
|---|---------|------|------------|----------|
| A | **Arabic locale for Shopify widget** | skawr-search/skawr/ | Easy | 2–3 days |
| B | **Landing page Arabic version** | skawr-landing | Easy-Medium | 1 week |
| C | **Documentation site refresh** | skawr-docs | Easy | 1–2 weeks |
| D | **Revenue dashboard frontend** | skawr-analytics/frontend | Medium | 1 week |
| E | **Paths/Sankey visualization** | skawr-analytics/frontend | Medium | 1–2 weeks |
| F | **Event rules management UI** | skawr-analytics/frontend | Medium | 1–2 weeks |
| G | **Search analytics dashboard** | skawr-search/skawr-dashboard-client | Medium | 1–2 weeks |
| H | **Pricing page component** | skawr-landing | Easy-Medium | 3–5 days |
| I | **Mobile responsiveness QA + fixes** | skawr-web | Easy-Medium | 1 week |
| J | **Autocomplete in Shopify widget** | skawr-search/skawr/ | Medium | 3–5 days |
| K | **SEO meta tags + structured data** | skawr-web | Easy-Medium | 1 week |
| L | **Load testing script** | skawr-search/skawr-indexer | Medium | 3–5 days |
| M | **Onboarding wizard (analytics)** | skawr-analytics/frontend | Medium | 1–2 weeks |
| N | **Demo project seed data** | skawr-analytics/backend | Medium | 3–5 days |

---

## Priority Ranking (What to Do First)

### Immediate (This Week)
1. Salla App Store submission (#1)
2. VPS hardening (#5)
3. Environment variables setup (#6)
4. End-to-end Salla testing (#3)

### Next 2 Weeks
5. End-to-end Shopify testing (#4)
6. Rate limiting enable (#8)
7. Usage tracking enable (#9)
8. Pricing page live (#11)
9. Privacy policy + terms (#63)

### Next Month
10. Shopify billing integration (#7)
11. SaaS onboarding flow (#10)
12. Analytics demo project (#22)
13. Analytics time-to-first-event UX (#23)
14. Client search analytics (#12)
15. Product sync retry logic (#13)

### Next Quarter
16. ClickHouse migration (#25)
17. Re-enable hidden analytics UI (stickiness, lifecycle, paths, revenue, attribution) (#27–33)
18. Zid integration (#16)
19. Arabic for marketplace frontend (#44)
20. Unified auth (#49)

---

*This document should be updated as work is completed or priorities shift.*
