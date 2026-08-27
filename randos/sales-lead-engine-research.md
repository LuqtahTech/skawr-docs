# Skawr Lead Engine — OSS Research and Acquisition Strategy

**Date:** July 18, 2026

## Executive recommendation

Build an **evidence-driven account intelligence engine**, not a personal-contact scraper. Its first wedge should discover Saudi/MENA Salla and Shopify stores, reproduce concrete Arabic-search or mobile-conversion problems, generate a bilingual audit and working before/after preview, then route only high-confidence accounts to human review.

No signal can guarantee that a prospect will buy. The system should optimize for demonstrated product fit and timing, then validate conversion through controlled experiments.

## Recommended open-source stack

### Adopt

| Project | Role | License | Recommendation |
|---|---|---|---|
| [Scrapy](https://github.com/scrapy/scrapy) | Polite public-page crawling and deterministic extraction | BSD-3-Clause | Use as the primary crawler; Skawr already operates Scrapy code. |
| [ProjectDiscovery httpx](https://github.com/projectdiscovery/httpx) | Cheap live-domain validation, redirects, TLS, titles and technology probes | MIT | Run as a locked-down internal sidecar with SSRF protections; disable unsafe/security-scanning options. |
| [WappalyzerGo](https://github.com/projectdiscovery/wappalyzergo) | Detect Shopify, WooCommerce, analytics and web technologies | MIT | Extend with tested Salla/Zid and MENA-specific fingerprints. Store evidence and confidence, not only labels. |
| [Common Crawl index tools](https://github.com/commoncrawl/cc-index-table) | Broad domain discovery without crawling the live web first | Apache-2.0 for tooling | Query narrowly by geography, language and commerce patterns; retain minimal company-level facts and revalidate live. |
| [HTTP Archive](https://github.com/HTTPArchive/bigquery) | Seed stores by known technology and origin data | Apache-2.0 tooling | Good secondary discovery source, especially for Shopify/WooCommerce; coverage is not exhaustive. |
| [Meltano](https://github.com/meltano/meltano) | Scheduled data movement and connectors | MIT | Use only when multiple sources/CRM sinks justify an EL control plane. |
| [Activepieces](https://github.com/activepieces/activepieces) Community Edition | Human approval and internal automation | MIT outside enterprise directories | Suitable for review → approved CRM sync. Do not use it for bulk unsolicited messaging. |

### Time-boxed evaluation

- [Crawlee](https://github.com/apify/crawlee): good Node/Playwright sidecar for JavaScript-heavy stores, but avoid duplicating Scrapy unless measurements prove it is needed.
- [Crawl4AI](https://github.com/unclecode/crawl4ai): test its Arabic extraction quality against deterministic Scrapy parsing; sandbox browsers and disable evasion features.
- [Firecrawl](https://github.com/firecrawl/firecrawl): capable but operationally heavy and AGPL; legal/architecture review required.
- [Twenty](https://github.com/twentyhq/twenty): evaluate only if Skawr needs a self-hosted CRM UI. Keep it separate and use its API rather than forking it into Skawr.
- [Windmill](https://github.com/windmill-labs/windmill): engineering-friendly workflow option, but choose either this or Activepieces—not both.

### Avoid

- LinkedIn scrapers, session-cookie automation, CAPTCHA solvers, proxy rotation and anti-detection tools.
- Google Maps or Google Search result harvesting; use permitted APIs only, under their storage/use terms.
- Email permutation generators, personal mobile harvesting, data-broker list imports and automatic cold-message sequencers.
- Small “all-in-one lead scraper” repositories with weak maintenance, unclear provenance or a business model based on bypassing platform controls.
- n8n as a customer-facing embedded foundation without license review; its Sustainable Use License is not a conventional permissive OSS license.

## Highest-conversion wedge

### Arabic Search Stress Test

For each permitted public storefront:

1. Detect platform, locale, visible catalog size range and search entry point.
2. Derive test queries from the store's own products:
   - exact Arabic title;
   - one realistic typo;
   - alef/hamza and ya/alif-maqsura variants where linguistically valid;
   - Arabic-Indic versus Western numerals;
   - Arabic/English brand transliteration;
   - common Saudi/Gulf synonym after native-language review;
   - brand + category + attribute and mixed Arabic/Latin queries.
3. Record actual top results, expected product rank, autocomplete, filters, latency and zero-result recovery.
4. Produce a timestamped bilingual one-page audit with screenshots and evidence links.
5. Generate a merchant-branded demo over 20–50 permitted sample products showing improved typo tolerance, normalization, transliteration and RTL facets.
6. Route to a Salla/Shopify extension for simple catalogs or Search SaaS for large, multilingual and multi-store catalogs.

Never present a small public query sample as the merchant's internal zero-result rate. Never claim a revenue-loss figure unless the merchant enters its own traffic, conversion and order-value assumptions into an explicitly labeled scenario calculator.

## Additional acquisition plays

1. **Mobile CRO Friction Reel:** a 60–90 second annotated journey from home to cart, stopping before transaction. Show three reproducible issues and a fixed-scope CRO proposal.
2. **Measurement Readiness Map:** map public client-side tags/routes to a proposed event vocabulary (`search_submitted`, `search_zero_results`, `result_clicked`, `product_viewed`, `add_to_cart`). Explicitly state that server-side events and data quality are invisible.
3. **Install Readiness Checker:** for Salla/Shopify, identify theme/platform, RTL compatibility, search locations and likely integration mode, ending with one-click install or a short compatibility call.
4. **Migration Regression Watcher:** detect a public platform/theme migration and compare old/new search, redirects, performance and analytics coverage. Timing makes the outreach relevant.
5. **Catalog Growth Watcher:** refresh qualified domains monthly and trigger re-review when visible catalog breadth or language/channel complexity materially changes.
6. **Category Benchmark Reports:** publish anonymized aggregate reports such as “Arabic search readiness across Saudi fragrance stores.” Make methodology and sample limits transparent; let merchants run their own free test.
7. **Founder teardown content:** publish consented or anonymized Arabic/English search and CRO teardowns. Each video links to the self-serve audit, converting educational search traffic into inbound leads.
8. **Agency and platform partnerships:** pursue Salla/Shopify agencies, theme developers and implementation partners. Shopify explicitly provides a partner directory and App Store distribution; this can outperform scraping because partners already have merchant trust.
9. **Marketplace feed partnerships:** identify inventory owners with unique/fresh Saudi supply and approach them with an overlap/gap map. Treat this as founder-led partnership sales, not mass outbound.
10. **Product-led follow-up:** prioritize accounts after they run an audit, open the interactive preview, install an extension, index a catalog or send a first analytics event. Product behavior is a stronger signal than static company attributes.

## Scoring model

Use separate **fit** and **confidence** values:

`Priority = Need (35) + Product fit (25) + Timing (15) + Value potential (10) + Reachability (10) + Evidence confidence (5) - Risk (0–20)`

- **Need:** reproduced search/UX/measurement problem.
- **Product fit:** platform, catalog complexity, Arabic/English need and geography.
- **Timing:** migration, launch, hiring, redesign, expansion or material catalog growth.
- **Value potential:** operational complexity and visible breadth—not guessed revenue.
- **Reachability:** public company channel, partnership form, opt-in audit submission or warm introduction.
- **Confidence:** multiple timestamped observations and corroborating detectors.
- **Risk:** unclear source rights, robots/terms restriction, stale evidence, personal-only contact or weak MENA relevance.

Suggested routing:

- 80–100: human-review immediately and prepare a custom preview.
- 65–79: generate audit, then human QA.
- 50–64: monitor for a timing event.
- Below 50: suppress from active work.

## MVP architecture

Create a separate `skawr-leads` service using FastAPI, PostgreSQL, Redis workers, Alembic and Zitadel. Reuse the current `skawr-web` CRO audit as an inbound source, but replace its process-local asynchronous `Map` and fire-and-forget execution with durable jobs.

Pipeline:

`permitted source → candidate domain → canonicalize/policy gate → HTTP validation → polite crawl → deterministic evidence → versioned score → audit artifact → human review → idempotent CRM sync`

Core records:

- account and domain aliases;
- discovery source, terms/policy classification and observation date;
- fetch run, robots result, response hash and tool version;
- evidence with source URL, confidence, method/version, freshness and screenshot/snippet;
- versioned score components;
- generated artifact and evidence references;
- review decision and reason;
- suppression/deletion ledger;
- CRM link and sync attempts.

Only approved accounts can reach CRM. Do not add automated outreach to the MVP.

## Four-week pilot

### Week 1 — foundation

- Build the account/evidence schema, domain canonicalization, source registry, suppression controls and job queue.
- Ingest existing CRO audit submissions and a manually approved CSV of 100–200 Saudi Salla/Shopify domains.

### Week 2 — evidence

- Integrate httpx/WappalyzerGo and Scrapy.
- Add Salla/Zid fingerprints with fixtures.
- Implement 10 Arabic/English search tests, mobile screenshots and evidence freshness.

### Week 3 — artifact and review

- Generate a bilingual interactive audit and small search preview.
- Add review UI in `skawr-dashboards` with approve/reject/refresh/suppress actions.
- Sync approved company records and notes to one CRM; do not create person records by default.

### Week 4 — controlled experiment

- Human-review the top 30–50 accounts.
- Test audit-only versus audit + interactive preview.
- Measure evidence acceptance, positive replies or permissioned follow-ups, qualified meetings, installs/trials, first indexed catalog and paid conversion.
- Refit score weights from outcomes; do not optimize on opens alone.

Pilot gates before scaling:

- at least 80% human precision in the top score band;
- zero unsupported claims in sampled reports;
- fewer than 2% duplicate accounts;
- source-policy and suppression checks pass for every approved account;
- browser/runtime cost and audit latency stay within a pre-set budget.

## Research lessons from blogs, videos and platform guidance

- Signal-based selling is more relevant than static list blasting: monitor changes that explain **why now**, then reference a verifiable event. See [HubSpot's trigger-event guide](https://blog.hubspot.com/sales/types-of-trigger-events-and-how-to-track-them) and [Clearbit's sales-trigger chapter](https://clearbit.com/resources/books/data-driven-sales/sales-triggers).
- Automate research before writing, and constrain generated claims to evidence. [Clay's account-research lesson](https://www.clay.com/university/lesson/11-ai-prompts-to-automate-prospect-research-with-claygent-automated-outbound) and [signals lesson](https://www.clay.com/university/lesson/intro-to-signals-in-clay-signals-abm) illustrate the workflow pattern; Skawr should implement it on company/public-site evidence rather than personal-profile enrichment.
- Let prospects experience value before asking for a meeting. [Salesforce's product-led sales overview](https://www.salesforce.com/blog/sales/product-led-sales/) supports using product engagement to prioritize sales assistance.
- Personalized video is most useful when it demonstrates a specific issue. Loom's vendor case study reports a 19% reply-rate increase for Intercom's video prospecting; treat this as directional, not a universal benchmark: [Intercom customer story](https://www.loom.com/customers/intercom).
- Educational audit content compounds into inbound acquisition. Ahrefs pairs reusable audit checklists with video walkthroughs: [website audit checklist](https://ahrefs.com/blog/website-audit-checklist/) and [technical audit video lesson](https://ahrefs.com/academy/ahrefs-youtube/technical-seo). Skawr can apply the same pattern to Arabic commerce search and CRO.
- Ecosystem distribution matters. Shopify exposes App Store and partner-directory routes, and its certified partner program emphasizes usefulness, performance, support, security and privacy: [technology partners](https://www.shopify.com/partners/technology-partners), [partner directory](https://www.shopify.com/partners/directory), and [2026 certified partner overview](https://www.shopify.com/au/partners/blog/shopify-plus-apps).
- Salla's official information page reports more than 68,000 active merchants and over $13 billion in processed online sales for 2025, making platform-native distribution a material channel: [Salla official information](https://beta.salla.com/en/ai-info/).

Most sales-playbook sources are vendors describing their own methods. Their numeric claims should be treated as hypotheses or directional case studies, not independent guarantees.

## Compliance and operational boundaries

- Collect company/store facts by default, not named-person profiles.
- Public visibility is not permission. Check source terms, robots directives, copyright, purpose and privacy basis independently.
- Never log in, bypass a paywall/CAPTCHA/block, rotate identities to evade controls or continue after an explicit denial.
- Use truthful crawler identification, per-domain budgets, caching, backoff and immediate handling of `403`, `429` and `503` responses.
- Do not scrape LinkedIn, Google Maps or Google Search results. Use approved APIs only under their terms.
- For Salla/Shopify admin or merchant data, require merchant-authorized OAuth and minimum scopes.
- Keep raw HTML briefly; retain extracted business evidence only while current and needed. Propagate correction, suppression and deletion to indexes, artifacts and processors.
- Treat named work emails, direct numbers and messaging IDs as personal data. Saudi PDPL direct-marketing requirements need legal review and auditable consent/opt-out controls.
- Keep discovery, scoring and outreach separate. The product should not send bulk unsolicited messages.

Authoritative starting points: [SDAIA PDPL materials](https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/lawsandregulations), [Robots Exclusion Protocol RFC 9309](https://www.rfc-editor.org/rfc/rfc9309), [LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement), [Shopify API Terms](https://www.shopify.com/legal/api-terms), and [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms).

This is product research, not legal advice. Web-sourced content was paraphrased for licensing compliance.
