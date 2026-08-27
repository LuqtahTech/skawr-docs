# Skawr — Business Overview

> **Living document.** This is a running assessment of Skawr as a business, synthesized from the
> steering docs, the live landing/pricing pages, internal planning docs, and external research.
> It is updated as new information surfaces. See the changelog at the bottom.

---

## 1. Snapshot

| | |
|---|---|
| **What** | MENA/Saudi-focused e-commerce growth company — a connected "system" of search, analytics, and conversion, with a deliberate Arabic-first edge. |
| **Legal org** | LuqtahTech (GitHub org). US entity being formed (see §8). |
| **Stage** | Bootstrapped, pre-revenue (**zero paid conversions to date**), about to push marketing & sales hard. |
| **Team** | 2 co-founders. Saudi-based. |
| **Positioning line** | "The growth partner for ambitious e-commerce." |
| **Top-of-funnel** | Free `skawr.com` marketplace aggregator + LinkedIn awareness + free CRO instant audit. |
| **Raise intent** | Plan to land a few clients first to de-risk, then raise. Not yet committed. |

**The core thesis:** growth breaks at the *system* level. Search, onboarding, analytics, and
conversion are usually separate tools that don't share context and get set up once, then decay.
Skawr sells those pieces and ties them together so each interaction becomes a signal the others use.

---

## 2. Product portfolio

Skawr is a multi-product company. Five products/lines, at different maturity:

| # | Product | URL | Model | Status |
|---|---------|-----|-------|--------|
| 1 | **Marketplace Aggregator** | `skawr.com` | Free consumer product (top-of-funnel / awareness) | Live |
| 2 | **Smart Search (SaaS)** | `skawr.com/search` | Subscription (Polar.sh MoR) | Live, pre-revenue |
| 3 | **CRO Service** | `skawr.com/cro` | Project-based consulting | Live, pre-revenue |
| 4 | **Analytics** | `analytics.skawr.com` | Bundled with SaaS today; standalone vision (see §4) | Backend/frontend built; publicly "coming soon" |
| 5 | **Salla / Shopify Extensions** | App stores | Zero-code widget embeds | Built |

The free marketplace aggregator (AI search across Haraj, Aqar, Dubizzle, OpenSooq, Mstaml) is both a
consumer product and the awareness/lead engine for the paid B2B products.

---

## 3. Revenue model & pricing

Two paid motions that cross-sell, plus bundled analytics:

- **Recurring, low-touch:** Smart Search SaaS (+ bundled Analytics), billed via **Polar.sh** as merchant
  of record — Polar handles collection, global tax/VAT, and payouts.
- **Higher-ticket, project-based:** CRO service, priced per "cycle."
- **Cross-sell:** CRO recommends Search + Analytics to Commerce/Performance clients; the SaaS pricing
  page upsells CRO. The service funds acquisition and warms leads for the product; the product gives
  the service measurable tooling.

### Smart Search (SaaS) — subscription

USD or SAR (fixed 3.75 rate), cancel anytime, **annual = 2 months free**, no free tier (preview-on-your-
own-products → paid).

| Tier | Monthly | Annual | Products | Searches/mo | Support | SLA | Overage |
|------|---------|--------|----------|-------------|---------|-----|---------|
| Growth | $99 | $990 | 50,000 | 500,000 | Email | 99.5% | $0.50 / 1K |
| Pro | $199 | $1,990 | 50,000 | 500,000 | WhatsApp | 99.5% | $0.40 / 1K |
| Scale | $399 | $3,990 | 500,000 | 5,000,000 | WhatsApp | 99.9% | $0.30 / 1K |
| Enterprise | Custom | — | 500K+ | Custom | Dedicated | Custom | — |

- **Shared across tiers:** search analytics, funnel analytics, AI reranking, personalization, heatmaps & attribution.
- **Pro+ only (locked on Growth):** Skawr Bar, Skawr Search Widget, WhatsApp support.
- **Cost driver is indexed product count**, not search volume — overage priced per 1K products, cheaper at higher tiers.

### CRO — project-based ("per cycle")

Every tier covers the full **4-pillar framework** (Pricing → Brand → Traffic → Data). Price scales with
business complexity, not with which pillars you get. A cycle = one full pass from analysis through
experimentation and results. Free instant audit (~45s, no signup) is the lead magnet.

| Tier | Price / cycle | Best for | Timeline |
|------|---------------|----------|----------|
| Essential | $300 | SaaS / simple sites, single conversion path | ~1–2 wks |
| Commerce | $700 | E-commerce, multiple products/funnels | 3–4 wks |
| Performance | $1,200 | Established brands & marketplaces | 6–8 wks |
| Enterprise | Custom | Multi-store / ongoing | Custom |

---

## 4. Positioning & differentiation

**Company-level:** Arabic-first, MENA-native, and "one connected system" vs. disconnected point tools.
Not an agency, not marketing/SEO (handled via partners) — a product company with one focused service.

**Analytics vision (aspirational — see caveat).** Internal planning docs position Analytics as a
standalone "MENA-first product analytics" play (Amplitude/Mixpanel category) differentiated on four axes:

1. **Proactive "push-not-pull" insights** — anomalies, funnel drop-offs, driver attribution surface in a feed; no chatbot; every insight links to its chart.
2. **Embeddings-powered behavioral clustering** — cluster users by journey vectors to surface cohorts you didn't define. Reuses the Fireworks embeddings stack from the indexer. Claimed as the real technical moat.
3. **MENA-first** — Arabic RTL-first UI, Hijri calendar, Ramadan/Eid-aware periods, MENA data residency, PDPL compliance, Mada/Tabby/Tamara payments.
4. **AI-derived shape + event-shape peer benchmarks** — infer each client's real funnels/cohorts from their actual events (seed vertical: marketplaces); benchmark against peers with matching event shape, not self-declared industry.

> **Caveat / inconsistency to resolve:** the standalone analytics vision (free tier, MTU-free pricing,
> AWS me-south-1 Bahrain residency, own SDK/pricing) conflicts with the *current* operating reality per
> the ecosystem steering: analytics is **bundled into the Search SaaS** and runs on the shared **Contabo
> VPS** (not AWS Bahrain). Tier gating is **not** removed: core product analytics is on all paid tiers,
> while Heatmaps and Revenue Attribution are Scale-tier and the onboarding widgets (Skawr Bar, Search
> Widget, SkawrBot, NPS Surveys) are Pro+, matching the pricing page. Treat the four pillars as product
> vision and the bundled-on-VPS setup as today's reality until the two are reconciled.

---

## 5. Competitive landscape

- **Search:** competes with e-commerce site-search incumbents; edge is Arabic quality + Salla/Shopify zero-code install + MENA focus.
- **Analytics:** category peers are Amplitude, Mixpanel, PostHog, Heap, FullStory, Pendo; adjacent push-insight precedent is June.so; Contentsquare for auto drop-off detection. Positioning is "Amplitude, but push-not-pull, embeddings-discovered cohorts, marketplace-first, and pricing that doesn't punish retention." **MENA product-analytics market is described as effectively empty** — no credible local player with Arabic UI, MENA residency, or local payment. That emptiness is the claimed moat.
- **CRO:** competes with agencies/freelancers; edge is a productized 4-pillar framework + free instant audit + bundling with Skawr's own conversion tools.

---

## 6. Go-to-market & current status

- **Awareness:** "decent" via LinkedIn and the free `skawr.com` marketplace aggregator.
- **Conversions:** **zero paid conversions so far.** The immediate priority is a heavy marketing & sales push.
- **Funnels in place:** free marketplace (consumer awareness) → B2B products; free CRO instant audit → book a call → paid cycle; SaaS preview → subscribe.
- **Wedge customer (analytics vision):** Saudi/UAE marketplace startups (10k–500k MAU) — have budget, care about Arabic/local, dislike Amplitude's MTU bill.
- **Key GTM risk:** strong top-of-funnel awareness but no proven conversion path yet; the model's viability is still unvalidated commercially.

---

## 7. Technology & infrastructure (condensed)

- **Backends:** Python 3.11+/3.12, FastAPI (async), SQLAlchemy 2.0, Alembic. **Frontends:** Next.js 16 / React 19 (skawr-web pnpm+Tailwind; analytics custom CSS, no Tailwind); dashboards React 19 + Vite.
- **Data/search:** PostgreSQL 15, Redis 7, OpenSearch 2.19.5 (FAISS). **AI:** Fireworks Qwen3 embeddings (4096D) + reranker.
- **Infra:** single **Contabo VPS** (~$25–30/mo), Docker + Traefik + Let's Encrypt; indexer uses blue/green deploys. Frontends on AWS Amplify. **Billing:** Polar.sh. **Auth:** migrating to Zitadel OIDC (`id.skawr.com`) via a custom login BFF; legacy `skawr-auth` JWT being phased out.
- **Cost posture:** deliberately lean/single-VPS; AWS migration is written (Terraform) but deferred until revenue justifies (~$180/mo baseline; trigger ≈ 2+ Growth clients).

---

## 8. Team, entity & corporate plan

- **2 co-founders.** One is a **US green card holder** (US person for tax purposes, has SSN) currently in Saudi Arabia; the other is Saudi-based (non-US person). Org: LuqtahTech.
- **Entity chosen: Wyoming single-member LLC.** You are the sole member (US person, SSN, Managing Member, signatory for banks/Stripe/contracts). Co-founder is **not** on the US entity — their equity/profit-share is handled via a separate written agreement, and the real co-founder equity will live in the future Saudi/UAE raise entity.
- **Multi-entity plan (future):** US LLC (Wyoming) now → Saudi CR when needed for local contracts/employment → UAE freezone LLC for 0% corp tax + Gulf clients. US entity is the starting "top" entity; others layer on.
- **Raise plan:** land a few clients first, then raise — but the raise will happen on a **separate Saudi or UAE entity**, not the US LLC. The LLC stays an LLC permanently (no C-Corp conversion needed). It exists purely for Stripe, US banking, and global contracting.
- **Tax:** single-member LLC is a disregarded entity. Income reported on your personal 1040 (Schedule C). File Form 5472 + pro-forma 1120 annually (reports related-party transactions with foreign persons — e.g. payments to your co-founder). $25K penalty for missing 5472. CPA recommended for 5472; ~$300–500/yr.

---

## 9. Open questions & risks

- **Commercial validation:** zero conversions — is the pricing/positioning actually landing? Sales motion unproven.
- **Analytics strategy:** standalone MENA vision vs. bundled-with-SaaS reality needs an explicit decision.
- **Pricing-page vs. steering inconsistency (resolved 2026-07-25):** the SaaS pricing page (`Pricing.jsx`) locks Heatmaps and Revenue Attribution to Scale, and the onboarding widgets (Skawr Bar, Search Widget, SkawrBot, NPS Surveys) to Pro+. The ecosystem steering's "tier gating removed" note has been corrected to match, and the analytics code tier gates were already consistent with this.
- **Focus risk:** five product lines, two founders, pre-revenue — spread vs. focus.
- **Inter-entity structure:** when Saudi/UAE entities are formed, clarify which entity holds IP, how revenue flows, and transfer-pricing arrangements. Don't over-engineer now — structure when the second entity is actually needed.

---

## Changelog

- **2026-07-23** — Initial version from pricing pages. Expanded into full business assessment across all steering docs, landing pages (`/business`, `/saas`, `/cro`, `/about`), analytics planning docs (positioning/competitors/mvp-direction), and external research. Added: portfolio, positioning, competitive landscape, GTM/current status (pre-revenue, zero conversions, raise-after-traction), tech/infra, team/entity plan, and open questions. Recorded founder inputs: 2 co-founders; raise planned after landing clients; Stripe intended post-LLC (KSA unsupported → US entity needed).
- **2026-07-23 (update 1)** — Founder is a US green card holder (SSN, US person for tax). Entity decision: Wyoming multi-member LLC (not C-Corp) for simplicity. Multi-entity plan: US (now) → Saudi CR + UAE freezone (later). Co-founder is non-US (Saudi). Tax: 1065 + K-1 + potential 8804/8805 withholding + founder's 1040.
- **2026-07-23 (update 3)** — Decided: single-member LLC. Co-founder not on the US entity. Tax filing simplified to 1040 + Form 5472 (no 1065/K-1/8804). CPA budget reduced to ~$300–500/yr.
- **2026-07-25** — Analytics consolidation build. All Skawr storefront tools (Skawr Bar, SkawrBot, Search Widget, NPS Surveys) now emit events into the customer's own analytics project, tagged by tool (`sdk_source`) and surfaced in a new "by tool" breakdown and filter in the analytics dashboard. The search indexer stores the provisioned analytics project id + encrypted key on its `APIClient` and links to analytics via an `external_client_id` handle (not just email), then forwards events server-side through a per-merchant pipe that is now on by default (analytics keys never reach the browser). Shipped the NPS survey storefront widget (`skawrsurvey.js` + a Pro+ gated proxy). Removed fabricated Salla search-analytics data. Corrected the analytics tier-gating note: gating is not removed, it matches the pricing page (core analytics all tiers; Heatmaps + Revenue Attribution Scale; onboarding widgets Pro+).
- **2026-07-25 (update 1)** — Shipped the storefront Heatmaps + Revenue Attribution producers (`skawranalytics.js`), closing the last gap from the consolidation analysis: every Scale feature the pricing page sells now has a working storefront producer. Because heatmap volume is high, this producer posts directly to analytics-api with the merchant's PUBLISHABLE key, so auto-provisioned analytics keys are now minted track-only. Added a shopper consent model (DNT/GPC always honored, an optional Accept/Decline banner via the `analytics_consent_required` merchant setting, and an opt-out) plus a PDPL/privacy note. The producer defaults to same-origin delivery and can be flipped to the CDN (`cdn.skawr.com/analytics/v1/...` via `SKAWR_ANALYTICS_BUNDLE_URL`), published by a new skawr-search workflow to the same bucket and distribution as the search widget. All work landed as merged PRs (skawr-analytics, skawr-search, skawr-deployment).
