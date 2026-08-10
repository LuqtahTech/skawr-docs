# Requirements Document

## Introduction

Skawr Growth MCP is a hosted, authenticated Model Context Protocol server that gives customers and approved operators one safe, tenant-isolated interface to read their **Search SaaS** and **Product Analytics** data. It differentiates Skawr not by "having an MCP" (competitors already do) but by exposing a **connected** surface — search behavior and product behavior through one auditable interface, backed by an analytics platform that already computes funnels, retention, revenue, and anomaly/segment insights.

The first release is read-only. CRO audits and all mutations remain out of scope until durable execution, principal quotas, confirmation, and idempotency controls exist.

## Grounded Facts (verified against source, 2026-07-18)

These facts, verified in code, constrain the requirements:

- **Analytics is fully built and live** (`analytics.skawr.com`): summary, top-events, timeseries, funnel, retention, cohort, revenue, attribution, paths, stickiness, lifecycle, plus an insight engine (z-score anomaly, funnel-drop, segment drivers) and saved dashboards. It is not "coming soon."
- **Analytics querying is parameterized, not freeform.** There is no general metric × breakdown × property-filter endpoint today.
- **A search→analytics event pipe exists** in `skawr-search` (`analytics_pipe.py`), feature-flagged and off by default, emitting `search_performed` / `search_no_results` — but **without identity** and **without click events**, so search events cannot currently be stitched into per-user funnels.
- **The analytics batch ingest endpoint** (`/api/v1/ingest/batch`) already accepts `user_id`/`anonymous_id`/`session_id`.
- **Tenancy mismatch:** Search authorizes by `client_id`; Analytics authorizes by `user_id` and has **no organization concept**; the two are linked today by **email + a static service token**.
- **Confirmed security issue:** hardcoded credential fallbacks exist in `skawr-web/lib/supabase.ts` and `skawr-web/lib/skawr-client-simple.ts`.

## Audience & Sequencing

The SMB merchant personas Skawr targets (solo founders, retailers going online) are largely **not** MCP-client users. The natural first audience is the more technical analytics user. Therefore the required build order is:

1. **Analytics-first tools** (map onto already-built endpoints) — Wave A.
2. **Search tools** — Wave B.
3. **Combined search→revenue** synthesis and freeform `explore` — Wave C, each gated on a specific upstream prerequisite (identity join; explore endpoint).

This ordering is a requirement, not a suggestion: Wave C tools SHALL NOT ship before their prerequisites land.

## Product Positioning

**Defensible claim:** "Connect your AI assistant to your Skawr search and product-analytics data through a tenant-isolated, auditable, read-only MCP interface."

Skawr SHALL NOT claim MCP itself proves system quality, nor use "first/only/unbreakable/zero-risk" language. Public claims MUST be supported by published tool contracts, scope descriptions, freshness metadata, audit behavior, and security documentation. Internal architecture, admin surfaces, IdP details, secrets, and customer identifiers SHALL NOT be exposed as marketing proof.

## Glossary

- **MCP_Gateway**: the standalone hosted MCP resource server.
- **Principal**: a human or workload represented by a validated Zitadel access token.
- **Growth_Workspace**: the durable, server-managed unit linking one Zitadel organization to a customer-safe workspace alias, approved Search clients/stores/indexes and store domains, Analytics projects, time zone, currency, semantic definitions, instrumentation readiness, attribution assumptions, consent, and authorization state.
- **Workspace_Store**: the shared durable store for Growth_Workspace records, validation evidence, and immutable version history.
- **Tenant_Context**: a request-scoped, server-resolved projection from a Principal and active Growth_Workspace to allowed Search stores and Analytics projects.
- **Readiness_Level**: the highest evidence-backed cross-product capability available to a workspace: `single_product_ready`, `side_by_side_ready`, `joined_funnel_ready`, or `revenue_attribution_ready`.
- **Workspace_Validation_Report**: versioned evidence that linked identifiers, ownership, identity coverage, attribution assumptions, and cross-tenant controls were validated.
- **Semantic_Metric_Dictionary**: the immutable-versioned per-workspace definitions for metrics, funnels, dimensions, units, identity basis, and quality thresholds.
- **Store**: a customer Search SaaS index (`SearchIndex`).
- **Project**: a customer Analytics project (`Project`, owned by a `User` until Analytics becomes organization-aware).
- **Adapter**: a typed client for one upstream Skawr service.
- **Tool_Result**: the stable structured envelope returned by every tool.
- **Prompt_Result**: a versioned, bounded composition result produced by a registered MCP prompt using only authorized typed tools.
- **Read_Only**: an operation that cannot create, update, delete, ingest, provision, export, or trigger paid/long-running work.
- **Execution_Budget**: per-call limits for time, upstream requests, rows, and response bytes.
- **Identity_Join**: attaching the storefront analytics `anonymous_id`/`session_id` to piped search events so they share the analytics identity ladder.

## Actors

1. **Customer user** — accesses only resources bound to their organization.
2. **Customer workload** — optional machine identity with narrower scopes.
3. **Skawr operator** — support access via a separate, audited role; never implicit.
4. **MCP client** — an untrusted caller acting for the Principal.
5. **Upstream service** — Search API or Analytics API, each remaining its system of record.

## Scope

Capability discovery plus read-only Search and Analytics tools, delivered in waves. Two demonstration workflows: weekly growth health (available now) and search-to-revenue leakage (gated on the Identity_Join). No autonomous actions, no generic access to arbitrary upstream endpoints.

## Non-Goals

- Direct database or OpenSearch access.
- Generic HTTP-fetch, SQL, export, event-ingestion, provisioning, billing, API-key, admin, or IdP tools.
- Index/document creation, update, or deletion.
- User-level analytics profiles (`/analytics/user/{id}`) on the customer surface.
- Cross-tenant benchmarking unless aggregated, de-identified, and separately approved.
- CRO audit execution in the MVP.
- Replacing Search or Analytics authorization with gateway-only checks.

## Requirements

## Requirement 1 — Stable Capability Discovery

1. WHEN an authenticated Principal calls `skawr_get_capabilities`, the MCP_Gateway SHALL return protocol version, server version, enabled tools, required scopes, resource types, limits, and known upstream availability.
2. The response SHALL contain no tenant identifiers, credentials, internal hostnames, or admin-only details.
3. Tool availability SHALL be computed from Principal scopes, Tenant_Context bindings, feature flags, AND the readiness of each tool's upstream prerequisite (e.g. Wave C tools appear only when their dependency is live).
4. Capability discovery SHALL include the Requirement 15.9 `instrumentation_readiness` object plus active semantic-dictionary and attribution-profile versions. The `readiness_level` SHALL use only `single_product_ready`, `side_by_side_ready`, `joined_funnel_ready`, or `revenue_attribution_ready`; missing or expired evidence SHALL remove the affected capability rather than merely lower confidence.

## Requirement 2 — Read-Only MVP Tools (delivered in waves)

The MCP_Gateway SHALL expose these tools and no others in the MVP:

**Wave A — Analytics-first**

| Tool | Scope | Purpose |
|---|---|---|
| `skawr_get_capabilities` | `mcp:connect` | Discover safe capabilities and limits |
| `skawr_analytics_summary` | `analytics:read` | Events, users, sessions, period deltas |
| `skawr_analytics_top_events` | `analytics:read` | Ranked event activity |
| `skawr_analytics_timeseries` | `analytics:read` | Bounded daily event counts |
| `skawr_analytics_funnel` | `analytics:read` | Ordered funnel conversion |
| `skawr_analytics_retention` | `analytics:read` | Bounded retention cohorts |
| `skawr_analytics_revenue` | `analytics:revenue:read` | Revenue aggregates in SAR |

**Wave B — Search**

| Tool | Scope | Purpose |
|---|---|---|
| `skawr_list_stores` | `search:read` | List bound stores with safe summary fields |
| `skawr_search_query` | `search:query` | Query one bound customer store |
| `skawr_get_search_performance` | `search:analytics:read` | Volume, latency, top and zero-result queries |

**Wave C — Conditional**

| Tool | Scope | Gated on |
|---|---|---|
| `skawr_analytics_explore` | `analytics:read` | The general `/analytics/explore` endpoint (Req 12) |

1. Every tool SHALL use a closed input schema with bounded strings, arrays, periods, limits, and result counts.
2. Resource arguments SHALL be aliases or opaque IDs resolved against Tenant_Context; they SHALL NOT establish ownership.
3. Search SHALL be explicitly customer-store search, not the public marketplace aggregator.
4. Periods SHALL be restricted to upstream-supported values (`24h`, `7d`, `30d`, `90d`) unless a contract is intentionally extended.
5. A Wave C tool SHALL NOT be enabled until its named prerequisite is live in the target environment.

## Requirement 3 — Authentication, Authorization, and Tenancy Binding

1. The MCP_Gateway SHALL validate issuer, audience/resource, signature, expiry, not-before, and required scopes on every request.
2. The MCP_Gateway SHALL use Zitadel subject and organization identifiers as identity inputs; email SHALL NOT be an authorization key.
3. The MCP_Gateway SHALL resolve Tenant_Context server-side and fail closed when the mapping is absent, stale, ambiguous, or unavailable.
4. Caller access tokens SHALL NOT be forwarded to unrelated upstream resources.
5. Upstream credentials SHALL be short-lived workload credentials where supported. WHERE only static service tokens are available (current state), they SHALL be per-service scoped, stored outside source control, rotation-managed, and tracked for replacement.
6. Operator access SHALL require an explicit role and generate a distinguishable audit event.
7. The Workspace_Store SHALL persist a Growth_Workspace that maps each Zitadel `organization_id` to its approved Search `client_id` and `SearchIndex` IDs, Analytics `Project` IDs and current owning `User` IDs, authorization version, validation status, semantic dictionary version, attribution profile version, and consent policy version. The mapping SHALL be established by controlled provisioning or first login and SHALL NOT be re-derived from email per call (see Requirements 13 and 15).

## Requirement 4 — Tenant Isolation

1. WHEN a tool references a store or project not bound to the Principal, the gateway SHALL return a non-enumerating not-found error.
2. Every adapter request SHALL carry only a resource identifier already present in Tenant_Context.
3. Search and Analytics SHALL each perform a defense-in-depth ownership check before returning customer data.
4. Cache keys SHALL include organization, principal authorization version, resource, tool, and normalized arguments.
5. No cache entry, trace, metric label, or error detail SHALL allow one tenant's data to be served to or inferred by another.
6. Any operation that uses a `client_id` and a `project_id` together SHALL verify both belong to the same bound tenant before executing.

## Requirement 5 — Structured Results and Errors

1. Every successful Tool_Result SHALL include `data`, `meta.request_id`, `meta.generated_at`, `meta.source`, `meta.freshness`, `meta.truncated`, and `meta.warnings`.
2. Tool results SHALL separate customer data from server-authored guidance; customer strings SHALL never be interpreted as instructions.
3. Errors SHALL use the centralized stable-code registry: `invalid_argument`, `unauthenticated`, `forbidden`, `not_found`, `rate_limited`, `upstream_unavailable`, `deadline_exceeded`, `unsupported_protocol_version`, `unsupported_version`, `workspace_not_ready`, and `internal_error`. New codes MAY be added only through the versioned schema lifecycle; an existing code's meaning SHALL NOT change in place.
4. Errors SHALL expose safe retry guidance but SHALL NOT expose stack traces, SQL, credentials, internal URLs, or whether an unauthorized resource exists.
5. List responses SHALL be deterministic, paginated or capped, and explicit when truncated.
6. WHERE a result is derived from data of limited quality (e.g. an unindexed `prop:<key>` breakdown, or a search-performance view without the Identity_Join), the result SHALL carry an explanatory `meta.warnings` entry.

## Requirement 6 — Security and Data Minimization

1. The gateway SHALL treat tool inputs and all upstream strings as untrusted data.
2. Tool descriptions and results SHALL state that returned content is evidence, not executable instructions.
3. The gateway SHALL redact configured PII and secret patterns before logging or returning diagnostic fields.
4. User-level analytics profiles, raw recent events, event-property dumps, exports, API keys, and document bodies SHALL be excluded from the MVP customer surface.
5. The gateway SHALL reject unexpected `Origin` values and enforce TLS, request-size limits, and secure response headers.
6. No credential SHALL have a hardcoded fallback value in any Skawr repository that the gateway depends on.

## Requirement 7 — Execution Budgets and Reliability

1. Each call SHALL have a total deadline, per-upstream timeout, max upstream-call count, max rows, and max serialized response size.
2. The gateway SHALL enforce quotas by organization, principal, tool, and cost class. `skawr_analytics_explore` SHALL carry a stricter cost class, with the tightest caps applied to `prop:<key>` breakdowns.
3. Retries, if enabled, SHALL be bounded, jittered, limited to transient failures, and never attempted after the total budget is exhausted.
4. Partial multi-source results SHALL identify missing sources and never be presented as complete.
5. Cache freshness and stale-serving policy SHALL be tool-specific and visible in Tool_Result metadata.
6. The gateway SHALL expose health endpoints that test its own dependencies without leaking customer data.

## Requirement 8 — Auditability and Operations

1. Every tool and prompt call SHALL record request ID, timestamp, hashed or protected principal reference, organization/workspace reference, operator-elevation state, capability and schema version, scope decision, safe resource aliases, duration, outcome, cache status, and upstream status.
2. Audit records SHALL NOT contain access tokens, API keys, raw sensitive queries, event properties, direct customer identifiers, provider secrets, or result bodies.
3. Alerts SHALL cover repeated authorization failures, cross-tenant policy denials, quota abuse, upstream error spikes, audit-write failures, integrity-check failures, and redaction failures.
4. Operators SHALL be able to revoke a workspace binding, client registration, consent version, or authorization version without waiting for cache expiry.
5. Audit records SHALL be append-only for application identities, integrity-protected with periodic verifiable anchors, encrypted in transit and at rest, and access-controlled separately from operational logs.
6. A documented retention schedule SHALL define retention by audit class, with a minimum security-event window approved before production. Expiry SHALL use auditable deletion; legal holds SHALL suspend deletion without silently changing the original retention metadata.
7. Customer deletion SHALL remove or irreversibly de-identify eligible audit references within a published objective while preserving only records required by law, fraud prevention, security incident response, or an active legal hold.
8. Operator elevation SHALL require a separate role, explicit reason and ticket/reference, least-privilege workspace scope, short expiry, no implicit renewal, and a distinguishable start/use/end audit trail. Emergency access SHALL receive retrospective review.
9. The gateway SHALL fail closed for authorization and operator elevation when required durable policy state is unavailable. Audit-delivery failure SHALL block elevated operations and SHALL either block or durably queue customer reads according to an approved lossless policy.

## Requirement 9 — MCP Prompts and Demonstration Workflows

1. The server SHALL publish the versioned MCP prompt `weekly-growth-review`, accepting only customer-safe workspace/project/store aliases, a bounded period, and a closed `review_mode`. `analytics` mode SHALL compose summary, top-events, timeseries, and retention. `search_enriched` mode SHALL replace top-events with Search performance so either plan remains within four upstream calls. No mode SHALL silently omit or add a step.
2. The server SHALL publish the versioned MCP prompt `diagnose-search-to-revenue-leakage`, accepting only customer-safe workspace/store/project aliases, a bounded period, and an approved semantic funnel key. It SHALL compose Search performance, Analytics funnel when join-valid, and revenue tools.
3. `diagnose-search-to-revenue-leakage` SHALL run in `side_by_side` mode unless the active Workspace_Validation_Report proves at least `joined_funnel_ready`. Revenue-attribution interpretation SHALL require `revenue_attribution_ready`; otherwise revenue SHALL remain a side-by-side observation. Side-by-side output SHALL explicitly state that records were not user-joined.
4. Every Prompt_Result SHALL pin prompt, tool, schema, Growth_Workspace authorization, Semantic_Metric_Dictionary, and attribution-profile versions; list step request IDs, source/freshness, warnings, skipped or failed steps; and mark completion as `complete`, `partial`, or `unavailable`.
5. Prompt execution SHALL repeat ordinary scope, alias, quota, budget, and authorization-version checks for every step, use no arbitrary URLs or unregistered tools, make at most four upstream calls, and perform no unbounded model/tool recursion.
6. Weekly growth review and leakage diagnosis SHALL report observations, **likely contributors**, associations, and correlations for human investigation. They SHALL NOT claim that observational cross-product findings prove causation, and SHALL NOT imply or perform autonomous remediation.
7. Demonstrations SHALL use seeded or explicitly authorized tenant data, identify cached, partial, unavailable, or synthetic data, and expose the same source/freshness and limitation metadata as production results.
8. Clients that do not support MCP prompts MAY invoke the same typed tools manually but SHALL NOT receive a weaker authorization, schema, provenance, or warning path.

## Requirement 10 — Marketing and Trust

1. Public docs SHALL publish the tool list, scope matrix, read-only guarantee, data-retention summary, and tenant-isolation model at a customer-safe level.
2. Public demonstrations SHALL identify cached, partial, unavailable, or synthetic data.
3. Claims SHALL avoid "unbreakable," "fully secure," "zero risk," and other absolute language.
4. IdP configuration, admin endpoints, internal topology, and exploit-relevant controls SHALL remain private.

## Requirement 11 — Search→Analytics Identity Join (prerequisite for combined story)

1. The search backend SHALL be able to attach the storefront analytics `anonymous_id` (and where available `session_id` and authenticated `user_id`) to piped `search_performed` / `search_no_results` events, behind the existing feature flag.
2. The identity SHALL be threaded from the search request through `execute_search → log_search_query → pipe_search_event` and stamped on every piped event.
3. The storefront search surface (widget/theme/extension/SDK) SHALL send the analytics `anonymous_id` on each search call so anonymous shoppers can be joined.
4. Piped search events SHALL be written only to the analytics project bound to the same tenant as the search `client_id`.
5. WHERE the Identity_Join is not yet live, search-derived funnel steps SHALL NOT be presented as user-joined.
6. `result_clicked` capture (for CTR / low-CTR analysis) MAY be added later and is not required for the MVP.

## Requirement 12 — General Explore Endpoint (prerequisite for `skawr_analytics_explore`)

1. IF freeform querying is in scope, the analytics backend SHALL provide a bounded `GET /api/v1/analytics/explore` supporting: one metric (`event_count` | `unique_users` | `unique_sessions`), optional event-name filter, a period, an optional single breakdown dimension, optional equality filters, and an optional `day` granularity.
2. Breakdown/filter dimensions SHALL be limited to first-class indexed columns plus `prop:<key>` over the `properties` JSONB.
3. `prop:<key>` breakdowns SHALL be capped harder in rows and time range and flagged in `meta.warnings` as unindexed.
4. The endpoint SHALL enforce the same project-ownership check as every other analytics read.
5. `skawr_analytics_explore` SHALL NOT be enabled until this endpoint is live.

## Requirement 13 — Tenancy Bridge and Migration

1. The MVP SHALL authorize via the active Growth_Workspace in the Workspace_Store (org→Search client/stores + Analytics user/projects), NOT via email and NOT via possession of a static service token.
2. Email-based entitlement SHALL be treated as a billing/entitlement check only, never as MCP authorization.
3. A migration path toward native organization-awareness in the Analytics data model SHALL be documented so the user/project bridge can be retired without changing public workspace, store, or project aliases.
4. Any migration SHALL preserve immutable validation and audit history, increment `authorization_version`, invalidate shared caches, and fail closed until the replacement bindings pass Phase 0 validation.

## Requirement 14 — Deferred CRO and Mutations

1. CRO audit tools MAY be added only after scans have durable job state, principal-aware quotas, SSRF regression validation, bounded fetches, and clear cost controls. The free CRO audit remains a hypothesis-generation aid for humans, not an MCP data source, in the MVP.
2. Any mutation SHALL require a separate spec defining confirmation, idempotency, authorization, rollback, and human-visible audit behavior.
3. API-key management, billing, provisioning, ingestion, exports, index/document mutation, and admin tools SHALL NOT be enabled by configuration alone.

## Requirement 15 — Growth Workspace, Instrumentation, and Phase 0 Validation

1. The MCP_Gateway SHALL use a durable, server-managed Growth_Workspace as the authoritative connected-analysis unit. Each immutable workspace version SHALL contain a stable customer-safe workspace alias; Zitadel organization ID; approved Search client IDs, store aliases, Search store/index IDs, and canonical store domains; approved Analytics project IDs and current owner IDs; time zone; currency; authorization version; instrumentation status and version; active Semantic_Metric_Dictionary version; attribution-profile and consent-policy versions; current readiness level; and stable missing-signal keys.
2. The Workspace_Store SHALL preserve immutable version history and lifecycle states `provisioning`, `active`, `suspended`, and `deleting`; no process-local record SHALL be authoritative for authorization, readiness, or composition.
3. Before activation and after any binding, identity, domain, time-zone, currency, instrumentation, semantic, attribution, or consent change, a Phase 0 validator SHALL resolve every organization, subject, Search client/store/index, Analytics project/owner, store domain, and event-pipe destination through authoritative service APIs.
4. Validation SHALL reject absent, stale, duplicate, ambiguous, or cross-organization identifiers and SHALL verify least-privilege test reads and negative cross-tenant access.
5. Attribution feasibility validation SHALL explicitly measure the availability, propagation, uniqueness, tenant confinement, coverage, and join quality of Search request/query ID; `anonymous_id`, `session_id`, and `user_id`; product ID; result position; click ID; order/purchase ID; revenue amount/currency linkage; and the configured attribution window. Missing signals SHALL remain explicit and SHALL NOT be inferred from unrelated fields; missing click instrumentation SHALL remain visible while `result_clicked` is deferred.
6. Validation SHALL also align clocks, time zone, currency, bot/internal-traffic policy, event names, freshness, and semantic mappings; and record attribution model/window, revenue event/value, refund/tax/shipping handling, deduplication, and late-event policy.
7. Validation SHALL emit a versioned Workspace_Validation_Report with check outcomes, non-sensitive evidence references, reviewer, approval time, expiry, instrumentation version, available and missing signals, measured coverage, quality thresholds, readiness calculation, and capability gates.
8. Readiness SHALL be derived only from current evidence, never caller input: `single_product_ready` requires one validated product binding and semantic definitions; `side_by_side_ready` requires independently validated Search and Analytics bindings with aligned time zone, currency, periods, and semantic definitions but no record-level join; `joined_funnel_ready` additionally requires a tenant-safe identity path and product/result-position propagation meeting approved join-coverage thresholds; `revenue_attribution_ready` additionally requires deterministic click/order/revenue linkage, a valid attribution window, deduplication, and revenue-quality thresholds. A workspace MAY remain usable at a lower level when a higher level fails.
9. Capability discovery and every cross-product Tool_Result and Prompt_Result SHALL include the same standardized `instrumentation_readiness` object: instrumentation status/version, readiness level, validation-report version and expiry, measured coverage, available signals, missing signals, failed thresholds, and permitted analysis modes. Customer-visible fields SHALL contain only aliases and non-sensitive evidence.
10. Failed, missing, expired, or out-of-tolerance evidence SHALL immediately recalculate readiness downward, invalidate dependent prompt plans and shared cache entries, and fail only the affected capabilities closed.

## Requirement 16 — Semantic Metric Dictionary

1. Every Growth_Workspace SHALL own an immutable-versioned Semantic_Metric_Dictionary with exactly one approved active version.
2. The dictionary SHALL define stable metric keys, display names, descriptions, source, unit, aggregation/formula, source events/fields, identity basis, closed filters, quality rules, minimum coverage, funnel steps/windows, dimensions and sensitivity, and applicable attribution-profile version.
3. Draft activation SHALL validate source fields/events, units, formulas, formula cycles, identity basis, attribution compatibility, and quality thresholds; activation SHALL record creator, approver, effective time, and integrity checksum.
4. Meaning, unit, identity, source, formula, or funnel changes SHALL create a new version rather than mutate the active version. Prompt runs and Tool_Results SHALL pin the version used.
5. Removed or renamed source data SHALL produce an explicit quality warning or disable the affected metric; the gateway SHALL NOT silently reinterpret historical or current metrics.

## Requirement 17 — OAuth Discovery, PKCE, Registration, and Client Compatibility

1. The MCP_Gateway SHALL publish standards-compliant protected-resource metadata for canonical resource `https://mcp.skawr.com`, allowed authorization-server issuer(s), bearer methods, and customer-safe scopes. Issuer/resource origins SHALL match configured HTTPS values exactly.
2. Zitadel authorization-server discovery and JWKS metadata SHALL be validated without following discovery redirects to arbitrary hosts.
3. Authorization-code clients SHALL use PKCE `S256`; missing or `plain` challenges SHALL be rejected. State and nonce, where applicable, SHALL be single-use, browser-session-bound, and short-lived.
4. Production desktop and IDE clients SHALL be pre-registered by default. Redirect URIs SHALL exact-match approved HTTPS or loopback patterns; wildcard and arbitrary redirects SHALL be forbidden.
5. Dynamic client registration, if enabled, SHALL require approved software statements or administrator approval, constrained redirect classes, public-client treatment for native clients, rate limits, and auditable registration/revocation. Unattended open registration SHALL remain disabled.
6. Workload clients SHALL use separate confidential registrations and narrow scopes without user impersonation. Browser and workload credentials SHALL NOT be interchangeable.
7. A compatibility suite SHALL cover approved desktop, IDE, and programmatic clients across discovery, resource indicators, PKCE, redirects, prompts, and structured results. Client workarounds SHALL NOT weaken token, scope, workspace, redirect, or result-schema controls.
8. Unsupported protocol versions SHALL return a stable `unsupported_protocol_version` error with safe upgrade guidance and no silent downgrade.

## Requirement 18 — Customer AI-Provider Data Flow and Consent

1. Typed tools and prompts SHALL function without a Skawr-selected third-party model. By default, Tool_Results go to the customer's MCP client, and any forwarding to its AI provider occurs under the customer's provider relationship.
2. Public documentation SHALL explain which data crosses Skawr, MCP-client, customer-AI-provider, and optional Skawr-subprocessor boundaries, including categories, purpose, region, retention/training policy, and deletion obligations.
3. Optional server-side AI synthesis SHALL be disabled by default and SHALL require explicit, informed, versioned, attributable workspace-administrator consent for an approved provider/model class, allowed tools/prompts, data categories, and retention.
4. Provider requests SHALL minimize fields and exclude direct identifiers, secrets, raw document bodies, internal IDs, user profiles, and unrelated tenant data. Provider credentials SHALL be isolated.
5. Provider or scope changes SHALL require fresh consent. Revocation SHALL prevent new provider calls immediately and trigger contracted deletion, subject only to documented legal holds.
6. Denied consent or provider failure SHALL degrade to typed non-AI results and SHALL NOT silently choose another provider.

## Requirement 19 — Schema, Tool, Prompt, and Protocol Lifecycle

1. The gateway SHALL independently version MCP protocol compatibility, server catalog, and every tool/prompt input-output schema; results SHALL record all versions used.
2. Additive optional fields and new capabilities MAY remain within a catalog major version. Required fields, meanings, units, behaviorally significant enum values, or required scopes SHALL NOT change in place.
3. Breaking changes SHALL introduce a new major version and run old/new versions concurrently during a documented migration window. Prompts SHALL pin compatible tool major versions and semantic constraints.
4. Capability discovery SHALL identify active, preview, deprecated, and sunset versions. Preview use SHALL require an explicit workspace flag.
5. Deprecation SHALL provide customer-safe notice, migration guidance, payload-free affected-version telemetry, and at least 90 days of support unless emergency security removal is necessary.
6. Removed versions SHALL return `unsupported_version` and SHALL NOT reinterpret old input under a new schema. Immutable fixtures, generated clients, compatibility tests, and rollback to a prior catalog version SHALL gate releases.

## Requirement 20 — Stateless Gateway and Durable Shared State

1. MCP gateway processes SHALL be stateless and horizontally scalable. No correctness, authorization, workspace, semantic, consent, prompt-run, quota, cache-coordination, or audit state SHALL depend on process memory.
2. Durable shared stores SHALL hold Growth_Workspaces and version history, validation reports, semantic dictionaries, attribution/consent policy, client policy, prompt-run records, audit records/legal holds, quota counters, and cache coordination.
3. Any gateway instance SHALL produce equivalent authorization and budget decisions from the same durable versions. Scaling, restart, or failover SHALL NOT weaken revocation, quota enforcement, audit ordering, or cache isolation.
4. Shared authorization state failures SHALL fail closed. Durable stores SHALL have bounded timeouts, readiness checks, backup/recovery objectives, and tested restoration procedures.

## Requirement 21 — Safe Dashboard Verification Links

1. Tool_Results and Prompt_Results MAY include short-lived links to verify equivalent bounded views in `analytics.skawr.com` or `dashboard.skawr.com`.
2. Links SHALL be built only from a server route allowlist and normalized safe filters. Callers SHALL NOT provide a host, scheme, path, return URL, or redirect target.
3. Links SHALL contain only an opaque reference or audience-bound signed token for safe workspace alias, view kind, normalized filters, result request ID, and expiry; they SHALL expose no organization, principal, client, project, store, or upstream-request identifier.
4. The dashboard SHALL authenticate the viewer, resolve the reference server-side, repeat workspace and authorization-version checks, and render only allowlisted filters.
5. Tokens SHALL be integrity-protected, single-purpose, short-lived (default ten minutes), redacted from logs, and non-forwardable where client binding is supported. Expired, revoked, malformed, or unauthorized links SHALL return a non-enumerating error.

## Requirement 22 — Cross-Product Interpretation Safety

1. Every cross-product result SHALL declare `analysis_mode` as `single_source`, `side_by_side`, or `validated_join` and SHALL include the Requirement 15.9 `instrumentation_readiness` object plus active semantic and attribution versions and identity, attribution, sample-size, freshness, and semantic-quality limitations.
2. Synthesis schemas SHALL separate `observations`, `likely_contributors`, `limitations`, and `suggested_human_checks`; they SHALL contain no field or wording that asserts proven causes from observational data.
3. A `validated_join` analysis mode SHALL require at least `joined_funnel_ready`; revenue attribution claims SHALL require `revenue_attribution_ready`. Both SHALL require an unexpired Workspace_Validation_Report meeting the applicable identity-coverage, attribution, and quality thresholds.
4. Customer-facing findings and marketing examples SHALL consistently describe likely contributors, associations, or correlations and SHALL recommend bounded human verification.
5. Capability discovery and cross-product Tool_Results and Prompt_Results SHALL derive readiness from the same active workspace/report versions; they SHALL NOT independently infer or upgrade readiness.

## Release Acceptance Criteria

- All executable preflight gates pass, covering credential remediation, Growth_Workspace identifier and attribution validation, semantic-dictionary activation, OAuth/client compatibility, AI data-boundary consent, lifecycle and durable state, verification-link safety, and audit controls.
- Wave A and Wave B tools and both MCP prompts match their published versioned schemas, scope matrix, execution budgets, and lifecycle state.
- A cross-tenant request cannot retrieve, cache, log, link to, or reveal another tenant's resource, and no search event can cross into another tenant's Analytics project.
- Revoked authorization, consent, client registration, or operator elevation fails closed within the documented objective on every gateway instance.
- The weekly growth review completes with bounded output, pinned semantic definitions, provenance, and safe verification links where available.
- Search-to-revenue diagnosis runs as `validated_join` only when identity and attribution gates pass; otherwise it runs `side_by_side` with explicit warnings and never implies causation.
- Approved MCP clients pass discovery, PKCE, resource/audience, redirect, prompts, structured-output, and protocol-version compatibility tests.
- Audit retention, integrity verification, deletion/legal-hold handling, and operator-elevation controls pass operational exercises.
- Production dashboards show availability, latency, errors, quota denials, audit health, and upstream health without customer payloads.
- Public claims and AI-provider disclosures are reviewed against observed behavior, consent state, and published contracts.
