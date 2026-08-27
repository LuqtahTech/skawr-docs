# Findings: Unified Auth, Customer Web, and Admin Dashboard

> **Detail catalog — not live status.** The verdict/counts below are the original audit snapshot.
> For what's fixed vs open, see **`STATUS.md`** (authoritative). Finding IDs (`AUTH-*`/`WEB-*`) are stable.

**Original verdict:** 🔴 NO-GO. Auth: **1 Blocker, 5 High, 4 Medium**. Web/dashboard: **3 Blocker, 5 High, 6 Medium, 2 Low**.

## Auth findings

| ID | Sev | Evidence | Finding / required handling |
|---|---|---|---|
| AUTH-C001 | Blocker | `skawr-web/lib/auth.ts:54-151` | PKCE verifier is embedded in base64 state, callback never compares returned state with `sessionStorage`, and unvalidated `returnTo` is returned to navigation. Use random opaque state stored server/session-side, compare once, keep verifier only in session, and allowlist same-origin paths. |
| AUTH-C002 | High | `skawr-login/app/main.py:120-139`; `app/zitadel.py:150-177` | Signup marks email unverified but immediately creates a password session and finalizes OIDC. Require email ownership before provisioning/privileged use. |
| AUTH-C003 | High | `skawr-login/app/zitadel.py:22-44`; no MFA route/template | Password-only session has no TOTP/WebAuthn/OTP continuation. MFA-enforced users are locked out. Implement checks or confirm policy remains optional until done. |
| AUTH-C004 | High | dashboard `.env.example:5-14`; `Login.tsx:32-90`; auth context | Admin defaults `VITE_ZITADEL_ENABLED=false`, leaving legacy password login active despite mandatory SSO. Remove legacy production path and fail build/start if OIDC config is absent. |
| AUTH-C005 | High | dashboard `auth/zitadel.ts:63-68`; shared `storage.ts`; analytics/web auth storage | `offline_access` and bearer state persist in localStorage. Move to HttpOnly SameSite BFF cookies or memory/session and harden CSP/rotation. |
| AUTH-C006 | High | `skawr-login/app/config.py:4-17`; `main.py:43-45`; Docker health | Missing PAT/org does not stop startup; health remains HTTP 200 with `configured:false`, so orchestration can route every app to a broken login target. Add startup assertions and non-2xx readiness. |
| AUTH-C007 | Medium | `skawr-login/app/main.py:36-38,80-118,200-242` | Slowapi is process-local and keyed from observed remote address without explicit trusted-proxy design. Use distributed IP+account controls and verify forwarded IP handling. |
| AUTH-C008 | Medium | `main.py:145-181`; `zitadel.py:52-78,180-250` | `authRequest` is carried in callback URL but not application-bound to the IDP intent. Store a one-time server-side intent↔auth-request binding. |
| AUTH-C009 | Medium | login FastAPI setup; no security-header middleware | Login responses have no application CSP/HSTS/referrer/frame policy; inline JS and third-party fonts expand impact. Enforce at app/Traefik and verify production headers. |
| AUTH-C010 | Medium | login templates `<html lang="en">`; English-only copy | Unified Saudi/MENA login has no Arabic/RTL path. Add locale/`dir` support and Arabic font/copy before broad MENA launch. |

## Web/dashboard findings

| ID | Sev | Evidence | Finding / required handling |
|---|---|---|---|
| WEB-C001 | Blocker | production `next build` error; import at `app/components/skawr-analytics-provider.tsx:3`; declared `"@skawr/analytics-react":"^0.6.0"` in `package.json` but **absent from `pnpm-lock.yaml` and `node_modules`** | Current web production build fails: `@skawr/analytics-react` is declared but not present in the lockfile or installed tree, so it cannot resolve. Restore a reproducible install/lock and gate the production build in CI. |
| WEB-C002 | Blocker | `Pricing.jsx:343-347`; `Comparison.jsx:14`; `terms/page.tsx:32-36`; import flow + Search public routes | Live UI/Terms promise free use and guest import creates service resources before payment, contradicting no-free/no-trial. Remove copy and disable paid-service execution until active Polar entitlement. |
| WEB-C003 | Blocker | `next.config.mjs:4-14` | AWS access/secret, Search key, admin secret, and provider headers are declared in Next build-time `env`, which inlines values and destroys a dependable server-only boundary. Remove secrets from `nextConfig.env`; use server runtime env/IAM roles and rotate if bundles ever contained them. |
| WEB-C004 | High | `Pricing.jsx:37-45,61-69,85-93` | Heatmaps/attribution are locked to Scale although all paid SaaS customers must receive full Analytics. Remove Analytics tier gating and align backend/UI contracts. |
| WEB-C005 | Medium | `app/saas/checkout/page.tsx:95-98`; unused validator in `lib/checkout-url.ts` | **Severity lowered (defense-in-depth):** main checkout navigates to the backend-returned `checkout_url` without calling `isValidCheckoutUrl`. The URL is a first-party API response (lower risk), but the import flow already validates it and this path does not. Apply the existing HTTPS exact/subdomain allowlist before redirect for consistency. |
| WEB-C006 | High | `app/api/test-search/route.ts:1-25` | Public production diagnostic returns sample data and raw exception message/stack. Delete or make development/admin-only with redacted errors. |
| WEB-C007 | High | `app/admin/page.tsx:19-71`; `middleware.ts:6-17` | Web admin uses one static bearer secret entered into sessionStorage; no identity, roles, per-user revocation, or rate limiting. Move admin to Zitadel role-based SSO and audit actions. |
| WEB-C008 | High | `middleware.ts:20-48` | CSP permits `unsafe-inline`, `unsafe-eval`, all HTTPS and HTTP connects; admin API early-return skips headers. Tighten with nonces/hashes and explicit origins; apply consistently. |
| WEB-C009 | Medium | `sitemap.ts:13-25`; stale `/services/cro` links | Sitemap points to nonexistent `/services/cro` and omits SaaS/CRO/legal routes. Correct canonical inventory and add route checks. |
| WEB-C010 | Medium | `privacy/page.tsx:27-64`; `terms/page.tsx:32-36`; Analytics behavior | Legal copy is materially stale: free plan/guest retention claims conflict with policy, and Analytics autocapture/PII/subprocessors/retention are under-disclosed. Product/legal review for Saudi PDPL is required. |
| WEB-C011 | Medium | root/login/marketing documents use English-only `lang`; no locale/dir switch | No Arabic/RTL customer journey exists. Add localized metadata, content, forms, and RTL QA before MENA GA. |
| WEB-C012 | Medium | dashboard `nginx.conf:27-33` | Dashboard headers omit CSP, HSTS, Referrer-Policy, and Permissions-Policy. Add headers at CDN/nginx and verify actual production responses. |
| WEB-C013 | Medium | dashboard production build output | Admin bundle is ~1.28 MB minified and emits CSS import-order warning. Fix font import order and code-split heavy Growth/chart routes. |
| WEB-C014 | Medium | `app/business/page.tsx:323-327`; Analytics is live/bundled | Customer copy still says Analytics “Coming Soon.” Align navigation and product copy with live bundled offering. |
| WEB-C015 | Low | `app/layout.tsx:34-36` | `generator: "v0.app"` leaks scaffolding provenance. Remove or brand it. |
| WEB-C016 | Low | duplicate `next.config 2.mjs` | Stale duplicate config ignores type errors and enables standalone output, creating operator confusion. Delete after confirming no deployment dependency. |

## Validation
- `skawr-login`: `python3 -m compileall app` passed. CI has no behavioral auth tests.
- Admin dashboard: production build passed; CSS import-order and >500 KB chunk warnings.
- `skawr-web`: 111 tests passed, but all are CRO audit-engine tests. Production build failed on unresolved Analytics package.
