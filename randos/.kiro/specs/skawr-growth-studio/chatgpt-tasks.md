# Implementation Plan:

## Overview

This plan implements Skawr Growth Studio as defined in [`chatgpt-consolidated-design.md`](./chatgpt-consolidated-design.md) and [`requirements.md`](./requirements.md). Tasks are ordered by dependency: foundation and safety infrastructure first, then identity and policy, evaluation engine, commercial composition, operator UI, and finally migration and quality gates. CSV injection safety, contact-route encryption, and deployment are explicit tasks rather than implicit sub-bullets.

## Tasks

- [x] 1. Repository scaffold and Growth database: Create `skawr-growth` repo (Python 3.12, FastAPI, async SQLAlchemy 2.0, Alembic, Pydantic v2, pinned lockfile), configure dedicated Growth PostgreSQL database with least-privilege roles and backup, set up private S3-compatible object-storage namespace with encryption and lifecycle, configure Zitadel Growth audience/roles, implement `/health/live` and `/health/ready`, and add CI with linting, type checks, image scanning, and tests.
- [x] 2. Source policy, suppression, and audit foundation: Create `sources` and immutable `source_policy_versions` tables with field/purpose/action child rows, expiry, kill-switch, retention, and approval metadata. Implement source-policy CRUD with Administrator auth, expiry auto-pause, and kill-switch halt. Create `suppression_entries`, `propagation_jobs`, `consent_records`, `audit_log`, and `security_events` tables. Seed MVP source definitions.
- [x] 3. SSRF-safe URL validation and fetch boundary: Implement URL normalization, scheme validation (HTTP/S only), embedded-credential rejection, private/metadata/internal range blocking, DNS-rebinding defense with recheck at every redirect/connection, and content limits (redirect count, response size, time, content type). Implement current-policy revalidation at every sensitive boundary (fetch, post-DNS, redirect, paid, publish, export, CRM). Add comprehensive SSRF test fixtures covering IPv4/IPv6/private/metadata/DNS-rebinding/redirect/credential-embedded URLs.
- [x] 4. CSV and feed injection safety: Implement CSV upload endpoint with byte-size, row-count, and column-count limits. Validate MIME type against magic bytes; reject mismatches. Neutralize formula-injection prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) in all string cells. Reject or safely decompress archives with decompression-bomb limits. Validate encoding (UTF-8 required). Implement optional malware scan hook. Quarantine files that fail any check. Add tests: oversized files, formula payloads, MIME spoofing, archive bombs, encoding corruption, and column overflow.
- [x] 5. Account and DigitalProperty identity graph: Create `accounts`, `digital_properties`, `account_aliases`, `property_aliases`, `identity_change_sets`, `identity_change_members`, archetype/capability assertion tables. Implement candidate intake with deduplication (from CSV rows, signed events, partner URLs), minimal merge/split admin operations with lineage preservation, and open-run pause on identity change.
- [x] 6. Browser worker isolation and write containment: Create isolated `growth-browser-worker` container (read-only root, seccomp, strict egress, quotas, no production secrets). Implement signed short-lived work capabilities, narrow result-ingestion boundary (cannot write policy/Eligibility/review/catalog/approval/workflow state), health monitoring with capability revocation on compromise detection, and sanitized output. Add tests: internal-address rejection, secret inaccessibility, resource limits, stale-token rejection.
- [x] 7. Durable PostgreSQL DAG runtime: Create workflow, draft, version, run, run-node, and node-attempt tables. Implement scheduler with `FOR UPDATE SKIP LOCKED`, fencing tokens, heartbeat, and Redis wake-ups. Implement worker claim/fencing/completion in one transaction, stale-lease recovery in sweeper, pause/cancel/resume, dead-letter replay, account concurrency locks, and Redis-loss fallback. Add runtime concurrency/recovery tests.
- [x] 8. Outbox, inbox, and side-effect receipts: Create `outbox_events`, `inbox_events`, and `side_effect_receipts` tables. Implement outbox dispatcher with `SKIP LOCKED` and at-least-once delivery, receipt lock before external call, provider idempotency key pass-through, unknown-outcome reconciliation, and inbox deduplication. Add effectively-once tests.
- [x] 9. Signed event ingress from skawr-web: Implement `/internal/v1/growth/events/skawr-web` with HMAC signature, timestamp/nonce validation, body binding, and `(source, event_id)` deduplication. Define CandidateSubmitted/SubmissionUpdated/PreviewEngaged/SubmissionClaimed schemas. Implement coarse public status endpoint. Plan shadow dual-write migration.
- [x] 10. Assessment Pack registry and evaluator contracts: Create assessment-pack, evaluator-version, collector-version, and pack-evaluator tables. Implement stable Collector and Evaluator protocol contracts. Create property-scoped `assessments` and `evaluator_runs` tables. Implement applicability/dependency/locale/lifecycle/freshness validation. Register Commerce and Marketplace/Directory pack schemas.
- [x] 11. Evidence ledger and finding review model: Create append-only `evidence` table, `findings` table, relational `finding_evidence` citations, and `finding_reviews`/`finding_corrections`/`refresh_requests` tables. Implement evidence state machine (collected → policy_admissible → evaluator_validated → reviewer_accepted|rejected|stale|retracted). Enforce accepted-evidence-before-acceptance constraint.
- [x] 12. Commerce and Marketplace/Directory evaluators: Implement identity/platform classifier (Salla/Shopify/Zid/custom as capabilities), catalog-sample collector, Search known-item evaluator with Arabic variant generation, Analytics-readiness evaluator (`not publicly observed` language), CRO evaluator (journey stop before auth/transaction), and Engagement evaluator (absence never creates finding). Build reviewed golden-fixture test sets.
- [x] 13. Eligibility, scoring, and routing engine: Create `rule_sets`, `rule_set_versions`, `eligibility_decisions` (scoped to account/property/finding/action), and `score_sets` (provisional/reviewed) tables. Implement Eligibility gate, separate Fit/Confidence/Timing-Value/Risk computation, routing outcomes, reviewer resolution, and provisional scoring with recomputation after review. LLM output never a rule input. Policy-over-snapshot acceptance criteria: scoring and routing MUST use current policy/suppression/catalog state, not the run snapshot; a newer expiry, prohibition, kill-switch, or suppression MUST invalidate a previously computed Pass and block downstream actions. Add tests: blocker dominance, separate components, LLM-free, policy-change-after-scoring-blocks-action.
- [x] 14. Product catalog and Package Composer: Create catalog-item, offer, entitlement, commercial-constraint, pilot-approval, catalog-snapshot, growth-package, and recommendation tables. Encode all commercial invariants (Analytics bundling, no free Search tier, annual wording). Implement composer: smallest valid package, phasing, no-current-offer, override with revalidation. Seed initial catalog. Add minimal catalog admin UI.
- [x] 15. Artifacts, bilingual generation, and deterministic fallback: Create `artifacts`, `artifact_evidence`, `artifact_catalog_claims`, and `previews` tables. Implement citation/grounding validator. Build deterministic bilingual templates for audit/summary/readiness/Blueprint. Implement LLM phrasing with Fireworks (redacted input, citation validation). Implement deterministic fallback when LLM is unavailable — artifacts must still be producible using templates alone provided citations pass. Add tests: unsupported-claim rejection, citation completeness, LLM-unavailable fallback produces valid output.
- [x] 16. Search ephemeral preview integration: Define internal Search preview API contract (create/query/delete). Implement Growth-side preview request, reference storage, access management, and expiry tracking. Implement preview cleanup in sweeper with deletion-receipt reconciliation. Verify token isolation from SaaS tenants.
- [x] 17. Approvals, contact-route encryption, and external action gates: Create `approvals` and `approval_votes` tables with exact-payload hash, distinct-actor constraint, and expiry. Implement dual-approval for configured sensitive actions. Implement action-time revalidation (Eligibility, policy, consent, suppression, catalog, approval). Create `business_contact_points` table with application-level column encryption for `normalized_route_ciphertext` using a managed key reference; decryption occurs only through the authorized action path; plaintext routes must never appear in logs, audit payloads, outbox events, exports, prompts, or screenshots. Implement key-rotation support. Implement CRM/Sheet adapter with outbox, receipt, reconciliation, and no bulk sending. Policy-over-snapshot acceptance criteria: before any CRM write, sheet export, or communication, the adapter MUST revalidate current Eligibility, source-policy authorization, consent/basis validity, suppression state, catalog lifecycle, and approval payload-hash match; a newer expiry, prohibition, kill-switch, withdrawn consent, or suppression MUST block the action regardless of what the run snapshot recorded. Add tests: encryption round-trip, key rotation, route never in plaintext logs, approval invalidation on payload change, suppression blocking, policy-change-blocks-export, expired-consent-blocks-action.
- [x] 18. Governance, retention, and secret protection: Implement object-storage retention classification (raw/sanitized/screenshot/artifact/export/temporary) with purpose-specific TTLs. Implement sweeper retention/expiry jobs with propagation acknowledgement. Implement suppression propagation across DB projections, objects, Search previews, caches, queues, artifacts, exports, and processors. Configure secret-manager references with rotation and audit. Enforce LLM processor policy (fields, purpose, region, redaction, fail-closed). Add PDPL technical controls for Saudi properties (purpose, consent, correction, deletion, suppression, opt-out).
- [x] 19. Review queue and operator UI: Add `/growth` route group to skawr-dashboard-admin. Implement Radar dashboard, review queue with required filters/saved views/assignments/comments/ETag conflicts, Account dossier, bulk actions (assignment/refresh/monitor/approval/export/suppression/rejection only — no bulk send), role-aware controls, keyboard navigation, list alternative, and RTL preview.
- [x] 20. Visual workflow editor: Add pinned `@xyflow/react`. Implement node palette, draft editing with explicit save and ETags, version inspection/diff/rollback, template clone-and-customize, schema-validated import/export (no secrets), single-property test, bounded dry-run with sandbox adapters, publish with full server validation (typed ports, path dominance, budget limits, compatibility). Add accessible list alternative. Defer undo/redo, autosave, and auto-layout.
- [x] 21. Growth Radar and outcome learning: Create `outcome_events` and `cost_entries` tables. Implement Radar projections/views for stage counts, yield, cost, latency, and quality. Record outcomes (meetings, imports, activation, paid, rejection, suppression). Implement alerts for stalls, expiry, yield shifts, and budget breaches. Instrument with Skawr Analytics for internal usage events.
- [x] 22. Deployment, CI pipeline, and operational runbook: Create Dockerfiles for growth-api, growth-worker, growth-browser-worker, and growth-sweeper. Create docker-compose for full local development. Configure Traefik routing and TLS. Implement rolling deployment with readiness probes and graceful drain. Configure Alembic migration as a one-shot release job under advisory lock. Set up CI pipeline: lint, type-check, unit tests, integration tests, image build, image scanning, pinned-dep verification, and restricted build provenance. Validate backup/restore with a recovery drill. Write operational runbook covering: health-check interpretation, kill-switch usage, lease-recovery procedures, alert response, browser-worker compromise response, Redis-loss behavior, deployment rollback, and secret rotation.
- [x] 23. Launch quality-gate harness: Create `launch_samples` and `launch_gate_runs` tables. Implement precision (≥80%), unsupported-claim (zero), duplicate (<2%), policy-pass (100%), and cost/latency threshold measurements. Implement capability flag blocking expansion until gates pass. Verify Engagement absence never qualifies. Run 30–50 Account sample and produce launch report.
- [x] 24. Migration and end-to-end validation: Implement shadow dual-write from existing audit/import paths. Compare outcomes and verify compatibility. Switch authority after parity/recovery tests. Run full end-to-end flow (CSV → policy → SSRF → identity → classification → assessment → Eligibility → scoring → routing → review → package → artifact → preview → approved export). Kill services at each stage to verify recovery. Verify dry-run zero effects and browser-compromise containment.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": [1],
      "description": "Repository scaffold and Growth database"
    },
    {
      "wave": 2,
      "tasks": [2, 7],
      "description": "Source policy/suppression foundation and DAG runtime"
    },
    {
      "wave": 3,
      "tasks": [3, 4, 8],
      "description": "SSRF boundary, CSV injection safety, and outbox/receipts — SSRF must precede any URL intake"
    },
    {
      "wave": 4,
      "tasks": [5, 6, 9],
      "description": "Identity graph, browser isolation, and signed ingress — all depend on SSRF and policy being in place"
    },
    {
      "wave": 5,
      "tasks": [10, 11],
      "description": "Assessment Pack registry, evidence ledger, and evaluator contracts"
    },
    {
      "wave": 6,
      "tasks": [12, 13],
      "description": "Evaluator implementations and Eligibility/scoring engine"
    },
    {
      "wave": 7,
      "tasks": [14],
      "description": "Product catalog and Package Composer"
    },
    {
      "wave": 8,
      "tasks": [15, 16, 17, 18],
      "description": "Artifacts, previews, approvals/contact encryption, and governance — core safety and action prerequisites"
    },
    {
      "wave": 9,
      "tasks": [19, 20, 21, 22],
      "description": "Operator UI, workflow editor, Radar, and deployment/CI — consume wave 8 outputs"
    },
    {
      "wave": 10,
      "tasks": [23],
      "description": "Launch quality-gate harness"
    },
    {
      "wave": 11,
      "tasks": [24],
      "description": "Migration and end-to-end validation"
    }
  ],
  "dependencies": {
    "2": [1],
    "3": [2],
    "4": [2],
    "5": [3, 4],
    "6": [3, 2],
    "7": [1],
    "8": [7],
    "9": [3, 5],
    "10": [5, 7],
    "11": [5, 7],
    "12": [10, 11],
    "13": [10, 11],
    "14": [13],
    "15": [14, 12],
    "16": [14, 15],
    "17": [8, 14],
    "18": [2, 7, 11],
    "19": [13, 15, 17],
    "20": [7, 10, 14],
    "21": [8, 13, 19],
    "22": [1, 6, 7],
    "23": [12, 13, 14, 15, 16, 17, 18, 21],
    "24": [9, 15, 16, 17, 19, 20, 22, 23]
  }
}
```

## Notes

- Tasks are implementation work packages, not a strict sequential timeline. Independent branches within the same wave may execute in parallel.
- Each task should include its own unit and integration tests as defined in the Testing Strategy.
- Infrastructure/configuration decisions in design §21 (database placement, object-store provider, Zitadel project IDs, CRM adapter, LLM processor, RPO/RTO) must be resolved before the relevant task begins implementation.
- SSRF and CSV injection safety (Tasks 3–4) are explicitly ordered before any URL-accepting intake to prevent unsafe URLs or injected content from entering the pipeline.
- Contact-route encryption (Task 17) is a first-class acceptance criterion, not an afterthought — routes must never appear in plaintext outside the authorized action path.
- Deployment (Task 22) is real engineering work including Dockerfiles, Traefik config, migration-as-job, CI hardening, backup validation, and an operational runbook.
- `tasks.md` is not created; this file (`chatgpt-tasks.md`) is the authoritative task plan for this design.
