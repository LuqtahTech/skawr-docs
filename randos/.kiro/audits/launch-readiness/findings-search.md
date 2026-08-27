# Findings: Search SaaS, SDKs, and Extension

> **Detail catalog — not live status.** The verdict/counts below are the original audit snapshot.
> For what's fixed vs open, see **`STATUS.md`** (authoritative). Finding IDs (`SRCH-*`) are stable.

**Original verdict:** 🔴 NO-GO. **12 Blocker, 23 High, 10 Medium, 1 Low.**

> **Active-fix-branch note:** `skawr-search` was audited on `fix/p1-audit-remaining`, which is under active remediation. The billing/quota cluster was hardened during the audit window: `quota_enforcement.py` now fails closed with an `ENTITLED_STATUSES` allowlist and no removed-tier fallback, and `quota_enforcement_asgi.py` enforces status/tier authorization even when Redis is down. Findings C001/C014/C016 were re-verified against current source and re-scoped below. Re-run the billing suite before relying on any of them.

Path prefixes: `I` = `skawr-search/skawr-indexer`, `S` = `skawr-sdks`, `E` = `skawr-extension`.

| ID | Sev | Evidence | Finding / required handling |
|---|---|---|---|
| SRCH-C001 | High | Tests `I/tests/property/test_tier_pricing_properties.py:20,68`, `test_overage_props.py:26,124`; `I/app/api/admin_billing_routes.py:10,198-210,333-334`; `I/app/services/notification_service.py:44-45,103-153` | **Re-scoped (was Blocker, stale):** current runtime quota middleware no longer references removed `TRIAL`/`STARTER` and fails closed. Residual trial artifacts remain in the billing **test suite** (28 failures reference removed enums), admin `extend-trial` routes with `or "trial"` defaults, and 14-day free-trial notification templates. Remove/align to the no-trial model and get the billing suite green. |
| SRCH-C002 | Blocker | Exemption list `I/app/middleware/api_key_auth.py:87-102` omits `/api/v1/webhooks/` and `/api/v1/billing/`; Polar webhook `/api/v1/webhooks/polar` (`I/app/main.py:293`, `webhook_routes.py:663`); public checkout under `/api/v1/billing/*` (`I/app/main.py:291`) | Global auth returns 401 before the Polar webhook and public checkout handlers run. **No subscription can ever activate** → the revenue path is dead. Exempt exact ingress paths, then enforce provider signatures/abuse controls. *(Most launch-fatal finding.)* |
| SRCH-C003 | Blocker | `I/app/middleware/api_key_auth.py:104-109`; `I/app/middleware/quota_enforcement_asgi.py:113-116` | **Reworded:** requests carrying any `Authorization: Bearer` header skip the API-key middleware, which does not set `request.state.client`; the quota ASGI middleware then treats absent client context as exempt and skips entitlement/quota entirely. Routes without a validating `get_current_client` dependency thus bypass subscription gating. (Invalid JWTs are still rejected at route level, so this is an entitlement bypass, not blanket authentication.) Set a verified principal centrally and fail closed on missing context. |
| SRCH-C004 | Blocker | `I/app/middleware/api_key_auth.py:91`; `I/app/api/public_routes.py:157-253,1172-1399` | Guest/import creates tenants, indices, keys, JWTs, and data before payment. Remove or isolate from production paid API. |
| SRCH-C005 | Blocker | `I/app/api/public_routes.py:90-150,363-409`; `I/app/api/dependencies.py:160-174` | Browser public-prefix keys can be exchanged for dashboard JWTs. Separate non-exchangeable storefront capabilities. |
| SRCH-C006 | Blocker | `I/app/api/salla_routes.py:510-540,595-644`; `I/app/platforms/shopify/routes.py:547-612` | Authenticated tenants can select another merchant or trigger all-merchant sync. Resolve through principal; reserve global sync for admin/service. |
| SRCH-C007 | Blocker | `I/app/security/token_encryption.py:19-46`; Salla/Shopify storage paths; `I/app/config/settings.py:346-362` | Missing/invalid encryption config silently stores provider OAuth tokens in plaintext. Fail production startup and migrate/rotate ciphertext. |
| SRCH-C008 | High | `I/app/models/__init__.py:315-349`; `I/app/models.py:320-350`; public/SaaS API-key creation paths | Canonical and shadow APIKey models diverge and `scope` is inconsistent. Keep one model and migrate schema. |
| SRCH-C009 | High | `I/app/middleware/api_key_auth.py:117-182`; document/skawrbar/SaaS routes | Key scope is not centrally enforced; browser keys can reach sensitive reads/writes. Define route capabilities and store binding. |
| SRCH-C010 | High | `I/app/services/token_service.py:24-86`; refresh/logout routes | Rotation, reuse detection, and revocation helpers are unused. Persist token families and revoke on replay/logout. |
| SRCH-C011 | High | `I/app/platforms/shopify/routes.py:770-826` | Public widget endpoint fuzzy-matches shop and executes sync using stored OAuth token. Remove mutation or require shop-bound signed session. |
| SRCH-C012 | High | `I/app/platforms/shopify/routes.py:63-126`; `I/app/main.py:312-359` | Shopify OAuth callback/root trust lacks canonical HMAC/state/shop validation. Implement provider-standard verification and output escaping. |
| SRCH-C013 | High | `I/app/middleware/api_key_auth.py:23-68`; `I/app/api/webhook_retry_routes.py:50-230` | Any tenant key can inspect/process/requeue/configure/clear the global webhook queue. Require admin/service authorization and audit logs. |
| SRCH-C014 | Medium | `I/app/middleware/quota_enforcement_asgi.py:30-52,113-116`; `I/app/middleware/quota_enforcement.py:12-16` | **Re-scoped (was Blocker/High, mostly remediated):** subscription-status/tier authorization now runs and fails closed even when Redis is unavailable. Residual: Redis-counter checks (search-volume/overage) are silently skipped when Redis is down, and enforcement depends entirely on `request.state.client` being set (see C003). Ensure volume/overage limits degrade to a safe policy and add alerting when counters are unavailable. |
| SRCH-C015 | High | quota counters, `I/app/services/overage_service.py:270-282`, billing tasks | Indexed product count is passed as zero and snapshots/rollovers do not authoritatively bill overages. Derive authoritative usage and reconcile idempotently to Polar. |
| SRCH-C016 | Medium | `I/app/middleware/quota_enforcement.py:290-303` (`ENTITLED_STATUSES`) | **Re-scoped (was High, largely remediated):** entitlement now uses an explicit `{ACTIVE, CANCELLED, GRACE_PERIOD}` allowlist and fails closed on unknown/None. Residual: `CANCELLED` is entitled unconditionally without checking the period-end timestamp, so a cancelled subscription stays entitled past its paid-through date. Gate `CANCELLED`/`GRACE_PERIOD` on a valid period-end. |
| SRCH-C017 | High | `I/app/api/admin_billing_routes.py:198-210,262-263,333-334`; `I/app/services/notification_service.py:103-153`; `I/app/auth.py` `_provision_client` (`RateLimitTier "free"`) | Trial/free states, `extend-trial` admin routes, `or "trial"` status defaults, free-trial email templates, and a `free` rate-limit tier assigned to SSO-provisioned clients remain despite the no-trial invariant. Remove/align and migrate any free/trial rows. |
| SRCH-C018 | High | `I/app/api/webhook_routes.py:215-242,360-374,430-443,762-812` | Unknown or semantically failed Polar events may be acknowledged/marked processed. Commit handling before acknowledgment; dead-letter unknown events. |
| SRCH-C019 | High | webhook analytics provisioning; internal entitlement route | Analytics provisioning is best-effort without durable reconciliation and inherits fail-open entitlement. Use outbox/reconciler and strict state. |
| SRCH-C020 | High | `I/app/main.py:177-188`; health route; Docker/deploy workflow | Billing init is non-fatal and health returns 200 with failed dependencies. Add non-2xx readiness for required dependencies/config. |
| SRCH-C021 | High | billing/import tasks and in-process background scheduling | Restarts lose work and replicas duplicate billing/import effects. Move to durable queue/leader leases with idempotency and retries. |
| SRCH-C022 | High | `I/alembic/env.py:56-122` | Migration startup may delete an environment-selected revision from version history. Remove automatic repair; fail and require audited manual recovery. |
| SRCH-C023 | Medium | `I/app/api/public_routes.py:1404-1435` | Anyone with store/import UUID can read status/count/timestamps. Require tenant or unguessable capability binding. |
| SRCH-C024 | Medium | Salla lifecycle routes and webhook verifier | Salla HMAC is checked asynchronously after success response. Verify raw body synchronously before enqueue/2xx. |
| SRCH-C025 | Medium | CORS config; browser SDK headers | Credentialed allowlist/custom API-key preflight does not safely cover arbitrary merchant origins. Define store-origin contract and browser-test representative shops. |
| SRCH-C026 | Medium | rate limiter paths; admin login | Credential endpoints lack effective application-level abuse controls. Add IP/account backoff, telemetry, and alerts. |
| SRCH-C027 | Medium | Salla/Shopify debug routes | Debug flags can reveal cross-tenant merchant samples. Remove in production or require redacted admin/service authorization. |
| SRCH-C028 | Medium | billing checkout creation | No stable idempotency key; retries can create duplicate checkout sessions. Persist purchase-intent idempotency. |
| SRCH-C029 | Blocker | `S/backend/js/tsconfig.json`; `src/http.ts`; package scripts | Backend JS SDK type/declaration build fails. Declare runtime types/libs and gate test/typecheck/build/pack. |
| SRCH-C030 | Blocker | `S/frontend/react-native/tsconfig.json`; client/hooks/package metadata | React Native SDK fails typecheck. Add correct peer/dev platform types and CI matrix. |
| SRCH-C031 | Blocker | Flutter `pubspec.yaml`, tests, README | Documented/tested `lib/skawr_search.dart` entry point is missing. Add barrel and pass analyze/test/publish dry-run. |
| SRCH-C032 | High | widget `package.json:34` | Published widget depends on `file:../js`, which consumers cannot resolve. Depend on exact published/workspace-transformed version and inspect tarball. |
| SRCH-C033 | High | browser/RN/widget clients and integration guide | Clients accept full secrets and tenant/index contract is absent/inconsistent. Reject secret keys in clients and use store-bound public capability. |
| SRCH-C034 | High | SDK target/AbortSignal/docs examples | Browser support claims and guide examples do not match compiled/runtime APIs. Test all documented snippets and narrow/polyfill support. |
| SRCH-C035 | High | widget engine TODO analytics hooks | Open/impression/no-result/click Analytics remains unimplemented. Integrate bundled Analytics with consent/batching/retry tests. |
| SRCH-C036 | High | PHP readonly tests; SDK workflows | PHP tests are invalid and publish workflows omit reproducible validation. Gate frozen install, tests, typecheck, build, pack, provenance. |
| SRCH-C037 | High | integration guide public-key claims | Docs call prefixes safe without quota-poisoning/scraping threat model. Document store/origin binding, rotation, and abuse monitoring. |
| SRCH-C038 | Blocker | `E/firestore.rules:5-7`; popup writes | Firestore permits unauthenticated global reads/writes. Default deny and require Firebase Auth + per-user ownership; emulator-test rules. |
| SRCH-C039 | Blocker | `E/storage.rules:8-10`; function public ACL | Storage lacks tenant boundaries and processed objects become public. Enforce owner paths and short-lived signed downloads. |
| SRCH-C040 | Blocker | `E/functions/main.py:21-45,148-203,262-264` | Firestore-controlled URLs drive unrestricted server fetches. Authenticate jobs; validate/pin public hosts; cap redirects/bytes/time/concurrency/egress. |
| SRCH-C041 | High | popup token enumeration; manifest permissions | Extension scrapes arbitrary-site storage/cookies and can forward guessed tokens. Use explicit provider OAuth; never enumerate generic tokens. |
| SRCH-C042 | High | popup/background identity and handoff | Caller-controlled UID/storage and substring origin matching lack signed nonce/state. Bind Firebase identity and exact origins; avoid sync-stored PII/tokens. |
| SRCH-C043 | High | Firebase versions and missing auth entry | Dependency versions disagree and configured web-auth page is absent. Reconcile clean pinned install and package complete auth flow. |
| SRCH-C044 | Medium | popup pagination/username handling | Export silently stops after three pages/partial failures; username is not bound to authenticated provider identity. Make resumable and derive verified account. |
| SRCH-C045 | Medium | manifest/options/README/store metadata | Broad permissions, misleading controls, incomplete assets/privacy metadata, and inaccurate claims block store readiness. Minimize and complete review package. |
| SRCH-C046 | Low | extension cloud function CORS | Wildcard origin and unused POST expand surface. Restrict methods/origins to extension/app identifiers. |

## Validation
- Targeted Search billing tests: **28 failed, 65 passed**, reproducing removed-tier drift.
- Smoke requests: Polar webhook and public checkout returned **401** before intended handlers.
- SDK TypeScript: browser JS passed; widget passed; backend JS failed; React Native failed.
- Migration graph static check: one head, no missing parent.
- Extension install/build/emulator and live provider/store checks were not run.

## Positive controls
- Polar and Shopify webhook signature primitives are fail-closed once requests reach them.
- URL/feed import has strong scheme, address, redirect, DNS-pinning, and decompressed-size SSRF defenses.
- Core document/index paths usually include `client_id`; API keys are hashed in newer creation paths.
- Migration graph has one head and container startup runs migrations.
- Widget has Shadow DOM, RTL primitives, safe text handling, keyboard support, URL rejection, and stale-response protection.
