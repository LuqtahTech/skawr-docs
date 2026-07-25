# Skawr Analytics — Technical Reference (Steering File)

This document is a canonical technical reference for the skawr-analytics platform. Use it to orient yourself before making changes to skawr-analytics or its SDKs.

---

## 1. Overview

**Skawr Analytics** is a MENA-first product analytics platform (comparable to Amplitude/Mixpanel). Live at `analytics.skawr.com`.

- **Backend**: FastAPI (Python)
- **Frontend**: Next.js 16
- **Database**: PostgreSQL (single store for events + auth + cohorts + dashboards)
- **No queue, no warehouse** — Postgres handles both write and read paths directly
- **Designed for future ClickHouse migration** on the read path

---

## 2. Architecture

```
Customer App → SDK → POST /api/v1/events/track → API Key auth
                                                → Enrich (UA, GeoIP, UTM)
                                                → Compute session_id (30min inactivity timeout)
                                                → Evaluate event rules
                                                → INSERT events table

Dashboard → GET /api/v1/analytics/* → JWT/Zitadel auth → SQL aggregates
```

Single Postgres table (`events`), two access paths:
- **Write**: SDK → API key auth → enrichment → insert
- **Read**: Dashboard → JWT auth → SQL aggregates on same table

---

## 3. Stack

### Backend
- Python 3.12
- FastAPI (fully async)
- SQLAlchemy 2.0 (async ORM)
- Alembic (migrations, auto-run on boot)

### Frontend
- Next.js 16 (App Router, standalone output)
- React 19
- TypeScript
- **NO Tailwind** — custom CSS only
- Auth: Zitadel SSO (mandatory)

### Auth
- Zitadel SSO for dashboard users (JWT)
- API keys for SDK ingestion

### Deploy
- Docker on VPS
- Docker Compose + Traefik reverse proxy

---

## 4. API Surface

### Public (API-key auth, CORS open to any origin)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/events/track` | Ingest one event |
| `POST /api/v1/events/identify` | Stitch anonymous_id → user_id |
| `POST /api/v1/ingest/batch` | Server-to-server batch ingest |
| `POST /api/v1/heatmaps/batch` | Ingest heatmap interactions (click/move/scroll), max 500 |
| `POST /api/v1/heatmaps/snapshot` | Store the latest DOM snapshot for a page (opt-in SDK capture, 2 MB cap) |
| `GET /api/v1/surveys/active` | Active surveys for the key's project (widget fetches these to render) |
| `POST /api/v1/surveys/{id}/respond` | Submit one survey response from the widget |
| `GET /sdk/skawr.js` | Browser SDK script |

### Dashboard (Zitadel JWT, project-ownership checked)

| Group | Endpoints |
|-------|-----------|
| Auth | signup, login, refresh, logout, me |
| Projects | CRUD + API key management |
| Analytics | summary, top-events, recent-events, timeseries, funnel, retention, cohort, paths, revenue, attribution, user/{user_id} |
| Insights | hero, feed, trends, pin, dismiss |
| Cohorts | CRUD, preview, refresh, sample users |
| Dashboards | CRUD, widgets, bulk layout save |
| Event Rules | CRUD, backfill, suggestions |
| Data Dictionary | `event-definitions`: friendly bilingual (EN/AR) display labels for raw event keys, `catalog` (every key seen), upsert, delete |
| Discovered Funnels | AI-surfaced funnel candidates |
| Heatmaps | pages, data (click/move/scroll grid), scroll (scroll-reach curve), snapshot (DOM background) |
| Behavior | frustration (rage/dead clicks, quick backs), errors ($error aggregation), element-clicks (by selector) |
| Surveys | survey CRUD + results (NPS, avg rating, choice distribution, text answers); public active + respond widget endpoints |
| Ad spend | `POST /api/v1/ad-spend` (upsert), `GET /api/v1/ad-spend` (list + SAR total) |
| FX | `POST /api/v1/fx/refresh` (force daily fetch), `GET /api/v1/fx/rates` (stored rates for a date) |

### Endpoint behavior worth knowing

- **Funnels** (`GET /api/v1/analytics/funnel`) walk each identity in true time order.
  `steps` is a comma-separated ordered list; a single step may list alternatives
  with a pipe to form an OR/branching step, e.g.
  `page_view,add_to_cart|buy_now,purchase` (step 2 matches either event).
  `window_hours` optionally bounds the first-to-last journey, and the response
  carries `median_time_to_convert_s` for users who completed the whole funnel.
- **Attribution** (`GET /api/v1/analytics/attribution`) takes a required
  `conversion_event`, one of five `model`s (`first_touch`, `last_touch`, `linear`,
  `time_decay`, `position_based`), and `lookback_days` (0-180). Conversions with no
  UTM-bearing touch go to a `(direct)` channel so `attributed_revenue_sar +
  direct_revenue_sar == total_revenue_sar`. When ad spend is recorded, each channel
  reports `cost_sar` and `roas`, and the response adds `total_cost_sar` and
  `overall_roas`.
- **Paths** (`GET /api/v1/analytics/paths`) returns ordered path sequences plus a
  transitions edge list; the `/journeys` canvas renders those transitions as a
  branching node graph.
- **Ad spend** upserts on the `(project, date, source, medium, campaign)` grain, so
  re-posting a day updates cost instead of duplicating.
- **FX feed** pulls a daily currency→SAR feed (open.er-api.com, keyless) with the
  static table as fallback; the resolved rate is stamped per revenue row at ingest
  (`_fx_rate_to_sar`) so SAR values stay reproducible.

---

## 5. Database Schema

| Table | Purpose |
|-------|---------|
| `events` | Core event table (id, event_name, user_id, session_id, anonymous_id, timestamp, date, hour, country/region/city, device_type, os, browser, project_id, environment, properties JSONB, page_url, referrer_url, path, page_title, utm_source/medium/campaign, is_bot, is_test) |
| `event_aggregates` | Pre-aggregated hourly/daily counts for performance |
| `cohorts` | Saved cohort definitions (JSONB predicate trees) |
| `dashboards` + `dashboard_widgets` | Saved dashboards on 12-column grid |
| `event_rules` | Auto-categorize raw events into semantic events |
| `discovered_funnels` | AI-surfaced funnel candidates (status: candidate/promoted/dismissed) |
| `pinned_insights` | Per-user pinned insight actions |
| `dismissed_insights` | Per-user dismissed insight actions |
| `heatmap_events` | Per-interaction click/move/scroll points (x/y percent, viewport, scroll_depth, page_path, device_type) — migration `0010` |
| `fx_rates` | Daily currency→SAR rates (`currency`, `rate_to_sar`, `rate_date`, `source`; unique on currency+date) — migration `0012` |
| `ad_spend` | Ad cost per channel/day (`date`, `source`, `medium`, `campaign`, `cost`, `currency`; unique on the channel grain) — migration `0013` |
| `page_snapshots` | Latest DOM snapshot per page for heatmap backgrounds (`page_path`, `page_url`, `snapshot_html`, viewport; one row per project+path) — migration `0014` |
| `surveys` | Merchant-defined survey (`name`, `question`, `type` nps/rating/text/choice, `choices`, `trigger`, `is_active`) — migration `0015` |
| `survey_responses` | One end-user answer to a survey (`survey_id`, `rating`, `answer`, identity, `page_path`) — migration `0015` |
| `event_definitions` | Display-name layer: friendly bilingual labels per raw event key (`event_name`, `display_name_en/ar`, `description_en/ar`, `verified`); unique on (project, event_name). Migration `0016` |

Behavior insights (frustration signals, JS errors, element click maps) add no table; they are computed on read from `events` and `heatmap_events`.

---

## 6. SDKs (5 packages)

| Package | Install | Runtime |
|---------|---------|---------|
| `@skawr/analytics-web` | `npm i @skawr/analytics-web` | Browser (vanilla JS) |
| `@skawr/analytics-react` | `npm i @skawr/analytics-react` | React / Next.js |
| `@skawr/analytics-node` | `npm i @skawr/analytics-node` | Server-side Node.js |
| `skawr-analytics` (PyPI) | `pip install skawr-analytics` | Python |
| `skawr_analytics` (Dart) | `flutter pub add skawr_analytics` | Flutter |

### Auto-Capture Events
- `$pageview`
- `$click`
- `$form_submit`
- `$error`

### Markup-Driven Tracking
- `data-skawr-track="event_name"` attribute on any element
- Additional properties via `data-skawr-*` attributes

---

## 7. Insight Engine

The insights engine computes real-time intelligence from the events table (no pre-computed table):

| Detection Type | Method |
|----------------|--------|
| **Anomaly detection** | Z-score vs same-day-of-week baseline (6-week history) |
| **Funnel drop detection** | Auto-discovers N-step paths, flags drops ≥5pp AND ≥20% relative |
| **Cohort growth/shrinkage** | Surfaces events whose unique-user count moved ≥25% week-over-week |
| **Self-benchmark** | This week's totals vs trailing 4-week average, flags ≥15% swings |
| **Segment drivers** | When an anomaly fires, attributes it to country/device/utm dimensions |

### Presentation (plain-language, bilingual, actionable)

Insight copy is jargon-free and bilingual. User-facing text has no z-scores and no `country=SA (76.3% of the delta)` strings; segments are humanized ("visitors in Saudi Arabia"). The backend emits a structured `template` + `params` per insight and the hero (English strings kept as a fallback); the frontend renders localized EN/AR titles, sub-lines, descriptions, and badges (`frontend/app/lib/insight-text.ts`). Insight titles resolve raw event keys through the display-name layer via a request-scoped label map in `app/api/v1/insights.py`. Every insight and the hero also carry an actionable recommendation (a "what to do next" line) with copy / download / share and an EN/AR toggle.

---

## 8. Frontend Pages

| Route | Purpose |
|-------|---------|
| `/` | Home: insight feed (hero anomaly card, mini-insights, peer-benchmark trends) with pin/dismiss, over the KPI + top-events + recent-events LiveDataPanel |
| `/events` | Live event stream with filters |
| `/funnels` | N-step sequential funnel builder, with OR/branching steps, conversion window, and median time-to-convert |
| `/journeys` | Visual journey canvas (React Flow) rendering `/analytics/paths` transitions as a branching node graph, with suggested funnels |
| `/retention` | D0–D30 retention curves |
| `/cohorts` | Saved cohorts with predicate tree builder (property, aggregate, recency, and sequence predicates) |
| `/heatmaps` | Click/move density grids + scroll-reach curve; backgrounds from the opt-in SDK DOM snapshot |
| `/behavior` | Behavior insights: frustration signals (rage/dead clicks, quick backs), JS error list, most-clicked elements |
| `/attribution` | Multi-touch attribution: conversion-event selector, five models, lookback, SAR, `(direct)` reconciliation, and ROAS |
| `/revenue` | Revenue in SAR: totals, AOV, by day/event/user, unconvertible currencies surfaced separately |
| `/surveys` | On-site survey builder + results (NPS, avg rating, choice distribution, text answers); widget served via the SDK |
| `/rules` | Event rules: turn raw auto-captured events (pageview/click/form_submit/error) into named semantic events, with per-match-type pattern fields, live preview, backfill, delete, and traffic-based suggestions |
| `/data-dictionary` | Data dictionary: give each raw event key a friendly bilingual (EN/AR) display label + description, with a verified badge and a catalog of every key seen; labels then render across the app |
| `/dashboards` | 12-column grid dashboards (KPI/line/funnel/cohort/retention/text widgets) |
| `/settings` | Project settings + API key CRUD |

Sidebar order under the Analyze group: Home, Events, Funnels, Journeys, Retention,
Cohorts, Heatmaps, Behavior, Attribution, Revenue, Surveys. Under the Build group:
Event rules, Data dictionary, Dashboards.

Readability: event names render as friendly labels everywhere via the data dictionary
(raw keys only in developer surfaces). Plain-language captions sit above the retention,
funnel, and revenue charts. The home insight feed and hero are bilingual with a
recommended-action block per card.

History note: PR #77 (`chore/mvp-trim`) once hid the insights home, `/rules`, and the
cohort sequence predicate for the v1 focus set. They were recreated against the current
APIs in PR #149; the backend endpoints were never removed.

---

## 9. Key Business Rules

- **Tier gating removed**: All SaaS customers get full analytics. No separate analytics billing.
- **Auto-sessions**: 30-minute inactivity timeout generates `session_id`.
- **Identity stitching**: `/events/identify` links `anonymous_id` → `user_id`. Identity ladder: `COALESCE(user_id, anonymous_id, session_id)`.
- **Reporting timezone = Asia/Riyadh (UTC+3)**: day/hour buckets use a fixed Riyadh civil day (no DST), not UTC. Applied going-forward at ingest only — historical rows keep their original UTC date. Per-project timezones are deferred (would live in an analytics-owned settings table, NOT the shared `skawr_auth` Project model). See §12.
- **Revenue currency is accept-and-flag**: supported currencies convert to SAR; unsupported currencies are counted and surfaced separately (`unconvertible_revenue`), never folded into `total_revenue_sar` at a fake 1:1 rate. See §12.
- **Live FX feed with per-row stamping**: a daily currency→SAR feed (open.er-api.com, keyless) upserts into `fx_rates`, with the static 12-currency table as the fail-safe fallback. When a revenue event is ingested, the resolved rate is stamped on the row (`_fx_rate_to_sar`), so the read path reuses that exact rate for reproducible SAR values and can convert currencies beyond the static table. The refresh never raises; on any failure callers fall back to stored then static rates. See §12.
- **Funnels are true sequential walks with OR-groups**: step i must occur after the occurrence that satisfied step i-1. A step can match any of several events via pipe syntax (`add_to_cart|buy_now`), an optional `window_hours` bounds first-to-last, and `median_time_to_convert_s` is reported for full converters.
- **Attribution reconciles a `(direct)` bucket**: conversions with no UTM-bearing touch in the lookback window are credited to `(direct)` rather than dropped, so attributed + direct equals total revenue. With ad spend recorded, channels carry `cost_sar` / `roas` and the response adds `total_cost_sar` / `overall_roas`. Foreign ad spend that cannot be converted to SAR is skipped, never counted at a fake 1:1 rate.
- **Event rules derive semantic events in-transaction**: When a raw event matches a rule, derived events are INSERTed in the same DB commit. No separate pipeline.
- **Display-name layer (data dictionary)**: raw event keys are the immutable engineering contract and are never rewritten. Each key can get an editable, bilingual (EN/AR) display label + description (`event_definitions` table, `/api/v1/event-definitions`, `/data-dictionary` page). Friendly labels render everywhere a person reads data (events, funnels, journeys, revenue, insights); raw keys stay only in developer surfaces (hover title, deep-link params). Unlabeled keys fall back to a de-slugged form (`add_to_cart` becomes "Add to Cart"), computed identically on backend and frontend.
- **Insights are plain-language, bilingual, and actionable**: user-facing copy has no z-score / delta jargon; the backend ships `template` + `params` and the frontend localizes EN/AR; each card carries a recommended next action. Home-feed filters key off the machine `kind`, not the localized display text.

---

## 10. Local Development

```bash
docker compose up
```

| Service | URL |
|---------|-----|
| Dashboard | `http://localhost:3004` |
| API docs (Swagger) | `http://localhost:8004/docs` |

- Alembic migrations auto-run on container boot (via `docker-entrypoint.sh`)
- No additional setup required

### Demo seeder

`backend/scripts/seed_demo_account.py` fills one project ("Skawr Analytics Demo", matched by name) with deterministic data (fixed RNG seed) that lights up every tab: funnels, revenue, attribution, heatmaps, retention, cohorts, insights (a deliberate anomaly), dashboard, event rules, the data dictionary, surveys, alerts, and the Behavior signals (rage/dead clicks, quick-backs, `$error` events, named element clicks). Idempotent and scoped to that one project (its wipe covers the new tables too). Run from `backend/` with `PYTHONPATH="$(pwd)"` set, otherwise the `app` import fails; tune density with `--visitors` / `--heatmap-sessions`. The full local and VPS runbook (including the CI-race and ephemeral-container-script caveat) lives in the `skawr-local-dev` steering doc.

---

## 11. Deploy

```
Push to main → GitHub Actions builds Docker images → scp to VPS → docker load → recreate containers
```

- Backend entrypoint runs `alembic upgrade head` before starting uvicorn
- Migrations must be safe to re-run (idempotent)
- Health check: `/health` (backend), `/api/v1/health`
- Production compose managed by `skawr-deployment` repo

---

## 12. Ingestion Limits & Data Correctness

Decisions from the launch-readiness hardening pass (ANLY-C003 / C004 / C009). The public
write key ships to browsers, so every ingested payload is **untrusted** — bound it before
persisting. Sources of truth: `app/services/event_sanitizer.py`, `app/core/reporting.py`,
`app/api/v1/analytics.py` (`FX_TO_SAR`, `_extract_revenue`), and the ingestion rate-limit
middleware.

### Payload hardening (ANLY-C003 / C004) — implemented

Applied on `/events/track` and `/ingest/batch` (via `event_sanitizer`):

- **Strings truncate, they do not reject.** String values/keys/event-names are truncated to
  **255 chars** (Mixpanel/Amplitude-aligned). The event is kept.
- **Structural abuse is rejected → HTTP 422.** Limits: **≤ 64 keys** per object, **arrays ≤ 100**,
  **nesting depth ≤ 5**.
- **Timestamp skew rejected → 422.** Accepted window is **[now − 90 days, now + 1 hour]** (tolerate
  clock drift, allow modest backfill, block stale/chronology poisoning).
- **Identifier hygiene.** `user_id` / `anonymous_id` have control chars stripped; if empty after
  cleaning or **> 255 chars**, the id is **dropped (set null) and the event is still counted**
  (Amplitude-style), never a 422.
- **Single vs batch behavior:** `/track` rejects one bad event with 422; `/batch` rejects only the
  offending event(s) and commits the rest (partial success).

### Reporting timezone (ANLY-C009) — implemented

- `app/core/reporting.py` is the **single source** of the reporting zone: fixed **Asia/Riyadh
  (UTC+3)**, no DST, no tz-database dependency.
- `date`/`hour` are stamped through `reporting_date()` / `reporting_hour()` at **every** ingest
  site (track, batch, `$identify` sentinel, heatmap).
- **Going-forward only** — historical rows keep their UTC date, so dashboards show a one-time
  boundary shift (acceptable pre-launch). To add per-project timezones later, swap the module
  constant for a lookup; call sites won't change. Do **not** add a column to the shared
  `skawr_auth` Project model (it's legacy — see §below).

### Revenue currency (ANLY-C009) — implemented

- Static fallback set (base = SAR, `FX_TO_SAR` table): **SAR, USD, AED, EGP, KWD, BHD, QAR, OMR,
  JOD, TRY, EUR, GBP**. The live FX feed extends real coverage well beyond this list.
- Missing `currency` defaults to **SAR**.
- **Unconvertible currency = accept-and-flag**: a currency with no live rate and none in the static
  table is excluded from `total_revenue_sar` and surfaced in the `/revenue` response as
  `unconvertible_revenue` (currency, amount, transactions). `_value_in_sar` returns 0 for those
  everywhere (revenue + attribution) — it never applies a silent 1:1 rate.
- **Live FX feed (`app/services/fx.py`, `fx_rates` table) — shipped.** Follows on the earlier
  "move the static table to a dated feed" plan: a keyless daily feed (open.er-api.com) upserts
  currency→SAR rates keyed by reporting date, and each revenue event is stamped with the resolved
  rate at ingest (`_fx_rate_to_sar`, plus `_fx_rate_date`). `resolve_rate` prefers the stored row
  with the greatest `rate_date <= event date` (reproducible history), then a fresh refresh, then the
  static table, then None. `refresh_rates` never raises. Endpoints: `POST /api/v1/fx/refresh`,
  `GET /api/v1/fx/rates`. Ad spend uses the same resolution path for cost→SAR in `/attribution`
  and `/ad-spend`.

### Rate limiting & body caps (ANLY-C003) — implemented

Sources: `app/middleware/ingestion_rate_limit.py` (middleware) + `app/middleware/rate_limit_backend.py` (token-bucket backends). Config in `app/core/config.py` (`ingest_*`, `redis_url`).

- **Per-project limit: 6,000 events/minute (~100/sec)**, as a **token bucket** (absorb short
  page-load bursts, cap sustained overage). Env-configurable so ops can raise it as the VPS scales.
  Rationale: our old 1,000/min was literally RudderStack's *free-tier* cap; Amplitude allows
  1,000/**sec**, PostHog doesn't hard-cap capture. 6,000/min is generous for real storefront
  traffic yet safe for single-VPS Postgres (the `/track` path is DB-bound: enrichment +
  session-compute query + insert per event).
- **Event-weighted, not request-weighted**: a 100-event batch consumes 100 tokens.
- **Server-to-server `/ingest/batch` gets a higher/separate ceiling** (or exemption) — it's the
  trusted indexer→analytics bridge, not the browser abuse surface.
- **Cover `/heatmaps/batch`** (currently omitted by the limiter).
- **Real byte cap**: read the body, do **not** trust `Content-Length`. **64 KB** single event,
  **1 MB** batch → HTTP 413.
- **Redis-optional, fail-open**: use Redis when `REDIS_URL` is set (cross-worker/replica correctness),
  else fall back to the in-process limiter (no hard dependency — analytics has no Redis today).
  If Redis is unreachable, **fail open** (don't drop legitimate events); log + alert.
- **Structured responses, never silent drops**: `413` / `429` / `422` carry a JSON reason;
  `429` includes `Retry-After` + `X-RateLimit-Limit/Remaining/Reset`. On a rate breach mid-batch,
  reject the **whole batch** with `429` (clearer to the SDK than partial).
- **SDK signal**: respect `Retry-After` with backoff, and emit a **dev-mode console warning** when
  throttled so integrators see it (a customer-facing "N events throttled" dashboard indicator is a
  separate future ticket).

### Shared auth model note

The `Project` / `APIKey` ORM models come from the shared **`skawr_auth`** library
(`create_project_models(Base)` in `app/auth.py`). `skawr_auth` is **legacy — do not add new
columns/features to it**. Analytics-owned per-project settings (e.g. reporting timezone) belong in
an analytics-local table, not the shared model. The analytics Docker build also clones `skawr_auth`
at a moving ref (ANLY-C012) — pin it before relying on shared-model changes.
