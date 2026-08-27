# Skawr Analytics: Team Demo Walkthrough

A presenter's guide for demoing the full analytics platform to your team, using
the seeded "Skawr Analytics Demo" project on your account.

Last set up: 2026-07-24. Everything below is live on `analytics.skawr.com`.

---

## TL;DR: what is set up

- Your account `ziyad.alotaibe@gmail.com` owns a dedicated **"Skawr Analytics Demo"**
  project (a fictional storefront `demo-shop.skawr.com`) filled with ~7 weeks of
  realistic e-commerce data.
- It is completely separate from the real `skawr.com` marketplace data, so you
  can click around freely without touching production analytics.
- Every dashboard feature has data behind it: funnels, revenue, attribution and
  ROAS, retention, heatmaps, cohorts, a saved dashboard, event rules, and
  discovered funnels.

Seeded volume: ~3,178 events, 282 purchases, 5,617 heatmap interactions, 250 ad
spend rows, 3 saved cohorts, 1 dashboard (7 widgets), 3 event rules, 3 discovered
funnels, across 49 days.

---

## Before the demo (5-minute checklist)

1. Go to `https://analytics.skawr.com` and click **Sign in**.
2. Authenticate with SSO using **`ziyad.alotaibe@gmail.com`**.
   - Important: the address is spelled **alotaibe** (with a `t`). The variant
     "aloaibe" is not a registered account and will not log in.
3. In the top-left project switcher, select **"Skawr Analytics Demo"**.
   - You may also see a project called `skawr` (that one holds the real
     marketplace traffic). For the demo, stay on "Skawr Analytics Demo".
4. Set the date range to **Last 30 days** (default) so every page is populated.
5. Open these tabs ahead of time so switching is instant: Home, Funnels,
   Revenue, Attribution, Retention, Heatmaps, Cohorts, Dashboards.

If a page looks empty, it is almost always the wrong project or too narrow a
date range. Re-check steps 3 and 4.

---

## Recommended demo flow (~15 minutes)

The order below tells a story: acquisition, to conversion, to money, to
retention, to the tools that explain why.

### 1. Home (1 min): the landing impression

Point out the KPI tiles (events, unique users, sessions) and the recent-events
stream. This is the "everything is live" moment. Mention that the numbers update
as events arrive from the SDK embedded in the site.

### 2. Events (1 min): raw truth

Open **Events**. Show the live event feed with filters. Call out the event
types: `page_view`, `product_view`, `add_to_cart`, `checkout_started`,
`purchase`, and `newsletter_signup`. This proves the data is granular, not just
rolled-up counts.

### 3. Funnels (2 min): the core conversion story

Open **Funnels** and build (or load) this 5-step funnel:

```
page_view , product_view , add_to_cart , checkout_started , purchase
```

Talking points:
- Realistic drop-off at each step (not a flat 100%).
- The **conversion window** and **median time-to-convert** for users who
  completed the whole journey.
- Show the OR-step syntax: replace one step with `add_to_cart|buy_now` to
  demonstrate branching steps matching either event.

### 4. Journeys (1 min): the visual path map

Open **Journeys**. This renders the path transitions as a branching node graph,
plus **suggested funnels** (three candidates were pre-discovered). Good for the
"we surface funnels you didn't think to build" line.

### 5. Revenue (2 min): money, in SAR

Open **Revenue**. Highlights:
- Total revenue converted to **SAR**, average order value, revenue by day / by
  event / by top users.
- Purchases came in **SAR, USD, AED, EGP** (all auto-converted via the live FX
  feed), plus a few in **INR and CAD** that surface separately as
  **unconvertible revenue** rather than being faked at a 1:1 rate. This is a
  strong "we handle MENA + global currencies honestly" talking point.

### 6. Attribution (2 min): which channel earns its budget

Open **Attribution**. Set conversion event to **`purchase`**, try the different
models (first-touch, last-touch, linear, time-decay, position-based), and a
30-day lookback. Talking points:
- Channels: google, facebook, instagram, newsletter, tiktok, plus a `(direct)`
  bucket for untagged conversions (so attributed + direct equals total).
- Because ad spend is seeded per channel, each channel shows **cost and ROAS**.
  Newsletter is cheap with high ROAS; paid social costs more. This is the
  "connect marketing spend to revenue" moment.

### 7. Retention (1 min): do they come back

Open **Retention**. Show the D0 to D30 curve decaying realistically. The demo
includes a pool of loyal users who return on days 1, 3, 7, 14, and 30, so the
curve is not flat. Optionally filter by a cohort event.

### 8. Heatmaps (2 min): the visual crowd-pleaser

Open **Heatmaps**. Pick a page (for example `/products/oud-royale`). Show:
- The **click / move density overlay** rendered on top of a snapshot of the
  actual page, with a clear hotspot on the add-to-cart button.
- The **scroll-reach curve** showing how far down visitors get.
- Switch pages (`/`, `/collections/new`, `/checkout`) to show per-page hotspots.

### 9. Cohorts (1 min): segments that update themselves

Open **Cohorts**. Three saved cohorts are pre-computed:
- **High-value buyers** (spent over 500 SAR in 30 days): ~36 users
- **Repeat purchasers** (2+ purchases in 45 days): ~55 users
- **Saudi shoppers** (browsed from Saudi Arabia): ~235 users

Open one to show the predicate-tree builder, and hit refresh to show it
recomputes live.

### 10. Dashboards (1 min): the executive view

Open **Dashboards** and open **"Executive Overview"**. It has KPI tiles, a daily
traffic line chart, the storefront funnel, and a retention widget on one
12-column grid. Mention that widgets are drag-resizable and any team can build
their own.

### 11. Settings (30 sec): how data gets in

Open **Settings** to show the project's API key management. This is where a new
site or app gets its write key. Good place to mention the SDKs
(`@skawr/analytics-react`, web, node, Python, Flutter).

---

## Feature reference (what has data and where to find it)

| Feature | Where | What to expect |
|---|---|---|
| KPIs / recent events | Home, Events | Live counts + event stream |
| Funnels (sequential, OR-steps, time-to-convert) | Funnels | 5-step storefront funnel with drop-off |
| Path map + suggested funnels | Journeys | Branching graph, 3 discovered candidates |
| Revenue in SAR + unconvertible bucket | Revenue | SAR/USD/AED/EGP convert; INR/CAD flagged |
| Multi-touch attribution + ROAS | Attribution | 5 channels + `(direct)`, cost and ROAS per channel |
| Retention D0-D30 | Retention | Decaying curve from returning users |
| Click/move heatmaps + scroll + DOM snapshot | Heatmaps | 4 pages, hotspots on real page backgrounds |
| Saved cohorts (predicate trees) | Cohorts | 3 pre-computed cohorts |
| Saved dashboards + widgets | Dashboards | "Executive Overview", 7 widgets |
| Event rules | Settings / Event Rules | 3 starter rules |
| API keys / SDK onboarding | Settings | Project write key |

Note on Insights: the anomaly-detection engine (hero card, feed, trends) is
powered by the seeded data too. There is a deliberate spike today in the
`newsletter_signup` event (about 40 today versus a ~6/day baseline over the
prior six weeks), which is a clean, explainable anomaly. Depending on the
deployed frontend build, this surfaces on the Home highlights; it is always
available through the `/api/v1/insights/*` API.

---

## If you want to reset or refresh the demo data

The seeder is idempotent and only ever touches the "Skawr Analytics Demo"
project. Re-running it wipes and regenerates that project's data (with a fixed
random seed, so results are stable) and never affects the real `skawr.com`
project.

```bash
ssh -i ~/Documents/Skawr/vps_ssh_key/id_ed25519 saleh@173.212.246.10 \
  "docker exec -e PYTHONPATH=/app skawr-analytics-backend \
   python scripts/seed_demo_account.py --email ziyad.alotaibe@gmail.com"
```

Optional flags: `--visitors 600` (funnel visitors), `--heatmap-sessions 300`.

Important: the enhanced seeder currently lives on the git branch
`fix/analytics-e2e-issues` in `skawr-analytics` and was copied into the running
container by hand. If the analytics backend is redeployed from `main`, the
container reverts to the older 30-day seeder. To keep the full-featured version
permanently, merge that branch to `main` (or re-copy the updated
`backend/scripts/seed_demo_account.py` into the container before re-running).

---

## Good to know

- The demo project is isolated. Nothing here mixes with the real marketplace
  analytics, so demo freely.
- All revenue is shown in SAR; the FX conversion and the unconvertible-currency
  handling are real platform behavior, not demo shortcuts.
- Reporting timezone is Asia/Riyadh (UTC+3), so "today" and daily buckets follow
  a Riyadh civil day.
- If a teammate should also see this, they currently would need their own
  project; the platform scopes each project to a single owner. Ask before
  sharing your login.
