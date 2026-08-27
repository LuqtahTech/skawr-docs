# Design Document

## Overview

This feature implements the AUTH-C002 "verify-before-privilege" identity model across three Skawr services. Identity trust is earned progressively:

- **Anonymous** — a guest can import and search with a browser-safe search-only key, no email, no password.
- **Unverified session** — self-service signup creates a Zitadel user with `isVerified=false`, signs the user in immediately, but that session is **authn-only**: it proves "someone holds this password," never "this person owns this email."
- **Paid / verified** — the only canonical proof of a committed identity is an active Polar subscription keyed to a Polar-verified checkout email (or a Zitadel email verified out-of-band / via Google's verified claims).

Most of the desired behavior already exists in the codebase and this design **locks it in as testable invariants**. The genuinely new work is:

1. **Google auto-reclaim** — when a Google-verified identity matches an existing account that is *both* unverified *and* never-paid, delete the stale squatter and create a fresh Google-linked account, replacing today's `error=google` dead-end.
2. **Expiry sweep job** — a scheduled two-phase job in skawr-login that first **deactivates** unverified-never-paid Zitadel users older than the `Deactivate_Threshold` (default 30 days), and later **hard-deletes** already-deactivated unverified-never-paid users older than the `Delete_Threshold` (default 90 days). Both ages are measured from account creation (`Verification_Age`). Deactivation always precedes deletion by at least one cycle, leaving a reversible marketing/nurture reach-out window before full erasure.
3. **Cross-service entitlement client in skawr-login** — a new HTTP client that calls the indexer `Entitlement_Endpoint` with the shared `SERVICE_API_TOKEN`, used by both new flows, **fail-SAFE** (retain) on error.

### Trust / State Model

```
                 no identity                     authn only,                    canonical proof
                 required                        NOT ownership proof            of identity
   ┌───────────────────────┐   signup     ┌───────────────────────┐  Polar    ┌──────────────────────┐
   │      ANONYMOUS         │  ─────────▶  │   UNVERIFIED SESSION   │  paid /   │   PAID / VERIFIED     │
   │  guest client          │             │  Zitadel isVerified=   │  Google   │  active subscription  │
   │  pk_ search-only key   │             │  false, signed in      │  verify   │  OR isVerified=true   │
   │  inactive / non-entitled│            │  402 on paid API usage │ ────────▶ │  full entitlement     │
   └───────────────────────┘             └───────────────────────┘           └──────────────────────┘
             │                                       │                                    ▲
             │ pk_ → account session = 403           │ email confirmed (Zitadel native    │
             │ (never exchangeable)                  │ verification) OR Google verified ──┘
             ▼                                        │
      marketing email = data only                    │ unverified AND never-paid AND
      (never authn/entitlement input)                │  (Google reclaim
                                                      │   | age>Deactivate_Threshold → DEACTIVATE
                                                      │   | deactivated & age>Delete_Threshold → DELETE)
                                                      └──────────────▶  ELIGIBLE FOR DEACTIVATE-THEN-DELETE / RECLAIM
```

Key trust rules encoded by the diagram:

- The **unverified session is authentication-only**. No privilege, entitlement, or trust decision may read it as email-ownership proof (Req 2.4).
- **Entitlement is keyed to the Polar-verified email**, never a self-asserted signup email (Req 3.1, 3.3).
- A **`pk_` search-only key is never exchangeable for an account session** (Req 1.5 → HTTP 403).
- **Deactivation/deletion/reclaim is gated hard**: an account must be *unverified* AND *never-paid* before any automated flow may deactivate, delete, or reclaim it, and entitlement-unknown always resolves to "retain" (Req 7). Hard deletion additionally requires the account to already be in the *deactivated* state, so deactivation always precedes deletion.

## Architecture

### Service responsibilities

| Service | Role in this feature | New/changed |
|---|---|---|
| **skawr-login** (`login.skawr.com`) | Signup, Google callback, and the new two-phase (deactivate-then-delete) expiry sweep job. Talks to Zitadel + the indexer entitlement endpoint. | `zitadel.py` (deactivate + reactivate + delete + reclaim helpers), `main.py` (`/google/callback`), new `entitlement.py` client, new `sweep.py` job, `config.py` (new env). |
| **skawr-indexer** (`api.skawr.com`) | Billing source of truth. Owns provisioning (`subscription.created`), the `Entitlement_Endpoint`, and the guest preview path. | No behavioral change required — this feature adds **regression coverage** locking in existing behavior. |
| **skawr-analytics** (`analytics-api.skawr.com`) | Downstream provisioning target (`POST /api/v1/provision/auto`). | No change (already keyed to the email the indexer sends). |

### Cross-service call graph (new + existing)

```
Browser ──▶ skawr-login /google/callback
                 │
                 ├─▶ Zitadel  (retrieve intent, find user, is_verified?, delete_user, create_human_with_idp, session)
                 └─▶ indexer  GET /api/v1/internal/entitlement   (Authorization: Bearer SERVICE_API_TOKEN)   [NEW caller]

skawr-login Expiry_Sweep_Job (scheduled, two-phase)
                 ├─▶ Zitadel  (user search by verification state + createdDate + deactivated state, deactivate_user, delete_user)
                 └─▶ indexer  GET /api/v1/internal/entitlement   (Authorization: Bearer SERVICE_API_TOKEN)   [NEW caller]

Polar ──▶ indexer POST /api/v1/webhooks/polar (subscription.created)
                 └─▶ analytics POST /api/v1/provision/auto  (X-Service-Token)   [EXISTING, keyed to Polar email]
```

Note: analytics already consumes the same `Entitlement_Endpoint` with `Authorization: Bearer <indexer_service_token>`. skawr-login becomes a **second consumer** of that endpoint using the identical auth scheme.

## Components and Interfaces

### 1. skawr-login: entitlement client (NEW — `app/entitlement.py`)

A small async client that both the Google reclaim path and the sweep job call. It is the single place that encodes the **fail-SAFE (retain) on error** contract for deletion decisions.

```python
# app/entitlement.py
from __future__ import annotations
import logging
import httpx
from app.config import config

log = logging.getLogger("skawr-login")


class EntitlementUnavailable(Exception):
    """Entitlement could not be determined (unreachable / non-2xx / bad body).

    Callers making a DEACTIVATE/DELETE/RECLAIM decision MUST treat this as
    'entitled → retain' (fail-safe). See Req 4.7, 5.7, 7.4."""


async def is_entitled(email: str) -> bool:
    """Return True if the indexer reports `email` as entitled.

    Raises EntitlementUnavailable when the answer cannot be trusted, so the
    caller can apply the retain-on-error safety rule explicitly rather than
    silently defaulting to 'not entitled' (which would authorize a delete)."""
    base = config.INDEXER_BASE_URL
    token = config.SERVICE_API_TOKEN
    if not (base and token):
        # Misconfigured: we cannot prove non-entitlement, so we must not delete.
        raise EntitlementUnavailable("INDEXER_BASE_URL / SERVICE_API_TOKEN not set")
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                f"{base}/api/v1/internal/entitlement",
                params={"email": email.strip().lower()},
                headers={"Authorization": f"Bearer {token}"},
            )
        r.raise_for_status()
        return bool(r.json()["entitled"])
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise EntitlementUnavailable(str(exc)) from exc
```

Design note: the client raises on ambiguity instead of returning `False`. Returning `False` on a timeout would silently authorize a destructive delete — the exact footgun Req 7.4 forbids. Callers convert `EntitlementUnavailable → retain`.

### 2. skawr-login: Zitadel destructive + reclaim helpers (CHANGED — `app/zitadel.py`)

Add `deactivate_user` / `reactivate_user` / `delete_user` helpers and a `reclaim_or_link_from_intent` function that replaces the `resolve_user_from_intent` dead-end for the unverified-never-paid case. The existing verified-linking and squatting-guard logic is preserved.

The guard/entitlement checks live in the **caller** for both `deactivate_user` and `delete_user` — these helpers only perform the Zitadel state transition, so the decision + audit log happen in one place (reclaim / sweep).

```python
async def deactivate_user(user_id: str) -> None:
    """Deactivate a Zitadel user (v2 POST /v2/users/{user_id}/deactivate).

    REVERSIBLE (undone by reactivate_user). Idempotent: a user that is already
    deactivated (Zitadel returns a 409 / "already deactivated") is treated as
    success so repeated sweep runs don't error (Req 5.8).

    Callers MUST have already proven the account is BOTH unverified AND
    never-paid (entitlement checked, not merely assumed). This function does not
    itself re-check — the guard lives in the caller (sweep)."""
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{config.BASE}/v2/users/{user_id}/deactivate", headers=_headers()
        )
    if r.status_code == 409:                 # already deactivated → treat as success
        return
    r.raise_for_status()


async def reactivate_user(user_id: str) -> None:
    """Reactivate a previously deactivated Zitadel user
    (v2 POST /v2/users/{user_id}/reactivate).

    Idempotent: a user that is already active (Zitadel returns a 409 /
    "already active") is treated as success. Used when the owner of a
    deactivated account returns (Req 5.10)."""
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{config.BASE}/v2/users/{user_id}/reactivate", headers=_headers()
        )
    if r.status_code == 409:                 # already active → treat as success
        return
    r.raise_for_status()


async def delete_user(user_id: str) -> None:
    """Delete a Zitadel user (v2 DeleteUser). UNCHANGED by the two-phase rework.
    Idempotent: a 404 (already gone) is treated as success so repeated sweep
    runs don't error (Req 5.9).

    DESTRUCTIVE. Callers MUST have already proven the account is BOTH unverified
    AND never-paid (entitlement checked, not merely assumed) AND — for the sweep —
    already deactivated. This function does not itself re-check — the guard lives
    in the caller (reclaim / sweep) so the decision + audit log happen in one place."""
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.delete(f"{config.BASE}/v2/users/{user_id}", headers=_headers())
    if r.status_code == 404:
        return
    r.raise_for_status()


async def get_user_created_at(user_id: str) -> datetime | None:
    """Return the user's creation timestamp (details.creationDate) or None."""
    ...


async def reclaim_or_link_from_intent(
    idp_id: str, intent_id: str, intent_token: str,
) -> str:
    """Resolve a completed Google intent to a Zitadel user id, with auto-reclaim.

    Decision branches (replaces the raise-ValueError dead-end):

      1. intent already linked to a user  -> return that user id.
      2. no existing account for the email -> create_human_with_idp (isVerified=true).
      3. existing account, email VERIFIED  -> add_idp_link, return it (Req 4.2).
      4. existing account, UNVERIFIED:
           a. entitled (or entitlement unknown) -> DO NOT delete; raise/deny (Req 4.6/4.7).
           b. never-paid                         -> delete_user + create_human_with_idp (Req 4.3/4.5).
    """
    # (implementation orchestrates find_user_id_by_email, _is_email_verified,
    #  entitlement.is_entitled, delete_user, create_human_with_idp; see flow below)
```

Existing helpers reused unchanged: `retrieve_idp_intent`, `find_user_id_by_email`, `_is_email_verified`, `add_idp_link`, `create_human_with_idp` (already sets `isVerified=true`), `session_from_idp_intent`, `finalize_auth_request`.

### 3. skawr-login: Google callback (CHANGED — `app/main.py`)

`/google/callback` swaps `resolve_user_from_intent` for `reclaim_or_link_from_intent` and audit-logs the reclaim decision. The `error=google` redirect remains only for genuine failures (missing intent, provider/transport errors, or the *entitled/verified* deny in branch 4a), not for the previously-fatal "unverified account exists" case.

#### Google auto-reclaim decision flow

```
Google intent completes (id, token) at /google/callback
        │
        ▼
retrieve_idp_intent → linked userId present? ──yes──▶ use it → session → finalize ✔
        │ no
        ▼
extract verified email + external id from intent (Google's verified claims)
        │
        ▼
find_user_id_by_email(email)
        │
        ├── none ──────────────▶ create_human_with_idp(isVerified=true) → session ✔   (Req 4.1, 4.5)
        │
        └── existing user_id
                 │
                 ├── _is_email_verified? ──yes──▶ add_idp_link → session ✔             (Req 4.2, 7.1)
                 │
                 └── unverified
                          │
                          ▼
                 is_entitled(email)   [indexer, Bearer SERVICE_API_TOKEN]
                          │
                          ├── entitled=True ─────────▶ DO NOT delete; deny → error=google  (Req 4.6, 7.2)
                          │
                          ├── EntitlementUnavailable ▶ DO NOT delete; deny → error=google  (Req 4.7, 7.4)
                          │       (audit: retained_on_entitlement_error)
                          │
                          └── entitled=False ────────▶ audit(reclaim) → delete_user
                                                        → create_human_with_idp(isVerified=true)
                                                        → session ✔                          (Req 4.3, 4.5)
```

Only branch "entitled=False" (proven never-paid) reaches `delete_user`. Every other branch retains the account. This is the concrete replacement of the current `raise ValueError("...not verified...")` → `error=google` dead-end.

### 4. skawr-login: Expiry sweep job (NEW — `app/sweep.py`)

A two-phase job. Both phases are measured from account creation via `Verification_Age`, and entitlement is checked **before either action**:

- **Deactivate phase** — unverified-never-paid users whose `Verification_Age` exceeds the `Deactivate_Threshold` (default 30 days) and that are **not yet deactivated** are reversibly deactivated.
- **Delete phase** — unverified-never-paid users that are **already deactivated** and whose `Verification_Age` exceeds the `Delete_Threshold` (default 90 days) are hard-deleted.

Because a delete only ever happens to an account already observed in the deactivated state, deactivation always precedes deletion by at least one cycle.

#### Listing candidates

Zitadel v2 user search (`POST /v2/users`) with queries for human users whose email is unverified. Zitadel does not expose a direct `isVerified=false` query in all versions, so the job filters defensively in code: for each returned user it re-checks `_is_email_verified` and reads `creationDate` to compute `Verification_Age`. It also reads the Zitadel user `state` (e.g. `USER_STATE_INACTIVE` == deactivated) so the sweep can tell whether an account is already deactivated and therefore eligible for the delete phase. Pagination via the search `query.limit` / `query.offset` (or the returned `details.totalResult`) so a large org is swept in pages.

`iter_unverified_users` yields a dict per candidate with the shape:

```python
{
    "id": str,               # Zitadel userId
    "email": str,            # human.email.email
    "email_verified": bool,  # human.email.isVerified (defensive re-check)
    "created_at": datetime,  # details.creationDate (drives Verification_Age)
    "deactivated": bool,     # state == USER_STATE_INACTIVE (drives the delete phase)
}
```

```python
# app/sweep.py
from __future__ import annotations
import logging
from datetime import datetime, timedelta, timezone

from app.config import config
from app.entitlement import is_entitled, EntitlementUnavailable
from app import zitadel

log = logging.getLogger("skawr-login")


async def run_sweep(now: datetime | None = None) -> dict:
    """One two-phase sweep pass. Returns a summary dict for logging/metrics.

    Guards (applied per candidate, in order — before EITHER action):
      * skip if no/young creation date relative to the DEACTIVATE cutoff
        (skipped_young) — nothing younger than the deactivate cutoff can be
        acted on, so this is the cheapest early exit,
      * skip verified accounts (retained_verified),
      * on EntitlementUnavailable, retain + audit (retained_error),
      * if entitled, retain + audit (retained_entitled).

    Then, for an unverified, never-paid candidate (entitlement already checked):
      * IF already deactivated AND Verification_Age > Delete_Threshold
            -> audit(delete) + delete_user            (deleted)
      * ELIF Verification_Age > Deactivate_Threshold AND not yet deactivated
            -> audit(deactivate) + deactivate_user     (deactivated)

    Delete only ever happens to an account already observed deactivated, so
    deactivation always precedes deletion by at least one cycle.

    Idempotent (Req 5.8, 5.9): deactivate_user swallows already-deactivated (409),
    delete_user swallows 404.
    """
    now = now or datetime.now(timezone.utc)
    deactivate_cutoff = now - timedelta(days=config.SWEEP_DEACTIVATE_DAYS)
    delete_cutoff = now - timedelta(days=config.SWEEP_DELETE_DAYS)
    summary = {"scanned": 0, "deactivated": 0, "deleted": 0,
               "retained_verified": 0, "retained_entitled": 0,
               "retained_error": 0, "skipped_young": 0}

    async for user in zitadel.iter_unverified_users():
        summary["scanned"] += 1
        created = user.get("created_at")
        # Nothing younger than the (earlier) deactivate cutoff can be acted on.
        if created is None or created > deactivate_cutoff:
            summary["skipped_young"] += 1
            continue
        if user["email_verified"]:            # defensive re-check
            summary["retained_verified"] += 1
            continue
        try:
            entitled = await is_entitled(user["email"])
        except EntitlementUnavailable:
            summary["retained_error"] += 1
            _audit("sweep", user, decision="retain", reason="entitlement_error")
            continue
        if entitled:
            summary["retained_entitled"] += 1
            _audit("sweep", user, decision="retain", reason="entitled")
            continue

        # unverified AND never-paid → decide deactivate vs delete
        if user["deactivated"] and created <= delete_cutoff:
            # already deactivated AND old enough → hard delete
            _audit("sweep", user, decision="delete", reason="deactivated_expired")
            await zitadel.delete_user(user["id"])
            summary["deleted"] += 1
        elif not user["deactivated"]:
            # older than deactivate cutoff, not yet deactivated → deactivate
            _audit("sweep", user, decision="deactivate", reason="unverified_never_paid")
            await zitadel.deactivate_user(user["id"])
            summary["deactivated"] += 1
        # else: already deactivated but younger than Delete_Threshold → wait

    log.info("expiry_sweep complete: %s", summary)
    return summary
```

#### Reactivation of returning owners

The sweep itself is **deactivate/delete-only** — it never reactivates. Reactivation is driven by the account owner returning:

- **Google reclaim** already covers its own case: the reclaim path deletes and recreates the account (a returning Google owner gets a fresh verified account rather than a stale deactivated one).
- **Password login** — a successful password login of a deactivated account whose email has since become verified should call `zitadel.reactivate_user` so the owner is not left blocked (Req 5.10). This lives in the login/session path, not in the sweep.

#### Scheduling mechanism

skawr-login has **no existing scheduler** (confirmed: only FastAPI startup/`on_event` hooks exist). To avoid coupling deletion to a request, the job is delivered two ways, controlled by config, so deployment can pick the safer one:

- **Preferred: cron entrypoint.** A module entrypoint `python -m app.sweep` runs one pass and exits. The VPS scheduler (the existing `skawr-deployment` cron/compose wiring, same pattern as the indexer guest-cleanup cron) invokes it daily. Single-shot processes are the simplest to reason about, cannot leak tasks, and are trivially idempotent.
- **Fallback: in-process periodic task.** If no external scheduler is wired, an `asyncio` task started in the FastAPI lifespan sleeps `SWEEP_INTERVAL_HOURS` and calls `run_sweep`, guarded by `SWEEP_ENABLED`. This runs in exactly one replica (guarded by an advisory lock / `SWEEP_ENABLED` only on one instance) to avoid concurrent duplicate sweeps — though idempotent deletes make a double-run harmless.

`__main__` shape:

```python
# app/sweep.py (entrypoint)
if __name__ == "__main__":
    import asyncio
    raise SystemExit(0 if asyncio.run(run_sweep()) is not None else 1)
```

### 5. skawr-login config (CHANGED — `app/config.py`)

New settings (skawr-login does **not** currently know about the indexer):

| Env var | Attr | Default | Purpose |
|---|---|---|---|
| `INDEXER_BASE_URL` | `INDEXER_BASE_URL` | `https://api.skawr.com` | Base URL for the entitlement endpoint. |
| `SERVICE_API_TOKEN` | `SERVICE_API_TOKEN` | `""` | Shared bearer secret the indexer verifies (same value as indexer's `SERVICE_API_TOKEN`). |
| `SWEEP_DEACTIVATE_DAYS` | `SWEEP_DEACTIVATE_DAYS` | `30` | `Deactivate_Threshold` age (Req 5.2, 5.4). |
| `SWEEP_DELETE_DAYS` | `SWEEP_DELETE_DAYS` | `90` | `Delete_Threshold` age (Req 5.3, 5.5). |
| `SWEEP_ENABLED` | `SWEEP_ENABLED` | `false` | Enables the in-process periodic fallback. |
| `SWEEP_INTERVAL_HOURS` | `SWEEP_INTERVAL_HOURS` | `24` | Interval for the in-process fallback. |

These are **not** added to `Config._REQUIRED`: the entitlement client fails safe when they are absent (treats accounts as entitled/retain), matching Req 7.4, so a missing token must never crash the login gateway nor authorize a delete. `SERVICE_API_TOKEN` is the same shared secret already documented in `skawr-deployment/.env`; deployment must inject it into skawr-login's environment alongside `INDEXER_BASE_URL`.

### 6. Cross-service entitlement contract

The endpoint already exists in the indexer (`GET /api/v1/internal/entitlement`). skawr-login consumes it verbatim.

**Request**

```
GET {INDEXER_BASE_URL}/api/v1/internal/entitlement?email=<account-email>
Authorization: Bearer <SERVICE_API_TOKEN>
```

**Response 200** (`EntitlementResponse`)

```json
{ "email": "user@example.com", "entitled": true, "tier": "pro", "status": "active", "reason": "ok" }
```

**Auth failure** — `401` (missing/invalid token) or `503` (token not configured on the indexer). skawr-login treats **any** non-2xx or transport failure as `EntitlementUnavailable → retain`.

**Entitlement semantics (indexer, unchanged — locked as invariants):**

- `active` → entitled.
- `cancelled` / `grace_period` → entitled only while `current_period_end` is in the future; not entitled once it passes.
- unknown email (no client) or any other status → not entitled.

## Data Models

This feature introduces **no new persistent tables**. It reads/acts on:

- **Zitadel user** (source of truth for identity): `userId`, `human.email.email`, `human.email.isVerified`, `details.creationDate`, `state` (active vs `USER_STATE_INACTIVE`). Read via existing helpers; created via `create_human_user` (`isVerified=false`) and `create_human_with_idp` (`isVerified=true`); reversibly deactivated/reactivated via the new `deactivate_user` / `reactivate_user`; deleted via the new `delete_user`.
- **indexer `APIClient`** (billing source of truth): `email` (UNIQUE), `subscription_status`, `subscription_tier`, `is_guest`, `guest_expires_at`. Read-only from skawr-login's perspective (via the entitlement endpoint).
- **indexer `Subscription`**: `current_period_end` — read by the entitlement endpoint for period-gated statuses.

Audit records are emitted as structured log events (see Error Handling), not a new table, keeping the change surface minimal and matching the existing `billing_logger` pattern.

### Audit log shape (Req 7.5)

Every delete/reclaim decision logs a structured record:

```python
def _audit(trigger: str, user: dict, *, decision: str, reason: str) -> None:
    # trigger ∈ {"google_reclaim", "sweep", "login"};
    # decision ∈ {"deactivate", "reactivate", "delete", "retain"}
    log.info(
        "auth_reclaim decision trigger=%s user_id=%s email_masked=%s "
        "decision=%s reason=%s entitlement=%s",
        trigger, user["id"], _mask(user.get("email")),
        decision, reason, reason,
    )
```

The record carries the **account identifier**, the **trigger** (Google reclaim, sweep, or login), the **decision type** (deactivate, reactivate, delete, or retain), and the **entitlement result** used for the decision. Emails are masked in logs to avoid leaking PII while keeping the record actionable.

## Error Handling

| Failure | Handling | Requirement |
|---|---|---|
| Entitlement endpoint unreachable / 5xx / 401 / 503 / bad body | `EntitlementUnavailable` → **retain** (neither deactivate nor delete). Google callback denies with `error=google`; sweep skips the candidate this run. | 4.7, 5.7, 7.4 |
| `INDEXER_BASE_URL` / `SERVICE_API_TOKEN` unset in skawr-login | `EntitlementUnavailable` (cannot prove non-entitlement) → retain. Sweep effectively no-ops safely. | 7.4 |
| Zitadel `deactivate_user` returns 409 (already deactivated) | Treated as success → idempotent sweep. | 5.8 |
| Zitadel `delete_user` returns 404 | Treated as success (already deleted) → idempotent sweep. | 5.9 |
| Zitadel `deactivate_user` / `delete_user` returns other error | Logged; sweep continues to next candidate; the item is retried next run. | 5.x |
| Google intent missing email/external id or `create_human_with_idp` fails | Redirect `/login?...&error=google` (existing behavior). | 4.x |
| Signup with already-registered email | `SignupError` → friendly "sign in instead" (existing). | 2.6 |
| Signup rate limit exceeded | `429` via SlowAPI `5/minute` (existing, must not regress). | 6.1, 6.2 |
| Provisioning event with no client id and no Polar email | Abort without creating an APIClient (existing). | 3.2 |

**Security considerations**

- **Deleting a Zitadel user is destructive and irreversible; deactivation is reversible.** The two-phase sweep exploits this: an account is first reversibly deactivated (recoverable via `reactivate_user`) and only hard-deleted a full `Delete_Threshold` later, once already observed in the deactivated state. The guard is defense-in-depth: the *caller* (reclaim / sweep) must establish unverified AND never-paid before calling `deactivate_user` or `delete_user`; the entitlement check must be a *positive* not-entitled answer, never an inferred one; any ambiguity retains. Both flows re-check `isVerified` immediately before the entitlement call to close TOCTOU where a user verifies mid-sweep.
- **`SERVICE_API_TOKEN` is a shared privileged secret.** It is passed only as a `Bearer` header over TLS to `api.skawr.com`, never logged, never placed in a URL/query string. skawr-login reads it from env only.
- **The Google reclaim never trusts the `user` query param** — the callback continues to resolve the user id from the verified intent server-side (existing hardening preserved).
- **Sweep runs with least authority**: it only needs Zitadel user-search + deactivate + delete and the entitlement read; it performs no writes to the indexer.

## What is already correct and must NOT regress

These behaviors exist today. This feature adds regression tests (Req 8) asserting they still hold:

1. **Provisioning/entitlement keyed to the Polar-verified email** — `_handle_subscription_created` resolves the client by `customer.email` from the webhook and provisions analytics with that email; a self-asserted signup email never grants paid access. (Regression tests in `skawr-indexer/tests/` for the webhook + entitlement.)
2. **Guest preview is search-only** — `mint_guest_preview_key` issues exactly one `pk_` key and never an `sk_`; guest clients are `inactive`/non-entitled with a `guest_expires_at`. (`skawr-indexer/tests/` public-path tests.)
3. **`pk_` → account session is 403** — `login_with_key` rejects `pk_`-prefixed keys with 403. (`skawr-indexer/tests/`.)
4. **Fail-closed billing** — non-entitled accounts get 402 on paid API usage; entitlement fails closed for unknown emails and out-of-window cancelled/grace. (`skawr-indexer/tests/` entitlement + quota tests.)

**Where regression tests go:**

- Indexer invariants (provisioning email, guest key, `pk_` 403, 402 gate, entitlement fail-closed) → `skawr-search/skawr-indexer/tests/`.
- skawr-login new flows (reclaim decision matrix, sweep safety guards, entitlement fail-safe) → `skawr-login/tests/`.

## Testing Strategy

**Property-based tests** (Hypothesis, ≥100 iterations each) cover the universal safety invariants — these are the highest-value tests because the whole feature is a safety envelope around a destructive operation. Zitadel and the entitlement endpoint are mocked so properties run in-memory and cheaply across many generated `(verified?, entitled?, age, already-deactivated?, entitlement-reachable?)` combinations.

**Example/unit tests** cover the concrete decision branches of the Google callback and specific entitlement statuses (active / cancelled-in-window / cancelled-expired / grace / unknown).

**Integration tests** (1–3 examples) cover the live wiring: skawr-login → indexer entitlement with a real token, and the indexer webhook → analytics provision call. These do not vary meaningfully with input, so they are not property tests.

Property test configuration: minimum 100 iterations per property; each property test is tagged **Feature: progressive-email-verification, Property {n}: {text}** and references the design property it validates.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — a formal statement about what the system should do. Properties bridge human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Provisioning and entitlement key off the Polar-verified email

For any `subscription.created` event that carries a Polar-verified customer email, the APIClient resolved or created for that event has `email` equal to the Polar-verified email, and the email sent to the analytics provisioning call equals that same resolved email — never a self-asserted signup email.

**Validates: Requirements 3.1, 3.3, 8.3**

### Property 2: Self-service signup creates an unverified user

For any valid signup input (name, email, password), the user-creation request sent to Zitadel sets email `isVerified` to `false`.

**Validates: Requirements 2.1**

### Property 3: The safety envelope — never deactivate or delete a verified, entitled, or indeterminate account

For any account and for either automated flow (Google auto-reclaim or the expiry sweep), the account is deactivated or deleted ONLY when it is both unverified AND positively reported not-entitled by the Entitlement_Endpoint. If the account's email is verified, OR the Entitlement_Endpoint reports it entitled, OR entitlement cannot be determined (unreachable, error, or unconfigured), the account is retained — neither deactivated nor deleted (nor reclaimed).

**Validates: Requirements 4.6, 4.7, 5.6, 5.7, 7.1, 7.2, 7.4**

### Property 4: Entitlement mapping is fail-closed

For any email and subscription status, the Entitlement_Endpoint reports entitled if and only if the status is `active`, or the status is `cancelled`/`grace_period` with a `current_period_end` strictly in the future. Any unknown email (no client) and any other status is reported as not entitled.

**Validates: Requirements 3.5, 3.6, 3.7, 8.2**

### Property 5: Every entitlement request is Service_Token-authenticated

For any entitlement check made by any consuming service, the request carries a `SERVICE_API_TOKEN` bearer credential; a request with a missing or invalid token is rejected (401), and an endpoint with no configured token rejects every request (503).

**Validates: Requirements 3.4, 4.4, 5.3, 8.5**

### Property 6: Google-linked accounts are created verified

For any account the Google flow creates (first-time Google sign-in or a post-reclaim recreate), the user-creation request sets email `isVerified` to `true`.

**Validates: Requirements 4.5**

### Property 7: Google auto-reclaim decision correctness

For any completed Google intent whose verified email matches an existing unverified account: if that account is not entitled, the flow deletes the stale account and then creates a Google-linked account for the same email within the same callback; if that account is entitled or entitlement is indeterminate, the flow performs no deletion and denies the reclaim.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 8: Expiry sweep deactivate and delete conditions

For any Zitadel user evaluated by the sweep, with entitlement positively reported not-entitled (reachable and answered) and the email unverified:

- **Deactivate condition** — the user is deactivated if and only if it is NOT already deactivated AND its Verification_Age exceeds the Deactivate_Threshold.
- **Delete condition** — the user is hard-deleted if and only if it is ALREADY deactivated AND its Verification_Age exceeds the Delete_Threshold.

Any other combination (verified, entitled, indeterminate, too young, or deactivated-but-younger-than-Delete_Threshold) retains the user unchanged. A delete therefore implies the user was previously deactivated.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 9: Guest preview is search-only, non-entitled, and expiring

For any guest client created on the preview path, exactly one `pk_` search-only key is minted and zero `sk_` secret keys are minted, the client is in an inactive/non-entitled billing state, and it carries a future guest-expiry timestamp.

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 10: Public keys are never exchangeable for an account session

For any `pk_`-prefixed key presented to exchange for an account session, the Indexer_Service rejects the request with HTTP status 403.

**Validates: Requirements 1.5**

### Property 11: Non-entitled accounts are refused paid API usage

For any account the Entitlement_Endpoint reports as not entitled, paid API usage is rejected with HTTP status 402.

**Validates: Requirements 2.5, 8.1**

### Property 12: Sweep is idempotent

For any set of candidate users, running the sweep twice produces the same end state as running it once and completes without error, because deactivating an already-deactivated user (409) and deleting an already-deleted user (404) are both treated as success.

**Validates: Requirements 5.8, 5.9**

### Property 13: Every deactivate/reactivate/delete/retain decision is audited

For any decision made by the automated flows — deactivate, reactivate, delete, or retain — an audit record is emitted containing the account identifier, the trigger (Google reclaim, sweep, or login), the decision type, and the entitlement result used for the decision.

**Validates: Requirements 7.5**

### Property 14: Delete only after deactivation

For any account hard-deleted by the expiry sweep, that account was already in the deactivated state at the time it was evaluated for deletion. No account is hard-deleted directly from an active state; deactivation always precedes deletion.

**Validates: Requirements 5.3, 7.3**
