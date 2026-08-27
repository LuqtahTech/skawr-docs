# Skawr Launch-Readiness — Status

**Last updated:** 2026-07-22  
**Verdict:** 🟡 **Blockers cleared; first paying-customer path functional.** The agreed first-customer High batch is now **merged to `main`**. Remaining High items don't block a single controlled **non-Shopify** first customer; several gate broader public launch (and the Shopify/extension/SDK surfaces gate those products specifically).

This is the single source of truth for launch-readiness status. Detailed per-finding
descriptions live in `findings-search.md`, `findings-analytics.md`, `findings-auth-web.md`
(finding IDs are stable; **this file is authoritative for status**, those files for detail).

---

## 1. Merged to `main` (2026-07-22)

All four remediation PRs are merged.

| Finding | What | PR (merged) |
|---|---|---|
| **AUTH-C004** | Admin dashboard SSO-on-by-default; legacy login gated to dev-only (can't render in prod) | dashboards #24 |
| **AUTH-C006** | Login readiness: `/health` liveness split from `/health/ready` (503 on misconfig); fail-closed startup in prod | login #8 |
| **AUTH-003 / 007** | CSRF double-submit + password-reset flow with OIDC continuity | login #7 (separate) + #8 |
| **SRCH-C020** | `/health` reflects real dependency health (won't promote an unusable/non-billing instance) | search #325 |
| **SRCH-C018** | Regression tests: unknown/failed Polar events never acked as `processed` | search #325 |
| **ANLY-C009** | Unsupported currencies excluded from SAR + surfaced as `unconvertible_revenue`; Asia/Riyadh day/hour bucketing (going-forward) | analytics #128 |
| **ANLY-C003 / C004** | Event-weighted token-bucket rate limiting (6k/min, Redis-optional fail-open), real byte caps, `/heatmaps/batch` coverage, structured 413/429; payload truncation + timestamp/identity validation | analytics #128 |
| **AUTH-C002** | Progressive email verification: Google auto-reclaim + two-phase (deactivate 30d → delete 90d) sweep, ships behind `SWEEP_ENABLED` (now enabled in prod) | login #9 + search #326 (see §2) |

**Also merged (via these PRs and/or separate PRs #7/#127; were Blockers/High):**
ANLY-C001 (reject legacy HS256 in prod), ANLY-C002 (heatmap `project_id` binding), ANLY-C005
(React consent/DNT + opt-in autocapture), ANLY-C008 (unified revenue contract), ANLY-003 (PII
capture), AUTH-018 (stop persisting refresh tokens), AUTH-013/021 (gate legacy auth routes),
WEB-C001 (web build), WEB-C002 (no free/trial copy), WEB-C003 (secrets out of build-time env),
WEB-C004 (analytics de-gated), WEB-C006 (removed public debug endpoint), SRCH-C004/C005/C007
(Shopify fail-closed, public-key→JWT block, OAuth token encryption).

> **Merge notes:** #325 was admin-merged past quota-failed CI (checks were GitHub Actions quota
> issues, not real failures). #128 and #8 were conflict-resolved by **merging `main` into the
> feature branch** (not rebasing): #128 = 1 test add/add conflict (kept superset); #8 = 1 `main.py`
> conflict + a merge-doubled `is_production` in `config.py` (deduped). Post-merge suites green
> (analytics 229; login pytest clean).

> **Post-merge follow-up:** `main` now carries the fail-closed login startup gate (AUTH-C006) and
> SSO-only admin (AUTH-C004) — confirm production has `ZITADEL_ORG_ID`/`LOGIN_PAT`/`BASE` set and
> that all admins hold the `platform_admin` role, or login/admin access breaks on deploy.

---

## 2. AUTH-C002 — merged, deployed, and sweep ENABLED in prod (2026-07-22)

Progressive email verification ("verify-before-privilege"), speced at
`.kiro/specs/progressive-email-verification/`, is **merged to `main` and live in production**.

- **skawr-login #9** — entitlement client, Google auto-reclaim on `/google/callback`, two-phase
  expiry sweep, password-login reactivation, structured audit logging. Suite: **138 passed**.
- **skawr-search #326** — regression + Hypothesis property tests locking in the indexer's
  fail-closed entitlement/guest invariants (no prod code change). Suite: **112 passed**.

**Design changed during rollout — the sweep is now two-phase (reversible-first):** instead of a
single 14-day hard-delete, it **reversibly deactivates** an unverified-never-paid account at
**30 days** (`SWEEP_DEACTIVATE_DAYS`), then **hard-deletes** it only once it is *already
deactivated* and **90 days** old (`SWEEP_DELETE_DAYS`). A delete always follows a prior
deactivation, so the first sweep can only ever deactivate (`deleted` is structurally 0 until an
account has been deactivated for 90d). A returning owner is reactivated on a verified password
login. Rationale: aligns with marketing/nurture windows and gives a long reversible runway
(unverified signup emails live only in Zitadel — deletion is full erasure).

**Enabled in prod:** `SWEEP_ENABLED=true` on `/opt/skawr-login/.env` (with `INDEXER_BASE_URL`,
`SERVICE_API_TOKEN`, `SWEEP_DEACTIVATE_DAYS=30`, `SWEEP_DELETE_DAYS=90`, `SWEEP_INTERVAL_HOURS=24`).
The in-process loop runs one pass on boot + every 24h. First live pass: **scanned 18, all
`skipped_young`, 0 deactivated, 0 deleted** — no account currently old enough to act on. Monitor
with `docker logs skawr-login | grep expiry_sweep`.

> **Deploy caveat (recorded in steering):** the VPS `deploy.sh` for skawr-login is broken for
> `saleh` (root-owned `/opt/skawr-login/.git` → dubious-ownership `git pull` refusal; root-owned
> `/tmp` build log). It fails *before* touching the running container (no outage). This deploy
> used the image-tarball path instead (build `linux/amd64` locally → save → scp → `docker load` →
> recreate with the Traefik labels + `--env-file`). Fix the repo ownership or switch `deploy.sh`
> to the tarball flow before the next login deploy.

---

## 3. Remaining High items (open)

### Scope-conditional — only High if that surface ships
| Finding | Gate |
|---|---|
| SRCH-C011 | Public Shopify widget sync runs with stored OAuth token (fuzzy shop match) |
| SRCH-C012 | Shopify OAuth callback lacks canonical HMAC / shop-domain validation |
| SRCH-C033/C034/C035/C037 | SDK client secret-key handling, doc/runtime drift, widget analytics TODO, public-key threat model |
| SRCH-C041/C042/C043 | Browser extension: Firestore/token scraping, identity handoff, version drift |

*These gate the Shopify / extension / SDK-GA surfaces, not a first non-Shopify customer.*

### Search billing / tenant robustness (scope-independent)
| Finding | Risk |
|---|---|
| SRCH-C013 | Any tenant API key can operate the **global** webhook retry/dead-letter queue |
| SRCH-C009 | API-key public/secret scope not centrally enforced |
| SRCH-C010 | Refresh rotation / reuse-detection / revocation helpers unused |
| SRCH-C015 | Overage not authoritatively billed (log-only snapshots) |
| SRCH-C021 | In-process job scheduling loses work / duplicates across replicas |
| SRCH-C022 | Alembic startup deletes a `version_num` row on every migration |
| SRCH-C008 | Duplicate/`scope`-inconsistent APIKey models (partially addressed) |

### Auth / web hardening
| Finding | Risk |
|---|---|
| AUTH-C003 | No MFA/TOTP continuation — lockout **only if** Zitadel enforces MFA (confirm policy) |
| AUTH-C005 | Tokens in `localStorage` — mitigation is tightening CSP (WEB-C008), so linked |
| WEB-C007 | Web admin uses one static bearer secret in sessionStorage |
| WEB-C008 | CSP allows `unsafe-inline`/`unsafe-eval`/all-HTTPS |

### Analytics infra
| Finding | Risk |
|---|---|
| ANLY-C011 | Alembic baseline stamping + migration metadata omits some models |
| ANLY-C012 | Docker build clones `skawr_auth` at a moving ref (pin it) |
| ANLY-C013 | Frontend TS build not gated in CI |
| ANLY-C016 | Large analytics queries materialize rows in Python (scale risk) |

---

## 4. Open scope questions (these move ~10 items in or out)
1. Is the **first customer on Shopify**? If no, SRCH-C011/C012 don't gate them.
2. Are the **browser extension / non-JS SDKs** in the first-customer path? If no, SRCH-C041–043 / C033–037 gate only those products.
3. Does the **Zitadel instance enforce MFA**? If not, AUTH-C003 is a fast-follow, not a blocker.

## 5. Suggested next batch (scope-independent, real cross-tenant risk)
`SRCH-C013` (global webhook queue authz) → `SRCH-C009` (central key-scope enforcement) →
`SRCH-C022` (remove destructive alembic auto-repair).

## 6. Validation baseline
- skawr-analytics backend unit suite: **229 passed**, 1 skipped (needs live Postgres).
- skawr-login: pytest green — **138 passed** (post AUTH-C002 merge; was 39); byte-compile clean.
- skawr-search: webhook handler suite 25 passed; health-readiness 5 passed; AUTH-C002 regression + property suite **112 passed**.
- skawr-dashboards admin build: passes off `main`.
- Production smoke (post AUTH-C002 deploy): `login.skawr.com` `/health` + `/health/ready` = 200; expiry sweep first live pass = no-op (18 scanned, 0 acted).

## 7. Deferred follow-ups (noted, not scheduled)
FX source/date auditability + per-row original amount/currency; per-project reporting timezone
(analytics-owned table, not shared `skawr_auth`); customer-facing "N events throttled" dashboard
signal; durable queue/outbox for billing/import/provisioning.

## Method (brief)
Read-only source audit across the ecosystem, independently reviewed (a second-model pass corrected
severities/counts), then remediated in the branches above. Historical first-pass reports and the
independent-review artifact were removed in consolidation; git history retains them.
