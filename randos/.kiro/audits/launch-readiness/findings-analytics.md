# Findings: Analytics Backend, Frontend, and React SDK

> **Detail catalog — not live status.** The verdict/counts below are the original audit snapshot.
> For what's fixed vs open, see **`STATUS.md`** (authoritative). Finding IDs (`ANLY-*`) are stable.

**Original verdict:** 🔴 NO-GO. **5 Blocker, 10 High, 4 Medium, 2 Low.**

| ID | Sev | Evidence | Finding / required handling |
|---|---|---|---|
| ANLY-C001 | Blocker | `backend/app/api/v1/router.py:20` (env-gated mount); `backend/app/auth.py:45-60` (HS256 legacy fallback) | **Reworded:** legacy auth routes are env-gated (mounted only when Zitadel is disabled), not unconditional. The real risk is the HS256 legacy fallback in `get_current_user`: when Zitadel config is absent, non-Zitadel tokens are verified with the symmetric legacy path (shared default-secret risk). Add a production startup assertion that Zitadel is enabled and reject the legacy fallback in prod. |
| ANLY-C002 | Blocker | shared auth tuple at `skawr_auth/.../api_key_auth.py:78,102`; `backend/app/api/v1/heatmaps.py:98,109,148,162,200,209` | Heatmaps treats returned `Project` object as project ID; ingest/query should fail or misbind. Unpack and use `str(project.id)` with tenant tests. |
| ANLY-C003 | High | `backend/app/middleware/ingestion_rate_limit.py:3-50`; event schemas | Limiter is process-local, request-counted, trusts Content-Length, omits heatmaps, and permits very large nested fields. Enforce streaming byte/event limits at edge + Redis. |
| ANLY-C004 | High | `events.py:76-103,225-248`; `ingest.py:97-122`; sessions service | Public browser key can spoof timestamp/identity/session and historical merges. Separate public append key from privileged identify and quarantine anomalies. |
| ANLY-C005 | Blocker | React SDK `client.ts:104-106,222`; `heatmap.ts:143-165`; `provider.tsx:156-158` | Click/form/error capture defaults on; URL/DOM/error/user properties can carry PII; no React consent/DNT/GPC parity. Make capture opt-in and port consent/redaction. |
| ANLY-C006 | Blocker | `backend/app/api/v1/privacy.py:127`; identity merge in events; heatmap model IDs | Erasure and merge affect Event only; identifiable heatmaps remain. Cascade subject operations across all stores/derivations and verify deletion. |
| ANLY-C007 | High | `privacy.py:203-256` | Retention API stores policy metadata but automatic purge is absent and manual purge accepts independent values. Add scheduled idempotent policy-driven purge. |
| ANLY-C008 | Blocker | `analytics.py:528-542`; React `attribution.ts:8-10`; `rule_evaluator.py:229-236` | Backend reads `properties.value`; SDK/rules emit `revenue`. Purchases can report zero. Define/migrate one canonical amount contract and test end-to-end. |
| ANLY-C009 | High | `analytics.py:511-544,629-640`; event ingest date | Static FX table, unknown currencies at 1.0, and UTC ingest-date buckets misstate SAR revenue. Store source/date and project reporting timezone. |
| ANLY-C010 | High | `provision.py:64-68,85-120` | “Idempotent” auto-provision always creates keys; no-domain and concurrent retries duplicate resources. Require idempotency key + DB upserts/uniques. |
| ANLY-C011 | High | `backend/alembic/env.py:11-17,60-78`; heatmap/alert revisions | Partial DB may be falsely stamped baseline; metadata omits current models. Fail closed and test fresh + production-snapshot upgrades/schema diff. |
| ANLY-C012 | High | backend/frontend `Dockerfile:11-14` | Both images clone moving auth branch during build. Pin immutable commit/artifact with compatibility tests and SBOM. |
| ANLY-C013 | High | `frontend/tsconfig.json:3,25`; deployment workflow paths/checks | Frontend TypeScript check is red and CI watches/tests only backend. Fix TS6 config or pin exact version; gate frontend/SDK build. |
| ANLY-C014 | Medium | `use-projects.ts:24,62`; `current-project.tsx:9-17,59`; `require-auth.tsx:47-54` | Outages are rendered as empty/not-provisioned states. Propagate typed 401/403/429/5xx/network states and retries. |
| ANLY-C015 | Medium | React package/lock identity and `attributes.test.ts:64-78` | Package/lock names and versions disagree; privacy test is stale/red. Regenerate lock, update test, gate pack/typecheck/build. |
| ANLY-C016 | High | `analytics.py` funnel/revenue/attribution/path/lifecycle row materialization | Large queries fold all rows in Python and can exhaust shared workers. Aggregate in SQL/store with cost caps/timeouts/indexes/load tests. |
| ANLY-C017 | High | `alerts.py:28-29,161-165`; `alert_evaluator.py:328-330` | Tenant webhook URL is posted without SSRF controls. Require HTTPS, block internal IPs on every resolve/redirect, and constrain egress. |
| ANLY-C018 | Medium | `frontend/app/auth/zitadel.ts:34-46` | Offline OIDC state and access token are persisted in localStorage. Prefer BFF cookie or memory/session plus strict CSP and rotation. |
| ANLY-C019 | Medium | `backend/app/main.py:153-155`; Docker health; deploy wait | Constant health returns 200 when DB/schema/config is unusable. Add bounded liveness/readiness separation. |
| ANLY-C020 | Low | compose env vs `api-config.ts`/`layout.tsx`; legacy deploy script | API env names and deployment ownership drift. Standardize `/api/v1` base and remove obsolete VPS frontend path. |
| ANLY-C021 | Low | `backend/app/api/v1/router.py:39-51` (stale "Growth+/Scale gated" comments) vs `backend/app/core/dependencies.py:27,34,41` (all call the same `require_entitlement`, no tier differentiation) | Runtime correctly gives every paid customer full analytics (no tier gating), but stale comments claim tier-gated access. Remove the misleading comments to prevent regressions that contradict the bundled-full-analytics invariant. |

## Validation
- Backend: **189 passed, 1 skipped**, 7 deprecation warnings.
- Backend compile: passed.
- React SDK typecheck: passed.
- React SDK tests: **39 passed, 1 failed** (privacy expectation drift).
- Frontend `tsc --noEmit`: failed with TS5107/TS5101.
- Production frontend build could not be established in the isolated read-only copy.
