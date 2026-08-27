# Implementation Plan: Progressive Email Verification (AUTH-C002)

## Overview

This plan implements the "verify-before-privilege" identity model. The genuinely new
code lives in **skawr-login** (entitlement client, Zitadel delete/reclaim helpers, Google
auto-reclaim wiring, expiry sweep job, new config). **skawr-indexer** gets no behavioral
change — only regression tests that lock in already-merged fail-closed billing/entitlement
behavior. **skawr-analytics needs no change** and has no tasks here.

### Cross-repo handoff — READ FIRST

- **skawr-login** (`/Users/smsaleh/Documents/Skawr/skawr-login`) and
  **skawr-search/skawr-indexer** (`/Users/smsaleh/Documents/Skawr/skawr-search/skawr-indexer`)
  are **separate git repositories** and MUST land as **two separate PRs**. Do not stage or
  commit across both repos in one commit. Group A tasks (1–7) → skawr-login PR.
  Group B tasks (8–9) → skawr-indexer PR. Group C (10) is a deployment-wiring doc task that
  belongs to the skawr-login PR.
- Tasks are independently verifiable with mocked Zitadel + mocked entitlement endpoint. No
  live Zitadel or live indexer call is required to make tests pass.
- **DESTRUCTIVE / HIGH-RISK:** any task touching `zitadel.delete_user`, the Google reclaim
  delete branch, or the sweep delete branch removes a real Zitadel user irreversibly. Those
  tasks (2.1, 3.1, 4.x) MUST land with their safety guards AND audit logging in the same
  change — never a bare delete. The entitlement check must be a *positive* not-entitled
  answer; any ambiguity retains.
- **Ship the sweep disabled.** `SWEEP_ENABLED=false` by default and the cron entrypoint stays
  unwired until verified in staging (task 10). Merging the code must not start deleting users.

---

## Tasks

### Group A — skawr-login (PR #1)

- [x] 1. Entitlement client and new config in skawr-login
  - [x] 1.1 Add new settings to `app/config.py`
    - Add `INDEXER_BASE_URL` (default `https://api.skawr.com`), `SERVICE_API_TOKEN`
      (default `""`), `SWEEP_THRESHOLD_DAYS` (default `14`), `SWEEP_ENABLED` (default
      `false`), `SWEEP_INTERVAL_HOURS` (default `24`)
    - Do NOT add any of these to `Config._REQUIRED` — a missing token must fail safe (retain),
      never crash the login gateway
    - Update `.env.example` with the five new vars and a comment that `SERVICE_API_TOKEN`
      matches the indexer's shared secret
    - _Requirements: 5.2, 7.4_

  - [x] 1.2 Create `app/entitlement.py` entitlement client
    - Implement `EntitlementUnavailable(Exception)` and
      `async def is_entitled(email: str) -> bool`
    - GET `{INDEXER_BASE_URL}/api/v1/internal/entitlement?email=<lower-stripped>` with
      `Authorization: Bearer {SERVICE_API_TOKEN}`, 10s timeout
    - Raise `EntitlementUnavailable` when base/token unset, on any `httpx.HTTPError`, non-2xx
      (`raise_for_status`), or malformed body (`KeyError`/`ValueError`) — never return `False`
      on ambiguity
    - Return `bool(r.json()["entitled"])` on success
    - Never log the token or place it in the URL/query string
    - _Requirements: 3.4, 4.4, 4.7, 5.3, 5.6, 7.4, 8.5_

  - [x] 1.3 Unit tests for the entitlement client
    - Mock httpx: assert Bearer header sent, email lowercased/stripped, `entitled=true/false`
      parsed; assert `EntitlementUnavailable` raised on timeout, 401, 503, 5xx, bad JSON, and
      unset base/token
    - _Requirements: 3.4, 4.7, 5.6, 7.4, 8.5_

- [x] 2. Zitadel destructive delete + reclaim helpers (skawr-login) — **DESTRUCTIVE**
  - [x] 2.1 Add `delete_user` and `get_user_created_at` to `app/zitadel.py` — **HIGH-RISK**
    - `async def delete_user(user_id)`: v2 `DELETE /v2/users/{user_id}`; treat HTTP 404 as
      success (idempotent), `raise_for_status` otherwise
    - Docstring MUST state it is destructive and that callers must have already proven
      unverified AND never-paid; the function does not re-check (guard lives in caller)
    - `async def get_user_created_at(user_id) -> datetime | None`: read `details.creationDate`
    - _Requirements: 5.7, 7.3_

  - [x] 2.2 Unit tests for `delete_user` / `get_user_created_at`
    - Assert 404 is swallowed (returns cleanly), other non-2xx raises, creationDate parsed to
      aware datetime, missing/invalid date → `None`
    - _Requirements: 5.7_

  - [x] 2.3 Add `iter_unverified_users` async generator to `app/zitadel.py`
    - Page through v2 `POST /v2/users` for human users; for each, defensively re-check
      `_is_email_verified` and read creation date; yield dicts shaped
      `{"id", "email", "email_verified", "created_at"}`
    - Paginate via `query.limit`/`query.offset` until exhausted (`details.totalResult`)
    - Reuse existing `_is_email_verified`; do not duplicate verification parsing
    - _Requirements: 5.1_

  - [x] 2.4 Add `reclaim_or_link_from_intent` to `app/zitadel.py` (orchestration) — **HIGH-RISK**
    - Signature `(idp_id, intent_id, intent_token) -> str`; replaces the
      `resolve_user_from_intent` dead-end
    - Branches: (1) intent already linked → return user id; (2) no existing account →
      `create_human_with_idp` (isVerified=true); (3) existing + verified → `add_idp_link`
      (Req 4.2); (4) existing + unverified → call `entitlement.is_entitled`:
      entitled OR `EntitlementUnavailable` → do NOT delete, deny (raise) (Req 4.6/4.7);
      not entitled → `delete_user` then `create_human_with_idp` (Req 4.3/4.5)
    - Re-check `_is_email_verified` immediately before the entitlement call to close TOCTOU
    - Reuse existing `retrieve_idp_intent`, `find_user_id_by_email`, `_is_email_verified`,
      `add_idp_link`, `create_human_with_idp`
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 7.1, 7.2, 7.3_

  - [x] 2.5 Add `_audit` / `_mask` structured audit helpers (shared by reclaim + sweep)
    - `_audit(trigger, user, *, decision, reason)` logs account id, trigger
      (`google_reclaim`|`sweep`), decision (`delete`|`retain`), and the entitlement result;
      `_mask` masks email PII
    - Call `_audit` at every delete and every retain branch in `reclaim_or_link_from_intent`
    - _Requirements: 7.5_

  - [x] 2.6 Unit tests for `reclaim_or_link_from_intent` decision branches
    - One test per branch (linked / none / verified-link / unverified-entitled-deny /
      unverified-unavailable-deny / unverified-not-entitled-delete-recreate), Zitadel +
      entitlement mocked; assert `delete_user` called ONLY in the not-entitled branch
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7_

- [x] 3. Wire `/google/callback` auto-reclaim (skawr-login `app/main.py`) — **HIGH-RISK**
  - [x] 3.1 Swap `resolve_user_from_intent` for `reclaim_or_link_from_intent`
    - On the deny path (entitled / verified / entitlement-unavailable) keep the existing
      `/login?...&error=google` redirect; reserve `error=google` for genuine failures and the
      entitled/verified deny, NOT the old "unverified account exists" dead-end
    - Continue resolving the user id from the verified intent server-side; never trust the
      `user` query param
    - Ensure session creation + `finalize_auth_request` still run on the success/link paths
    - _Requirements: 4.1, 4.2, 4.3, 7.1, 7.2_

  - [x] 3.2 Endpoint tests for `/google/callback`
    - Mock intent + Zitadel + entitlement; assert reclaim recreates and signs in for
      unverified-never-paid, and denies (error=google, no delete) for entitled / verified /
      unavailable
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7_

- [x] 4. Expiry sweep job + entrypoint (skawr-login `app/sweep.py`) — **DESTRUCTIVE, ships disabled**
  - [x] 4.1 Implement `async def run_sweep(now=None) -> dict`
    - Compute `cutoff = now - SWEEP_THRESHOLD_DAYS`; iterate `zitadel.iter_unverified_users`
    - Guards in order: skip if `created_at is None` or newer than cutoff (skipped_young);
      skip verified (retained_verified); on `EntitlementUnavailable` retain + audit
      (retained_error); if entitled retain + audit (retained_entitled); else audit(delete) +
      `zitadel.delete_user` (deleted)
    - Return + log the summary counter dict; reuse `_audit` from 2.5
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 7.1, 7.2, 7.4, 7.5_

  - [x] 4.2 Add `python -m app.sweep` entrypoint and optional in-process fallback
    - `__main__` runs one `asyncio.run(run_sweep())` pass and exits (single-shot cron model)
    - Add the `asyncio` lifespan fallback in `app/main.py` guarded by `SWEEP_ENABLED`
      (default false) sleeping `SWEEP_INTERVAL_HOURS`; when disabled it must be a no-op
    - Verify importing/starting the app with defaults does NOT trigger any deletion
    - _Requirements: 5.1, 5.7_

  - [x] 4.3 Unit tests for sweep guards and counters
    - Table-driven over (verified?, entitled?, age, reachable?); assert delete happens only
      for unverified + old + positively-not-entitled; assert each retain branch increments the
      right counter and audits
    - _Requirements: 5.4, 5.5, 5.6, 7.5_

- [x] 5. Checkpoint — skawr-login core flows
  - Ensure all skawr-login tests pass (`pytest` in `/Users/smsaleh/Documents/Skawr/skawr-login`).
    Ask the user if questions arise.

- [x] 6. Property-based safety tests for skawr-login (Hypothesis, ≥100 iterations, mocked)
  - [x] 6.1 Property 3 — the safety envelope (write FIRST)
    - **Property 3: Never delete a verified, entitled, or indeterminate account**
    - Generate `(verified?, entitled?, age, entitlement-reachable?)`; for BOTH reclaim and
      sweep assert delete occurs iff unverified AND positively not-entitled; verified/entitled/
      unavailable/unconfigured always retain
    - **Validates: Requirements 4.6, 4.7, 5.5, 5.6, 7.1, 7.2, 7.4**

  - [x] 6.2 Property 7 — Google auto-reclaim decision correctness
    - **Property 7: unverified+not-entitled → delete then recreate within the same callback;
      entitled/indeterminate → no delete, deny**
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [x] 6.3 Property 8 — expiry sweep delete condition
    - **Property 8: delete iff unverified AND age > threshold AND positively not-entitled**
    - **Validates: Requirements 5.1, 5.4**

  - [x] 6.4 Property 12 — sweep idempotency
    - **Property 12: running the sweep twice equals running it once and never errors
      (delete of an already-deleted user is success)**
    - **Validates: Requirements 5.7**

  - [x] 6.5 Property 6 — Google-linked accounts created verified
    - **Property 6: every Google-created account sets isVerified=true**
    - **Validates: Requirements 4.5**

  - [x] 6.6 Property 13 — every delete/reclaim decision is audited
    - **Property 13: each delete/retain emits an audit record with account id, trigger, and
      entitlement result**
    - **Validates: Requirements 7.5**

  - [x] 6.7 Property 2 — self-service signup creates an unverified user
    - **Property 2: signup user-creation sends isVerified=false to Zitadel**
    - **Validates: Requirements 2.1**

- [x] 7. Preserve signup rate limiting (skawr-login regression)
  - [x] 7.1 Regression test asserting signup rate limit still enforced
    - Assert `POST /signup` is limited to 5/minute per client address and returns 429 when
      exceeded (SlowAPI), and that the new reclaim/sweep code did not remove the limiter
    - _Requirements: 6.1, 6.2_

---

### Group B — skawr-indexer regression tests (PR #2, no behavioral change)

> These tasks add tests only, in `skawr-search/skawr-indexer/tests/`. They lock in
> already-merged behavior (Req 8 non-regression). No production indexer code changes.

- [x] 8. Indexer must-not-regress example/regression tests
  - [x] 8.1 Provisioning + entitlement key off the Polar-verified email
    - Assert `_handle_subscription_created` resolves the client by `customer.email` from the
      webhook and provisions analytics with that email; a self-asserted email never used;
      assert abort (no APIClient) when no client id AND no Polar email
    - _Requirements: 3.1, 3.2, 3.3, 8.3_

  - [x] 8.2 Entitlement endpoint fail-closed status matrix
    - Assert active → entitled; cancelled/grace_period entitled only while
      `current_period_end` in future, not entitled once passed; unknown email / any other
      status → not entitled
    - _Requirements: 3.5, 3.6, 3.7, 8.2_

  - [x] 8.3 Entitlement endpoint requires Service_Token
    - Assert 401 on missing/invalid token and 503 when the indexer has no token configured
    - _Requirements: 3.4, 8.5_

  - [x] 8.4 Guest preview is search-only, non-entitled, expiring
    - Assert `mint_guest_preview_key` mints exactly one `pk_` key and zero `sk_`; client is
      inactive/non-entitled with a future `guest_expires_at`
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 8.5 `pk_` → account session is 403
    - Assert `login_with_key` rejects a `pk_`-prefixed key with HTTP 403
    - _Requirements: 1.5_

  - [x] 8.6 Non-entitled accounts refused paid API usage (402)
    - Assert paid API usage for a non-entitled account is rejected with HTTP 402
    - _Requirements: 2.5, 8.1_

- [x] 9. Property-based invariant tests for the indexer (Hypothesis, ≥100 iterations, mocked)
  - [x] 9.1 Property 4 — entitlement mapping is fail-closed
    - **Property 4: entitled iff active, or cancelled/grace_period with future
      current_period_end; unknown email and any other status → not entitled**
    - **Validates: Requirements 3.5, 3.6, 3.7, 8.2**

  - [x] 9.2 Property 1 — provisioning/entitlement key off the Polar-verified email
    - **Property 1: resolved/created APIClient email equals the Polar-verified email and the
      analytics provision email equals that same email, never a self-asserted email**
    - **Validates: Requirements 3.1, 3.3, 8.3**

  - [x] 9.3 Property 5 — every entitlement request is Service_Token-authenticated
    - **Property 5: request carries a Bearer SERVICE_API_TOKEN; missing/invalid → 401;
      endpoint with no configured token → 503**
    - **Validates: Requirements 3.4, 4.4, 5.3, 8.5**

  - [x] 9.4 Property 9 — guest preview is search-only, non-entitled, expiring
    - **Property 9: exactly one pk_ key, zero sk_ keys, inactive/non-entitled, future
      guest-expiry**
    - **Validates: Requirements 1.2, 1.3, 1.4**

  - [x] 9.5 Property 10 — public keys never exchangeable for an account session
    - **Property 10: any pk_ key presented to exchange for an account session → HTTP 403**
    - **Validates: Requirements 1.5**

  - [x] 9.6 Property 11 — non-entitled accounts refused paid API usage
    - **Property 11: not-entitled account → HTTP 402 on paid API usage**
    - **Validates: Requirements 2.5, 8.1**

- [x] 9.7 Checkpoint — indexer regression suite
  - Ensure all indexer tests pass (`pytest` in
    `/Users/smsaleh/Documents/Skawr/skawr-search/skawr-indexer`). Ask the user if questions
    arise.

---

### Group C — deployment wiring (skawr-login PR #1)

- [x] 10. Deployment wiring notes for skawr-login — **sweep stays disabled until staging-verified**
  - Add a deployment section to `skawr-login/README.md` documenting the required env for the
    new flows: `INDEXER_BASE_URL` and `SERVICE_API_TOKEN` (same shared secret already in
    `skawr-deployment/.env`) must be injected into skawr-login's environment
  - Document the cron entrypoint (`python -m app.sweep`) following the existing indexer
    guest-cleanup cron pattern in `skawr-deployment`, and state it MUST remain unwired
    (and `SWEEP_ENABLED=false`) until the sweep is verified in staging
  - Document that a missing token fails safe (retain) so a misconfig cannot delete users, and
    the staging verification checklist: run one manual `python -m app.sweep` against staging,
    confirm audit logs show correct retain/delete decisions, then enable the cron
  - This is a docs/config-note task only — no live deployment is performed here
  - _Requirements: 5.2, 7.4, 7.5_

---

### Amendment — Two-phase deactivate-then-delete lifecycle (skawr-login PR #1)

> Delta from the two-phase sweep amendment (requirements.md Req 5/7 and design.md
> sections 2/4/5 + Properties 3/8/12/13/14). All new work lives in **skawr-login**
> (Group A) and lands in the same skawr-login PR. The single-threshold delete model
> (tasks 4.x) is superseded by a two-phase model: **deactivate** unverified/never-paid
> accounts past the deactivate threshold, then **delete** already-deactivated
> unverified/never-paid accounts past the delete threshold. Verified accounts are
> reactivated on successful password login.
>
> **DESTRUCTIVE / HIGH-RISK:** the delete phase still removes a real Zitadel user
> irreversibly and MUST only fire on an account that is (a) already deactivated,
> (b) unverified, (c) positively not-entitled, and (d) older than the delete threshold.
> The sweep still ships disabled (`SWEEP_ENABLED=false`, cron unwired) until staging-verified.

- [x] 11. Split sweep thresholds into deactivate + delete windows (skawr-login `app/config.py`)
  - [x] 11.1 Replace `SWEEP_THRESHOLD_DAYS` with `SWEEP_DEACTIVATE_DAYS` and `SWEEP_DELETE_DAYS`
    - Remove `SWEEP_THRESHOLD_DAYS`; add `SWEEP_DEACTIVATE_DAYS` (default `30`) and
      `SWEEP_DELETE_DAYS` (default `90`)
    - Do NOT add either to `Config._REQUIRED` — defaults must apply and a misconfig must never
      crash the login gateway
    - Update `.env.example` to drop `SWEEP_THRESHOLD_DAYS` and add both new vars with a comment
      that delete must be ≥ deactivate window and that both are ignored while `SWEEP_ENABLED=false`
    - _Requirements: 5.4, 5.5_

- [x] 12. Zitadel deactivate / reactivate helpers (skawr-login `app/zitadel.py`)
  - [x] 12.1 Add `deactivate_user` and `reactivate_user`
    - `async def deactivate_user(user_id)`: v2 `POST /v2/users/{user_id}/deactivate`; treat
      HTTP 409 as success (already inactive → idempotent), `raise_for_status` otherwise
    - `async def reactivate_user(user_id)`: v2 `POST /v2/users/{user_id}/reactivate`; treat
      HTTP 409 as success (already active → idempotent), `raise_for_status` otherwise
    - Docstrings state deactivate is reversible (unlike `delete_user`) and is the required
      first phase before any delete
    - _Requirements: 5.2, 5.8, 5.10_

  - [x]* 12.2 Unit tests for `deactivate_user` / `reactivate_user`
    - Assert 409 is swallowed (returns cleanly) for both, other non-2xx raises, correct v2
      endpoint + method used
    - _Requirements: 5.2, 5.8_

- [x] 13. Surface deactivation state from `iter_unverified_users` (skawr-login `app/zitadel.py`)
  - [x] 13.1 Add the `deactivated` field to the yielded dict
    - Read the Zitadel user `state` and set `deactivated = (state == "USER_STATE_INACTIVE")`;
      add it to the yielded shape `{"id", "email", "email_verified", "created_at", "deactivated"}`
    - Keep existing verification/creation-date parsing; do not duplicate `_is_email_verified`
    - _Requirements: 5.3_

- [x] 14. Two-phase `run_sweep` rework (skawr-login `app/sweep.py`) — **DESTRUCTIVE, ships disabled**
  - [x] 14.1 Rework `run_sweep` into deactivate + delete phases
    - Compute `deactivate_cutoff = now - SWEEP_DEACTIVATE_DAYS` and
      `delete_cutoff = now - SWEEP_DELETE_DAYS`; iterate `zitadel.iter_unverified_users`
    - Retain guards (unchanged intent): skip verified (retained_verified), skip
      `created_at is None` or younger than deactivate window (skipped_young), on
      `EntitlementUnavailable` retain + audit (retained_error), if entitled retain + audit
      (retained_entitled)
    - Deactivate phase: unverified + never-paid + older than `deactivate_cutoff` + NOT already
      `deactivated` → `zitadel.deactivate_user` + audit (deactivated)
    - Delete phase: unverified + never-paid + already `deactivated` + older than `delete_cutoff`
      → `zitadel.delete_user` + audit (deleted); a delete MUST NOT fire on an account that is
      not already deactivated
    - Return + log the new summary counter dict: `scanned`, `deactivated`, `deleted`,
      `retained_verified`, `retained_entitled`, `retained_error`, `skipped_young`; reuse `_audit`
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7, 5.8, 5.9, 7.5_

  - [x]* 14.2 Update sweep unit tests for the two-phase model
    - Table-driven over (verified?, entitled?, age, reachable?, already-deactivated?); assert
      deactivate fires only for unverified + never-paid + past deactivate window + not-yet
      deactivated; assert delete fires only for already-deactivated + past delete window;
      assert delete never fires before deactivation; assert every retain/skip branch increments
      the right counter and audits
    - _Requirements: 5.1, 5.6, 5.7, 5.8, 5.9, 7.5_

- [x] 15. Reactivate on successful password login (skawr-login `app/main.py`)
  - [x] 15.1 Reactivate deactivated-but-verified accounts on password login
    - After a successful password login where the account is deactivated AND email is verified,
      call `zitadel.reactivate_user` before finalizing the session; audit the reactivation
    - Do NOT reactivate unverified accounts; leave the existing session/finalize path otherwise
      unchanged
    - _Requirements: 5.10_

  - [x]* 15.2 Test password-login reactivation
    - Mock Zitadel: assert `reactivate_user` is called for a deactivated + verified account on
      successful login and NOT called for verified-active or unverified accounts
    - _Requirements: 5.10_

- [x]* 16. Update property-based safety tests for the two-phase model (Hypothesis, ≥100 iters, mocked)
  - [x]* 16.1 Extend Property 3 — safety envelope covers deactivate AND delete
    - **Property 3: never deactivate OR delete a verified, entitled, or indeterminate account**
    - Generate `(verified?, entitled?, age, entitlement-reachable?, already-deactivated?)`;
      assert neither phase touches verified / entitled / unavailable / unconfigured accounts
    - **Validates: Requirements 4.6, 4.7, 5.6, 7.1, 7.2, 7.4**

  - [x]* 16.2 Split/rework Property 8 — deactivate condition + delete condition
    - **Property 8a: deactivate iff unverified AND never-paid AND age > deactivate threshold
      AND not already deactivated**
    - **Property 8b: delete iff unverified AND never-paid AND already deactivated AND age >
      delete threshold**
    - **Validates: Requirements 5.1, 5.2, 5.8, 5.9**

  - [x]* 16.3 Update Property 12 — deactivate + delete idempotency
    - **Property 12: running the sweep twice equals running it once and never errors
      (deactivate of an already-inactive user and delete of an already-deleted user are both
      success)**
    - **Validates: Requirements 5.7, 5.8**

  - [x]* 16.4 Update Property 13 — every lifecycle decision is audited
    - **Property 13: each deactivate / reactivate / delete / retain emits an audit record with
      account id, trigger, and entitlement result**
    - **Validates: Requirements 7.5**

  - [x]* 16.5 Add Property 14 — delete only after deactivation
    - **Property 14: no account is ever deleted unless it was already in the deactivated state
      (delete is strictly the second phase, never applied to an active account)**
    - **Validates: Requirements 5.8, 5.9**

- [x] 17. Update README for the two-phase lifecycle (skawr-login `README.md`)
  - [x] 17.1 Refresh deployment section + env defaults
    - Replace `SWEEP_THRESHOLD_DAYS` references with `SWEEP_DEACTIVATE_DAYS=30` and
      `SWEEP_DELETE_DAYS=90`; document the deactivate-then-delete lifecycle (deactivate at 30d,
      delete at 90d, reactivation on verified password login) and that delete only follows a
      prior deactivation
    - Keep the "sweep stays disabled until staging-verified" note and the staging checklist
    - _Requirements: 5.4, 5.5_

- [x] 18. Checkpoint — skawr-login two-phase lifecycle
  - Ensure all skawr-login tests pass (`pytest` in `/Users/smsaleh/Documents/Skawr/skawr-login`).
    Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core
  implementation tasks (unmarked) MUST be implemented.
- **skawr-login and skawr-indexer are separate git repos → two separate PRs.** Do not mix
  commits across repos. skawr-analytics needs no change.
- **DESTRUCTIVE tasks (2.1, 2.4, 3.1, 4.1) must land with safety guards + audit logging in the
  same change.** The delete gate requires a *positive* not-entitled answer; verified, entitled,
  and indeterminate all retain.
- **The sweep ships disabled** (`SWEEP_ENABLED=false`, cron unwired) until verified in staging.
- Property tests use Hypothesis at ≥100 iterations each; Zitadel and the entitlement endpoint
  are mocked so properties run in-memory. Property 3 (safety envelope) is authored first.
- Each task references the requirement clauses and/or design property it satisfies.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.3", "9.1", "9.2", "9.3", "9.4", "9.5", "9.6"] },
    { "id": 2, "tasks": ["1.3", "2.2", "2.5"] },
    { "id": 3, "tasks": ["2.4"] },
    { "id": 4, "tasks": ["2.6", "3.1", "4.1"] },
    { "id": 5, "tasks": ["3.2", "4.2", "7.1"] },
    { "id": 6, "tasks": ["4.3", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7"] },
    { "id": 7, "tasks": ["10"] }
  ]
}
```

### Amendment addendum — two-phase lifecycle waves

These waves cover ONLY the new amendment tasks (11–17) and their ordering: config + Zitadel
helpers + state field first, then the sweep rework and login reactivation, then the tests, then
docs. They run after the original waves above (which are already complete).

```json
{
  "waves": [
    { "id": 8, "tasks": ["11.1", "12.1", "13.1"] },
    { "id": 9, "tasks": ["12.2", "14.1", "15.1"] },
    { "id": 10, "tasks": ["14.2", "15.2", "16.1", "16.2", "16.3", "16.4", "16.5"] },
    { "id": 11, "tasks": ["17.1"] }
  ]
}
```
