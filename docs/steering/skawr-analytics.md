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
| `GET /sdk/skawr.js` | Browser SDK script |

### Dashboard (Zitadel JWT, project-ownership checked)

| Group | Endpoints |
|-------|-----------|
| Auth | signup, login, refresh, logout, me |
| Projects | CRUD + API key management |
| Analytics | summary, top-events, funnel, retention, cohort, timeseries, paths, revenue, attribution, stickiness, lifecycle |
| Insights | hero, feed, trends, pin, dismiss |
| Cohorts | CRUD, preview, refresh, sample users |
| Dashboards | CRUD, widgets, bulk layout save |
| Event Rules | CRUD, backfill, suggestions |
| Discovered Funnels | AI-surfaced funnel candidates |

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

---

## 8. Frontend Pages

| Route | Purpose |
|-------|---------|
| `/` | Home: KPIs + top events + recent events feed |
| `/events` | Live event stream with filters |
| `/funnels` | N-step sequential funnel builder |
| `/retention` | D0–D30 retention curves |
| `/cohorts` | Saved cohorts with predicate tree builder |
| `/dashboards` | 12-column grid dashboards (KPI/line/funnel/cohort/retention/text widgets) |
| `/settings` | Project settings + API key CRUD |

---

## 9. Key Business Rules

- **Tier gating removed**: All SaaS customers get full analytics. No separate analytics billing.
- **Auto-sessions**: 30-minute inactivity timeout generates `session_id`.
- **Identity stitching**: `/events/identify` links `anonymous_id` → `user_id`. Identity ladder: `COALESCE(user_id, anonymous_id, session_id)`.
- **Event rules derive semantic events in-transaction**: When a raw event matches a rule, derived events are INSERTed in the same DB commit. No separate pipeline.

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

---

## 11. Deploy

```
Push to main → GitHub Actions builds Docker images → scp to VPS → docker load → recreate containers
```

- Backend entrypoint runs `alembic upgrade head` before starting uvicorn
- Migrations must be safe to re-run (idempotent)
- Health check: `/health` (backend), `/api/v1/health`
- Production compose managed by `skawr-deployment` repo
