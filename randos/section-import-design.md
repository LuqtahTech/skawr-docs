# Importing a Section of a Store — Design Alternatives

## Context

Users sometimes paste a **category page URL** (e.g., `extra.com/ar-sa/electronic-games/cp/13` or `jarir.com/printers`) wanting to demo Skawr search on just that section — not the entire store catalog.

### Why previous approaches failed

| Approach | Why it fails |
|----------|-------------|
| **Path-prefix filtering on sitemap URLs** | Product URLs often don't share the category page's path. Jarir uses flat URLs like `/product-name/p/12345`. Extra uses `/ar-sa/product-name/p/12345` regardless of category. |
| **Scraping the category page for links** | Most stores (Salla, Zid) are SPAs. The HTML contains no product links — they load via JavaScript. No headless browser allowed. |
| **Platform API category filtering** | Salla and Zid APIs don't support `?category_id=` filtering on their storefront product endpoints. |
| **Per-site scrapers** | Doesn't scale, maintenance nightmare. Fragile to markup changes. |

### Current state

The codebase already has `_filter_products_by_path()` which does URL-prefix matching post-fetch. It works for Shopify (collections) but fails for flat-URL stores (Jarir, Extra, most Salla/Zid stores).

### Constraints

- Import must work in **under 90 seconds**
- **No headless browser** (too heavy for a demo tool)
- Must work **without knowing the platform** in advance
- Primary goal: **WOW the merchant** with a quick demo

---

## Approach 1: Full Import + Post-Filter by Category (via Embeddings)

### How it works

1. Import the full store catalog (or as much as the time budget allows) — exactly what we do today.
2. After indexing, the user types or selects a category in the playground UI.
3. We use our **existing embeddings** (Qwen3 4096-dim) to semantically filter: run a kNN search with the category name as the query against the imported products, then restrict the playground's search scope to only those products.

Essentially: the "section" isn't defined at import time — it's a **faceted view** on the imported data.

### What it requires

- A "category filter" UI element in the playground (dropdown or chip selector)
- A one-time kNN query to identify products matching the category
- OR: use the `category` field that products already have (many platform APIs return category names)

### Timing

- Import: same as today (15s for Salla/Zid, 90s for sitemap stores)
- Category filter: instant (embedding search or facet filter on existing index)

### Tradeoffs

| Pro | Con |
|-----|-----|
| Zero changes to import pipeline | Requires full catalog import first (time + products counted against quota) |
| Uses existing infrastructure (embeddings, kNN) | On stores with 50K+ products and 500-product cap, the "section" might not be in the sample |
| Works for any store/platform | User has to specify the category after import (not auto-detected from URL) |
| Category filtering is useful beyond demo (production feature) | Adds UI complexity to the playground |

### Best for

Stores where the full catalog fits within our import cap (≤500 products for guests, ≤5000 after signup). The user imports everything, then drills into a section via search or faceting.

---

## Approach 2: Use the Store's Own Search/Filter API

### How it works

1. User pastes a category URL (e.g., `extra.com/ar-sa/electronic-games/cp/13`)
2. We detect the platform and call the store's **internal search or category listing API** with the category slug/ID
3. The API returns only products in that category — we index those

Most e-commerce platforms expose product-listing APIs that accept category filters, even if their public storefront APIs don't document them:

- **Salla**: `GET /api/twilight/products?category_id={id}` (not documented but the SPA uses it)
- **Zid**: `GET /api/v1/products?category_id={id}` (same pattern)
- **Extra/Jarir**: `GET /api/search/products?category={slug}&page=1` (public AJAX APIs the frontend uses)
- **Shopify**: `/collections/{handle}/products.json` (already implemented)

### What it requires

- Detecting the category ID/slug from the pasted URL
- Mapping it to the platform's internal product-listing API
- One new function per platform: `_fetch_platform_category(base, category_id, ...)`

### Timing

- Category ID extraction: instant (URL parsing)
- API call: 2-15 seconds (paginated, same as full catalog but scoped)
- Total: **5-30 seconds** (faster than full import because fewer products)

### Tradeoffs

| Pro | Con |
|-----|-----|
| Only imports relevant products (no wasted quota) | Requires reverse-engineering each platform's category API |
| Fast (only fetches what's needed) | Fragile — undocumented APIs can change without notice |
| Natural UX — paste URL, get that section | Category ID extraction varies per platform (URL structure differs) |
| Uses less storage (smaller index) | Won't work for unknown platforms (only Salla/Zid/Shopify/WooCommerce) |

### Implementation notes

For Salla/Zid, the category API is just the same storefront API with a `?category_id=X` param. The category ID can be extracted from the URL (Salla uses `/categories/{id}`, Zid uses `/categories/{slug}`). For Extra/Jarir, their SPA frontend makes AJAX calls to internal search APIs — we can replicate those calls.

### Best for

Known platforms (Salla, Zid, Shopify, WooCommerce) where we can map category URLs to API filters. This is the most "correct" solution for these platforms.

---

## Approach 3: Scrape the Category Page's Embedded State (No Headless Browser)

### How it works

Even on SPAs, the initial HTML often contains **preloaded/embedded state** (JSON in `<script>` tags, `window.__INITIAL_STATE__`, Next.js `__NEXT_DATA__`, Nuxt `__NUXT__`). This state frequently includes the first page of products for the current category.

1. User pastes a category URL
2. We fetch the raw HTML (no JS execution)
3. We parse embedded state from `<script>` tags — the extractor already has `parse_embedded_state()` and `_collect_embedded_blobs()` for this
4. We extract the product list from the embedded state — even on an SPA, the server usually hydrates the first page

### What it requires

- The existing `parse_embedded_state()` function (already implemented)
- A category page fetch + embedded state extraction
- The ability to paginate (follow "load more" via the internal API once we have the category context from page 1)

### Timing

- Category page fetch: 1-3 seconds
- Embedded state parse: instant
- Follow-up pagination (if available): 5-20 seconds
- Total: **5-25 seconds**

### Tradeoffs

| Pro | Con |
|-----|-----|
| Works without knowing the platform | Only gets page 1 (10-30 products) unless we discover the pagination API |
| No headless browser needed | Embedded state format varies per framework (Next.js, Nuxt, custom) |
| Fast (single page fetch) | Not all SPAs embed products in initial HTML (some are 100% client-rendered) |
| Already partially implemented | May not get full metadata (descriptions, images) from embedded state |

### Best for

Getting a quick "sample" of 10-30 products from a category page. Combined with Approach 2 (if we discover the API from the embedded state), this can bootstrap the full category import.

---

## Approach 4: Redesign the UX — No Section Import Needed

### How it works

Instead of importing a section at import time, **reframe the UX** so the user never needs to:

1. **Always import the full store** (current behavior)
2. In the playground, show a **category facet bar** auto-generated from the imported products' `category` field
3. User clicks a category → search scope narrows to just those products
4. The "WOW" moment is: "Look, we categorized your products automatically and you can search within each section"

The insight: merchants don't actually need section-import. They need **section-search**. The import is just the setup — the demo value is in showing intelligent filtering/faceting.

### What it requires

- Auto-detect product categories from imported data (most platform APIs include category names)
- If no category field: use embeddings to cluster products into ~5-10 auto-categories (K-means on the 4096-dim vectors)
- A facet/filter bar in the playground UI

### Timing

- Import: same as today
- Auto-categorization: instant (during indexing, already have the data)
- Embedding-based clustering: 1-2 seconds on <500 products

### Tradeoffs

| Pro | Con |
|-----|-----|
| Zero import pipeline changes | Requires full catalog import (time + quota) |
| Actually a better demo than section-import | For 50K+ product stores, sample may not represent all categories |
| Turns a limitation into a feature ("auto-categorization") | More frontend work (facet bar, cluster display) |
| Solves the real need (browsing within a section) | Doesn't solve "I only want 30 products from this specific category" |

### Best for

The demo use case. If the goal is to WOW merchants, showing them auto-categorized search with facets is more impressive than just importing a subset. This makes the "full import" a feature, not a limitation.

---

## Approach 5: Hybrid — Smart URL Detection + Post-Import AI Filtering

### How it works

Combine the best parts of approaches 1-4:

1. **At paste time**: detect if the URL is a category page (heuristics: `/categories/`, `/collections/`, `/cp/`, URL path depth > 1)
2. **If known platform + category URL**: use Approach 2 (API call with category filter) — fast, precise
3. **If unknown platform or API fails**: fall back to Approach 3 (embedded state from category page) for a quick sample
4. **If still nothing**: full import (Approach 1) + post-filter with embeddings using the category page's title/H1 as the filter query
5. **In the playground**: always show the category facet bar (Approach 4) regardless of import method

### Decision tree:

```
User pastes URL
     │
     ├── Is it a category URL? (path heuristic)
     │    │
     │    ├── Known platform with category API? → Approach 2 (API call)
     │    │
     │    ├── Unknown platform → fetch page → has embedded state? → Approach 3
     │    │
     │    └── Nothing worked → full import + filter by category name (Approach 1)
     │
     └── Is it the store root? → full import (current behavior)
```

### What it requires

- Category URL detection heuristic (path patterns like `/categories/`, `/collections/`, `/cp/`)
- Platform-specific category API calls (for Salla/Zid/Shopify, which we already have fast-paths for)
- Embedded state fallback (already implemented)
- Post-import semantic filter (new: a kNN query using the category page title)

### Timing

- Best case (API): 5-15 seconds (only category products)
- Middle case (embedded state + API follow-up): 10-30 seconds
- Worst case (full import + filter): 30-90 seconds

### Tradeoffs

| Pro | Con |
|-----|-----|
| Works for every case (graceful degradation) | Most complex to implement |
| Fastest path when available (category API) | More code paths = more maintenance |
| Always gives a result (never "we can't import this section") | Category URL detection heuristics are imperfect |
| The playground facets make any approach feel polished | Need to handle the "category URL but flat product URLs" edge case |

### Best for

Production-grade solution. The fallback chain ensures the user always gets something relevant, and the fastest path is tried first.

---

## Recommendation

For Skawr's current stage (demo tool, WOW factor, limited engineering bandwidth):

**Start with Approach 4 (UX redesign) + Approach 2 (platform category APIs) for quick wins.**

1. **Approach 4** (facet bar in playground) — solves 80% of the problem with no backend changes. Users import the full store and filter in the UI. The auto-categorization from embeddings is a differentiator.

2. **Approach 2** (platform category APIs) — for Salla and Zid stores (your primary market), add `?category_id=` support to the existing fast-paths. This handles the "I only want printers" use case for merchants on known platforms.

3. **Approach 5** (full hybrid) — build toward this over time. The decision tree is the ideal end state but can be built incrementally.

**Don't bother with:**
- Perfect cross-platform category detection for unknown stores
- Headless browser solutions
- Per-site scrapers

The import pipeline is already good. The gap is in the **playground UX** — showing the user they can drill into sections of their imported catalog.
