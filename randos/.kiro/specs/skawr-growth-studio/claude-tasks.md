# Implementation Plan:

## Overview

This plan implements the Skawr Growth Studio consolidated design across 26 tasks organized in four phases: foundation/safety, durable runtime, assessments/composition, and UI/integration/launch. Tasks within a phase can often be parallelized; cross-phase dependencies are noted in the dependency graph.

## Tasks

- [ ] 1. Repository skeleton and database foundation
  - Create `skawr-growth` repository with Python 3.12, FastAPI, Pydantic v2, async SQLAlchemy 2.0, Alembic, pytest, and pytest-asyncio
  - Configure project structure mirroring `skawr-analytics/backend/app`
  - Create dedicated Growth PostgreSQL database with isolated role
  - Initial Alembic migration: accounts, digital_properties, identity_aliases, identity_changes, sources, source_policy_versions, candidates, suppressions, audit_log
  - Implement `/health/live` and `/health/ready` endpoints
  - Configure Zitadel audience validation, JWKS rotation, and role-claim extraction
  - Define RBAC decorator for all six roles
  - Set up Sentry/GlitchTip with scrubbed payloads
  - Dockerfile for growth-api and docker-compose entry
  - Configure CI with pinned dependencies, lockfile integrity check, image scanning, and restricted build provenance
  - Tests: health endpoints, token validation, role enforcement

- [ ] 2. Source policy, suppression, and URL-safety gate
  - Source registry CRUD API
  - Source-policy version creation and retrieval
  - Suppression create/lift with append-only history and keyed tombstones
  - URL-safety validator: scheme allowlist, credential rejection, normalization, private-range blocking
  - DNS-rebinding defense: controlled resolution, re-check after DNS and every redirect
  - Redirect-count, response-size, content-type, and request-time limits
  - Kill-switch check at schedule, lease, connect, and persist boundaries
  - Policy-expiry auto-pause
  - Property-based tests over URL inputs; unit tests for policy blocking and suppression

- [ ] 3. CSV intake and candidate pipeline
  - CSV upload with byte/row/column limits, MIME/magic validation, formula neutralization
  - Archive rejection and bounded decompression
  - Schema-mapping from validated rows to candidates with dedupe keys
  - Candidate intake for submitted URLs via signed events
  - Signed envelope verification: key ID, timestamp window, nonce, HMAC, body-hash, inbox deduplication
  - Partner-URL intake with source-policy verification
  - Candidate deduplication constraint
  - Tests: CSV injection, oversized files, duplicates, signed-event replay rejection

- [ ] 4. Account and DigitalProperty identity
  - Account creation from accepted candidates with stable UUID and row_version
  - DigitalProperty resolution: canonical location, type, geography, languages, partial unique index
  - Identity-alias recording with source and observation interval
  - Minimal merge operation (Administrator only) with lineage preservation
  - Minimal split operation with explicit property selection and audit
  - Account/property status management
  - Tests: deduplicated resolution, alias recording, merge/split lineage, suppression isolation

- [ ] 5. Workflow runtime core — dispatcher, leases, and checkpoints (split into two sub-phases)
  - **5a — Schema and workflow lifecycle:**
  - Migration: workflows, workflow_versions, workflow_runs, run_nodes, node_attempts, dead_letters, outbox_events, inbox_events, side_effect_receipts
  - Workflow draft CRUD with ETag-based concurrency
  - Workflow publication: immutable snapshot creation
  - Run materialization from published graph
  - **5b — Dispatcher, fencing, and recovery:**
  - Dispatcher: SKIP LOCKED claims, lease tokens, fencing tokens, optional Redis wake-up
  - Worker claim with fencing-token verification and heartbeat
  - Completion transaction: typed output, cost, checkpoint, downstream readiness, outbox
  - Fencing enforcement: reject superseded tokens
  - Lease-expiry sweeper with committed-completion check
  - Pause, cancel, resume, dead-letter, and authorized replay
  - Account advisory locks for conflicting mutations
  - Redis fallback to Postgres polling
  - DB check constraint: no non-sandbox receipt in test/dry_run mode
  - **Acceptance criteria for current-policy revalidation:** the dispatcher and worker MUST recheck current source-policy expiry, kill-switch, and suppression state at lease time and before every paid/browser/publish/export/action call; a newer prohibition stops the attempt even if the run snapshot held an earlier approval
  - Tests: concurrent SKIP LOCKED, fencing rejection, lease expiry, Redis loss, pause/resume/cancel/replay, dry-run zero-effects, policy-change-during-run stops work

- [ ] 6. Outbox, side-effect receipts, and effectively-once delivery
  - Outbox dispatcher with SKIP LOCKED claim and acknowledgement
  - Inbox deduplication for inbound events
  - Receipt creation/locking before external calls with idempotency key
  - Unknown-outcome reconciliation logic
  - Committed-receipt returns prior result on replay
  - Approval payload-hash binding: invalidate on payload change
  - Tests: duplicate prevention, receipt reuse, reconciliation, approval invalidation

- [ ] 7. Evidence ledger and evidence state machine
  - Migration: fetch_runs, evidence, findings, evidence_snapshots, finding_reviews
  - Evidence state machine: collected → policy_admissible → evaluator_validated → reviewer_accepted/rejected/stale/retracted
  - Evidence supersession with linked originals
  - Evidence-snapshot creation for scoring and artifacts
  - Finding creation with typed payload and evidence citations
  - Reviewer finding decisions preserving automated output
  - Provisional vs reviewed score distinction
  - Tests: state transitions, supersession, snapshot immutability, reviewer-accepted-only publication

- [ ] 8. Classification and Assessment Pack registry
  - Migration: classification_assertions, assessment_pack_versions, evaluator_versions
  - Archetype/capability classification with evidence, confidence, version, effective interval
  - Reviewer correction with reason and retained original
  - Pack registry: stable IDs, versions, evaluator refs, schemas, cost, dependencies, locales, lifecycle, freshness
  - Pack applicability check before running
  - Version retirement and blocking
  - Register Commerce and Marketplace/Directory packs
  - Tests: applicability filtering, lifecycle enforcement, retired-version blocking

- [ ] 9. Eligibility, scoring, and routing engine
  - Migration: eligibility_decisions, score_runs, routing_decisions
  - Eligibility computation: Pass | Review Required | Blocked
  - Eligibility scoping at account, property, finding, and action level
  - Separate Fit, Confidence, Timing/Value, Risk with breakdowns
  - Scoring versioning with model, config, evidence-snapshot hash
  - Routing: qualified-review, generate-then-review, monitor, no-current-offer, disqualified
  - Re-evaluation on reviewer decisions
  - Action-time Eligibility revalidation
  - **Acceptance criteria for policy-over-snapshot:** Eligibility revalidation at action time MUST use current policy/suppression/catalog state, not the run snapshot; a newer expiry, prohibition, kill-switch, or suppression MUST block the action regardless of what the snapshot recorded
  - Tests: blocker dominance, separate components, LLM-free, action-time revalidation, policy-change-after-scoring-blocks-action

- [ ] 10. Product catalog and Package Composer
  - Migration: catalog_versions, catalog_snapshots, recommendations
  - Catalog entity model with lifecycle, dates, prerequisites, claims, CTA
  - Catalog seeding and restricted Administrator endpoints
  - Immutable catalog-snapshot creation
  - Package Composer: smallest valid Growth Package
  - Analytics bundling rules (Basic/Advanced, never standalone)
  - No-current-offer outcome
  - Phased recommendations
  - Reviewer override with revalidation
  - Catalog-conflict blocking
  - Annual wording enforcement
  - Tests: Analytics rules, no-free-tier, smallest-valid, phasing, override, conflict blocking

- [ ] 11. Search evaluator
  - Known-item retrieval evaluator using versioned Search API
  - Arabic transformation pipeline: orthographic, transliteration, mixed-script, numerals, typos, SKU/model, category-plus-attribute
  - Test recording: query, expected item, derivation, rank bucket, latency, autocomplete, zero-result recovery
  - Synthetic zero-result rate with mandatory labeling
  - Skip logic for restricted paths
  - Freshness enforcement
  - Golden-fixture tests: Arabic/English transformations, rank accuracy, stale rejection

- [ ] 12. Analytics readiness, CRO, and Engagement evaluators
  - Analytics readiness evaluator with observable-only signals and `not publicly observed` phrasing
  - CRO evaluator with journey-stop boundaries
  - Engagement evaluator: absence-never-finding, demonstrated-need requirement, harmful-implementation detection
  - Shared evaluator output validation
  - Fixture tests: claim language, stop boundaries, absence-never-finding, harmful-implementation

- [ ] 13. Artifact generation and grounding validation
  - Bilingual artifact generation pipeline
  - Citation/grounding validator
  - Deterministic template fallback
  - Fireworks integration with allowlist, redaction, and schema validation
  - Artifact storage with content hash and snapshot references
  - Tests: unsupported-claim rejection, citation completeness, template fallback, bilingual output

- [ ] 14. Search preview integration
  - Preview request from Growth with normalized sample, expiry, and idempotency key
  - Preview reference storage: opaque ID, token hash, state, expiry, deletion receipt
  - Expiry sweeper with cleanup reconciliation
  - Signed user-access token generation
  - Integration tests against stubbed Search preview API

- [ ] 15. Review queue and collaboration
  - Review queue API with filters and cursor pagination
  - Saved-view CRUD
  - Assignment API
  - Review-decision API preserving originals
  - Comments API with audit metadata
  - Optimistic version-conflict detection with If-Match
  - Bulk actions (no bulk send)
  - Dual-approval for configured sensitive actions (distinct actors, off by default)
  - Tests: conflict detection, dual-approval actors, bulk restrictions, filtering

- [ ] 16. External actions — CRM and sheet export
  - BusinessContactPoint model with application-level column encryption for `normalized_route_ciphertext` using a managed key reference; decryption occurs only through the authorized action path; plaintext routes MUST NEVER appear in logs, audit payloads, outbox events, exports, prompts, or screenshots
  - Implement key-rotation support: new routes encrypt with current key; reads attempt current then previous key; rotation audit event emitted
  - Action-time revalidation chain
  - Approval-request API with payload-hash binding and distinct-actor voting
  - CRM adapter: idempotent upsert via outbox and receipt
  - Sheet-export adapter
  - Suppression propagation to CRM/sheet
  - **Acceptance criteria for current-policy revalidation at action time:** before any CRM write, sheet export, or communication, the adapter MUST revalidate current Eligibility, source-policy field/purpose/action authorization, consent/basis validity, suppression state, catalog lifecycle, and approval payload-hash match; stale approval or changed policy MUST block the action
  - **PDPL acceptance criteria:** for Saudi recipients/properties, verify that purpose, consent/basis, retention class, and opt-out controls are enforced at action time; blocked if consent is expired, withdrawn, or inapplicable
  - Tests: encryption round-trip, key rotation reads old+new, route never appears in plaintext in logs/audit/outbox/export, approval invalidation on payload change, suppression blocking, receipt deduplication, reconciliation, policy-change-blocks-export, expired-consent-blocks-action

- [ ] 17. Suppression and deletion propagation
  - propagation_jobs table with per-destination state
  - Propagation dispatcher to all configured destinations
  - Per-destination acknowledgement recording
  - Retry and alerting for incomplete propagation
  - Tombstone creation after acknowledged deletion
  - Tests: full propagation, retry on failure, resurrection prevention

- [ ] 18. Growth Radar and observability
  - Outcome-event recording API
  - PostgreSQL materialized views for stage counts, yields, cost, latency
  - Radar API endpoints
  - Alert detection
  - After-commit Analytics projection via outbox
  - Cost-entry recording
  - Tests: outcome provenance, view accuracy, alert triggers

- [ ] 19. Visual workflow builder UI
  - Add pinned `@xyflow/react` to skawr-dashboard-admin
  - `/growth/flows` route with template library
  - `/growth/flows/:workflowId/edit` with graph canvas, node palette, and config panel
  - Accessible list-view alternative
  - Draft save with ETag conflict resolution UI
  - Server validation call and diagnostic overlay
  - Cost-estimate display
  - Test-run and dry-run triggers with result overlay
  - Publish, rollback, and pause controls
  - Template import/export with secret stripping
  - UI tests: graph interaction, validation, conflict resolution, keyboard accessibility

- [ ] 20. Dashboard routes — Radar, accounts, review, catalog
  - `/growth` Radar overview
  - `/growth/accounts` list and dossier
  - `/growth/review` queue UI with saved views and inline decisions
  - `/growth/runs/:runId` trace view
  - `/growth/catalog` view with minimal administration
  - RTL layout with logical CSS properties
  - Keyboard and screen-reader accessibility
  - Accessibility and responsive tests

- [ ] 21. Browser worker isolation
  - Separate Dockerfile: restricted user, read-only root, dropped capabilities, seccomp
  - Controlled-egress network policy
  - Per-job resource limits
  - Signed work-capability token (short-lived, scoped)
  - Result ingestion boundary (narrow endpoint or restricted DB role)
  - Per-job context destruction
  - Playwright-based safe navigation with DNS/redirect revalidation
  - Tests: internal-address rejection, secret inaccessibility, resource limits, stale-token rejection

- [ ] 22. Launch quality-gate harness
  - Migration: launch_samples, launch_gate_runs
  - Launch-sample declaration with fixed denominator hash
  - Gate-run recording: precision, claims, duplicates, policy, cost/latency, Engagement absence
  - Capability flag blocking new sources/packs until gate passes
  - Gate evaluation endpoint
  - Tests: gate pass/fail logic, capability-flag enforcement, denominator immutability

- [ ] 23. Shadow migration from skawr-web
  - Dual-write from `/cro/audit` to Growth signed events
  - Dual-write from `/saas/import` to Growth signed events
  - Compatibility status projection for existing polling shapes
  - Parity comparison tooling
  - Execution-authority switch after verified parity
  - Old-path retirement after confirmed cutover
  - Integration tests: dual-write correctness, polling compatibility, rollback

- [ ] 24. Deployment, CI pipeline, and operational runbook
  - Create Dockerfiles for growth-api, growth-worker, growth-browser-worker, and growth-sweeper
  - Create docker-compose for full local development (all processes + PostgreSQL + Redis)
  - Configure Traefik routing and TLS for Growth API
  - Implement rolling deployment with readiness probes and graceful drain
  - Configure Alembic migration as a one-shot release job under advisory lock
  - CI pipeline: lint, type-check, unit tests, integration tests, image build, image scan, lockfile integrity, dependency audit, and restricted build provenance
  - Validate backup/restore with a recovery drill
  - Write operational runbook: health-check interpretation, kill-switch usage, lease-recovery procedures, alert response, browser-worker compromise response, Redis-loss behavior, deployment rollback, and secret rotation
  - Tests: readiness probe behavior, graceful drain, migration advisory lock, and backup restore verification

- [ ] 25. Governance, object lifecycle, consent, and PDPL
  - Configure private S3-compatible object-storage namespace with encryption, lifecycle policies, and retention classes (raw/short, evidence/medium, artifact/long)
  - Implement object upload with temporary keys, finalization, and orphan sweeper for abandoned uploads
  - Implement retention-class enforcement: automatic expiry of raw pages, browser traces, and screenshots per policy
  - Implement consent-record model: purpose, basis type, granted/withdrawn/expired states, subject, scope, and auditable history
  - Implement PDPL technical controls for Saudi recipients/properties: purpose validation, consent/basis check, retention enforcement, correction/deletion propagation, opt-out handling, and suppression-ledger maintenance
  - Implement LLM/processor governance: approved processor allowlist, region/transfer-basis validation, field redaction profile, and blocked-if-unavailable policy
  - Implement secret-manager integration: opaque references, rotation support, environment separation, and administrative create/rotate/revoke audit events
  - Implement object-deletion reconciliation: verify object removal, preview cleanup, cache invalidation, artifact expiry, and export/processor acknowledgement
  - Tests: retention enforcement timing, consent expiry blocks action, PDPL opt-out propagation, orphan cleanup, secret rotation audit, and object-deletion completeness

- [ ] 26. End-to-end integration and quality-gate execution
  - Run full end-to-end flow: CSV upload → policy → SSRF → identity → classification → evaluation → Eligibility → scoring → routing → review → package → artifact → preview → approved export
  - Verify all 18 correctness properties hold against the running system with specific test scenarios per property
  - Kill services at each stage (API, worker, Redis, browser-worker) to verify recovery from checkpoints without duplicate effects
  - Verify dry-run produces zero real side effects across all adapters
  - Verify browser-compromise containment: compromised worker cannot mutate control-plane state
  - Run predeclared 30–50 Account quality sample and record gate results in launch_gate_runs
  - Confirm R22 thresholds: ≥80% precision, zero unsupported claims, <2% duplicates, 100% policy pass, predeclared cost/latency met
  - Tests: E2E happy path, service-kill recovery, dry-run isolation, browser containment, and quality-gate pass/fail

## Task Dependency Graph

```json
{
  "waves": [
    {
      "name": "Phase 0 — Foundation and Safety",
      "tasks": [1, 2, 3, 4, 5, 6]
    },
    {
      "name": "Phase 1 — Evidence and Assessment",
      "tasks": [7, 8, 9, 10, 11, 12]
    },
    {
      "name": "Phase 2 — Artifacts, Preview, Review, Actions",
      "tasks": [13, 14, 15, 16, 17, 18, 25]
    },
    {
      "name": "Phase 3 — UI, Isolation, Migration, Launch",
      "tasks": [19, 20, 21, 22, 23, 24, 26]
    }
  ],
  "dependencies": {
    "2": [1],
    "3": [2],
    "4": [3],
    "5": [1],
    "6": [5],
    "7": [4, 6],
    "8": [7],
    "9": [8],
    "10": [9],
    "11": [8],
    "12": [8],
    "13": [10, 11, 12],
    "14": [13],
    "15": [7, 9],
    "16": [10, 15],
    "17": [2, 6],
    "18": [9, 15],
    "19": [5, 8],
    "20": [15, 18],
    "21": [2, 5],
    "22": [18],
    "23": [3, 5],
    "24": [1, 5, 21],
    "25": [1, 2, 7, 17],
    "26": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
  }
}
```

## Notes

- Tasks within the same phase that share no dependency arrow can be parallelized.
- Task 5 is large but internally split into sub-phases (5a: schema/lifecycle, 5b: dispatcher/fencing/recovery) that can be implemented and reviewed incrementally.
- Task 21 (browser worker) can begin as early as Phase 0 since it depends only on Tasks 2 and 5, but full testing requires evaluators from Phase 1.
- Task 24 (deployment/CI/runbook) depends on the repository, runtime, and browser worker but can proceed in parallel with Phase 2 and Phase 3 UI work.
- Task 25 (governance/object/PDPL) depends on repository foundation (1), source policy (2), evidence (7), and propagation (17); it can run in parallel with Phase 2 artifacts/preview work.
- Task 26 is the final integration gate; it cannot begin until all other tasks including Tasks 24 and 25 are functionally complete.
- The quality-gate trial (Task 22 + Task 26) must pass R22 thresholds before any broader discovery or new packs are enabled.
- No task introduces automated sending, person profiles, or unattended outreach cadences.
- Current-policy revalidation (Correctness Property 2) is explicitly tested in Tasks 5, 9, and 16 to prevent run snapshots from granting lasting permission.
- Contact-route encryption (Task 16) requires plaintext routes to never appear outside the authorized action path — enforced by specific log/audit/export verification tests.
