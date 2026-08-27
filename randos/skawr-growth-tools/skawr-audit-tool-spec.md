# Skawr Instant Store Audit — Implementation Spec

**Status:** Ready for build
**Owner:** Skawr (skawr.com)
**Purpose of this doc:** Give any engineering agent (human or AI) enough context to build this feature end-to-end without needing the product owner in the loop for basic decisions.

---

## 1. What this is, in one paragraph

A free, public tool at `skawr.com/audit` where anyone pastes their store URL and gets, in under a minute, a plain-language report on why their site might be losing sales — covering pricing clarity, trust/brand signals, tracking setup, and real page speed. It detects the platform (Salla, Zid, Shopify, WooCommerce, Magento, custom) and tailors findings and recommendations to that platform's actual app ecosystem. It is Skawr's primary lead-generation surface for both the CRO consulting service and the Smart Search SaaS product.

**North star:** someone with zero CRO knowledge pastes their link, feels either validated or mildly alarmed within 45 seconds, understands exactly what to do next without needing anything explained to them, and wants to share or rerun it.

---

## 2. Goals & non-goals

### Goals
- Generate qualified leads for Skawr CRO (Essential/Commerce/Performance/Enterprise tiers) and Smart Search SaaS.
- Be genuinely useful even to someone who never converts — this is a trust-building instrument, not a bait-and-switch.
- Be platform-aware: give sharper, more specific findings to Salla/Zid/Shopify/Woo merchants than a generic Western tool could.
- Be understandable with zero prior CRO knowledge — no jargon, no unexplained scores.
- Be fast (sub-45s to first result) and require no signup for the initial score.

### Non-goals (v1)
- Not a replacement for the human CRO audit — it's a qualifier and diagnostic, not the full "4-pillar" service.
- Not attempting real traffic/analytics analysis (Traffic pillar stays intentionally shallow/locked in v1 — see §6.4).
- Not supporting authenticated/gated storefronts in v1.
- Not multi-page crawling in v1 — homepage + one representative product page only.

---

## 3. Target users & platform considerations

Primary audience: Saudi/Gulf e-commerce founders and marketers, ranging from solo Salla/Zid store owners to established Shopify/Magento brands. Assume **most users have little to no CRO or technical vocabulary.**

### 3.1 Why platform detection matters (core design decision)

Salla, Zid, and Shopify merchants run on a shared theme/checkout/hosting layer. This means:

- Checks like "has SSL," "mobile responsive," "checkout exists" are near-universally true on these platforms and have **near-zero differentiating value** — do not present them as findings, or present them collapsed/de-emphasized.
- What *does* vary between two merchants on the same platform is: which **apps/integrations** they've installed (BNPL, WhatsApp chat, pixels, reviews, search), and how much they've customized the default theme.
- Because platform + installed-app fingerprints are detectable from page source (see §7.2), the tool should give **app-specific, actionable recommendations** ("Install Tabby from the Salla App Store →") rather than vague advice ("consider offering installments"). This is the single biggest differentiator vs. generic graders (HubSpot Website Grader, Neil Patel's tool, etc.), which have no concept of MENA platform app stores.
- This also creates a direct, non-pushy upsell path into Skawr's own Smart Search app when on-site search is missing or weak — the audit becomes a funnel into Skawr's own product, not just the CRO service.

### 3.2 Segmentation by detected site type

Before scoring, classify the site into one of:
1. **E-commerce — multi-product** (Salla/Zid/Shopify/Woo/Magento storefront with catalog)
2. **E-commerce — single/few product** (dropship-style or small catalog)
3. **SaaS / service / single funnel** (skip pricing/catalog-specific checks entirely — do not penalize for missing product reviews etc.)
4. **Marketplace** (multiple vendors — different trust-signal expectations)

Rubric and copy must branch on this classification. Never show a SaaS site a "no product reviews found" finding.

---

## 4. User flow

```
[Landing] → paste URL (+ optional: monthly visitors, avg order value, currency)
    ↓
[Scanning state ~20–45s] — visible progress, plain-language step labels
    ↓
[Free report — fully ungated]
    - Overall grade (letter or /100, see §5)
    - Estimated monthly revenue impact (if visitor/AOV data given, else generic range)
    - "3 things to fix this week" — always free, always specific, always plain language
    - Full per-pillar findings list, each tagged found / missing / couldn't verify
    - Peer/competitor benchmark line
    - Shareable scorecard image (auto-generated, no login)
    ↓
[Soft gate] — email or WhatsApp number, framed as "send me this report + re-check reminder in 30 days," NOT as "unlock your results" (results are never hidden — see §9)
    ↓
[CTA ladder] routed by score + site type + tier fit:
    - Low score, multi-product store → Commerce tier
    - Low score, single funnel → Essential tier
    - Any score, missing/weak search → Smart Search SaaS signup
    - Data pillar weak (no tracking at all) → framed as "you're flying blind" → Essential/Commerce
    - High score → Performance tier / "let's push further" framing, not left with no next step
    ↓
[Optional] Rerun anytime, free, unlimited — delta view against previous scan
```

Critical UX rule: **the free report must never feel like a teaser.** Every finding is named and specific for free. What's paid is the *prioritized fix plan, effort/impact ranking, and hands-on implementation* — never the diagnosis itself. This is a trust decision, not just a UX one (see prior discussion — bait-and-switch gating erodes exactly the trust this tool exists to build).

---

## 5. Scoring architecture

### 5.1 Overall score
- Presented as a 0–100 number **and** a letter-style grade band for shareability and non-expert legibility:
  - 85–100: **A — Converting well**
  - 70–84: **B — Solid, a few gaps**
  - 50–69: **C — Leaking sales**
  - 30–49: **D — Losing customers daily**
  - 0–29: **F — Actively repelling buyers**
- Grade language must stay plain and consequence-oriented, never academic ("C — Leaking sales" not "C — Average performance").

### 5.2 Pillar weights (site-type dependent)

| Pillar | E-commerce weight | SaaS/single-funnel weight |
|---|---|---|
| Foundation (speed, mobile) | 25% | 30% |
| Brand & Trust | 30% | 35% |
| Pricing & Offer | 20% | 15% |
| Tracking & Data | 25% | 20% |
| Traffic Signals | shown, not weighted into score (locked/informational — see §5.6) | same |

### 5.3 Foundation pillar (new in this iteration — the credibility anchor)
This pillar exists specifically to give the tool one undisputable, API-verified metric before anything subjective. Do not skip this even under time pressure — it is what makes the tool feel credible on first use.

- Real load time (Google PageSpeed Insights API, mobile) — shown as raw seconds, not just a score
- Mobile usability score (from same API)
- Largest Contentful Paint, Cumulative Layout Shift (from same API) — shown to power users, collapsed by default for non-experts
- Broken image/link count on homepage (basic crawl check)

### 5.4 Brand & Trust pillar
- Reviews/ratings visible on product page
- Return/refund policy linked and findable
- Payment method badges shown (Mada, Visa/Mastercard, Apple Pay)
- **BNPL badge present (Tabby/Tamara)** — tag as `KSA`-relevant
- **WhatsApp Business click-to-chat present** — tag as `KSA`-relevant, high weight; WhatsApp commerce is a dominant channel in Saudi/Gulf and no Western grader checks this
- Social proof: Instagram/TikTok shop links, follower badges, testimonials
- About/Contact page reachable
- Consistent branding (real logo/favicon, not platform template default)
- **Arabic RTL rendering correctness**, if Arabic content detected — tag as `AR`-relevant
- No broken trust elements (dead links, template placeholder text)

### 5.5 Pricing & Offer pillar (skipped/reweighted for SaaS site type)
- Price visible pre-add-to-cart, no login gate
- Currency clearly and unambiguously labeled
- BNPL option shown at product/cart level (distinct from badge presence above — this checks placement)
- Shipping cost disclosed before final checkout step
- Urgency/scarcity mechanics present without being spammy (stock counters, sale timers)
- Bundle/upsell present on product page

### 5.6 Tracking & Data pillar
- GA4 (or equivalent) installed
- Meta Pixel installed
- **TikTok Pixel installed** — tag `KSA`-relevant (TikTok Shop usage is significant in the region)
- Heatmap/session recording tool installed (Hotjar, Microsoft Clarity)
- On-site search present at all — **direct tie-in to Skawr Smart Search recommendation when absent or when a slow/basic search is detected**

### 5.7 Traffic Signals pillar (kept deliberately shallow, always labeled honestly)
- Meta title/description present and non-generic
- Open Graph tags present
- Sitemap.xml / robots.txt reachable
- Everything beyond this (actual traffic volume, channel mix, visitor intent) is **not scored** — shown as a clearly labeled locked card: "🔒 Traffic volume and channel quality require analytics access — included in a full audit." Never silently omit this; the honesty about what can't be checked from a URL alone is itself a trust signal.

### 5.8 Confidence states (mandatory for every check)
Every individual check must resolve to one of three states — never force a binary guess:
- ✅ **Found** — verified present
- ❌ **Missing** — verified absent
- ⚠️ **Couldn't verify** — page structure prevented a reliable check (e.g., heavy client-side rendering blocked a scrape). Never silently treat this as a fail; a wrongly confident false negative on a zero-trust product is reputational damage the business cannot afford at this stage.

---

## 6. Revenue impact estimator

This is the emotional hook that turns an abstract score into something a non-expert viscerally understands.

### Inputs (optional, collected pre- or post-scan, never required to see a score)
- Monthly visitors (approximate, self-reported)
- Average order value
- Currency (SAR/USD default by detected TLD/language)

### Logic
- If inputs provided: estimate lost revenue using a conservative, clearly-labeled-as-estimate multiplier per missing high-impact finding (e.g., missing BNPL ≈ industry-cited conversion lift range applied to estimated current conversion rate). **Always show as a range, always footnote the assumption** ("estimated using industry-average conversion lift benchmarks, not your actual analytics").
- If inputs not provided: show a generic, clearly-labeled illustrative range based on site-type medians, framed explicitly as illustrative ("stores like yours typically see...") rather than personalized.
- Never state a specific number as fact. This is a directional/motivational device, not a financial claim — legal/trust risk if overclaimed.

---

## 7. Detection methods (technical)

### 7.1 Architecture requirement
Client-side fetch cannot reliably retrieve arbitrary third-party sites (CORS). This must be a **server-side** scan:
1. Backend endpoint receives URL.
2. Server-side headless render (Playwright or Puppeteer) fetches and renders the page (many storefronts are JS-heavy).
3. Parse rendered DOM + raw HTML + network request log for checks.
4. Call Google PageSpeed Insights API in parallel for Foundation pillar.
5. Cache result per normalized domain for 24h (avoid re-scanning the same store repeatedly; also protects against abuse/cost).
6. Rate-limit by IP and by domain to prevent scraping abuse or cost blowouts.

### 7.2 Platform fingerprinting (detect before scoring)
Detect via combination of signals:
- **Salla**: presence of `salla.sa` CDN asset paths, `<meta name="generator" content="Salla">` or equivalent script tags, Salla-specific checkout URL patterns.
- **Zid**: `zid.sa` / `zid.store` asset domains, Zid-specific script signatures.
- **Shopify**: `cdn.shopify.com` assets, `Shopify.shop` global JS object, `/cdn/shop/` paths.
- **WooCommerce**: `wp-content/plugins/woocommerce` paths, WordPress meta generator tag.
- **Magento**: `Mage.Cookies`, `/static/version*/frontend/` paths.
- **Custom/unknown**: fallback — run full generic check set, no platform-specific recommendations.

Once platform is known:
- Suppress checks that are structurally guaranteed by the platform (documented per-platform exception list — build this list empirically as false positives are found).
- Map missing findings to **specific, named apps in that platform's app store** with direct links where possible (e.g., Salla App Store search URL for "Tabby", for "WhatsApp Chat", etc.). This mapping table is a first-class data structure in the codebase (`platform_app_recommendations.json` or equivalent) and should be easy to extend as new apps/partners are added — including Skawr's own Smart Search listing once live on each app store.

### 7.3 Per-check detection notes
- Reviews: look for common review-widget script signatures (Judge.me, Loox, Yotpo, native Salla/Zid reviews block) plus visible star-rating DOM patterns.
- BNPL: script/domain signatures for `tabby.ai`, `tamara.co`.
- WhatsApp click-to-chat: `wa.me` or `api.whatsapp.com` links, or known chat-widget script signatures.
- Pixels: standard `fbq(`, `gtag(`, `ttq.` signatures in inline/script-src.
- RTL correctness: check `dir="rtl"` / `html[lang]` attributes against detected Arabic text content ratio; flag mismatches.
- On-site search: detect presence of a search input; if present, do not attempt to judge its quality automatically in v1 (that requires interaction) — presence/absence only, described honestly as such.

---

## 8. Report UI requirements

- Overall grade + score, prominent, above the fold, no scroll needed to see it.
- Real Foundation metrics (load time, mobile score) shown as hard numbers immediately next to the grade — this is the credibility anchor, must not be buried below soft pillars.
- Revenue impact framing directly beneath the grade.
- "3 things to fix this week" — a short, always-visible, always-free action list in plain imperative language ("Add a WhatsApp chat button," not "WhatsApp integration is absent"). This list must always be renderable even for a high-scoring site (frame as "polish" items) — never leave a user with literally nothing actionable.
- Full pillar breakdown below, each finding tagged with confidence state (§5.8) and region tag (`KSA`, `AR`) where relevant.
- Traffic pillar shown but clearly marked locked/informational, never silently dropped.
- Peer benchmark line (e.g., "Stores like yours in Saudi e-commerce average 68/100") — until real aggregate data exists from actual scans, label as illustrative; once the tool has run enough real scans, replace with genuine aggregated (anonymized) benchmarks.
- Shareable scorecard: auto-generated image (OG-image style card) summarizing grade + top finding, sized for social/LinkedIn sharing, generatable without login.
- Rerun/delta view: on repeat scans of the same domain, show score change since last scan.
- CTA block routes to the correct CRO tier or Smart Search signup based on score + site type + weakest pillar (see §4 flow).

---

## 9. Lead capture logic

- **Never gate the diagnosis.** All findings, all scores, are visible without providing contact info. This is a deliberate trust decision — the free tool must be genuinely complete on its own.
- Contact capture (email or WhatsApp number) is framed as a *delivery/follow-up* mechanic, not an unlock mechanic: "Send me this report" / "Remind me to re-scan in 30 days" / "Get the fix roadmap" — all of these are legitimate, honest reasons to ask, distinct from "unlock your score."
- WhatsApp capture should be offered alongside email, not as a replacement — Saudi users frequently prefer WhatsApp follow-up over email for response speed.
- All captured leads flow into a CRM/lead list tagged with: detected platform, site type, overall score, weakest pillar, and CTA tier routed — this tagging is what makes outbound follow-up efficient later.

---

## 10. Non-functional requirements

- **Privacy/compliance:** store only what's needed (scanned URL, derived findings, optional contact info if given). Note Saudi PDPL considerations if storing personal data of the store owner — display a clear, short privacy note near the contact-capture step, not just in a footer link.
- **Abuse prevention:** rate limit scans per IP and per domain; cap concurrent headless-render jobs; consider a lightweight CAPTCHA or similar only if abuse is observed, not by default (friction should be minimal at launch).
- **Performance:** target end-to-end scan completion under 45 seconds for the median site; show honest progress states rather than a generic spinner if it runs longer.
- **Accessibility:** keyboard focus states, sufficient color contrast for pass/fail/warn indicators (do not rely on color alone — use icon + text label, already reflected in the check-state design).
- **Legal/disclaimer:** revenue-impact numbers must carry a visible "estimated, not measured" disclaimer at the point of display, not buried in fine print elsewhere.
- **Internationalization:** UI should support Arabic-language rendering of the report itself for Arabic-speaking users, given the target market — at minimum, findings copy should have an Arabic translation path even if v1 ships English-first.

---

## 11. Success metrics to instrument

- Scan completion rate (started vs. finished)
- Contact-capture rate post-scan
- CTA click-through rate by tier
- Rerun rate (delta view usage) — proxy for perceived value even among non-converters
- Share rate of the scorecard image
- Lead-to-paid-CRO conversion rate, segmented by detected platform and site type
- False-positive/false-negative reports (manual QA channel — critical early on, since a wrong finding on a zero-trust product is costly)

---

## 12. Open questions for product owner

1. Which app-store links should be prioritized in the platform recommendation table first — is there an existing partner/affiliate relationship (e.g., with Tabby, Tamara) worth reflecting in the copy?
2. Should the Smart Search SaaS listing be live on Salla/Shopify app stores before this tool ships, so the "install our search app" recommendation can link directly rather than to a Skawr landing page?
3. What's the acceptable cost ceiling for PageSpeed API calls + headless rendering per scan, to set rate limits appropriately?
4. Should Arabic-first UI ship in v1 or v2, given the target market is Arabic-first but the founder/team may want to validate English-first first?

---

## 13. Out of scope for v1 (explicitly deferred)

- Authenticated/gated storefront scanning
- Multi-page/full-site crawling
- Automated search-quality testing (only presence/absence in v1)
- Real (non-illustrative) peer benchmarking — requires accumulated scan volume first
- Paid-tier automated implementation (fix roadmap remains human-delivered in v1)
