# Skawr Search Widget — Design Document

**Status:** Draft  
**Author:** Skawr Engineering  
**Date:** July 2025  
**Package:** `@skawr/search-widget`  
**Repo:** `skawr-sdks` (new package at `frontend/widget/`)

---

## Table of Contents

1. [Context & Problem Statement](#1-context--problem-statement)
2. [Architecture Overview](#2-architecture-overview)
3. [Package Structure](#3-package-structure)
4. [CDN Distribution](#4-cdn-distribution)
5. [npm Distribution](#5-npm-distribution)
6. [Widget Variants](#6-widget-variants)
7. [UI Design](#7-ui-design)
8. [Graceful Degradation](#8-graceful-degradation)
9. [Salla Integration Update](#9-salla-integration-update)
10. [Shopify Integration](#10-shopify-integration)
11. [Dashboard Widget Management](#11-dashboard-widget-management)
12. [Analytics Integration](#12-analytics-integration)
13. [Versioning & Updates](#13-versioning--updates)
14. [Performance Budget](#14-performance-budget)
15. [Implementation Plan](#15-implementation-plan)

---

## 1. Context & Problem Statement

Skawr is a search SaaS for MENA e-commerce merchants. The current SDK landscape:

| Package | Purpose | Size | Status |
|---------|---------|------|--------|
| `@skawr/search` | Headless API client (search, autocomplete, suggest) | ~1.7KB gzipped | ✅ Published to npm |
| `@skawr/search-widget` | UI widget merchants embed on stores | — | ❌ **Does not exist** |

The problem: the Salla app manifest references a dead CloudFront URL (`d156mvss01eg3e.cloudfront.net/v1/salla/widget/loader.js`) that was never built. The backend has a `/widget/config` endpoint that serves merchant configuration, but there is no actual frontend bundle to consume it.

**We need a production-ready UI widget that:**

- Uses `@skawr/search` internally for data fetching
- Works as a CDN one-liner for non-technical merchants (Salla, Shopify)
- Works as an npm package for developers building custom integrations
- Supports RTL (Arabic) natively — this is the primary market
- Handles 402 (subscription expired) gracefully — no ugly error screens
- Stays under 15KB gzipped for the full bundle
- Fires analytics events via `@skawr/analytics-web`

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Merchant's Storefront                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           @skawr/search-widget (UI Layer)            │    │
│  │                                                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐   │    │
│  │  │ SearchBar│  │Autocomplete│ │  Inline Search  │   │    │
│  │  │  (modal) │  │ (dropdown)│ │   (embedded)    │   │    │
│  │  └────┬─────┘  └─────┬────┘  └───────┬─────────┘   │    │
│  │       │               │               │              │    │
│  │       └───────────────┼───────────────┘              │    │
│  │                       ▼                              │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │         Core Engine (state + rendering)       │   │    │
│  │  └──────────┬───────────────────┬───────────────┘   │    │
│  └─────────────┼───────────────────┼───────────────────┘    │
│                │                   │                          │
│                ▼                   ▼                          │
│  ┌─────────────────────┐  ┌─────────────────────────┐       │
│  │  @skawr/search      │  │  @skawr/analytics-web   │       │
│  │  (data fetching)    │  │  (event tracking)       │       │
│  │  ~1.7KB             │  │  ~2KB                   │       │
│  └──────────┬──────────┘  └──────────┬──────────────┘       │
└─────────────┼────────────────────────┼───────────────────────┘
              │                        │
              ▼                        ▼
        api.skawr.com          analytics-api.skawr.com
```

**Key principles:**

- **Layered:** The widget never calls `fetch` directly — it uses `@skawr/search` for all API communication
- **Framework-agnostic core:** Vanilla JS/TS engine with optional React wrapper
- **Shadow DOM isolation:** Widget styles never leak into or from the host page
- **Lazy initialization:** Widget does nothing until the user interacts (focus/click)
- **Offline-capable config:** Widget caches merchant config in localStorage for instant re-render

---

## 3. Package Structure

Lives in `skawr-sdks/frontend/widget/` alongside the existing `skawr-sdks/frontend/js/` (`@skawr/search`).

```
skawr-sdks/
├── frontend/
│   ├── js/                    # @skawr/search (existing, headless)
│   └── widget/                # @skawr/search-widget (NEW)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts     # Library mode (CDN + ESM)
│       ├── src/
│       │   ├── index.ts       # npm entry (ESM)
│       │   ├── cdn.ts         # CDN entry (IIFE, auto-init)
│       │   ├── core/
│       │   │   ├── engine.ts          # Search state machine
│       │   │   ├── renderer.ts        # DOM rendering (Shadow DOM)
│       │   │   ├── config.ts          # Config fetching + caching
│       │   │   └── error-boundary.ts  # Graceful degradation
│       │   ├── variants/
│       │   │   ├── search-bar.ts      # Modal/overlay variant
│       │   │   ├── inline-search.ts   # Embedded variant
│       │   │   └── autocomplete.ts    # Dropdown variant
│       │   ├── styles/
│       │   │   ├── base.css           # Shared styles (CSS logical properties)
│       │   │   ├── light.css          # Light theme tokens
│       │   │   └── dark.css           # Dark theme tokens
│       │   ├── i18n/
│       │   │   ├── ar.ts             # Arabic strings (default)
│       │   │   └── en.ts             # English strings
│       │   └── react/
│       │       ├── index.ts          # React wrapper entry
│       │       ├── SkawrSearch.tsx    # <SkawrSearch /> component
│       │       └── useSkawrSearch.ts  # Hook for custom UIs
│       ├── tests/
│       └── dist/
│           ├── skawr-widget-v1.js    # CDN bundle (IIFE)
│           ├── skawr-widget-v1.css   # Extracted styles
│           ├── index.js              # ESM for npm
│           └── react/
│               └── index.js          # React wrapper ESM
```

### Build Setup (Vite Library Mode)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cdn: resolve(__dirname, 'src/cdn.ts'),
      },
      formats: ['es', 'iife'],
      name: 'SkawrWidget',
      fileName: (format, entry) => {
        if (entry === 'cdn') return `skawr-widget-v1.${format === 'iife' ? 'js' : 'mjs'}`;
        return `index.${format === 'es' ? 'js' : 'cjs'}`;
      },
    },
    rollupOptions: {
      external: ['react', 'react-dom'], // Only external for ESM build
    },
    cssCodeSplit: false, // Single CSS file
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, passes: 2 },
    },
  },
});
```

### package.json

```json
{
  "name": "@skawr/search-widget",
  "version": "1.0.0",
  "description": "Drop-in search widget for Skawr merchants — RTL-first, < 15KB",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
    },
    "./react": {
      "import": { "types": "./dist/react/index.d.ts", "default": "./dist/react/index.js" }
    },
    "./cdn": "./dist/skawr-widget-v1.js"
  },
  "dependencies": {
    "@skawr/search": "^0.2.0"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "react-dom": { "optional": true }
  }
}
```

---

## 4. CDN Distribution

### The One-Liner

Non-technical merchants paste this in their store's `<head>`:

```html
<script
  src="https://cdn.skawr.com/widget/v1/skawr-widget.js"
  data-key="a1b2c3d4"
  data-variant="search-bar"
  async
></script>
```

That's it. No config files, no build tools, no JavaScript knowledge required.

### How Auto-Init Works

```typescript
// src/cdn.ts
import { SkawrWidget } from './core/engine';

(function autoInit() {
  // Find the script tag that loaded us
  const script = document.currentScript
    || document.querySelector('script[data-key][src*="skawr-widget"]');

  if (!script) return;

  const config = {
    publicKey: script.getAttribute('data-key'),
    variant: script.getAttribute('data-variant') || 'search-bar',
    language: script.getAttribute('data-lang') || 'ar',
    theme: script.getAttribute('data-theme') || 'auto',
    placeholder: script.getAttribute('data-placeholder'),
    container: script.getAttribute('data-container'), // CSS selector for inline variant
  };

  if (!config.publicKey) {
    console.warn('[Skawr] Missing data-key attribute. Widget will not initialize.');
    return;
  }

  // Expose global for programmatic control
  window.SkawrWidget = new SkawrWidget(config);

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.SkawrWidget.mount());
  } else {
    window.SkawrWidget.mount();
  }
})();
```

### CDN Data Attributes

| Attribute | Required | Default | Description |
|-----------|----------|---------|-------------|
| `data-key` | ✅ | — | 8-char public API key prefix |
| `data-variant` | — | `search-bar` | `search-bar`, `inline`, `autocomplete` |
| `data-lang` | — | `ar` | `ar` or `en` |
| `data-theme` | — | `auto` | `light`, `dark`, or `auto` (follows prefers-color-scheme) |
| `data-placeholder` | — | Per-language default | Custom placeholder text |
| `data-container` | — | — | CSS selector for inline variant mount point |

### CDN Infrastructure

```
┌──────────────┐       ┌─────────────────┐       ┌──────────────────┐
│  CI/CD Build │──────▶│   S3 Bucket     │──────▶│   CloudFront     │
│  (GitHub     │       │  skawr-cdn-     │       │   cdn.skawr.com  │
│   Actions)   │       │  assets/widget/ │       │                  │
└──────────────┘       └─────────────────┘       └──────────────────┘
```

**S3 bucket structure:**
```
skawr-cdn-assets/
├── widget/
│   ├── v1/
│   │   ├── skawr-widget.js          # Latest v1.x (auto-updated)
│   │   ├── skawr-widget.js.map      # Source map
│   │   ├── skawr-widget.css         # Extracted styles
│   │   ├── skawr-widget-1.0.0.js    # Pinned version
│   │   └── skawr-widget-1.0.1.js    # Pinned version
│   └── v2/                           # Future major version
│       └── skawr-widget.js
```

**CloudFront config:**
- Origin: S3 bucket with OAI
- Cache-Control: `public, max-age=3600, s-maxage=86400` (1h browser, 24h edge)
- CORS: `Access-Control-Allow-Origin: *`
- Compression: Brotli + gzip
- Custom domain: `cdn.skawr.com`

---

## 5. npm Distribution

### Vanilla JS (programmatic)

```bash
npm install @skawr/search-widget
```

```typescript
import { SkawrWidget } from '@skawr/search-widget';

const widget = new SkawrWidget({
  publicKey: 'a1b2c3d4',
  variant: 'search-bar',
  language: 'ar',
  theme: 'auto',
});

// Mount to a specific element (or auto-finds <body>)
widget.mount(document.getElementById('search-container'));

// Programmatic control
widget.open();
widget.close();
widget.setQuery('laptop');
widget.destroy();
```

### React Wrapper (`@skawr/search-widget/react`)

```tsx
import { SkawrSearch } from '@skawr/search-widget/react';

function App() {
  return (
    <SkawrSearch
      publicKey="a1b2c3d4"
      variant="search-bar"
      language="ar"
      theme="auto"
      placeholder="ابحث عن المنتجات..."
      onSearch={(query, results) => console.log(query, results)}
      onResultClick={(result) => window.location.href = result.product_url}
    />
  );
}
```

### Hook for Custom UIs

```tsx
import { useSkawrSearch } from '@skawr/search-widget/react';

function CustomSearch() {
  const {
    query, setQuery,
    results, isLoading, error,
    suggestions,
    search, clear,
  } = useSkawrSearch({ publicKey: 'a1b2c3d4' });

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {isLoading && <Spinner />}
      {results.map(r => <ProductCard key={r.id} product={r} />)}
    </div>
  );
}
```

---

## 6. Widget Variants

### 6.1 Search Bar (Modal/Overlay)

The default variant. Like Algolia DocSearch / Cmd+K patterns.

**Behavior:**
1. Renders a compact search trigger button/bar in the merchant's header
2. On focus/click → opens a full-screen modal (mobile) or centered overlay (desktop)
3. Shows autocomplete suggestions as user types (debounced 200ms)
4. Displays results in the overlay — clicking a result navigates to the product page
5. Keyboard navigation: ↑/↓ arrows, Enter to select, Escape to close
6. Cmd/Ctrl+K shortcut opens the modal (configurable)

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  ╭─────────────────────────────────────────────────╮ │
│  │  🔍  ابحث عن المنتجات...              ⌘K      │ │
│  ╰─────────────────────────────────────────────────╯ │
│                                                       │
│  ┌─ Suggestions ────────────────────────────────┐    │
│  │  لابتوب ابل                                  │    │
│  │  لابتوب قيمنق                               │    │
│  │  لابتوب لينوفو                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
│  ┌─ Results ────────────────────────────────────┐    │
│  │  [img] MacBook Pro M4            4,999 ر.س   │    │
│  │  [img] ASUS ROG Strix           3,299 ر.س   │    │
│  │  [img] Lenovo ThinkPad          2,199 ر.س   │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
│  Powered by Skawr                                    │
└──────────────────────────────────────────────────────┘
```

### 6.2 Inline Search (Embedded)

Replaces the store's default search results page. Mounts into a designated container.

**Behavior:**
1. Merchant provides a `data-container` CSS selector
2. Widget renders a search input + results grid in that container
3. URL sync: updates `?q=` query param for deep-linking and back-button support
4. Supports faceted filtering (price range, category) if the index has facets configured
5. Pagination (load more button, not infinite scroll — for performance)

**Use case:** Salla/Shopify stores that want to completely replace the default search page.

### 6.3 Autocomplete Dropdown

Lightweight variant that only shows suggestions and top results under the input.

**Behavior:**
1. Attaches to an existing `<input>` element on the page
2. Shows a dropdown with suggestion completions + top 3 product previews
3. Clicking a suggestion performs the search; clicking a product navigates to it
4. Lightweight — doesn't render full results, just a teaser

**Use case:** Stores that already have a search results page but want smarter autocomplete.

---

## 7. UI Design

### Design Tokens

Following the Skawr design system — the widget is an "app UI" component (not a marketing page), so it uses the app conventions with a bridge flavor since it lives on merchant sites.

```css
:host {
  /* Typography */
  --skawr-font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
  --skawr-font-ar: 'IBM Plex Sans Arabic', system-ui, sans-serif;
  --skawr-font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Colors — Light */
  --skawr-bg-overlay: rgba(0, 0, 0, 0.5);
  --skawr-bg-surface: #ffffff;
  --skawr-bg-input: #f4f4f5;
  --skawr-border: rgba(0, 0, 0, 0.08);
  --skawr-text-primary: #18181b;
  --skawr-text-secondary: #71717a;
  --skawr-text-muted: #a1a1aa;
  --skawr-accent: #ED7453;
  --skawr-accent-hover: #E95223;
  --skawr-radius: 8px;
  --skawr-radius-lg: 12px;

  /* Colors — Dark (toggled via prefers-color-scheme or data-theme) */
  --skawr-bg-surface-dark: #18181b;
  --skawr-bg-input-dark: #27272a;
  --skawr-border-dark: rgba(255, 255, 255, 0.1);
  --skawr-text-primary-dark: #f4f4f5;
  --skawr-text-secondary-dark: #a1a1aa;
}
```

### RTL Support

RTL is the default — Arabic is the primary market. CSS logical properties throughout:

```css
/* ✅ Correct — works in both LTR and RTL */
.skawr-result-card {
  padding-inline-start: 12px;
  padding-inline-end: 16px;
  margin-block-end: 8px;
  border-inline-start: 3px solid var(--skawr-accent);
  text-align: start;
}

/* ❌ Never — breaks in RTL */
.skawr-result-card {
  padding-left: 12px;
  text-align: left;
}
```

**Direction detection:**
1. Check `data-lang` attribute → `ar` = RTL, `en` = LTR
2. Fallback: detect `dir` attribute on `<html>` element
3. Set `dir="rtl"` on the Shadow DOM host

### Dark/Light Theme

```typescript
function resolveTheme(preference: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  if (preference !== 'auto') return preference;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
```

The widget listens to `matchMedia` changes and re-renders when the system theme flips.

### Shadow DOM Isolation

All widget UI lives inside a Shadow DOM to prevent CSS collisions with the host site:

```typescript
class SkawrWidgetElement extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Inject styles into shadow root (not document head)
    const style = document.createElement('style');
    style.textContent = WIDGET_STYLES; // Inlined at build time
    this.shadow.appendChild(style);

    // Render widget UI
    this.shadow.appendChild(this.render());
  }
}

customElements.define('skawr-search', SkawrWidgetElement);
```

### Font Loading

The widget does NOT load fonts by default — it uses the system font stack. If the merchant's site already loads Plus Jakarta Sans or IBM Plex Sans Arabic, the widget inherits them. Otherwise, it falls back gracefully to `system-ui`.

Optional: merchants can add `data-load-fonts="true"` to load Skawr's preferred fonts via Google Fonts.

---

## 8. Graceful Degradation

The widget must never show a raw error to a shopper. Every failure state has a designed fallback.

### 8.1 HTTP 402 — Subscription Expired

**Trigger:** `@skawr/search` throws `SearchError` with status 402.

**Behavior:**
- **Search bar variant:** Hide the widget entirely. Remove the trigger from the DOM. The merchant's original search (if any) becomes active again.
- **Inline variant:** Show a neutral empty state: "البحث غير متوفر حالياً" (Search unavailable at this time). No error styling, no red colors. Looks intentional, not broken.
- **No "pay to continue" prompts** — shoppers aren't the customer, merchants are. The dashboard handles upgrade nudges.

```typescript
// Error boundary logic
if (error.status === 402) {
  this.unmount(); // Silently remove widget
  // Optionally dispatch event for merchant's code to handle
  document.dispatchEvent(new CustomEvent('skawr:subscription-expired'));
  return;
}
```

### 8.2 HTTP 5xx — Server Error

**Behavior:**
- Show a subtle inline message: "حدث خطأ، يرجى المحاولة لاحقاً" (Something went wrong, please try again later)
- Auto-retry once after 3 seconds
- If retry fails, show the message with a manual "Retry" button
- No stack traces, no error codes visible to shoppers

### 8.3 Network Timeout

**Behavior:**
- The `@skawr/search` client has a 10s default timeout
- On timeout: show "اتصال بطيء، يرجى المحاولة مرة أخرى" (Slow connection, please try again)
- Show a retry button
- If the merchant's site is offline entirely, the widget stays dormant (never initialized)

### 8.4 No Results

**Behavior:**
- Show "لا توجد نتائج لـ «{query}»" (No results for "{query}")
- Below: show trending/popular queries from the suggest endpoint
- If suggest also returns empty: show "جرّب البحث بكلمات أخرى" (Try different search terms)

### 8.5 Invalid/Missing API Key

**Behavior:**
- Widget does not mount at all
- Logs a console warning: `[Skawr] Invalid API key. Widget disabled.`
- In development mode (`localhost`): shows a visible banner with setup instructions

### Error State Priority

```
Missing key     → Don't mount, console warn
402 (expired)   → Unmount silently
401 (invalid)   → Don't mount, console warn
5xx             → Retry once, then show gentle message
Timeout         → Show retry prompt
No results      → Show empty state + suggestions
```

---

## 9. Salla Integration Update

### Current State (Broken)

The Salla app manifest (`salla-app-manifest.json`) points to a dead CloudFront distribution:

```json
{
  "widgets": [{
    "zone": "header.search",
    "url": "https://d156mvss01eg3e.cloudfront.net/v1/salla/widget/loader.js",  // ❌ DEAD
    "position": "replace"
  }]
}
```

The check-no-cruft script already flags this as dead: `"dead widget snippet (points at a destroyed CloudFront); see #170/#183"`.

### Updated Flow

```
┌──────────────────┐         ┌────────────────────┐        ┌─────────────────┐
│  Salla Storefront│────────▶│  cdn.skawr.com/    │        │  api.skawr.com  │
│  (loads widget)  │         │  widget/v1/        │        │  /v1/salla/     │
│                  │         │  skawr-widget.js   │        │  widget/config  │
└──────────────────┘         └────────────────────┘        └─────────────────┘
        │                            │                            │
        │  1. Load widget JS         │                            │
        │◀───────────────────────────┘                            │
        │                                                          │
        │  2. Widget reads store_id from Salla context             │
        │  3. Fetch config (api_key, theme, lang)                  │
        │─────────────────────────────────────────────────────────▶│
        │                                                          │
        │  4. Config response (api_key prefix, merchant prefs)     │
        │◀─────────────────────────────────────────────────────────│
        │                                                          │
        │  5. Initialize @skawr/search with prefix key             │
        │  6. Render widget in header.search zone                  │
```

### Manifest Update

```json
{
  "widgets": [{
    "zone": "header.search",
    "name": "Skawr AI Search Widget",
    "description": {
      "ar": "بحث ذكي يحل محل البحث الافتراضي",
      "en": "Intelligent search replacing default search"
    },
    "type": "script",
    "url": "https://cdn.skawr.com/widget/v1/skawr-widget.js",
    "position": "replace"
  }]
}
```

### Salla-Specific Widget Loader

For Salla, the widget auto-detects the store context without requiring `data-key`:

```typescript
// Salla stores expose window.__SALLA__ context
function getSallaContext(): { storeId: string } | null {
  const salla = (window as any).__SALLA__;
  if (salla?.store?.id) {
    return { storeId: salla.store.id };
  }
  // Fallback: parse from meta tag
  const meta = document.querySelector('meta[name="salla-store-id"]');
  return meta ? { storeId: meta.getAttribute('content')! } : null;
}

// In Salla mode: fetch config from /v1/salla/widget/config?store_id=...
// This returns the API key prefix + merchant preferences
async function initSallaWidget() {
  const ctx = getSallaContext();
  if (!ctx) return; // Not a Salla store

  const config = await fetch(
    `https://api.skawr.com/v1/salla/widget/config?store_id=${ctx.storeId}`
  ).then(r => r.json());

  window.SkawrWidget = new SkawrWidget({
    publicKey: config.api_key,
    language: config.config.language,
    theme: config.config.theme,
    placeholder: config.config.placeholder,
    variant: 'search-bar',
  });

  window.SkawrWidget.mount();
}
```

### OAuth Redirect Update

The manifest `oauth.redirect_uri` also needs updating from the dead CloudFront to the live API:

```json
{
  "oauth": {
    "redirect_uri": "https://api.skawr.com/v1/salla/oauth/callback",
    "scopes": ["products:read", "products:write", "store:read"]
  }
}
```

---

## 10. Shopify Integration

### Theme App Extension

Shopify uses "theme app extensions" to embed third-party UI. The widget lives in `skawr-shopify-extension/`.

**File structure:**
```
skawr-shopify-extension/
├── extensions/
│   └── skawr-search/
│       ├── blocks/
│       │   └── search-widget.liquid    # Block for theme editor
│       ├── assets/
│       │   └── skawr-loader.js         # Thin loader → CDN widget
│       └── locales/
│           ├── ar.json
│           └── en.default.json
├── shopify.app.toml
└── package.json
```

### Block Template (Liquid)

```liquid
{% comment %} blocks/search-widget.liquid {% endcomment %}
{% schema %}
{
  "name": "Skawr AI Search",
  "target": "section",
  "settings": [
    {
      "type": "text",
      "id": "api_key",
      "label": "Skawr API Key (public prefix)",
      "info": "The 8-character key from your Skawr dashboard"
    },
    {
      "type": "select",
      "id": "variant",
      "label": "Widget Style",
      "default": "search-bar",
      "options": [
        { "value": "search-bar", "label": "Search Bar (modal overlay)" },
        { "value": "inline", "label": "Inline (embedded results)" },
        { "value": "autocomplete", "label": "Autocomplete (dropdown)" }
      ]
    },
    {
      "type": "select",
      "id": "theme",
      "label": "Theme",
      "default": "auto",
      "options": [
        { "value": "auto", "label": "Auto (follow system)" },
        { "value": "light", "label": "Light" },
        { "value": "dark", "label": "Dark" }
      ]
    },
    {
      "type": "text",
      "id": "placeholder",
      "label": "Search placeholder text",
      "default": "Search products..."
    }
  ]
}
{% endschema %}

<div id="skawr-search-root"></div>

<script
  src="https://cdn.skawr.com/widget/v1/skawr-widget.js"
  data-key="{{ block.settings.api_key }}"
  data-variant="{{ block.settings.variant }}"
  data-theme="{{ block.settings.theme }}"
  data-placeholder="{{ block.settings.placeholder }}"
  data-container="#skawr-search-root"
  async
  defer
></script>
```

### Shopify App Setup Flow

1. Merchant installs "Skawr AI Search" from Shopify App Store
2. App OAuth redirects to `api.skawr.com/v1/shopify/oauth/callback`
3. Backend provisions merchant account + API key
4. Post-install page says: "Enable the widget: Online Store → Themes → Customize → App embeds → Skawr Search"
5. Merchant enables the app embed in the theme editor — widget appears immediately

### Shopify-Specific Behavior

- Auto-detect Shopify context via `window.Shopify.shop`
- Product URLs use Shopify's `/products/{handle}` format
- Currency formatting follows Shopify's `Shopify.currency.active` setting
- Support for Shopify's AJAX cart API (add-to-cart from search results)

---

## 11. Dashboard Widget Management

The "Embed/Widget" page in `skawr-dashboards` gives merchants control over their widget.

### Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Widget / Embed                                        [Active] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Install ───────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  Platform: [Salla ▼] [Shopify] [WordPress] [Custom]     │    │
│  │                                                          │    │
│  │  ┌────────────────────────────────────────────────────┐ │    │
│  │  │ <script                                            │ │    │
│  │  │   src="https://cdn.skawr.com/widget/v1/skawr-w..." │ │    │
│  │  │   data-key="a1b2c3d4"                              │ │    │
│  │  │   data-variant="search-bar"                        │ │    │
│  │  │   async                                            │ │    │
│  │  │ ></script>                                   [📋]  │ │    │
│  │  └────────────────────────────────────────────────────┘ │    │
│  │                                                          │    │
│  │  ℹ️  Salla: Widget auto-installs — no code needed       │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─ Widget Status ─────────────────────────────────────────┐    │
│  │  Status: 🟢 Active (subscription valid until Aug 15)     │    │
│  │  Last search: 2 minutes ago                              │    │
│  │  Total searches today: 847                               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─ Customization ─────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  Variant:     [Search Bar ▼]                             │    │
│  │  Language:    [Arabic ▼]                                 │    │
│  │  Theme:       [Auto ▼]                                   │    │
│  │  Placeholder: [ابحث عن المنتجات...              ]       │    │
│  │                                                          │    │
│  │  ┌─ Preview ──────────────────────────────────────────┐ │    │
│  │  │  (live preview of the widget with current settings) │ │    │
│  │  └────────────────────────────────────────────────────┘ │    │
│  │                                                          │    │
│  │  [Save Changes]                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Platform-Specific Instructions

| Platform | Snippet | Notes |
|----------|---------|-------|
| **Salla** | N/A — auto-injected via app manifest | "Widget is automatically active on your store" |
| **Shopify** | Theme app extension embed | "Go to Themes → Customize → App embeds → enable Skawr" |
| **WordPress** | `<script>` in header via plugin or theme settings | Full snippet with data attributes |
| **Custom** | `<script>` tag or npm install | Full snippet + npm examples |

### Widget Status States

| State | Display | Cause |
|-------|---------|-------|
| 🟢 Active | "Widget is live" | Valid subscription, API key active |
| 🟡 Trial | "Trial — 7 days remaining" | Within 14-day trial period |
| 🔴 Inactive | "Widget disabled — subscription expired" | 402 state, widget self-hides |
| ⚪ Not installed | "Widget not detected on your store" | No search requests in last 24h |

### Customization API

When merchants change settings in the dashboard, it's saved to the backend and served via `/v1/salla/widget/config`:

```typescript
// PUT /api/v1/saas/widget-config
{
  "variant": "search-bar",
  "language": "ar",
  "theme": "auto",
  "placeholder": "ابحث عن المنتجات...",
  "accent_color": "#ED7453",  // Optional override
  "show_powered_by": true
}
```

---

## 12. Analytics Integration

The widget fires events through `@skawr/analytics-web` for every meaningful user interaction. This feeds into the merchant's analytics dashboard at `analytics.skawr.com`.

### Events Fired

| Event | Trigger | Properties |
|-------|---------|------------|
| `search_query` | User submits search (debounced) | `query`, `results_count`, `took_ms`, `variant` |
| `search_impression` | Results rendered and visible | `query`, `result_ids[]`, `positions[]`, `page` |
| `search_result_click` | User clicks a search result | `query`, `result_id`, `position`, `product_url` |
| `search_suggestion_click` | User clicks a suggestion | `query`, `suggestion`, `position` |
| `search_no_results` | Search returns 0 results | `query`, `variant` |
| `widget_open` | Modal/overlay opened | `trigger` (click, keyboard, focus) |
| `widget_close` | Modal/overlay closed | `query` (last query, if any) |
| `search_filter_applied` | User applies a facet filter | `query`, `filter_field`, `filter_value` |

### Integration Code

```typescript
// Inside the widget engine
import type { SkawrAnalytics } from '@skawr/analytics-web';

class WidgetAnalytics {
  private analytics: SkawrAnalytics | null = null;

  constructor(private publicKey: string) {
    this.initAnalytics();
  }

  private async initAnalytics() {
    // Dynamically import to keep it out of critical path
    try {
      const { initSkawr } = await import('@skawr/analytics-web');
      this.analytics = initSkawr({
        apiKey: this.publicKey,
        autoCapture: false, // Widget handles its own events
      });
    } catch {
      // Analytics unavailable — non-fatal, widget still works
    }
  }

  trackSearch(query: string, resultsCount: number, tookMs: number) {
    this.analytics?.track('search_query', {
      query,
      results_count: resultsCount,
      took_ms: tookMs,
      variant: this.variant,
      timestamp: Date.now(),
    });
  }

  trackClick(query: string, resultId: string, position: number) {
    this.analytics?.track('search_result_click', {
      query,
      result_id: resultId,
      position,
    });
  }

  trackImpression(query: string, resultIds: string[], page: number) {
    this.analytics?.track('search_impression', {
      query,
      result_ids: resultIds,
      positions: resultIds.map((_, i) => i + 1 + (page - 1) * 20),
      page,
    });
  }
}
```

### CDN Bundle Consideration

For CDN distribution, `@skawr/analytics-web` is bundled inline (not an external dependency). The analytics SDK is ~2KB gzipped, keeping the total widget under the 15KB budget.

### Opt-Out

Merchants can disable analytics tracking via config:

```html
<script src="..." data-key="..." data-analytics="false" async></script>
```

Or programmatically:

```typescript
const widget = new SkawrWidget({ publicKey: '...', analytics: false });
```

---

## 13. Versioning & Updates

### URL Scheme

```
https://cdn.skawr.com/widget/v{major}/skawr-widget.js
```

- `v1/skawr-widget.js` — always the latest `1.x.x` release (auto-updated)
- `v1/skawr-widget-1.2.3.js` — pinned to exact version (for developers who need stability)

### Versioning Strategy

| Change Type | Example | Version Bump | CDN Behavior |
|-------------|---------|--------------|--------------|
| Bug fix | Fix RTL alignment | 1.0.0 → 1.0.1 | Auto-deployed to `v1/skawr-widget.js` |
| New feature | Add filter chips | 1.0.1 → 1.1.0 | Auto-deployed to `v1/skawr-widget.js` |
| Breaking change | New config format | 1.x → 2.0.0 | New URL: `v2/skawr-widget.js`. v1 still served. |

### Merchant Experience

- **Non-technical merchants (CDN):** Always get latest minor/patch. No action needed.
- **Developers (npm):** Standard semver. Pin in `package.json` as desired.
- **Major version migration:** Old versions served indefinitely (at least 12 months). Deprecation notice shown in dashboard. Migration guide published.

### Deployment Pipeline

```
Push to main → GitHub Actions → Build → Test → S3 Upload
                                                    │
                                    ┌───────────────┴──────────────────┐
                                    │                                   │
                              Upload pinned                    Update "latest"
                              v1/skawr-widget-1.2.3.js        v1/skawr-widget.js
                                    │                                   │
                                    └───────────────┬──────────────────┘
                                                    │
                                        CloudFront Invalidation
                                        (path: /widget/v1/skawr-widget.js)
```

### Cache Invalidation

- Pinned versions: `Cache-Control: public, max-age=31536000, immutable` (1 year, never changes)
- Latest alias: `Cache-Control: public, max-age=3600, s-maxage=86400` (1h browser, 24h CDN edge)
- On deploy: CloudFront invalidation on the latest alias path only

---

## 14. Performance Budget

**Target: < 15KB gzipped for the full CDN bundle (JS + CSS inlined).**

### Budget Breakdown

| Component | Estimated Size (gzip) | Notes |
|-----------|----------------------|-------|
| `@skawr/search` (bundled) | ~1.7KB | Fetch wrapper, zero deps |
| `@skawr/analytics-web` (bundled) | ~2KB | Event tracking, batched |
| Widget core engine | ~4KB | State machine, rendering |
| Styles (inlined CSS) | ~2KB | All variants + themes |
| i18n strings (ar + en) | ~0.5KB | Two languages |
| Shadow DOM + Custom Element | ~1KB | Registration, lifecycle |
| Variant: search-bar (modal) | ~2KB | Overlay, keyboard nav |
| Variant: inline | ~1.5KB | Pagination, URL sync |
| Variant: autocomplete | ~1KB | Dropdown rendering |
| **Total (single variant)** | **~12KB** | Under budget ✓ |
| **Total (all variants)** | **~14KB** | Under budget ✓ |

### Performance Constraints

1. **No framework runtime.** No React, no Preact, no Lit. Vanilla Custom Elements.
2. **No external font loading by default.** System font stack.
3. **Lazy analytics.** `@skawr/analytics-web` loaded via dynamic import after first interaction.
4. **Debounced API calls.** 200ms debounce on keystroke search, 500ms on autocomplete.
5. **No images in the bundle.** Icons are inline SVG (search icon = ~200 bytes).
6. **Tree-shakeable npm build.** Developers importing only `useSkawrSearch` don't pay for the full widget.

### Measurement

Run on every CI build:

```bash
# Check bundle size
npx bundlesize --max-size 15KB --files dist/skawr-widget-v1.js

# Or with size-limit
npx size-limit
```

**size-limit config:**
```json
[
  {
    "path": "dist/skawr-widget-v1.js",
    "limit": "15 KB",
    "gzip": true
  },
  {
    "path": "dist/index.js",
    "limit": "12 KB",
    "gzip": true,
    "import": "{ SkawrWidget }"
  }
]
```

### Loading Strategy

```html
<!-- async: doesn't block page render -->
<script src="https://cdn.skawr.com/widget/v1/skawr-widget.js" async></script>
```

- Widget JS loads in parallel with page rendering
- Only initializes after `DOMContentLoaded`
- First API call happens on user interaction (focus/click), not on page load
- Config is cached in `localStorage` for instant subsequent renders

---

## 15. Implementation Plan

### Phase 1: MVP (2 weeks)

**Goal:** A working search-bar widget on CDN that Salla merchants can use.

| Task | Priority | Est. |
|------|----------|------|
| Set up `skawr-sdks/frontend/widget/` package with Vite | P0 | 1d |
| Core engine: config, state machine, Shadow DOM renderer | P0 | 3d |
| Search bar variant (modal overlay, basic results) | P0 | 2d |
| RTL + Arabic support (CSS logical properties, i18n) | P0 | 1d |
| Graceful 402/5xx handling | P0 | 1d |
| CDN build (IIFE bundle) + S3/CloudFront setup | P0 | 1d |
| Update Salla manifest URL | P0 | 0.5d |
| Integration test with live Salla store | P0 | 0.5d |

**MVP deliverables:**
- `cdn.skawr.com/widget/v1/skawr-widget.js` is live
- Salla stores with Skawr installed get a working search modal
- 402 state gracefully hides the widget
- Arabic RTL works correctly

### Phase 2: V1 (2 weeks)

**Goal:** Full feature set, npm package, Shopify support.

| Task | Priority | Est. |
|------|----------|------|
| Inline search variant | P1 | 2d |
| Autocomplete dropdown variant | P1 | 1.5d |
| Dark/light theme + auto detection | P1 | 1d |
| npm package publish (`@skawr/search-widget`) | P1 | 1d |
| React wrapper (`@skawr/search-widget/react`) | P1 | 1.5d |
| Shopify theme app extension setup | P1 | 2d |
| Analytics integration (`@skawr/analytics-web`) | P1 | 1d |
| Dashboard "Widget" page (snippet, status, preview) | P1 | 2d |
| Keyboard navigation (↑↓ Enter Esc) + a11y | P1 | 1d |
| Performance audit + bundle size enforcement | P1 | 0.5d |

**V1 deliverables:**
- All 3 variants working
- Published to npm
- Shopify app extension live
- Dashboard page for widget management
- Analytics flowing through

### Phase 3: V2 (4 weeks, future)

**Goal:** Advanced features, customization, marketplace-grade.

| Task | Priority | Est. |
|------|----------|------|
| Visual customization in dashboard (colors, radius, fonts) | P2 | 3d |
| Faceted search (filter chips for price, category) | P2 | 3d |
| Product quick-view in results (image zoom, add to cart) | P2 | 2d |
| Search-as-you-type with instant results (no submit) | P2 | 2d |
| WordPress plugin wrapper | P2 | 2d |
| A/B testing support (widget variant experiments) | P2 | 3d |
| Personalization (recent searches, user preferences) | P2 | 3d |
| Voice search (Web Speech API, Arabic) | P3 | 3d |
| AI-powered "did you mean" corrections | P3 | 2d |

---

## Appendix A: Decision Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Vanilla Custom Elements over Preact/Lit | 15KB budget is tight; framework runtime adds 3-5KB | Preact (too heavy), Lit (unnecessary abstraction) |
| Shadow DOM for style isolation | Merchant CSS varies wildly; can't risk collisions | Scoped CSS classes (fragile), iframe (bad perf) |
| Bundle analytics inline (CDN) | Can't rely on merchants installing a second script | Separate `<script>` (extra HTTP request, opt-in friction) |
| Default to Arabic/RTL | 90%+ of merchants are in Saudi Arabia | Default English (would require all merchants to configure) |
| Hide widget on 402 (not error message) | Shoppers don't control the subscription; showing errors hurts merchant UX | "Search unavailable" message (still looks broken to shoppers) |
| `data-key` on script tag (not config endpoint) | One-liner simplicity; no extra network request before widget init | Required `/config` call (adds latency, fails if API is down) |
| S3 + CloudFront for CDN | Already used for other Skawr assets; cost-effective, global edge | Cloudflare R2 (no existing infra), Fastly (overkill) |

---

## Appendix B: Security Considerations

- **API key exposure:** Only the 8-character prefix is used client-side. This grants search-only access. Full key is never in the widget.
- **XSS prevention:** All user input (query, result titles) is escaped before DOM insertion. No `innerHTML` with untrusted data.
- **CSP compatibility:** Widget uses no `eval()`, no inline event handlers. Works with strict Content-Security-Policy headers.
- **Subresource Integrity:** CDN-served widget includes an SRI hash in documentation snippets for merchants who want extra security.
- **CORS:** `api.skawr.com` allows `*` origin for search endpoints (they're public by design).

---

## Appendix C: Accessibility

- **ARIA roles:** Search input has `role="combobox"`, results list has `role="listbox"`, individual results have `role="option"`
- **Keyboard navigation:** Full keyboard support (Tab, Arrow keys, Enter, Escape)
- **Screen reader announcements:** Live region announces result count ("3 results found for laptop")
- **Focus management:** Focus trapped in modal when open, returns to trigger on close
- **Color contrast:** All text meets WCAG 2.1 AA contrast ratios in both light and dark themes
- **Reduced motion:** Respects `prefers-reduced-motion` — disables all animations
