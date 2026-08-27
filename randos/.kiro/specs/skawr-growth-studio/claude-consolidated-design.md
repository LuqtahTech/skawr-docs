# Skawr Growth Studio — Consolidated Design

## Overview

Skawr Growth Studio is a new internal bounded-context service, `skawr-growth`, with an operator interface inside `skawr-dashboards/skawr-dashboard-admin`. It discovers permitted digital-business candidates, resolves stable Accounts and DigitalProperties, evaluates evidence-backed Search, bundled Analytics, CRO, and Engagement & Onboarding opportunities, composes commercially valid Growth Packages, and routes approved work through durable, human-gated acquisition workflows.

The system follows four rules:

1. **Build horizontally, launch vertically.** Identity, workflow, policy, evidence, evaluation, and review are platform-neutral; the MVP launches with Saudi/MENA Commerce and Marketplace/Directory packs.
2. **Discovery proposes; evidence substantiates; deterministic rules decide; humans approve.** No discovery source directly creates contacts, CRM records, recommendations, or outbound actions.
3. **PostgreSQL is authoritative.** Redis may wake workers or accelerate ephemeral coordination, but durable run truth, checkpoints, approvals, and side-effect receipts live in PostgreSQL.
4. **Every external effect is separately authorized and effectively once.** No unattended sending or cadence exists; each message or follow-up requires explicit human approval.

This document consolidates the strongest parts of `design.md` and `design-kiro.md` while deliberately constraining the first implementation. It describes both the durable target architecture and the minimal subset required to pass the MVP quality gates.

### 1.1 Goals

- Establish `skawr-growth` as the owner of Accounts, DigitalProperties, policies, evidence, assessments, scoring, review, catalog snapshots, recommendations, workflow definitions/runs, approvals, outcomes, suppression, and audit history.
- Run one safe path from approved URL/CSV submission to evidence-backed review, bilingual artifact, optional Search preview, and approved manual CRM or sheet export.
- Reuse Skawr Search, Analytics, dashboards, Zitadel, scraper patterns, and approved Fireworks capabilities without sharing databases.
- Make policy, Eligibility, evidence provenance, commercial validity, and human approval structurally difficult to bypass.
- Support visual, versioned workflows without introducing a heavyweight external orchestration platform for MVP.

### 1.2 Non-goals

- Customer-facing campaign editing, popup rendering, SDKs, push delivery, audiences, frequency enforcement, or experimentation runtime.
- Personal-contact enrichment, named-person profiles, LinkedIn/Maps/SERP scraping, CAPTCHA bypass, SMTP probing, cold WhatsApp, or bulk automated outreach.
- A general evaluator/plugin marketplace, every proposed discovery connector, or every future Assessment Pack.
- Replacing Search, Analytics, CRM, or object storage as systems of record for their own domains.
- Proving production traffic, conversion, revenue, or analytics quality from public inspection alone.
## 2. Scope and architectural decisions

### 2.1 MVP implementation boundary

The MVP builds:

- A FastAPI control plane and PostgreSQL database.
- Account/DigitalProperty identity with minimal authorized merge/split operations.
- Approved CSV, submitted URL, partner URL where approved, and accepted-account refresh sources.
- Source-policy registry, URL/SSRF controls, suppression, retention, and kill switches.
- Commerce and Marketplace/Directory Assessment Packs.
- Search, Analytics readiness, CRO, and Engagement & Onboarding evaluators.
- Eligibility, separate Fit/Confidence/Timing-Value/Risk, routing, and Package Composer.
- A small authoritative product catalog and immutable catalog snapshots.
- Postgres-backed DAG execution, checkpoints, leases, outbox, dead letters, and side-effect receipts.
- Workflow builder, server validation, single-property test, bounded dry run, immutable publishing, rollback, and Funnel Template import/export.
- Review queues, assignments, due dates, status, comments, saved views, and optimistic version-conflict detection.
- Evidence dossier, bilingual artifacts, optional ephemeral Search preview, and approved manual CRM or sheet export.
- Growth Radar, operational telemetry, suppression/deletion propagation, and launch quality-gate harness.

The MVP remains schema-ready but does not implement:

- B2B Catalog, SaaS/Product, Content/Documentation, or Lead-Generation pack evaluators.
- Common Crawl, HTTP Archive, broad directory, or migration-signal collectors.
- Mentions, notifications, account activity feed, polished merge/split UI, or advanced workflow-editor conveniences.
- Customer-facing Engagement & Onboarding delivery.
- Automated outreach, experiments, attribution optimization, or autonomous package decisions.

### 2.2 Key architecture decisions

| Decision | Choice | Reason |
|---|---|---|
| Service boundary | New `skawr-growth` service | No existing service owns the combined identity, policy, evidence, workflow, review, and commercial lifecycle. |
| Runtime truth | PostgreSQL | Supports durable state, transactions, leases, optimistic concurrency, outbox, and recovery using existing operations expertise. |
| Redis | Wake-up/cache only | Redis loss must delay work, not lose or redefine it. |
| Workflow engine | Constrained Postgres-backed DAG | Typed, user-authored workflows and human gates are domain behavior; Temporal is deferred until demonstrated necessary. |
| Browser execution | Separate restricted worker tier | Untrusted pages and resource spikes must not share API secrets or broad database access. |
| Large objects | Private S3-compatible storage, initially R2-compatible | Keeps HTML, screenshots, and artifacts outside PostgreSQL while retaining hashes and lifecycle metadata. |
| UI graph | `@xyflow/react`, pinned during implementation | Mature graph interaction; persisted graphs remain library-neutral and have an accessible list alternative. |
| Integration | Versioned APIs/events, never shared databases | Preserves ownership, authorization, migration independence, and auditing. |
| Search preview | Search-owned ephemeral preview API | Avoids duplicating ingestion, OpenSearch, Arabic Search, and retrieval logic in Growth. |
| External effects | Outbox + idempotency receipt + reconciliation | Produces effectively-once behavior even when providers lack transactional delivery. |

### 2.3 Commercial invariants

The catalog and Package Composer enforce:

- Search has no free subscription tier and no subscription trial.
- Free store import and personalized preview are acquisition experiences, not subscription access.
- Analytics is unavailable standalone.
- Basic Analytics is included in Search tier 1; Advanced Analytics is included in Search tier 2 and above.
- Annual copy is `Save 17% with an annual subscription` or an approved localized equivalent.
- CRO remains project-based.
- Only available offers, or explicitly account/channel/date-approved pilots, may be presented as purchasable.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│ skawr-dashboards / Growth Studio                                    │
│ Radar · Flows · Review · Account dossier · Catalog administration   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS + Zitadel JWT + If-Match
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ skawr-growth API                                                    │
│ Identity · Policy · Workflow · Evidence · Review · Composer · RBAC  │
└───────────────┬────────────────────┬───────────────────┬────────────┘
                │                    │                   │
                ▼                    ▼                   ▼
       Growth PostgreSQL      Redis wake-ups      Private R2 objects
       authoritative state    optional/cache      HTML/images/artifacts
                │
                ▼
       Postgres dispatcher/scheduler
                │ leases ready attempts with SKIP LOCKED
        ┌───────┴──────────┐
        ▼                  ▼
 General workers      Restricted browser workers
 evaluators/composer  safe fetch/Playwright, no broad DB role
        │                  │
        └──────── result-ingest boundary ────────┐
                                                 ▼
                         skawr-search preview/retrieval APIs
                                                 │
                 ┌───────────────────────────────┼──────────────┐
                 ▼                               ▼              ▼
          CRM/sheet adapter              Skawr Analytics   Fireworks
          approved effects only          projection only   approved phrasing
```

### 3.1 Bounded-context ownership

| Context | Owns | Does not own |
|---|---|---|
| Growth | Account graph, source policy, evidence, findings, eligibility/scoring, workflows, reviews, catalog snapshots, recommendations, approvals, suppression, outcomes | Search indexes, product telemetry ingestion, CRM truth, customer campaigns |
| Search | Catalog ingestion, ephemeral preview indexes, retrieval and Arabic Search behavior | Growth qualification, source policy, commercial recommendation |
| Analytics | Product telemetry and internal Growth-usage analytics | Workflow/run truth or authoritative commercial outcomes |
| Web | `/cro/audit` and `/saas/import` acquisition experiences | Durable scans or Growth review state |
| Scraper/collectors | Policy-constrained retrieval and normalized collection results | Accounts, findings, scoring, routing, recommendations |
| CRM/sheet | Approved commercial destination records | Eligibility or evidence truth |
| Object storage | Encrypted private blobs | Relational lifecycle and authorization truth |

### 3.2 Deployment units

The initial repository contains one codebase with separately deployable processes:

- `growth-api`: FastAPI, no browser runtime.
- `growth-dispatcher`: claims durable ready work and emits Redis wake-ups where configured.
- `growth-worker`: classification, evaluators, scoring, composition, artifact coordination, and adapters.
- `growth-browser-worker`: safe fetching and Playwright in a restricted container and network policy.
- `growth-sweeper`: lease recovery, expiry, preview cleanup, object reconciliation, retention, and policy-expiry jobs.

All use Python 3.12, Pydantic v2, async SQLAlchemy 2.0, and Alembic. A dedicated Growth database on the existing PostgreSQL 15 instance is preferred; a dedicated schema is acceptable only with isolated roles and backups.

### 3.3 Health and readiness

- `/health/live` reports process liveness.
- `/health/ready` verifies database connectivity, migration compatibility, required configuration, and worker snapshot-deserialization capability.
- Redis or optional adapter unavailability reports **degraded** status, not full unavailability, because PostgreSQL is authoritative.
- Migrations run once under a release advisory lock and never concurrently from multiple replicas.
- API deploys use readiness probes and graceful drain. Workers stop leasing, complete or safely relinquish active attempts, then restart.

The browser worker receives signed, short-lived work capabilities. It writes results through a narrow authenticated ingestion endpoint or a database role restricted to attempt-result/evidence-staging tables. It cannot edit policy, eligibility, review, catalog, approval, or workflow state.

## Components and Interfaces

### Primary execution flow

```text
Approved CSV row / submitted URL / approved partner URL / refresh
  → deduplicated candidate intake
  → current source-policy and URL-safety gate
  → Account and DigitalProperty resolution
  → cheap live-property validation
  → archetype and capability classification
  → lightweight opportunity detection
  → Eligibility: Pass | Review Required | Blocked
  → applicable Commerce or Marketplace/Directory deep assessment
  → reviewer-visible evidence and proposed findings
  → deterministic Fit, Confidence, Timing/Value, and Risk
  → routing and human review
  → reviewer accepts/corrects/rejects findings
  → Package Composer selects smallest valid offer or no-current-offer
  → approved bilingual artifact and optional Search preview
  → separate approved CRM/sheet/manual-outreach action
  → outbox delivery, receipt, reconciliation, and outcome recording
```

Expensive browser or paid operations occur only after cheaper gates pass. Engagement mechanism absence alone never creates a finding. An Analytics need without valid Search fit produces `Opportunity detected; no current Skawr offer`.
## 5. Workflow definitions and runtime

### 5.1 Graph model

A Funnel Template is a reusable, parameterized orchestration definition. A workflow draft instantiates or clones a template. Publishing creates an immutable workflow version; each run captures the exact workflow, policy references, packs, evaluator versions, scoring configuration, template relationship, and compatible catalog references.

Persisted graphs are library-neutral JSON containing:

- stable node and edge IDs;
- node type and schema version;
- typed input/output ports;
- sanitized configuration and secret references;
- retry, timeout, cost, fanout, and concurrency bounds;
- human-gate and terminal semantics.

MVP node families are `source`, `policy`, `collect`, `classify`, `assess`, `decide`, `human_gate`, `artifact`, and `action`. Graphs are directed and acyclic. Recurrence creates a new scheduled run rather than a graph cycle.

### 5.2 Publication validation

The server rejects publication unless it verifies:

- all node types and versions are registered;
- typed ports and edge schemas are compatible;
- required configuration and secret references exist;
- a permitted source and terminal path exist;
- no cycles or unreachable nodes exist;
- pack, package, template, locale, archetype, capability, and catalog constraints are compatible;
- browser, paid-call, fanout, concurrency, and estimated-cost limits are within authorization;
- every external action is preceded by required Eligibility and human gates.

Import/export validates a versioned schema and removes credentials, environment URLs, secret values, runtime state, and object-access tokens.

### 5.3 Postgres scheduler

The runtime uses these minimal durable mechanics:

1. Publishing stores an immutable `workflow_version`.
2. Starting a run materializes its node states and typed dependency relationships.
3. A dispatcher claims ready attempts using a short PostgreSQL lease and `FOR UPDATE SKIP LOCKED`.
4. The dispatcher may notify Redis; workers can always poll PostgreSQL after Redis loss.
5. A worker claims one attempt using compare-and-set state and a lease token.
6. Completion writes typed output, cost, checkpoint, downstream readiness, and outbox events in one transaction.
7. Expired leases become reclaimable only after the sweeper confirms no committed completion.
8. Pause prevents new leases; cancellation cooperatively stops pending work without reversing committed effects; resume derives readiness from committed checkpoints.
9. Dead-letter replay requires authorization, current safety validation, and a linked new attempt.
10. Account advisory keys and optimistic row versions serialize conflicting identity, package, review, and action mutations.

11. Each `node_attempt` carries a monotonic fencing token issued at lease time. A worker must present the current fencing token when committing output; the database rejects writes with a superseded or expired token. This prevents a slow or partitioned worker from committing after a lease has been reclaimed and reassigned.
12. Workers that cannot deserialize every runnable snapshot version declared by the dispatcher are not activated for those capabilities; they report version incompatibility at startup and during health checks.

The MVP does not require a generalized workflow language, multi-region consensus, or a separate orchestration platform. These are reconsidered only after observed concurrency or workflow complexity justifies them.

### 5.4 Retry behavior

- Terminal without automatic retry: prohibited/expired policy, source kill switch, robots denial, suppression, unsafe URL, explicit `401/403`, invalid output contract, or missing action basis.
- `429`: honor valid `Retry-After` within source-policy bounds, then pause the source/property.
- `503`, network interruption, or timeout: bounded classified backoff; exhaustion goes to review or dead letter.
- Paid and browser work rechecks budget, current policy, suppression, and destination immediately before execution.

### 5.5 Effectively-once external effects

Before an external call, the adapter creates or locks a unique receipt keyed by:

```text
hash(run_id, node_id, logical_operation, target_scope, payload_version)
```

The adapter sends the key to providers that support native idempotency. A committed receipt returns its previous result. If the call outcome is unknown, the adapter reconciles by provider reference or deterministic read-before-write before retrying. The system describes this as **effectively once**, not literal distributed exactly-once delivery.

Every outbound message, including every follow-up, has a new message-specific approval. No timer, open, click, or prior message can authorize a later send.

### 5.5a Approval payload binding

Each `approval` record binds to an exact payload hash (covering recipient, channel, evidence snapshot, and message content). If any approved field changes after approval is granted, the approval is invalidated and a new approval cycle is required. This structurally prevents "approve message A, send message B" drift.

### 5.6 Policy snapshot versus current authorization

A run snapshot records which policy version informed prior decisions; it is provenance, not a permanent capability. The runtime rechecks the current source decision, expiry, kill switch, suppression, purpose, destination, and action authorization:

- before every fetch or browser navigation;
- after DNS resolution and before connecting;
- at every redirect;
- before paid processing;
- before artifact publication or preview creation;
- before export, CRM mutation, or communication.

A newer prohibition, expiry, suppression, or kill switch stops pending work even when the run snapshot contained an earlier approval.

## Data Models

PostgreSQL uses UUID identifiers, timestamps in UTC, append-only audit/outbox records, JSON only for bounded versioned payloads, and normalized columns for policy, status, ownership, and frequently queried filters.

### 6.1 Minimal MVP tables

| Area | Tables | Purpose |
|---|---|---|
| Identity | `accounts`, `digital_properties`, `identity_aliases`, `identity_changes` | Stable organizations, properties, aliases, minimal merge/split lineage |
| Sources/policy | `sources`, `source_policy_versions`, `candidates`, `suppressions` | Approved intake, field/purpose/action rules, expiry and kill switch |
| Evidence | `fetch_runs`, `evidence`, `findings`, `evidence_snapshots` | Reproducible observations and reviewer decisions |
| Classification | `classification_assertions` | Primary/secondary archetypes, capabilities, evidence, confidence, correction |
| Registry | `assessment_pack_versions`, `evaluator_versions`, `funnel_template_versions` | Stable contracts and lifecycle |
| Decisions | `eligibility_decisions`, `score_runs`, `routing_decisions` | Separate hard gates and explainable prioritization |
| Catalog | `catalog_versions`, `catalog_snapshots`, `recommendations` | Authoritative offers and composed package history |
| Workflow | `workflows`, `workflow_versions`, `workflow_runs`, `run_nodes`, `node_attempts`, `dead_letters` | Durable DAG execution and trace |
| Review | `reviews`, `assignments`, `comments`, `saved_views`, `approvals` | Human coordination and action authorization |
| Actions | `business_contact_points`, `outbox_events`, `inbox_events`, `side_effect_receipts`, `crm_links` | Permissioned destinations and delivery recovery |
| Artifacts/outcomes | `artifacts`, `previews`, `outcome_events`, `cost_entries` | Reports, preview references, learning and economics |
| Governance | `audit_log`, `security_events`, `retention_jobs`, `propagation_jobs` | Accountability, incidents, deletion, expiry, and suppression propagation tracking |
| Launch gates | `launch_samples`, `launch_gate_runs` | Persisted quality-trial results and capability flags |

Closely related concepts may initially share a table using explicit type and schema-version columns. They should be split only when authorization, retention, scale, or query patterns require separate lifecycles.

### 6.1a Database-level safety constraints

- A check constraint on `side_effect_receipts` enforces that no receipt with `adapter != 'sandbox'` can be inserted when the associated run has `mode = 'test'` or `mode = 'dry_run'`. This provides defense-in-depth behind the sandbox adapter substitution logic.
- Partial indexes cover ready nodes, stale leases, unsent outbox events, policy expiry, evidence freshness, preview expiry, and suppression hashes for efficient queue/sweeper operation.

### 6.2 Key entity shapes

```text
Account
  id, display_name, status, owner_id, primary_archetype,
  suppression_state, first_seen_at, last_seen_at, row_version

DigitalProperty
  id, account_id, type, canonical_location, geography, languages,
  provenance, status, first_seen_at, last_seen_at, row_version

Evidence
  id, account_id, property_id, signal_type, typed_value,
  source_url, source_policy_version_id, method, method_version,
  observed_at, expires_at, confidence_basis, status,
  object_ref, excerpt, fingerprint

Finding
  id, account_id, property_id, category, pack_id, pack_version,
  evaluator_id, evaluator_version, typed_payload, evidence_ids,
  review_state, reviewer_id, review_reason, row_version

WorkflowRun
  id, workflow_version_id, account_id, property_id, mode,
  immutable_snapshot, state, checkpoint_seq, budget_snapshot,
  actual_cost, created_at, completed_at

NodeAttempt
  id, run_id, node_id, logical_key, state, lease_token,
  lease_expires_at, typed_input, typed_output, attempts,
  cost, error_class, started_at, completed_at

Recommendation
  id, account_id, catalog_snapshot_id, growth_package_ref,
  accepted_finding_ids, phase_plan, original_result,
  override_log, lifecycle_state, created_at
```

### 6.3 Identity correction

Merge and split are minimal authorized API/admin operations in MVP:

- require reason and Administrator permission;
- preserve prior IDs and aliases rather than deleting them;
- record before/after membership and actor/time;
- explicitly reassign selected properties/evidence during split;
- pause affected open runs for reviewed reassignment;
- propagate suppression conservatively until reviewed.

A polished reviewer-facing merge/split interface is post-MVP.
## 7. Source policy and secure collection

### 7.1 Source registry

Each source version records owner, source identity, decision, allowed fields, purposes and actions, terms/robots decision, legal basis where applicable, retention class, review date, expiry, approver, and kill-switch state. Unknown or expired sources are disabled by default. Discovery creates candidates only.

MVP sources are:

- approved CSV uploads;
- `/cro/audit` submissions;
- `/saas/import` submissions;
- approved partner-submitted URLs;
- scheduled refresh of accepted Accounts.

Common Crawl, HTTP Archive, directories, technology fingerprints, and migration signals remain post-MVP connectors.

### 7.2 Safe-fetch contract

`Collector.collect(request) -> CollectorResult` receives a property, current authorized policy capability, allowed fields/purpose, limits, locale, and trace IDs. It returns fetched-resource metadata, typed observations, denials, object references, and exact cost. It cannot create Accounts/findings, alter policy, or call arbitrary destinations.

The safe-fetch boundary:

- allows only approved HTTP(S) schemes and rejects embedded credentials;
- normalizes hostnames and URLs;
- blocks loopback, private, link-local, multicast, metadata, internal, and otherwise non-public ranges;
- resolves DNS through controlled infrastructure and rechecks all addresses before connecting;
- revalidates every redirect and protects against DNS rebinding;
- enforces redirect, response-size, content-type, request-time, and total-navigation limits;
- never executes downloaded files;
- records denials as terminal evidence without seeking alternate credentials or bypasses.

Browser workers run without Growth/CRM/provider secrets, with controlled egress, restricted capabilities, CPU/memory/time limits, and sanitized output. Active markup is never rendered directly in the dashboard.

### 7.3 CSV and feed intake safety

Uploaded CSV and structured feeds pass through:

- byte, row, and column count limits;
- MIME type and magic-byte validation;
- spreadsheet formula neutralization (strip leading `=`, `+`, `-`, `@`, tab, and carriage-return injection vectors);
- archive rejection or bounded decompression with recursion limits;
- optional configured malware scan;
- quarantine on type mismatch, oversized fields, or suspicious patterns.

Only validated, schema-mapped rows enter the candidate pipeline. Rejected rows produce structured diagnostics without executing embedded content.

## 8. Evaluation architecture

### 8.1 Evaluator and Assessment Pack contracts

```python
class Evaluator(Protocol):
    id: str
    version: str
    cost_class: Literal["cheap", "browser", "paid"]

    def applicable(self, property: DigitalProperty, capabilities: Capabilities) -> bool: ...
    async def evaluate(self, context: EvaluationContext) -> EvaluatorResult: ...
```

`EvaluationContext` exposes selected permitted evidence, a safe-fetch capability, locale resources, limits, and trace metadata. Evaluators do not set Eligibility, scores, routing, packages, or publication state.

An Assessment Pack version binds supported archetypes/capabilities, inputs, evaluator versions, typed output schemas, dependencies, locales, cost class, applicability, lifecycle, and freshness rules. MVP packs are hardcoded versioned modules registered through the stable contract; no general plugin marketplace is built.

### 8.2 Search evaluator

Search evaluation uses known-item retrieval from permitted public or submitted inventory. Query variants come from deterministic documented transformations or reviewed locale lexicons, including applicable Arabic orthography, Arabic/English transliteration, mixed script, numerals, typo patterns, SKU/model, and category-plus-attribute forms.

Each test records query, expected item and derivation, rank bucket (`top1`, `top3`, `top10`, `none`), latency, autocomplete behavior, zero-result recovery, timestamp, evaluator version, and screenshot/snippet. A synthetic zero-result rate is allowed only for its declared sample and is labeled `synthetic`; it is never described as production behavior.

Restricted/login-required paths are skipped. Growth calls versioned Search APIs for comparison retrieval and optional preview creation rather than accessing Search tables or OpenSearch directly.

### 8.3 Analytics readiness evaluator

Analytics findings use only publicly observable or merchant-submitted signals. Output says `not publicly observed`, never `missing`, where public evidence is absent. Tag presence does not prove event, identity, governance, reporting, or business-use quality. Tag absence does not prove no analytics exists.

### 8.4 CRO evaluator

CRO evaluates reproducible pricing clarity, trust/brand cues, journey friction, intent-to-landing alignment, accessibility, mobile usability, and observable measurement readiness. Public journeys stop before transaction completion, authentication, account creation, or form submission unless an approved sandbox/test path exists. Revenue or uplift scenarios require merchant inputs and explicit assumptions.

### 8.5 Engagement & Onboarding evaluator

Absence of a popup, bar, guidance, survey, push prompt, or other mechanism never creates a finding. A finding requires either:

- a demonstrated unmet journey need; or
- a harmful existing implementation supported by reproducible evidence.

Applicable checks cover obstruction, dismissibility, competing overlays, keyboard/screen-reader use, RTL/localization, performance, stale/conflicting messages, manipulative behavior, contextual permission, opt-out, and bounded revisit behavior. Concepts include frequency, accessibility, mobile, localization, performance, consent, and anti-dark-pattern constraints and are labeled for a separate future delivery product.

### 8.6 LLM boundary

Fireworks or another approved processor may phrase selected reviewer-accepted structured evidence and approved catalog claims. It cannot determine evidence truth, expected relevance, Eligibility, Fit, Confidence, Timing/Value, Risk, package constraints, or routing thresholds. Output must be schema-valid and pass citation/grounding validation; unavailable or invalid phrasing fails closed to deterministic templates/manual review.

## 9. Eligibility, scoring, and routing

Eligibility is a versioned deterministic hard gate with `Pass`, `Review Required`, or `Blocked` outcomes. Policy prohibition, unsafe destination, suppression, explicit denial, expired authorization, personal-data dependency, or missing action basis blocks the relevant scope. Ambiguity requires review and prevents external action.

Only after Eligibility passes does the system compute separately:

- **Fit:** reproduced need, archetype/product alignment, complexity, first-party engagement, credible value, and current offer eligibility.
- **Confidence:** reproducibility, corroboration, freshness, source reliability, and evidence completeness.
- **Timing/Value:** commercial timing and credible operational value.
- **Risk:** uncertainty, policy sensitivity, delivery effort, stale/conflicting evidence, and commercial risk.

No additive score can cancel a blocker. Every result stores model/version, configuration, evidence-snapshot hash, component breakdown, and reasons. Routing supports qualified review, generate-then-review, monitor, no-current-offer, and disqualified.

## 10. Product catalog and Package Composer

### 10.1 Catalog

The authoritative catalog stores stable/versioned products, services, tiers, entitlements, and Growth Packages with lifecycle, effective dates, locales, regions, currencies, billing cadence, prerequisites, incompatibilities, archetype eligibility, implementation requirements, connector support, entitlements, pricing policy, approved claims, CTA, and legal/commercial approval state.

Launch uses reviewed seed data and restricted Administrator publication endpoints. A full catalog-management experience is not required before the quality-gate trial; the dashboard needs only safe viewing, validation, and minimal controlled update/publish operations.

Recommendations capture immutable catalog snapshots and revalidate against current lifecycle and policy before publication or action. Conflicting copy is blocked.

### 10.2 Composer

The deterministic composer consumes reviewer-accepted findings and chooses the smallest commercially valid Growth Package satisfying needs, prerequisites, entitlements, compatibility, lifecycle, region, and effective date. It supports phased sequences and reassessment points.

Authorized reviewers may add, remove, phase, or override components with a reason. The system retains the original recommendation and revalidates all commercial rules. If no valid offer addresses an accepted opportunity, it preserves the finding for learning/monitoring without a purchase CTA.

Package rationale may explain the applicable future loop—Search captures intent, bundled Analytics observes, CRO diagnoses, Engagement & Onboarding executes interventions, Analytics measures outcomes—but cannot imply Skawr already observed private funnels.

## 11. Evidence, artifacts, and Search previews

Evidence records source URL/policy, method/version, observation time, expiry, confidence basis, property, screenshot/snippet/object hash, and status. Reviewer correction preserves the original observation and decision history.

### 11.1 Evidence state machine

Evidence progresses through a controlled lifecycle:

```text
collected → policy_admissible → evaluator_validated → reviewer_accepted
                                                   → rejected
                                                   → stale
                                                   → retracted
```

- Pre-review scores use a versioned admissible-evidence snapshot and are marked **provisional**.
- Reviewer acceptance/rejection triggers deterministic score recomputation.
- Package recommendations and publishable artifact claims reference only **reviewer-accepted** evidence or approved catalog claims.
- Corrections create a new superseding evidence record linked to the original; the original remains for audit.

Artifacts include bilingual audits, top-opportunity summaries, readiness reports, and Growth Blueprints. Every factual or commercial claim cites reviewer-accepted evidence or an approved catalog claim. Unsupported output is omitted and flagged before publication.

Search preview lifecycle:

1. Growth approves a purpose-limited normalized sample.
2. Growth calls a versioned internal Search preview API with an idempotency key and expiry.
3. Search creates the ephemeral index and returns an opaque preview reference.
4. Growth stores only the reference, purpose, access metadata hash, and expiry intent.
5. Search enforces query/access behavior; Growth grants signed user access.
6. Expiry triggers deletion, and a sweeper reconciles missing cleanup receipts.

Large raw pages, browser captures, screenshots, and generated artifacts use private object storage with content hashes, temporary upload/finalization states, short retention, and signed access. PostgreSQL remains authoritative for authorization and lifecycle.
## 12. Operator interface

Growth Studio is added to `skawr-dashboard-admin`, which already provides React 19, React Router, TanStack Query, Tailwind 4, Axios, Recharts, Zitadel OIDC, Sentry, and shared `@skawr/core` components. `@xyflow/react` is the only planned graph dependency and must be pinned when added.

### 12.1 Routes

| Route | Purpose |
|---|---|
| `/growth` | Growth Radar and launch-quality overview |
| `/growth/review` | Queues, filters, saved views, assignments, due dates, and bulk-safe actions |
| `/growth/accounts` | Account list |
| `/growth/accounts/:accountId` | Properties, identity history, evidence, findings, package rationale, artifacts, and outcomes |
| `/growth/flows` | Workflow and Funnel Template library |
| `/growth/flows/:workflowId/edit` | Visual draft editor, validation, test/dry run, publish and rollback |
| `/growth/runs/:runId` | Per-node trace, cost, errors, pause/cancel/resume, authorized replay |
| `/growth/catalog` | Catalog snapshot viewing and minimal authorized administration |

### 12.2 Workflow editor

The editor supports graph/list views, typed node palette, configuration panel, validation diagnostics, server cost estimate, draft/published distinction, single-property test, bounded dry run, template import/export, publish, rollback, and pause.

TanStack Query owns server state. Every mutation sends `If-Match` or an equivalent expected version. A stale mutation returns `409 Conflict` with the current version and enough structured information to refresh or explicitly resolve; silent overwrite is prohibited.

Undo/redo, debounced autosave, collaborative cursors, and advanced graph-layout tooling are post-MVP. Explicit save is sufficient initially.

### 12.3 Review and collaboration

The review queue includes required filters and saved views, assignments, owner, due dates, status, comments, freshness, Eligibility, score bands, opportunities, packages, source, archetype, capabilities, geography, language, and risk flags.

MVP bulk actions are limited to assignment, refresh, monitor, generation approval, approved export, suppression, and rejection with reason. There is no bulk send. Mentions, notifications, and account activity feed are deferred.

### 12.4 Design-system and accessibility

The interface follows Skawr app conventions: compact 4px-grid spacing, rectangular 34px desktop controls, 8–12px radii, no marketing motion/glow, correct app theme behavior, logical properties for RTL, and Space Grotesk/Plus Jakarta Sans typography. Graph operations have keyboard-accessible controls and a list alternative. Tables, dialogs, errors, evidence, approvals, and conflict resolution are screen-reader accessible.

## 13. Identity, authentication, and authorization

Zitadel is mandatory. The Growth API validates issuer, exact Growth audience, signature/JWKS rotation, expiry/not-before, token type, and project roles. No legacy password or custom JWT path is introduced.

Roles:

- `Viewer`: read permitted radar, account, workflow, and evidence views.
- `Operator`: intake, workflow drafts, tests, assignments, and refresh requests.
- `Reviewer`: finding decisions, classification corrections, package review, and Eligibility resolution within policy.
- `Publisher`: workflow/catalog/artifact publication as separately authorized.
- `Administrator`: source policy, retention, secrets, identity correction, and role-sensitive configuration.
- `Outreach Approver`: recipient/channel/message-specific external-action approval.

Permissions are resource/action-specific. General edit does not imply publish, CRM, export, or communication permission. Dual approval is supported for configured sensitive actions, requires distinct users, and is off by default for ordinary MVP actions unless policy marks them sensitive.

Every sensitive mutation records actor, time, before/after, reason where required, and affected Account, workflow, catalog, policy, suppression, consent, or secret reference.

## 14. BusinessContactPoint and external actions

Growth stores organization-level routes only: generic company inbox, official contact form, published switchboard, merchant-submitted address, partner introduction, or explicitly consented recipient. Each includes source, classification, purpose, basis/consent, allowed channels, evidence, expiry, suppression, and Account association. The normalized contact route is stored encrypted at rest (`normalized_route_ciphertext`) to limit exposure from database compromise. There is no person entity.

An action proceeds only after current revalidation of:

- Eligibility and finding/recommendation approval;
- source field/purpose/action policy;
- current consent or basis and channel permission;
- expiry and suppression;
- catalog lifecycle and approved claims;
- recipient, evidence snapshot, exact message, and Outreach Approver decision.

CRM and sheet adapters initially provide one approved provider each, use outbox delivery and receipts, and attach approved evidence/artifact summaries and reviewer identity. Outreach remains assignment or approved draft generation unless a separately approved sending adapter exists. Even then, every message is individually approved.

## 15. Integration contracts

### 15.1 Inbound web events

`/cro/audit` and `/saas/import` send signed versioned internal REST events containing event ID, occurred time, source type, submitted URL/reference, minimal consent/purpose fields, and payload hash. Growth verifies signature, timestamp window, source policy, and inbox dedupe before creating a candidate.

Signed envelopes include key ID, UTC timestamp, nonce, and HMAC over method, path, timestamp, nonce, and raw body. Growth rejects stale timestamps (configurable window, e.g. 5 minutes), reused nonces (stored in inbox_events), unknown key IDs, body-hash mismatches, and duplicate `(source, event_id)` combinations. Valid replays return the original acknowledgement without re-processing.

Full CloudEvents standardization is optional post-MVP. A stable signed envelope and idempotent event ID are sufficient initially.

During migration, existing public response shapes and polling behavior remain compatible. Growth first shadows the old execution path, then becomes authoritative after parity/recovery tests; process-local maps and fire-and-forget scans are retired afterward.

### 15.2 Search APIs

Versioned internal endpoints cover:

- normalized sample ingestion for a preview;
- preview status and deletion;
- controlled comparison retrieval for known-item testing;
- optional reuse of an existing guest import reference.

Search authenticates the Growth service identity, enforces quotas and expiry, and never trusts operator browser tokens directly.

### 15.3 Analytics projection

Growth owns authoritative outcome records. An after-commit outbox adapter sends approved internal usage and outcome projections to Skawr Analytics. Analytics downtime cannot block or erase Growth run truth. Events exclude secrets, raw pages, personal data, object URLs, and prohibited evidence.

### 15.4 Fireworks/processor boundary

Only approved fields, purpose, region/transfer basis, redaction profile, and schema are permitted. Processor requests reference structured evidence rather than raw pages whenever possible. Secrets, personal routes, and unrelated content are excluded. Processor failure does not weaken deterministic gates.

## 16. Security, privacy, and governance

### 16.1 Threat controls

| Threat | Controls |
|---|---|
| SSRF/DNS rebinding | Controlled resolver, public-range checks before connection and every redirect, metadata/internal deny rules |
| Malicious page/browser escape | Separate worker, sandbox, controlled egress, no broad DB role or service secrets, bounded resources |
| Stored XSS/unsafe evidence | Sanitize output, never render active page markup, signed object access, restrictive CSP |
| Unauthorized workflow/action | Zitadel audience/roles, resource permissions, human gates, optimistic versions, audit |
| Duplicate external effect | Unique receipt, provider idempotency, reconciliation before retry |
| Stale authorization | Current policy/suppression/catalog/approval revalidation at each sensitive boundary |
| Secret leakage | Managed secret references, environment separation, redacted logs/exports/prompts/screenshots |
| Personal-data expansion | Organization-fact default, no person model, field/purpose restrictions, retention and deletion propagation |
| Supply-chain risk | Pinned dependencies, lockfiles, image scanning, restricted build provenance |

### 16.2 Retention, deletion, and propagation tracking

Raw pages, browser traces, and screenshots receive purpose-specific short retention. Extracted evidence remains only while current and needed. An approved correction, deletion, or suppression propagates to PostgreSQL, objects, Search previews, caches, pending jobs, artifacts, adapters, and CRM reconciliation where supported. Only a content-free auditable tombstone remains where legally permitted.

Propagation is tracked by a `propagation_jobs` table:

```text
propagation_jobs
  id, subject_type, subject_hash, destination, operation,
  state, attempts, acknowledged_at, created_at
```

Each destination (database projections, object storage, Search preview, cache, queue, artifact, export, processor) independently acknowledges completion. Incomplete propagation is retried and alerted. Property 12 (suppression propagates) is enforceable because every destination has an auditable acknowledgement record.

Saudi recipients/properties use applicable PDPL purpose, consent/basis, correction, deletion, retention, suppression, and opt-out controls. Policy owners—not evaluators—define the approved legal interpretation.

### 16.3 Secrets

Secrets are stored through approved secret management, encrypted in transit/at rest, environment-separated, rotatable, least-privilege, and referenced by opaque IDs. Workflow/template export, logs, prompts, screenshots, errors, and artifacts never contain secret values. Administrative create/rotate/fail/revoke events are audited without values.
## 17. Observability and Growth Radar

Every trace uses `trace_id`, `run_id`, `account_id`, `property_id`, `node_id`, `attempt_id`, and error class where applicable. OpenTelemetry covers API, dispatcher, workers, Search calls, processors, and adapters. Errors flow to the existing Sentry/GlitchTip pattern without raw page content, contact routes, tokens, or secrets.

PostgreSQL projections/materialized views power Radar metrics:

- counts by discovered, policy-accepted, safe, live, classified, eligible, assessed, qualified, in-review, monitored, blocked, dead-lettered, and errored stage;
- source/workflow/pack/evaluator yield and reviewer acceptance/overturn;
- package mix and commercial outcomes;
- cost by source/evaluator/pack/property/account and per accepted Account;
- stage and end-to-review latency percentiles;
- duplicate, unsupported-claim, and policy-pass rates;
- imports, catalog index completion, Analytics first event, Engagement & Onboarding start, CRO start, meeting, proposal, paid, rejection, and suppression.

Alerts cover stalled queues, expired leases, policy expiry, source-yield shifts, budget breaches, preview cleanup failures, adapter reconciliation backlog, and quality-gate regression. Opens alone never optimize scoring or routing.

## Error Handling

| Condition | Handling |
|---|---|
| Prohibited/expired source, kill switch, robots denial, suppression, unsafe URL | Terminal, audited, never retried automatically |
| `401/403` | Record explicit denial; no retry or alternate credentials |
| Bounded `429` | Honor permitted `Retry-After`; then pause source/property |
| `503`, timeout, worker interruption | Classified bounded backoff; then review/dead letter |
| Output schema/contract violation | Fail attempt and dead-letter with sanitized diagnostics |
| Budget/fanout limit | Pause affected stage and alert; no hidden overrun |
| Concurrent mutation | `409 Conflict`; refresh or explicit reviewed resolution |
| Catalog/policy conflict at publication/action | Block and show current conflicting rule |
| Unsupported artifact claim | Omit/block claim and require review |
| Unknown external-call outcome | Reconcile receipt/provider state before retry |
| Redis unavailable | Continue via bounded Postgres polling; no durable state loss |
| Browser worker compromised/unhealthy | Revoke work capability, isolate worker, expire lease, preserve staged result boundary |

Backups and restore drills cover Growth PostgreSQL and object metadata. Objects use lifecycle/versioning appropriate to approved retention. Recovery objectives are declared before launch and validated with a restore test.

## Testing Strategy

Tests use local fixtures, fake processors, and sandbox adapters by default. They do not scrape live third-party sites or send real external actions.

### 19.1 Unit and contract tests

- Eligibility blockers and separate scoring components.
- Catalog commercial rules and smallest-valid-package composition.
- Policy field/purpose/action combinations and expiry/kill-switch behavior.
- URL normalization, SSRF, DNS rebinding, redirect checks, and content limits.
- Evaluator, pack, graph, import/export, Search API, inbound-event, and adapter schemas.
- Citation validator and deterministic fallback artifact templates.
- Optimistic concurrency and role/action authorization.

### 19.2 Golden evaluator fixtures

- Arabic/English inventory and deterministic known-item transformations.
- Commerce, Marketplace/Directory, Salla, Shopify, Zid, and custom-platform classification fixtures without making platform an eligibility rule.
- Analytics claim-language corpus for `not publicly observed` boundaries.
- CRO journey stop boundaries and scenario labeling.
- Engagement examples proving absence alone never creates a finding.
- Supported/unsupported evidence and commercial-claim corpus.

### 19.3 Runtime and recovery tests

- Concurrent dispatchers claiming with `SKIP LOCKED`.
- Worker death before/after checkpoint and lease expiry recovery.
- Fencing token rejection: a slow worker with a superseded token cannot commit output.
- Redis loss during ready work.
- Pause, cancel, resume, dead letter, authorized replay, and rollback with in-flight runs.
- Duplicate inbound events and duplicate candidate races.
- Effect receipt reuse, provider-native idempotency, and unknown-outcome reconciliation.
- Current policy/kill-switch/suppression change during a run.
- Dry run proving zero real side effects.
- Approval invalidation when payload hash changes after approval is granted.

### 19.4 End-to-end and UI tests

- Submitted URL/CSV through policy, identity, evaluation, review, package, bilingual artifact, optional preview, and approved sandbox export.
- Keyboard/screen-reader graph and list workflows.
- RTL artifact preview and responsive review tables/dialogs.
- Version-conflict refresh/resolution and role-aware disabled actions.
- Search preview expiry and object/retention cleanup.

### 19.5 Launch quality-gate harness

A predeclared sample of at least 30, preferably 50, deeply reviewed Accounts measures:

- at least 80% top-band precision using the fixed denominator defined in R22;
- zero unsupported claims in sampled published artifacts;
- duplicate rate below 2%;
- 100% applicable non-expired policy/safety/basis/suppression pass for accepted work;
- predeclared per-accepted-account cost and end-to-review latency thresholds;
- no Engagement & Onboarding opportunity based only on mechanism absence.

Broad discovery or new required launch packs remain disabled until these gates pass.

### 19.6 Launch-gate persistence and capability flag

Quality-gate results are persisted in `launch_samples` and `launch_gate_runs` tables recording: sampling period, selection method, fixed top-band denominator hash, reviewer-confirmed findings, unsupported-claim results, duplicate decisions, policy results, cost/latency thresholds, and gate outcome.

A system-level capability flag prevents activation of new source classes, new required Assessment Packs, or broader discovery connectors until the relevant approved gate passes. This prevents accidental scale-up before proven quality.

## Correctness Properties

### Property 1: No sensitive action without current Eligibility

Publication, preview, export, CRM mutation, or communication requires current `Pass` at the relevant scope.

**Validates: Requirements 7.1, 7.2, 17.6**

### Property 2: Current policy overrides historical permission

A snapshot preserves provenance but cannot bypass later expiry, prohibition, kill switch, or suppression.

**Validates: Requirements 5.6, 5.8, 15.1, 17.6**

### Property 3: No unsupported claim leaves the system

Every factual or commercial claim cites accepted evidence or an approved catalog claim.

**Validates: Requirements 12.11, 18.5, 18.6**

### Property 4: Catalog is authoritative

Generated output cannot contradict active lifecycle, entitlement, pricing, region, date, approval, or claim rules.

**Validates: Requirements 12.3, 12.4, 12.5, 12.6, 12.10**

### Property 5: Analytics is never standalone

Analytics accompanies an eligible Search tier or results in no-current-offer.

**Validates: Requirements 11.3, 11.4, 12.7**

### Property 6: Engagement absence is not an opportunity

A mechanism's absence cannot create or worsen a finding.

**Validates: Requirements 10.1, 11.2, 22.11**

### Property 7: External effects are effectively once

Replaying one logical operation cannot knowingly duplicate a committed artifact, export, CRM mutation, or message; unknown outcomes reconcile before retry.

**Validates: Requirements 15.3, 15.12, 17.8**

### Property 8: Every message is independently approved

No follow-up inherits permission, and no elapsed-time, open, or engagement trigger sends it.

**Validates: Requirements 17.5, 17.9, 17.10**

### Property 9: Terminal means terminal

Explicit denial, prohibition, unsafe URL, robots denial, or suppression is not automatically retried or bypassed.

**Validates: Requirements 5.7, 6.8, 15.5, 15.6**

### Property 10: No person profiles

Automated discovery cannot create or enrich a named-person entity; only allowed organization-level routes exist.

**Validates: Requirements 17.1, 17.3, 20.1**

### Property 11: LLMs do not decide truth

Processors cannot set evidence truth, relevance ground truth, Eligibility, scores, routing thresholds, or commercial compatibility.

**Validates: Requirements 7.8, 8.2, 18.6**

### Property 12: Suppression propagates

Suppressed targets cannot re-enter queues, eligibility, exports, CRM actions, previews, or communications without authorized resolution.

**Validates: Requirements 17.7, 20.3**

### Property 13: Run provenance is immutable

Published graph and referenced versions used by a run are preserved; rollback affects new runs only.

**Validates: Requirements 15.1, 15.13**

### Property 14: Browser compromise is contained

A browser worker cannot mutate policy, approval, catalog, review, or workflow control state.

**Validates: Requirements 6.7, 20.5, 20.7**

### Property 15: Redis loss cannot lose truth

Durable work remains discoverable from PostgreSQL.

**Validates: Requirements 15.2, 15.4, 21.3**

### Property 16: Dry runs have no real side effects

All external nodes use sandbox adapters and clearly labeled simulated outcomes.

**Validates: Requirements 14.5, 14.6, 14.7**

### Property 17: Stale workers cannot commit

A worker whose lease has expired or whose fencing token has been superseded is rejected at commit time; only the current lease holder can advance node state.

**Validates: Requirements 15.3, 15.9, 15.11**

### Property 18: Approval is payload-bound

An approval covers an exact payload hash; any change to recipient, channel, evidence, or message content invalidates the approval and requires a new approval cycle.

**Validates: Requirements 17.5, 17.10**

## 21. Requirements traceability

| Requirement | Design coverage | Primary verification |
|---|---|---|
| R1 Account/DigitalProperty | Sections 6.1–6.3 | Identity/dedupe races, property isolation, merge/split lineage |
| R2 archetypes/capabilities | Sections 4, 6, 8 | Versioned classification evidence and correction feedback |
| R3 Assessment Packs | Section 8.1 | Registry applicability, lifecycle, locale, dependency, freshness tests |
| R4 concept separation | Sections 5.1, 8.1, 10 | Stable IDs and pack/package/template compatibility |
| R5 discovery/policy | Sections 7, 5.6 | Field/purpose/action, expiry, kill switch, candidate-only discovery |
| R6 secure collection/cost | Sections 4, 7 | SSRF/redirect/isolation and broad-to-narrow budget tests |
| R7 Eligibility/scoring | Section 9 | Blocker dominance and explainable separate-component tests |
| R8 Search evaluation | Section 8.2 | Arabic golden fixtures, rank evidence, stale/skip behavior |
| R9 Analytics/CRO | Sections 8.3–8.4 | Claim-language and journey-boundary fixtures |
| R10 Engagement safety | Section 8.5 | Absence-never-finding and harmful-implementation fixtures |
| R11 opportunities/composer | Sections 9–10 | Omission, minimality, phasing, override, no-offer tests |
| R12 product catalog | Sections 2.3, 10 | Lifecycle, snapshot, commercial and approved-copy tests |
| R13 templates/builder | Sections 5.1–5.2, 12 | Clone/import/export, compatibility, no-secret tests |
| R14 graph validation/test | Sections 5.2, 12.2 | Typed graph, bounds, dry-run-zero-effect tests |
| R15 runtime guarantees | Sections 5, 18 | Lease/crash/idempotency/outbox/pause/rollback tests |
| R16 review/access | Sections 12–13 | Saved views, assignments, ETags, RBAC, optional dual approval |
| R17 contacts/actions | Sections 5.5, 14 | Allowed routes, suppression, per-message approval, receipts |
| R18 evidence/artifacts | Section 11 | Lineage, citations, bilingual output, preview expiry |
| R19 Radar/learning | Sections 15.3, 17 | Stage metrics, authoritative outcomes, Analytics projection |
| R20 governance/secrets | Section 16 | Retention/deletion, processor policy, secret redaction/audit |
| R21 infrastructure reuse | Sections 3, 12, 15 | Web/Search/Analytics/dashboard/scraper contract tests |
| R22 MVP/quality gates | Sections 2.1, 19.5 | Fixed-sample precision, claim, duplicate, policy, cost gates |
## 22. Delivery and migration plan

### Phase 0: safety and contracts

- Establish repository, migrations, Zitadel audience/roles, dedicated database roles, secret references, object namespace, audit, and source-policy authority.
- Implement URL-safety and browser-isolation tests before accepting arbitrary submitted URLs.
- Define versioned inbound, Search preview, processor, CRM/sheet, and Analytics contracts.
- Seed and approve the initial commercial catalog.

### Phase 1: durable intake and review spine

- Candidate intake, identity resolution, source policy, suppression, evidence ledger, and minimal Account dossier.
- Postgres dispatcher, runs/node attempts, checkpoints, outbox, receipts, dead letters, and basic recovery.
- Approved URL/CSV workflow without broad discovery.
- Review queue, assignments, comments, saved views, RBAC, and version conflicts.

### Phase 2: launch assessments and composition

- Commerce and Marketplace/Directory packs.
- Search, Analytics readiness, CRO, and Engagement & Onboarding evaluators.
- Eligibility, separate scoring, routing, reviewer finding decisions, and Package Composer.
- Bilingual deterministic artifacts with optional approved LLM phrasing.

### Phase 3: visual workflows and previews

- Minimal Flow Studio with graph/list editing, server validation, explicit save, test, bounded dry run, publish, rollback, and import/export.
- Search-owned ephemeral preview integration and cleanup reconciliation.
- Minimal catalog administration and approved CRM/sheet adapters.

### Phase 4: shadow migration and quality trial

- Mirror `/cro/audit` and `/saas/import` submissions into Growth while existing paths remain authoritative.
- Compare outcomes, durability, latency, and public polling compatibility.
- Move execution authority to Growth only after recovery and parity checks.
- Run the predeclared 30–50 Account quality sample.
- Broaden discovery only after R22 gates pass.

Database changes use expand/backfill/switch/contract migrations. Deployments preserve in-flight immutable versions. New code reads old/new representations during transitions where needed. No production cutover removes the old path until rollback and reconciliation are verified.

## 23. Deferred target-state extensions

The architecture anticipates but does not require for MVP:

- additional Assessment Packs and broad discovery connectors;
- polished identity-management UI and portfolio/agency hierarchy;
- richer catalog publication workflows;
- graph undo/redo, autosave, advanced layout, and real-time collaboration;
- mentions, notifications, and account activity feed;
- configurable experimentation and attribution;
- action adapters through Activepieces or similar tools, never as system of record;
- Temporal or another orchestration platform if sustained scale demonstrates that the constrained Postgres runtime is insufficient;
- separately specified customer-facing Engagement & Onboarding product runtime.

Any extension must preserve the correctness properties and cannot weaken source policy, evidence, catalog, approval, suppression, or no-automated-sending boundaries.

## 24. Open implementation decisions

These do not reopen the selected service boundary, Postgres authority, human-gated actions, or safety model:

1. Dedicated database versus isolated schema on the existing PostgreSQL instance, based on backup and capacity operations.
2. Approved object-store region, retention classes, and Saudi transfer basis.
3. Exact Zitadel project audience and role-claim names.
4. The single MVP CRM adapter and sheet/export target, including native idempotency support.
5. Source-policy approver and approved expiry intervals for each MVP source.
6. Predeclared browser concurrency, cost, latency, preview-size, and preview-TTL limits.
7. Search preview request shape: normalized sample documents, guest import reference, or both.
8. Approved LLM processor, region, redaction profile, and fail-closed behavior.
9. Recovery point/time objectives and restore-test cadence.
10. Compatibility duration and polling fields for existing `/cro/audit` and `/saas/import` consumers.

## 25. Final design decision

Growth Studio will use the bounded-context and Postgres-authoritative architecture from `design-kiro.md`, constrained by the focused MVP boundary from `design.md` and the accepted requirements. The first release proves evidence quality, policy safety, reviewer usefulness, and acquisition economics before expanding sources, packs, collaboration, or automation.

No `tasks.md` should be generated until this consolidated design is reviewed and accepted.
