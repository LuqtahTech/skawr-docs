# Implementation Plan: Skawr Growth MCP

## Overview

Implement a stateless, read-only MCP gateway that exposes Analytics first, Search second, and joined growth analysis only after workspace, identity, semantic, attribution, and security gates pass. Every task below produces code, executable schemas, migrations, fixtures, tests, generated documentation, or deployment configuration.

## Delivery Constraints

- Use durable `GrowthWorkspace` and `WorkspaceStore` as the only connected-analysis authority; `TenantContext` is request-local.
- Deliver Analytics Wave A before Search Wave B; gate Wave C and `validated_join` on executable readiness evidence.
- Keep all operations read-only and bounded; CRO execution, mutations, `result_clicked`, and native Analytics organization ownership remain outside this MVP.
- Pin runtime dependencies exactly and preserve immutable schema, policy, and validation versions.
- Do not scaffold `skawr-mcp` until task 0.10 passes.

## Task Dependency Graph

```json
{
  "waves": [
    {"id": 0, "tasks": ["0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8"]},
    {"id": 1, "tasks": ["0.9"]},
    {"id": 2, "tasks": ["0.10"]},
    {"id": 3, "tasks": ["1.1"]},
    {"id": 4, "tasks": ["1.2", "1.4"]},
    {"id": 5, "tasks": ["1.3", "1.6", "8.1"]},
    {"id": 6, "tasks": ["1.5", "2.1", "8.2", "9.1"]},
    {"id": 7, "tasks": ["1.7", "9.2"]},
    {"id": 8, "tasks": ["2.2"]},
    {"id": 9, "tasks": ["2.3"]},
    {"id": 10, "tasks": ["3.1", "4.1", "7.1"]},
    {"id": 11, "tasks": ["3.2", "7.2"]},
    {"id": 12, "tasks": ["4.2", "7.3"]},
    {"id": 13, "tasks": ["4.3", "9.3"]},
    {"id": 14, "tasks": ["5.1", "6.1", "6.3"]},
    {"id": 15, "tasks": ["5.2", "5.3", "6.2", "6.4"]},
    {"id": 16, "tasks": ["5.4"]},
    {"id": 17, "tasks": ["5.5"]},
    {"id": 18, "tasks": ["9.4"]},
    {"id": 19, "tasks": ["9.5"]},
    {"id": 20, "tasks": ["9.6"]}
  ]
}
```

## Tasks

## Phase 0 — Executable preflight contracts
- [ ] 0.1 Remove hardcoded credential fallbacks and add a remediation gate
  - Replace fallback credentials in `skawr-web/lib/supabase.ts` and `skawr-web/lib/skawr-client-simple.ts` with required secret configuration that fails safely when absent.
  - Add a repository scanner with fixtures covering source, generated bundles, examples, and tests; never store a real credential in fixtures.
  - Add a non-secret rotation-evidence manifest schema and make the gate reject missing or stale evidence.
  - _Requirements: 3.5, 6.3, 6.6_

- [ ] 0.2 Freeze Search and Analytics upstream contracts
  - Export versioned OpenAPI artifacts and response fixtures for all Wave A and Wave B operations.
  - Add contract checks for ownership enforcement, pagination, caps, API versions, malformed responses, and `/api/v1/saas/search` versus `/api/v1/search` routing.
  - Generate schema-checked adapter interfaces without accepting arbitrary paths or methods.
  - _Requirements: 2.1, 2.3, 4.3, 5.1, 19.6_

- [ ] 0.3 Define executable `GrowthWorkspace` and `WorkspaceStore` contracts
  - Create versioned JSON Schemas for workspace alias, organization ID, Search client/store/index IDs, canonical store domains, Analytics project/owner IDs, time zone, currency, lifecycle, authorization version, instrumentation status/version, readiness level, missing signals, semantic/attribution/consent versions, and immutable history.
  - Add valid, stale, ambiguous, duplicate, suspended, deleting, and cross-organization fixtures that reject email-derived authorization.
  - Add persistence-interface and concurrency fixtures for atomic activation, monotonic authorization versions, and fail-closed durable-state reads.
  - _Requirements: 3.2, 3.3, 3.7, 13.1, 13.4, 15.1, 15.2, 20.2_

- [ ] 0.4 Define OAuth and approved-client compatibility contracts
  - Create fixtures for protected-resource metadata, Zitadel discovery/JWKS, canonical resource indicators, bearer challenges, PKCE S256, state/nonce, redirects, client classes, and revocation.
  - Add compatibility drivers for Kiro, Claude, Cursor, MCP Inspector, and a programmatic client without weakening policy for client-specific behavior.
  - Add negative cases for issuer/resource mismatch, redirect abuse, dynamic-registration denial, refresh-token misuse, and protocol downgrade.
  - _Requirements: 3.1, 17.1–17.8_

- [ ] 0.5 Define semantic dictionary and attribution contracts
  - Create immutable-versioned schemas for metrics, funnels, dimensions, units, formulas, identity basis, sensitivity, quality thresholds, and attribution profiles.
  - Implement contract validators for source existence, formula cycles, unit compatibility, event/field drift, minimum coverage, and exactly one active version.
  - Add fixtures proving meaning changes create a new version, missing signals disable affected metrics, and active-version resolution deterministically selects exactly one approved dictionary.
  - _Requirements: 16.1–16.5_

- [ ] 0.6 Define result, prompt, error, and lifecycle contracts
  - Create versioned JSON Schemas for `ToolResult`, `PromptResult`, instrumentation readiness, source/API versions, safe errors, prompt steps, and synthesis fields.
  - Encode the two immutable four-call weekly-review plans and the leakage prompt's `side_by_side`/`validated_join` rules.
  - Add compatibility fixtures for additive changes, concurrent majors, deprecation, unsupported versions, and rollback.
  - _Requirements: 1.3, 5.1–5.6, 9.1–9.8, 19.1–19.6, 22.1–22.4_

- [ ] 0.7 Define consent and external-provider boundary contracts
  - Create versioned consent-policy schemas for administrator identity, provider/model class, allowed tools/prompts, data categories, region, retention, and revocation.
  - Add minimization fixtures that reject direct identifiers, secrets, internal IDs, raw document bodies, user profiles, and unrelated tenant fields.
  - Add executable fallback cases proving denied consent or provider failure returns typed non-AI results without provider substitution.
  - _Requirements: 18.1–18.6_

- [ ] 0.8 Define audit, elevation, retention, and verification-link contracts
  - Create schemas for pre-access intent, linked outcomes, integrity checkpoints, retention classes, deletion tombstones, legal holds, and time-bounded operator elevation.
  - Create a closed verification-route registry and opaque-reference fixtures covering expiry, audience, authorization version, revocation, and log redaction.
  - Add negative fixtures for arbitrary URLs, internal identifiers, missing elevation reasons, payload-bearing audit events, and failed audit delivery.
  - _Requirements: 8.1–8.9, 21.1–21.5_

- [ ] 0.9 Implement the workspace-validation harness
  - Resolve recorded authoritative fixtures for organizations, subjects, Search clients/stores, Analytics projects/owners, and pipe destinations.
  - Measure Search request/query ID, anonymous/session/user ID, product ID, result position, click ID, order/purchase ID, and revenue linkage/window, plus clocks, time zone, currency, freshness, deduplication, late events, and revenue/refund/tax/shipping semantics.
  - Emit versioned `WorkspaceValidationReport` fixtures with evidence references, reviewer, expiry, missing signals, and gates for `single_product_ready`, `side_by_side_ready`, `joined_funnel_ready`, and `revenue_attribution_ready`, including negative cross-tenant canaries.
  - _Requirements: 4.3, 4.6, 15.3–15.9, 22.3_
  - _Depends on: 0.2, 0.3, 0.5_

- [ ] 0.10 Implement the aggregate preflight gate
  - Build one deterministic command that runs credential, contract, OAuth, workspace, semantic, consent, audit, and validation checks and emits a machine-readable report.
  - Fail the command on unresolved security blockers, missing authoritative fixtures, unsupported client behavior, or any capability configured above its evidence level.
  - Store only non-sensitive evidence references and version identifiers in the report.
  - _Requirements: 6.6, 15.10, 17.7, 19.6, 20.4_
  - _Depends on: 0.1–0.9_

## Phase 1 — Gateway foundation

- [ ] 1.1 Scaffold the stateless `skawr-mcp` service
  - Create the Python package, Streamable HTTP server, exact dependency pins, configuration validation, container image, and `/health/live` endpoint.
  - Register only the read-only MCP surface and reject unregistered tools, prompts, transports, protocol versions, arbitrary HTTP/SQL, CRO execution, and every mutation even when configuration is altered.
  - Add build, type-check, lint, unit-test, and SBOM commands suitable for CI.
  - _Requirements: 2.1, 6.5, 14.1–14.3, 19.1, 20.1_
  - _Depends on: 0.10_

- [ ] 1.2 Implement durable shared state and migrations
  - Add shared persistence for authorization/revocation versions, workspace versions, validation reports, semantic/attribution/consent policies, client policy, prompt runs, audit/legal holds, verification references, and revocation events.
  - Add atomic shared quota counters, cache coordination, bounded timeouts, migration locking, backup metadata, and readiness probes.
  - Add restoration and multi-instance fixtures proving restart or scale-out does not reset policy, quotas, revocation, or audit ordering.
  - _Requirements: 7.2, 8.4, 20.1–20.4_
  - _Depends on: 1.1_

- [ ] 1.3 Implement `GrowthWorkspace`, `WorkspaceStore`, and policy resolution
  - Persist immutable workspace versions and lifecycle transitions; derive request-scoped `TenantContext` from validated principal and active workspace.
  - Resolve only customer-safe aliases, enforce one-tenant Search/Analytics pairings, and return non-enumerating failures for unbound resources.
  - Increment `authorization_version` on policy changes and invalidate stale cache entries, sessions, prompt steps, and verification references across instances.
  - _Requirements: 3.2, 3.3, 3.7, 4.1, 4.2, 4.6, 13.1–13.4, 15.1, 15.2_
  - _Depends on: 1.2_

- [ ] 1.4 Implement the OAuth protected-resource boundary
  - Publish protected-resource metadata and correct `WWW-Authenticate` challenges; validate Zitadel discovery/JWKS against pinned origins.
  - Validate issuer, signature, audience/resource, time claims, subject, organization, scopes, client policy, and PKCE/redirect class where applicable.
  - Implement pre-registered user clients, separate workload clients, gated registration/revocation records, and stable protocol-version rejection.
  - _Requirements: 3.1, 3.4–3.6, 17.1–17.8_
  - _Depends on: 0.4, 1.1_

- [ ] 1.5 Implement semantic activation and workspace validation
  - Persist immutable dictionary and attribution versions; validate and atomically activate drafts with creator, approver, effective time, and checksum.
  - Implement authoritative workspace validation, periodic revalidation, expiry, canaries, threshold evaluation, and capability-specific fail-closed gates.
  - Derive the standardized instrumentation-readiness object and the highest satisfied level (`single_product_ready`, `side_by_side_ready`, `joined_funnel_ready`, or `revenue_attribution_ready`) from the active report instead of accepting caller claims.
  - _Requirements: 1.3, 15.3–15.10, 16.1–16.5, 22.3_
  - _Depends on: 0.5, 0.9, 1.3_

- [ ] 1.6 Implement results, budgets, shared cache, schema lifecycle, and audit primitives
  - Implement typed result/error envelopes with server/catalog/schema/semantic/attribution/upstream versions, freshness, truncation, instrumentation, and warnings.
  - Enforce deadlines, call/row/byte caps, atomic quotas, versioned cache keys, redaction, durable pre-access audit intent, idempotent outcomes, and orphan reconciliation.
  - Implement immutable catalog publication, preview/deprecation/sunset states, concurrent majors, payload-free version telemetry, and rollback.
  - _Requirements: 4.4, 4.5, 5.1–5.6, 7.1–7.5, 8.1, 8.2, 8.9, 19.1–19.6, 20.3_
  - _Depends on: 0.6, 0.8, 1.2_

- [ ] 1.7 Implement `skawr_get_capabilities`
  - Filter tools and prompts by scopes, workspace lifecycle, active schema versions, feature flags, upstream readiness, consent, and validation gates.
  - Return safe limits, version lifecycle, the standardized `instrumentation_readiness` object, readiness level, missing signals, validation expiry, and available analysis modes without internal topology or identifiers.
  - Add contract cases for partial and unavailable instrumentation and expired evidence.
  - _Requirements: 1.1–1.3, 2.5, 15.8–15.10, 19.4, 22.1, 22.3_
  - _Depends on: 1.3, 1.4, 1.5, 1.6_

## Phase 2 — Analytics Wave A

- [ ] 2.1 Implement the typed Analytics adapter
  - Generate or schema-check clients for summary, top-events, timeseries, funnel, retention, and revenue with per-call ownership checks and bounded parameters.
  - Strip user profiles, raw events/properties, exports, internal IDs, and unexpected response fields.
  - Map timeout, availability, authorization, and schema failures to the stable gateway error registry.
  - _Requirements: 2.1–2.5, 4.2, 4.3, 5.3, 6.4_
  - _Depends on: 0.2, 1.3, 1.6_

- [ ] 2.2 Implement the Wave A Analytics tools
  - Register the six Analytics tools with closed input/output schemas, safe aliases, required scopes, deterministic caps, and tool-specific cache/freshness policy.
  - Pin semantic definitions and instrumentation metadata in every result and preserve customer strings as inert data.
  - Keep `skawr_analytics_explore` unavailable unless its bounded upstream endpoint and stricter cost policy exist.
  - _Requirements: 2.1–2.5, 5.1, 5.2, 5.5, 5.6, 12.1–12.5, 15.9, 16.4_
  - _Depends on: 1.5, 1.7, 2.1_

- [ ] 2.3 Verify Analytics Wave A isolation and contracts
  - Add scope/resource matrices, cross-tenant denials, ownership checks, cache partitioning, revocation, cap/deadline, malformed-response, redaction, and instruction-like-data tests.
  - Verify generated client fixtures and every Analytics result schema against frozen upstream contracts.
  - Add a seeded non-production smoke command that uses synthetic principals and emits no customer payloads.
  - _Requirements: 4.1–4.5, 5.2–5.6, 6.1–6.4, 7.1–7.5_
  - _Depends on: 2.2_

## Phase 3 — Weekly growth review prompt

- [ ] 3.1 Implement the versioned `weekly-growth-review` prompt
  - Register closed arguments and immutable `analytics` and `search_enriched` plans; initially expose only `analytics` mode.
  - Execute summary, top-events, timeseries, and retention under one four-call budget with per-step reauthorization and durable prompt-run provenance.
  - Return structured observations, likely contributors, limitations, and suggested human checks with complete/partial/unavailable status and no causal claims.
  - _Requirements: 9.1, 9.4–9.8, 22.1, 22.2, 22.4_
  - _Depends on: 2.3_

- [ ] 3.2 Verify weekly prompt contracts and interpretation safety
  - Test fixed call count, scope union, alias validation, revocation between steps, partial failures, version pinning, deterministic textual fallback, and inert customer content.
  - Add schema and terminology checks that reject a `causes` field or unsupported causal wording.
  - Run the prompt against seeded non-production Analytics data and preserve source/freshness metadata.
  - _Requirements: 6.1, 9.4–9.8, 22.1, 22.2, 22.4_
  - _Depends on: 3.1_

## Phase 4 — Search Wave B

- [ ] 4.1 Implement the typed Search adapter
  - Generate or schema-check store-list, store-bound query, and search-performance clients with upstream ownership checks and no marketplace-index fallback.
  - Sanitize documents and analytics fields to exclude embeddings, hidden ranking features, response snapshots, internal index names, and unnecessary document bodies.
  - Add purpose-built internal read endpoints where existing management routes cannot prove store-bound authorization.
  - _Requirements: 2.1–2.5, 4.2, 4.3, 6.4_
  - _Depends on: 0.2, 2.3_

- [ ] 4.2 Implement the Wave B Search tools and enriched weekly mode
  - Register `skawr_list_stores`, `skawr_search_query`, and `skawr_get_search_performance` with closed schemas, scopes, caps, aliases, and cache policies.
  - Enable `search_enriched` weekly review only when Search readiness passes; use summary, timeseries, retention, and search performance as the fixed four-call plan.
  - Return single-source or side-by-side metadata without implying user-level joins.
  - _Requirements: 1.3, 2.1–2.5, 9.1, 9.5, 11.5, 15.8, 15.9, 22.1_
  - _Depends on: 3.2, 4.1_

- [ ] 4.3 Verify Search Wave B isolation and contracts
  - Test store alias confinement, public-marketplace exclusion, cross-tenant denial, upstream ownership, cache partitioning, revocation, redaction, budgets, and malformed responses.
  - Verify Search-enriched weekly review never exceeds four calls and does not expose joined language.
  - Add seeded non-production smoke coverage for all Wave B tools.
  - _Requirements: 4.1–4.6, 5.1–5.6, 6.1–6.4, 7.1–7.5, 9.5_
  - _Depends on: 4.2_

## Phase 5 — Search-to-Analytics identity and attribution readiness

- [ ] 5.1 Thread analytics identity through `skawr-search`
  - Add bounded optional `anonymous_id` and `session_id` request fields or headers and propagate them with authenticated `user_id` through search execution, query logging, and event piping.
  - Stamp identity on `search_performed` and `search_no_results` while preserving the feature flag and non-blocking search behavior.
  - Add backend tests for missing, anonymous, session, authenticated, and malformed identity inputs.
  - _Requirements: 11.1, 11.2_
  - _Depends on: 4.3_

- [ ] 5.2 Propagate identity from supported storefront clients
  - Update the selected Search SDK/widget/theme integrations to read the Analytics SDK's anonymous/session identifiers and include them on each Search request.
  - Preserve backward compatibility when Analytics is unavailable and prevent identities from crossing store or browser boundaries.
  - Add integration fixtures proving browser identity reaches the Search request without exposing it in logs.
  - _Requirements: 6.3, 11.3_
  - _Depends on: 5.1_

- [ ] 5.3 Enforce tenant-safe event-pipe destinations
  - Resolve pipe destinations from the active workspace binding and reject any `client_id`/project pairing outside one organization.
  - Scope ingest credentials per service/workspace where supported; remove static cross-tenant destination selection from request paths.
  - Add negative canaries proving tenant A events cannot be written to tenant B projects.
  - _Requirements: 3.5, 4.6, 11.4, 15.4_
  - _Depends on: 1.3, 5.1_

- [ ] 5.4 Activate runtime instrumentation and attribution validation
  - Compute identity coverage and join rate; validate clocks, timezone, currency, bot policy, freshness, semantic mappings, attribution window, revenue handling, deduplication, and late events.
  - Persist expiring validation reports and calculate the highest satisfied readiness level: `single_product_ready`, `side_by_side_ready`, `joined_funnel_ready`, or `revenue_attribution_ready`; callers cannot override it.
  - Revalidate after binding, identity, instrumentation, semantic, attribution, or consent changes and lower readiness immediately on failure or expiry.
  - _Requirements: 15.3–15.10, 16.5, 22.1, 22.3_
  - _Depends on: 1.5, 5.2, 5.3_

- [ ] 5.5 Verify cross-product join integrity
  - Property-test client/project combinations, normalized aliases, cache keys, destination routing, stale reports, threshold boundaries, and concurrent authorization-version changes.
  - Prove identity fields alone cannot reach `joined_funnel_ready` or enable `validated_join`, incomplete click/order/revenue linkage cannot reach `revenue_attribution_ready`, and tenant A events cannot land in or be read from tenant B projects.
  - Verify missing `result_clicked` appears as an instrumentation limitation and prevents CTR and revenue-attribution claims while leaving eligible non-click joined funnels available.
  - _Requirements: 4.4–4.6, 11.4–11.6, 15.5, 15.8–15.10, 22.1, 22.3_
  - _Depends on: 5.4_

## Phase 6 — Search-to-revenue prompt

- [ ] 6.1 Implement `diagnose-search-to-revenue-leakage`
  - Register the versioned prompt with safe workspace/store/project aliases, bounded period, and approved dictionary funnel key.
  - Compose Search performance, dictionary-defined funnel when allowed, and revenue under one fixed plan with per-step authorization and provenance.
  - Default to `side_by_side`; emit `validated_join` only at `joined_funnel_ready` or above, and permit revenue-attribution interpretation only at `revenue_attribution_ready`; structure output as observations, likely contributors, limitations, and human checks.
  - _Requirements: 9.2–9.8, 15.8–15.10, 16.4, 22.1–22.4_
  - _Depends on: 3.2, 4.3, 1.5_

- [ ] 6.2 Verify leakage-prompt gating and causal safety
  - Test required `side_by_side` behavior before identity readiness and add `validated_join` cases only when task 5.5 supplies passing coverage, attribution, semantic, freshness, and aligned-window fixtures.
  - Test report expiry, revocation between steps, partial sources, sample-size limitations, missing click signals, and no autonomous remediation.
  - Add adversarial schema/wording cases and a seeded non-production side-by-side end-to-end test; conditionally add the joined end-to-end test after task 5.5.
  - _Requirements: 9.3–9.8, 11.5, 15.8–15.10, 22.1–22.4_
  - _Depends on: 6.1; 5.5 only for validated_join cases_

- [ ]* 6.3 Implement the bounded Analytics Explore endpoint
  - Add `GET /api/v1/analytics/explore` with one approved metric, optional event filter, supported period, one breakdown, at most five equality filters, optional day granularity, and capped rows.
  - Restrict dimensions to approved indexed columns plus `prop:<key>`; apply tighter period/row budgets and `unindexed_breakdown` warnings to property dimensions.
  - Use the identity ladder for user/session metrics and repeat ordinary Analytics project-ownership checks.
  - _Requirements: 12.1–12.4_
  - _Depends on: 0.2, 4.3_

- [ ]* 6.4 Implement and readiness-gate `skawr_analytics_explore`
  - Register a closed versioned tool schema over task 6.3 with the strict Explore cost class, shared quotas, response caps, provenance, warnings, audit, and safe verification links.
  - Hide the tool from capabilities until the target-environment endpoint contract and readiness probe pass; fail closed on schema drift or unindexed-budget exhaustion.
  - Add indexed/property breakdown, filter-count, ownership, quota, timeout, truncation, and unavailable-prerequisite tests.
  - _Requirements: 2.5, 5.6, 7.2, 12.3, 12.5, 19.4, 19.6_
  - _Depends on: 1.7, 2.1, 6.3_

## Phase 7 — Safe dashboard verification

- [ ] 7.1 Implement the verification-reference service
  - Build links only from a closed server route registry and normalized safe filters; store opaque, audience-bound, single-purpose references with ten-minute default expiry.
  - Exclude organization, principal, client, project, store, upstream request, token, host, path, and redirect values from customer-visible URLs and logs.
  - Invalidate references on workspace authorization changes and attach links only to supported bounded result views.
  - _Requirements: 4.5, 21.1–21.5_
  - _Depends on: 1.3, 1.6, 2.3_

- [ ] 7.2 Implement dashboard verification resolvers
  - Add authenticated resolver routes in Analytics and Search dashboards for allowlisted view kinds.
  - Resolve references server-side, repeat workspace and authorization-version checks, and render only normalized allowlisted filters.
  - Return one non-enumerating response for malformed, expired, revoked, replayed, or unauthorized references.
  - _Requirements: 4.1, 21.2–21.5_
  - _Depends on: 7.1_

- [ ] 7.3 Verify link isolation and redirect safety
  - Test expiry, tampering, audience mismatch, revocation, cross-tenant access, log redaction, route confusion, and arbitrary URL/return-target rejection.
  - Verify links remain navigation rather than authorization and require ordinary dashboard authentication.
  - Property-test normalized filters and opaque references for identifier leakage.
  - _Requirements: 4.5, 21.1–21.5_
  - _Depends on: 7.2_

## Phase 8 — Customer AI-provider boundary

- [ ] 8.1 Implement versioned consent and typed non-AI fallback
  - Persist administrator-attributable consent versions and enforce allowed provider/model class, tools/prompts, fields, region, retention, and expiry.
  - Keep server-side AI disabled by default; return deterministic typed results when consent is absent, denied, expired, or revoked.
  - Increment policy/authorization versions and block new provider calls immediately after scope or provider changes.
  - _Requirements: 18.1–18.6, 20.2_
  - _Depends on: 0.7, 1.2_

- [ ] 8.2 Implement the minimized provider adapter boundary
  - Build an allowlisted field projector, isolated credential interface, strict request/response schemas, deadlines, quotas, and audit disclosure class without enabling an unapproved provider.
  - Reject direct identifiers, secrets, raw document bodies, internal IDs, user profiles, and fields outside consent.
  - Add provider outage, deletion-request, legal-hold, credential-isolation, and no-fallback-provider tests.
  - _Requirements: 6.3, 7.1–7.4, 8.2, 18.3–18.6_
  - _Depends on: 1.6, 8.1_

## Phase 9 — Audit, resilience, compatibility, and release

- [ ] 9.1 Implement audit integrity, retention, deletion, legal holds, and elevation
  - Persist append-only intent/outcome streams with hash chaining and signed checkpoints in a separately controlled integrity store.
  - Implement configurable retention classes, deletion tombstones, backup expiry, scoped legal holds, and customer-reference de-identification.
  - Implement reason/ticket/workspace-scoped operator elevation with approval, maximum lease, immediate revocation, alerts, and start/use/end events.
  - _Requirements: 8.1–8.9, 20.2–20.4_
  - _Depends on: 1.2, 1.6_

- [ ] 9.2 Implement payload-free observability and readiness
  - Add low-cardinality metrics and traces for tools, prompt steps, versions, latency, errors, denials, quotas, cache, upstreams, audit integrity, redaction, consent, links, and join readiness.
  - Implement `/health/ready` and protected `/health/dependencies` checks for workspace, revocation, quota, audit-intent, cache, and version stores.
  - Add automated alerts without customer identifiers, query values, tokens, result bodies, provider prompts, or verification references.
  - _Requirements: 6.3, 7.6, 8.2, 8.3, 20.4_
  - _Depends on: 1.6, 9.1_

- [ ] 9.3 Verify multi-instance failure and recovery behavior
  - Run concurrent-instance tests for equivalent authorization, atomic quotas, cache isolation, revocation propagation, prompt budgets, audit ordering, and migration compatibility.
  - Exercise process loss after audit intent, orphan reconciliation, shared-store timeout, backup restore, rolling deployment, and catalog rollback.
  - Prove instances become unready and authorization fails closed whenever shared policy guarantees cannot be preserved.
  - _Requirements: 8.9, 19.6, 20.1–20.4_
  - _Depends on: 7.3, 8.2, 9.2_

- [ ] 9.4 Run the MCP interoperability and adversarial suite
  - Test approved Kiro, Claude, Cursor, MCP Inspector, and programmatic-client fixtures across discovery, PKCE, resource indicators, redirects, bearer challenges, prompts, structured/text results, and protocol versions.
  - Exercise confused-deputy, cross-tenant, prompt-injection, cache, redaction, verification-link, operator, consent, audit-integrity, and causal-language attacks.
  - Fail on critical/high findings and emit a payload-free compatibility report pinned to protocol, catalog, and client fixture versions.
  - _Requirements: 4.1–4.6, 6.1–6.6, 17.7, 17.8, 19.6, 22.2–22.4_
  - _Depends on: 6.2, 9.3_

- [ ] 9.5 Generate customer-safe trust and provider-boundary documentation
  - Generate the tool/scope matrix, read-only guarantee, versions, limits, freshness, instrumentation states, revocation objective, retention summary, tenant-isolation model, and known limitations from executable contracts.
  - Generate diagrams explaining Skawr, MCP-client, customer-provider, and optional Skawr-subprocessor data boundaries, consent, retention/training, and deletion behavior.
  - Add copy checks that reject absolute security claims, causal claims, internal topology, IdP/admin details, and examples lacking synthetic/cached/partial labels.
  - _Requirements: 10.1–10.4, 18.2, 22.4_
  - _Depends on: 8.2, 9.4_

- [ ] 9.6 Implement pilot and GA release gates
  - Add feature-flagged organization allowlists, low shared quotas, rapid revocation controls, immutable production version pins, and automated rollback checks.
  - Build a release command that runs preflight, Wave A/B, prompt, join, audit, restore, interoperability, generated-doc, and observability acceptance checks.
  - Refuse joined mode, optional provider synthesis, preview schemas, or GA when their specific evidence and consent gates are absent or expired.
  - _Requirements: 1.3, 7.1–7.6, 8.3, 15.8–15.10, 18.3, 19.4–19.6, 22.3_
  - _Depends on: 9.5_

## First Implementable Slice

After task 0.10 passes, implement tasks 1.1–1.7, then 2.1–2.2. This produces a stateless authenticated gateway with durable `GrowthWorkspace` resolution, shared authorization/quota/cache state, readiness propagation, schema lifecycle, durable audit intent, capability discovery, and the six tenant-isolated Analytics Wave A tools. Complete 2.3 before any Search implementation begins.

Next, deliver the Analytics-only weekly review through 3.1–3.2, then Search Wave B through 4.1–4.3. The leakage prompt may ship in explicit `side_by_side` mode through 6.1–6.2; `validated_join` remains unavailable until 5.1–5.5 pass. Explore remains hidden unless conditional tasks 6.3–6.4 are implemented and ready. This slice includes no CRO, mutation, provisioning, export, ingestion, `result_clicked`, or autonomous-remediation surface.

## Notes

- Tasks intentionally encode policy and operational decisions as schemas, fixtures, validators, generated artifacts, or automated gates rather than manual approval work.
- Bounded Analytics Explore remains optional and cannot appear in capabilities unless tasks 6.3–6.4 and their target-environment readiness probe pass; `result_clicked`, CRO execution, mutations, and native Analytics organization ownership require separate follow-up work.
- The spec is complete when diagnostics pass; implementation can then proceed in dependency order from this file.
