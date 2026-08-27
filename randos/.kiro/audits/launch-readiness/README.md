# Skawr Launch-Readiness Audit

Ecosystem-wide launch-readiness audit and remediation for the first paying customer
(auth/SSO, Search SaaS + plugins, Analytics, web + dashboards).

## Read this first
- **`STATUS.md`** — authoritative current status: what's fixed (with PR links), what's open
  (by severity/cluster), open scope questions, and the suggested next batch.

## Detailed finding catalogs (per-finding descriptions + evidence)
- **`findings-search.md`** — Search SaaS, SDKs, extension (`SRCH-*`)
- **`findings-analytics.md`** — Analytics backend/frontend/SDK (`ANLY-*`)
- **`findings-auth-web.md`** — Unified auth, web, dashboards (`AUTH-*`, `WEB-*`)

> Finding IDs are stable across docs. **`STATUS.md` is authoritative for current status**; the
> catalogs describe each finding in detail (their inline severities reflect the original audit —
> defer to STATUS for what's fixed/open).

Historical first-pass reports, the never-run Track-B prompt pack, and the independent-review
artifact were removed during consolidation (2026-07-22); git history retains them.
