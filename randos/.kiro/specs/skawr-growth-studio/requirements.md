# Requirements Document

## Introduction

Skawr Growth Studio is an internal account-intelligence, visual-workflow, human-review, and acquisition-orchestration system. It discovers digital businesses, evaluates how their customers find information and make decisions, produces evidence-backed recommendations, and routes approved accounts and artifacts toward permissioned commercial actions.

Growth Studio is not a personal-contact scraper or automated cold-outreach engine. It collects organization facts by default, demonstrates reproducible opportunities on permitted public or submitted properties, and remains draft-first with human approval before CRM writes or external communication.

The system follows **build horizontally, launch vertically**. Its account graph, workflow runtime, policy gates, evaluators, scoring, review, and outcome model are platform-neutral. Domain behavior is supplied by connectors, Assessment Packs, Growth Packages, and Funnel Templates. The MVP targets Saudi/MENA commerce and marketplace/directory businesses while preserving extension points for later archetypes and sources.

Skawr's coordinated opportunity loop is: **Search captures intent; bundled Analytics observes; CRO diagnoses and prioritizes; Engagement & Onboarding executes interventions; Analytics measures outcomes.** Growth Studio evaluates and recommends these opportunities and orchestrates their review and acquisition journey.

### Product and runtime scope

Growth Studio SHALL evaluate and recommend Engagement & Onboarding concepts, including popup concepts, announcement or hellobar-style banners, guidance, surveys, and push concepts; onboarding is one use case within this category. Growth Studio SHALL NOT implement the customer-facing campaign editor, web or mobile SDK, popup renderer, push-delivery infrastructure, audience engine, or campaign runtime. Those capabilities belong to a separate future product specification.

Growth Studio's workflow runtime executes internal discovery, evaluation, review, artifact, and approved acquisition-orchestration steps. It is distinct from any future customer-facing Search, Analytics, CRO, or Engagement & Onboarding runtime.

### Commercial constraints

- Search subscriptions have no free tier and no subscription trial.
- The free import-your-store flow and personalized preview are acquisition experiences, not a free subscription or trial.
- Analytics is not available standalone. Basic Analytics is included with the lowest Search tier; Advanced Analytics is included with the second and higher Search tiers.
- Annual wording SHALL be `Save 17% with an annual subscription`, or an approved localized equivalent, and SHALL NOT describe free months.
- CRO is a project-based service.
- Only available offers, or pilot offers explicitly approved for presentation, may be presented as purchasable.

### Safety and governance boundaries

- Public visibility is not permission; every source, field, purpose, and action passes a source-policy gate.
- The system SHALL NOT bypass login, paywall, CAPTCHA, rate limits, robots directives, bot defenses, or explicit denial.
- The system SHALL NOT create named-person profiles from automated discovery or infer personal contact details.
- No automated bulk sending is in scope; external actions are draft-first, consent-aware, suppression-aware, and human-gated.
- Saudi PDPL, applicable platform terms, and approved legal/commercial policy govern collection and external action.
- LLMs may phrase reviewed structured evidence but SHALL NOT determine eligibility, fit, confidence, evidence truth, or ground truth.

### Phase boundary

**MVP:** Account and DigitalProperty graph; approved CSV and submitted-URL sources; Commerce and Marketplace/Directory Assessment Packs; Search, bundled Analytics, CRO, and Engagement & Onboarding evaluation; product catalog and Package Composer; visual workflows and initial Funnel Templates needed for the launch flow; evidence review; bilingual artifacts; optional Search preview; manual approved export; Growth Radar; and required safety, policy, security, and runtime controls.

**Post-MVP:** B2B Catalog, SaaS/Product, Content/Documentation, and Lead-Generation Assessment Packs; additional connectors and discovery sources; customer-facing engagement delivery products under separate specifications; and optional advanced experimentation and attribution. Registry schemas SHALL support these future additions without making their implementation an MVP dependency.

---

## Requirements

### Requirement 1: Account and DigitalProperty model

**User Story:** As a growth operator, I want stable business identities with multiple digital properties, so that assessments survive domain changes and represent complex organizations accurately.

#### Acceptance Criteria

1. WHEN a business is first accepted THEN the system SHALL assign a stable Account UUID that is independent of any domain, platform, connector, or property URL.
2. WHEN an account has an online presence THEN the system SHALL represent each domain, subdomain, site, store, app, documentation property, or marketplace presence as a DigitalProperty with its own stable identifier, type, canonical location, geography, languages, and provenance.
3. WHEN an assessment runs THEN the system SHALL assess one DigitalProperty and SHALL aggregate structured findings and opportunity signals to its Account without erasing property-level differences.
4. WHEN domains, redirects, or aliases are observed THEN the system SHALL treat them as identity signals and aliases rather than sole primary keys and SHALL retain previous domains, redirect evidence, and observation history.
5. WHEN multiple sources identify the same organization THEN the system SHALL deduplicate using auditable identity evidence and retain all source aliases and provenance.
6. WHEN Account or DigitalProperty identities must be corrected THEN the data model SHALL support merge and split with a required reason, preserved pre-change identities and evidence links, and recorded actor and time; IN THE MVP this MAY be performed through a minimal authorized administrative action, and a polished reviewer-facing merge/split UI is POST-MVP.
7. WHEN a property is private, unsafe, unsupported, or no longer controlled by the account THEN the system SHALL isolate or block that property without necessarily suppressing the entire Account.

### Requirement 2: Archetypes and capabilities

**User Story:** As a growth operator, I want flexible classification by archetype and capability, so that the correct evaluations run without forcing a business into one narrow type.

#### Acceptance Criteria

1. WHEN an Account is classified THEN the system SHALL assign one primary archetype and zero or more secondary archetypes or capabilities, or mark it unsupported.
2. WHEN classification is stored THEN the system SHALL retain evidence, confidence, classifier version, and the DigitalProperties from which each conclusion was derived.
3. WHEN evaluation applicability is determined THEN the system SHALL use capabilities such as searchable inventory, measurable journey, conversion action, observable analytics, languages, and credible-improvement potential in addition to archetypes.
4. WHEN a reviewer changes a primary or secondary archetype or capability THEN the system SHALL require a reason, retain the correction as labeled feedback, and re-evaluate pack applicability.
5. IF no implemented Assessment Pack applies THEN the system SHALL monitor or reject the Account and SHALL NOT run an unrelated deep assessment.

### Requirement 3: Assessment Pack registry and phasing

**User Story:** As a growth operator, I want versioned, pluggable Assessment Packs, so that Growth Studio evaluates only relevant concerns and can expand safely.

#### Acceptance Criteria

1. WHEN an Assessment Pack is registered THEN the system SHALL store its stable pack ID, version, supported archetypes and capabilities, required inputs, evaluator IDs and versions, typed output schemas, cost class, applicability rules, dependencies, supported locales, lifecycle state, and evidence-freshness rules.
2. WHEN a pack runs THEN it SHALL produce structured findings with accepted evidence references and schema-valid outputs rather than ungrounded free-form conclusions.
3. WHEN a pack is selected THEN the system SHALL verify its applicability, dependencies, locale support, lifecycle, and required inputs against the target DigitalProperty.
4. WHEN a pack is composed only from registered evaluators THEN the system SHALL allow that composition through configuration without changes to the core discovery, scoring, or workflow engine.
5. WHEN a new kind of evaluation behavior is required THEN the system MAY require a versioned evaluator plugin, but that plugin SHALL implement the stable evaluator contract and SHALL NOT require changes to unrelated packs.
6. WHEN a pack version is retired or its evidence expires THEN the system SHALL prevent new runs with that version and SHALL mark affected recommendations for refresh according to its freshness rules.
7. IN THE MVP, the system SHALL implement and enable the Commerce and Marketplace/Directory Assessment Packs.
8. POST-MVP, the system MAY implement B2B Catalog, SaaS/Product, Content/Documentation, and Lead-Generation Assessment Packs; their registry entries and schemas SHALL be supported in MVP without requiring their evaluators to exist.

### Requirement 4: Growth Packages, Funnel Templates, and concept separation

**User Story:** As a growth operator, I want evaluation, commercial recommendation, and workflow presentation modeled separately, so that each can evolve without ambiguity.

#### Acceptance Criteria

1. WHEN evaluation scope is configured THEN an Assessment Pack SHALL define what evidence and opportunities to evaluate.
2. WHEN a commercial recommendation is composed THEN a Growth Package SHALL define what current Skawr products or services may be recommended or sold together.
3. WHEN a workflow is demonstrated, reviewed, or converted THEN a Funnel Template SHALL define the reusable internal orchestration path and required artifacts or success events.
4. WHEN any of these concepts is referenced THEN the system SHALL use stable IDs and versions and SHALL NOT treat a pack, package, and template as interchangeable.
5. WHEN compatibility is validated THEN the system SHALL verify the selected Funnel Template, Assessment Pack versions, Growth Package version, archetypes, capabilities, and available offers are mutually compatible.

### Requirement 5: Discovery and source-policy control

**User Story:** As a growth operator, I want controlled multi-source discovery, so that coverage can expand without violating source terms, purpose limits, or privacy obligations.

#### Acceptance Criteria

1. WHEN discovery runs in MVP THEN the system SHALL accept approved CSV uploads, inbound audit submissions, import-flow submissions, partner-submitted URLs where approved, and previously accepted Accounts scheduled for refresh.
2. POST-MVP, the system MAY add approved connectors for Common Crawl, HTTP Archive, permitted directories or APIs, technology fingerprints, and other reviewed sources; no future connector SHALL be required for MVP launch.
3. WHEN any source is proposed THEN the system SHALL classify it as approved, review-required, or prohibited and SHALL disable unknown or expired sources by default.
4. WHEN a source policy is approved THEN the system SHALL record its owner, source identity, allowed fields, allowed purposes, allowed actions, terms and robots decision, retention, legal basis where needed, review date, and expiry.
5. WHEN a policy does not authorize a specific field, purpose, or action THEN the system SHALL block that field collection, use, or action even if another use of the source is approved.
6. WHEN a source-policy approval expires THEN the system SHALL automatically pause new collection from that source until reapproved while preserving auditable prior evidence according to retention policy.
7. WHEN a source is prohibited, explicitly denies access, or is suppressed THEN the system SHALL treat collection as terminal and SHALL NOT retry or substitute an unapproved source.
8. WHEN a source must be stopped THEN an authorized user SHALL be able to activate a per-source kill switch that halts new collection and queued source work.
9. WHEN discovery identifies a candidate THEN it SHALL create only an Account or DigitalProperty candidate and SHALL NOT create a named-person profile, contact, CRM record, or outreach action.

### Requirement 6: Secure collection and broad-to-narrow processing

**User Story:** As a growth operator, I want safe, cost-bounded collection, so that expensive assessment runs only on eligible properties and untrusted URLs cannot reach internal systems.

#### Acceptance Criteria

1. WHEN a candidate enters a workflow THEN the system SHALL process it through policy and URL safety, cheap property validation, archetype and capability classification, lightweight opportunity detection, Eligibility, applicable deep assessment, scoring, and human review in that order.
2. WHEN a candidate fails an earlier mandatory stage THEN the system SHALL NOT run later or more expensive stages against it.
3. WHEN browser-heavy or paid evaluation is scheduled THEN the system SHALL enforce configured per-source, per-property, per-account, and global fanout and cost limits.
4. WHEN a URL is submitted, discovered, redirected to, or read from CSV THEN the system SHALL allow only approved schemes, reject embedded credentials, normalize and validate the destination, and block loopback, private, link-local, multicast, metadata-service, internal, and otherwise non-public address ranges.
5. WHEN DNS is resolved or a redirect occurs THEN the system SHALL defend against DNS rebinding and SHALL repeat scheme, hostname, address-range, policy, and destination checks before connecting.
6. WHEN fetching content THEN the system SHALL enforce redirect-count, response-size, time, and approved content-type limits and SHALL NOT execute downloaded files.
7. WHEN a browser is required THEN the system SHALL use an isolated sandbox with controlled egress, secret isolation, restricted capabilities, and sanitized captured output.
8. WHEN unsafe URL behavior is detected THEN the system SHALL terminate that property operation, record a security event, and SHALL NOT retry automatically.
9. WHEN a workflow is configured or run THEN the system SHALL expose estimated cost before publication and record actual cost by source, evaluator, pack, property, and account.

### Requirement 7: Eligibility, scoring, and routing

**User Story:** As a growth operator, I want non-negotiable eligibility evaluated separately from commercial scoring, so that attractive but unsafe accounts cannot enter acquisition workflows.

#### Acceptance Criteria

1. WHEN an Account or DigitalProperty reaches routing THEN the system SHALL determine Eligibility as `Pass`, `Review Required`, or `Blocked` before computing or applying Fit, Confidence, Timing/Value, or Risk.
2. WHEN evidence depends on a prohibited source, suppression match, explicit denial, unsafe or private destination, expired policy, personal-data dependency, or missing basis for an external action THEN the relevant Account, property, finding, or action SHALL be `Blocked`.
3. WHEN policy or evidence is ambiguous but not a hard blocker THEN Eligibility SHALL be `Review Required`, and the system SHALL prevent downstream external action until an authorized reviewer resolves it.
4. WHEN Eligibility is `Pass` THEN the system SHALL compute Fit, Confidence, Timing/Value, and Risk as separate values with component breakdowns and SHALL NOT reduce Eligibility to an additive risk score.
5. WHEN Fit is computed THEN the system SHALL consider reproduced need, product and archetype fit, inventory or language complexity, first-party engagement, credible operational value, and current offer eligibility.
6. WHEN Confidence is computed THEN the system SHALL consider reproducibility, corroboration, freshness, source reliability, and evidence completeness.
7. WHEN Timing/Value and Risk are computed THEN the system SHALL preserve each independently and SHALL identify stale or conflicting evidence, policy sensitivity, delivery effort, and commercial timing without allowing a high value to cancel a blocker.
8. WHEN an LLM is used THEN it SHALL NOT set Eligibility, Fit, Confidence, Timing/Value, Risk, evidence truth, expected-item relevance, or routing thresholds.
9. WHEN a scoring or routing model changes THEN the system SHALL version it and retain the exact model and configuration that produced each result.
10. WHEN routing completes THEN the system SHALL support qualified review, generate-then-review, monitor, `Opportunity detected; no current Skawr offer`, and disqualified outcomes.

### Requirement 8: Search evaluation quality

**User Story:** As a growth operator, I want reproducible Search evidence grounded in public inventory, so that recommendations do not rely on invented relevance judgments.

#### Acceptance Criteria

1. WHEN Search is evaluated THEN expected items and query variants SHALL derive from exact permitted public inventory, deterministic documented transformations, or a reviewed locale-specific lexicon.
2. WHEN Arabic or multilingual variants are generated THEN the system SHALL support applicable orthographic, Arabic/English transliteration, mixed-script, numeral, typo, SKU/model, and category-plus-attribute transformations without allowing an LLM to establish ground truth or independent relevance.
3. WHEN a known-item test runs THEN the system SHALL record the query, expected item and derivation, actual rank bucket (`top1`, `top3`, `top10`, or `none`), latency, autocomplete behavior, zero-result recovery, timestamp, evaluator version, and screenshot or snippet.
4. WHEN results are presented THEN the system MAY calculate and present a synthetic zero-result rate for the defined timestamped sample only if it is clearly labeled `synthetic`, identifies the sample and method, and SHALL NOT present it as the business's internal or production zero-result rate, traffic, conversion, or revenue impact.
5. WHEN Search cannot be tested without login, restricted access, prohibited interaction, or unsafe behavior THEN the system SHALL skip the test and record the reason.
6. WHEN inventory or evidence freshness falls outside the Assessment Pack rule THEN the system SHALL prevent the stale test from supporting a current recommendation until refreshed.

### Requirement 9: Analytics and CRO evaluation quality

**User Story:** As a growth operator, I want measurement and conversion findings constrained to observable evidence, so that Growth Studio does not overstate what public inspection can establish.

#### Acceptance Criteria

1. WHEN Analytics readiness is evaluated THEN the system SHALL record only publicly observable or merchant-submitted signals and SHALL phrase absent public evidence as `not publicly observed` rather than `missing` or `not implemented`.
2. WHEN a public analytics tag is observed THEN the system SHALL NOT treat its presence as proof of event quality, identity quality, governance, reporting quality, or business use.
3. WHEN no public analytics tag is observed THEN the system SHALL NOT claim the business has no analytics because server-side events, warehouses, attribution systems, dashboards, or non-public implementations may exist.
4. WHEN CRO is evaluated from a public property THEN the system SHALL assess reproducible pricing clarity, trust and brand cues, journey friction, intent-to-landing alignment, accessibility, mobile usability, and observable measurement readiness where permitted.
5. WHEN describing traffic from public inspection THEN the system SHALL limit claims to observable intent or landing-page alignment and SHALL NOT infer traffic volume, traffic quality, channel mix, or channel revenue.
6. WHEN a customer journey is exercised THEN the system SHALL stop before transaction completion, authentication, account creation, or form submission unless a separately approved sandbox or merchant-provided test path authorizes it.
7. WHEN revenue, uplift, or traffic impact is modeled THEN the system SHALL require merchant-supplied inputs, label the result as a scenario with assumptions, and SHALL NOT present it as observed fact or guarantee.

### Requirement 10: Engagement & Onboarding evaluation safety

**User Story:** As a growth operator, I want Engagement & Onboarding recommendations grounded in demonstrated journey needs, so that Growth Studio never penalizes a business merely for not using an intervention.

#### Acceptance Criteria

1. WHEN Engagement & Onboarding is evaluated THEN the absence of a popup, announcement bar, exit-intent offer, push prompt, guidance, or survey SHALL NEVER by itself reduce a score, create a finding, or count as an opportunity.
2. WHEN an Engagement & Onboarding opportunity is created THEN it SHALL cite either a demonstrated unmet journey need or a harmful existing implementation with reproducible evidence.
3. WHEN existing overlays are evaluated THEN the system SHALL inspect applicable immediate or competing overlays, mobile obstruction, dismissibility, keyboard and screen-reader behavior, RTL and localization behavior, performance impact, and repetition across a configured bounded revisit sequence.
4. WHEN announcements or guidance are evaluated THEN the system SHALL inspect applicable stale content, conflicting messages, relevance to the demonstrated need, and accessibility without assuming that an announcement is required.
5. WHEN push behavior is evaluated THEN the system SHALL inspect permission timing, contextual explanation, consent, opt-out, and repeated prompting without triggering or granting permission.
6. WHEN manipulative behavior is evaluated THEN the system SHALL identify false urgency, deceptive consent, obstruction, confirm-shaming, or other dark patterns as harmful implementations rather than recommended tactics.
7. WHEN a concept is generated THEN it SHALL include applicable frequency caps, accessible interaction requirements, mobile suitability, RTL/localization requirements, performance budgets, explicit push permission, clear opt-out, and a prohibition on false urgency or dark patterns.
8. WHEN a concept is reviewed THEN the system SHALL label it as a recommendation for a separate customer-facing Engagement & Onboarding product and SHALL NOT imply that Growth Studio itself can render or deliver it.

### Requirement 11: Four opportunities and Package Composer

**User Story:** As a growth operator, I want separate opportunity signals composed into the smallest valid recommendation, so that evidence is useful without forcing an unsuitable sale.

#### Acceptance Criteria

1. WHEN an applicable Assessment Pack completes THEN the system SHALL produce separate evidence-backed opportunity signals for Search, bundled Analytics, CRO, and Engagement & Onboarding.
2. WHEN an opportunity category is unsupported or irrelevant THEN the system SHALL omit it rather than force all four categories.
3. WHEN Analytics need is detected and Search is eligible THEN the Package Composer SHALL attach Basic Analytics to the lowest Search tier or Advanced Analytics to the second or higher Search tier and SHALL NOT offer Analytics standalone.
4. WHEN Analytics need is detected but Search is not a valid fit THEN the system SHALL use `Opportunity detected; no current Skawr offer` rather than force the need into a Search recommendation.
5. WHEN a recommendation is composed THEN the Package Composer SHALL select the smallest commercially valid Growth Package that addresses accepted findings, prerequisites, entitlements, implementation requirements, and product eligibility.
6. WHEN a reviewer edits a composed package THEN the system SHALL allow authorized add, remove, phase, or override actions, require a reason, preserve the original recommendation, and revalidate entitlements and commercial rules.
7. WHEN needs are not appropriate for one immediate engagement THEN the Package Composer SHALL support phased recommendations with explicit sequence, prerequisites, and reassessment points.
8. WHEN a package is generated or changed THEN the system SHALL validate each product's lifecycle and effective dates and SHALL cite only reviewer-accepted evidence for each included recommendation.
9. WHEN a package rationale is shown THEN it SHALL accurately explain the applicable loop: Search captures intent; bundled Analytics observes; CRO diagnoses and prioritizes; Engagement & Onboarding executes interventions; Analytics measures outcomes.
10. WHEN no purchasable offer validly addresses an accepted opportunity THEN the system SHALL preserve the opportunity for learning and monitoring without generating a purchase CTA.

### Requirement 12: Authoritative product catalog

**User Story:** As a growth operator, I want an authoritative, versioned catalog, so that recommendations remain commercially and legally valid.

#### Acceptance Criteria

1. WHEN a product, service, tier, entitlement, or Growth Package is cataloged THEN it SHALL have a stable ID, version, lifecycle (`planned`, `pilot`, `available`, `deprecated`, or `retired`), effective dates, supported locales, regions, currencies, billing cadence, and version history.
2. WHEN an offer is cataloged THEN it SHALL define prerequisites, incompatibilities, archetype eligibility, implementation requirements, supported platforms or connectors where applicable, included entitlements, pricing policy, allowed claims, CTA, and legal and commercial approval state.
3. WHEN a recommendation is created THEN the system SHALL capture an immutable catalog-version snapshot and SHALL revalidate it before artifact publication, export, or approved external action.
4. WHEN lifecycle is `available` THEN the offer MAY be presented as purchasable within its effective region, currency, eligibility, and approval bounds.
5. WHEN lifecycle is `pilot` THEN the offer SHALL be presented as purchasable only if its pilot approval explicitly permits that account, region, channel, and date.
6. WHEN lifecycle is `planned`, `deprecated`, or `retired` THEN the system SHALL NOT present the offer as currently purchasable.
7. WHEN Analytics is modeled THEN the catalog SHALL mark it unavailable standalone and SHALL encode Basic Analytics in the lowest Search tier and Advanced Analytics in the second and higher Search tiers.
8. WHEN Search acquisition is modeled THEN the catalog SHALL distinguish the free import and personalized preview from subscription access and SHALL state that Search has no free subscription tier and no subscription trial.
9. WHEN annual pricing is presented THEN the system SHALL use `Save 17% with an annual subscription`, or a legally approved localized equivalent, and SHALL NOT describe the saving as free months.
10. WHEN landing copy, a template, or generated text conflicts with the active catalog snapshot THEN the catalog SHALL control and the conflicting output SHALL be blocked from publication.
11. WHEN an artifact or draft is generated THEN it SHALL use only claims approved in the applicable catalog snapshot.

### Requirement 13: Funnel Templates and visual workflow builder

**User Story:** As a growth operator, I want reusable, parameterized visual workflows, so that common acquisition motions can be cloned and safely adapted without engineering changes.

#### Acceptance Criteria

1. WHEN a user opens a workflow THEN the system SHALL display a platform-neutral node graph with source, policy, collection, classification, Assessment Pack, decision, human-gate, artifact, and action node types and SHALL place connector specifics inside node configuration.
2. WHEN a Funnel Template is registered THEN it SHALL define a stable ID and version, parameters, node requirements, default thresholds, compatible Assessment Packs and Growth Packages, required artifacts, and success events.
3. WHEN an authorized user creates a workflow from a Funnel Template THEN the system SHALL support clone and customize while retaining the source template and version relationship.
4. WHEN a Funnel Template is transferred THEN the system SHALL support schema-validated import and export without exporting secrets or environment-specific credentials.
5. WHEN a workflow is edited THEN the system SHALL preserve an editable draft separately from the published immutable version.
6. IN THE MVP, the system SHALL provide only the Funnel Templates required for the initial approved-URL/CSV-to-review-and-export flow, selected from Inbound Growth Audit, Approved Discovery, Partner Portfolio, Search Opportunity, Measurement Readiness, Engagement Opportunity, CRO Opportunity, and Growth Blueprint.
7. POST-MVP, the system MAY add or expand Migration Watcher, Reactivation, and other templates without requiring changes to the core runtime.
8. WHEN a template is unavailable or incompatible THEN the system SHALL prevent publication and explain the unmet requirement rather than silently replacing it.

### Requirement 14: Graph validation and safe test execution

**User Story:** As a growth operator, I want workflows validated and tested before publication, so that unsafe graphs or unintended side effects cannot run.

#### Acceptance Criteria

1. WHEN a workflow draft is validated THEN all checks SHALL pass before publication, including typed input and output ports, required node configuration, at least one source and permitted terminal, no unreachable nodes, and schema compatibility across every edge.
2. WHEN cycles are present THEN the system SHALL reject unsupported cycles and SHALL prefer a directed acyclic graph; recurrence SHALL be represented by schedules or new runs rather than graph cycles.
3. WHEN a graph can collect, publish, export, write to CRM, or communicate externally THEN validation SHALL require the applicable policy gate, human gate, and consent or basis check before that action.
4. WHEN a graph is validated THEN the system SHALL enforce configured fanout, browser, evaluator, and cost limits and SHALL verify compatible pack, package, locale, archetype, capability, and available-offer constraints.
5. WHEN a workflow draft exists THEN an authorized user SHALL be able to run a single-property test and a bounded sample dry run before publication.
6. WHEN a dry or test run executes THEN the system SHALL disable real external side effects and SHALL use sandbox adapters for CRM, notification, export, publishing, and communication actions.
7. WHEN a dry run completes THEN the system SHALL display simulated actions, cost, policy decisions, evidence, and validation errors without representing simulated outcomes as real outcomes.

### Requirement 15: Workflow runtime guarantees

**User Story:** As a growth operator, I want durable, explainable workflow execution, so that retries, interruptions, and concurrent work cannot duplicate external effects or lose state.

#### Acceptance Criteria

1. WHEN a workflow is published THEN the system SHALL create an immutable snapshot of the graph, node configurations, policies, Assessment Packs, evaluator versions, scoring rules, Funnel Template relationship, and compatible catalog references used by each run.
2. WHEN a run executes THEN the system SHALL maintain a per-account and per-property trace with typed node inputs, typed outputs, decisions, evidence IDs, attempts, costs, and timestamps.
3. WHEN a node or action is retried THEN it SHALL be idempotent for the same run and logical operation and SHALL prevent duplicate artifacts, CRM records, exports, or communications.
4. WHEN a transient failure occurs THEN the runtime SHALL apply bounded, classified retries and checkpoint completed durable work.
5. WHEN robots denial, suppression, explicit source denial, prohibited policy, or unsafe URL occurs THEN the runtime SHALL treat it as terminal and SHALL NOT retry automatically.
6. WHEN an HTTP `401` or `403` occurs THEN the runtime SHALL record the denial and SHALL NOT retry automatically or attempt alternate credentials.
7. WHEN an HTTP `429` occurs THEN the runtime SHALL honor a valid `Retry-After` within configured bounds and then pause the source or property if the bound is exceeded.
8. WHEN an HTTP `503` or timeout occurs THEN the runtime SHALL use bounded backoff and SHALL send exhausted work to review or dead-letter handling rather than retry indefinitely.
9. WHEN a run is paused, cancelled, or interrupted THEN the system SHALL support safe pause, cancellation, and resume from checkpoints without replaying committed side effects.
10. WHEN work exhausts its allowed attempts or violates an output contract THEN the runtime SHALL place it in a dead-letter queue with classification, trace, and authorized replay controls.
11. WHEN multiple workflows target one Account THEN the runtime SHALL enforce configurable account concurrency and shall serialize conflicting state changes.
12. WHEN a durable state change must emit an external event THEN the runtime SHALL use a transactional outbox or equivalent atomic delivery guarantee.
13. WHEN a published version is rolled back THEN new runs SHALL use the selected prior version while in-flight runs retain their original immutable snapshot unless explicitly and safely cancelled.

### Requirement 16: Human review, access, and collaboration

**User Story:** As a growth team member, I want a collaborative, least-privilege review workspace, so that evidence and decisions are accountable before publication or action.

#### Acceptance Criteria

1. WHEN an eligible Account reaches human review THEN the system SHALL show Account and DigitalProperty identity, primary and secondary archetypes, platform signals, Eligibility, Fit, Confidence, Timing/Value, Risk, recommended Growth Package, findings, freshness, owner, and status.
2. WHEN a user filters or saves a view THEN the system SHALL support product or package, opportunity, archetype, capability, platform, geography, language, source, eligibility, score bands, freshness, review state, owner, due date, first-party engagement, and risk flags.
3. WHEN work is coordinated IN THE MVP THEN the system SHALL support assignments, queues, due dates, status, comments, and saved views; mentions, notifications, and an account activity feed are POST-MVP.
4. WHEN two users edit the same decision or configuration THEN the system SHALL detect version conflicts, prevent silent overwrite, and allow an explicit refresh or reviewed resolution.
5. WHEN access is granted through Zitadel THEN the system SHALL enforce least privilege using Viewer, Operator, Reviewer, Publisher, Administrator, and Outreach Approver roles.
6. WHEN permissions are evaluated THEN publish permission and external-send permission SHALL be separate, and neither SHALL be implied by general edit access.
7. WHEN configured for a sensitive action THEN the system SHALL require approval from two distinct authorized users before publication, export, CRM creation, or sending.
8. WHEN a sensitive change occurs THEN the system SHALL audit the actor, time, prior value, new value, reason where required, and affected Account, workflow, catalog, policy, suppression, consent, or secret reference.
9. WHEN a bulk action is requested THEN the system SHALL restrict it to assignment, refresh request, monitor, report-generation approval, approved export, suppression, or rejection with reason and SHALL NOT offer bulk sending.

### Requirement 17: BusinessContactPoint and external actions

**User Story:** As an Outreach Approver, I want organization-level contact points and strict action gates, so that Growth Studio supports permissioned acquisition without building person profiles.

#### Acceptance Criteria

1. WHEN a contact route is recorded THEN the system SHALL create a BusinessContactPoint only for a generic company inbox, official contact form, published business switchboard, merchant-submitted address, partner introduction, or consented recipient.
2. WHEN a BusinessContactPoint is stored THEN it SHALL include source, classification, purpose, basis or consent, allowed channels, evidence, expiry, suppression status, and organization association.
3. WHEN automated discovery encounters a named person, guessed address, personal mobile number, or social profile THEN the system SHALL NOT create or enrich a named-person profile from it.
4. WHEN an account is approved THEN available actions MAY include approve-report, approve-CRM-creation, assign-for-manual-outreach, approve-permissioned-follow-up, monitor, reject, suppress, or request-new-evidence according to role and policy.
5. WHEN outreach content is generated THEN it SHALL remain draft-only until an Outreach Approver authorizes the specific recipient, channel, evidence snapshot, and message.
6. WHEN any external action is attempted THEN the system SHALL revalidate Eligibility, source and action policy, purpose, current consent or basis, allowed channel, expiry, suppression, catalog lifecycle, and reviewer approval.
7. WHEN a BusinessContactPoint or Account is suppressed THEN the system SHALL block collection or contact as configured, prevent re-import into eligibility, and propagate suppression to queues, exports, CRM actions, and communication adapters.
8. WHEN a CRM record is approved THEN the system SHALL use an idempotent key, attach the approved evidence and artifact summary, identify the reviewer, and avoid duplicate creation.
9. WHEN external communication capability exists THEN the system SHALL NOT provide automated bulk sending and SHALL preserve recipient-level human approval.
10. WHEN a follow-up or multi-step outreach is used THEN each message SHALL require explicit human approval before it sends, and no step SHALL send automatically based on elapsed time, a prior open, or any other engagement signal; a follow-up is a new human-approved draft, not an unattended cadence.

### Requirement 18: Evidence, account view, and artifacts

**User Story:** As a reviewer, I want every finding and artifact traceable to accepted evidence, so that corrections are safe and unsupported claims cannot leave the system.

#### Acceptance Criteria

1. WHEN a user opens an Account THEN the system SHALL show DigitalProperties, identity history, recommended package, qualification rationale, and each finding's source URL, source policy, method and version, timestamp, confidence basis, and screenshot or snippet.
2. WHEN a reviewer evaluates a finding THEN the system SHALL allow acceptance, rejection, correction, and refresh request and SHALL retain the original observation and decision audit.
3. WHEN a reviewer changes an archetype, capability, package, Fit, Confidence, Timing/Value, Risk, or Eligibility resolution THEN the system SHALL require an authorized role and reason and SHALL preserve the automated result.
4. WHEN prior comparable evidence exists THEN the system SHALL show the change against the previous observation without treating absence of comparable evidence as improvement or regression.
5. WHEN an artifact or outreach draft is generated THEN every factual or commercial claim SHALL cite reviewer-accepted evidence or an approved catalog claim, and unsupported claims SHALL be omitted and flagged.
6. WHEN an LLM phrases a finding THEN it SHALL receive only selected structured evidence and approved catalog claims and SHALL return content that passes citation and evidence-grounding validation.
7. WHEN a reviewer approves generation THEN the system SHALL support applicable bilingual Arabic/English audits, top-opportunity summaries, readiness reports, Growth Blueprints, and an optional interactive Search preview using a small permitted public-inventory sample.
8. WHEN a Search preview is generated THEN its sample index SHALL be ephemeral, access-controlled, purpose-limited, and automatically removed at expiry.
9. WHEN an artifact is generated THEN the system SHALL retain its evidence snapshot, Assessment Pack and evaluator versions, catalog snapshot, template and model versions, reviewer decisions, locale, and expiry.

### Requirement 19: Growth Radar, observability, and outcome learning

**User Story:** As a growth leader, I want operational and commercial outcomes in one dashboard, so that the team improves account selection and funnels rather than merely monitoring technical runs.

#### Acceptance Criteria

1. WHEN a user opens Growth Radar THEN the system SHALL show account opportunity distribution, review queues, funnel stages, source and workflow yields, package mix, accepted findings, commercial outcomes, cost, latency, and policy or quality alerts.
2. WHEN a workflow runs THEN the system SHALL show per-stage counts including discovered, policy-accepted, safe, live, classified, eligible, evaluated, qualified, in review, monitored, blocked, dead-lettered, and errored.
3. WHEN an outcome event occurs THEN the system SHALL associate it where applicable with source and policy version, workflow and Funnel Template version, Assessment Pack and evaluator versions, archetype and capabilities, opportunity, Growth Package and catalog snapshot, artifact, channel, Account, and DigitalProperty.
4. WHEN funnel outcomes are recorded THEN the system SHALL support source yield, evaluator yield, reviewer acceptance, artifact generation, meetings, imports, catalog index completion, Analytics first event, Engagement & Onboarding start, CRO start, proposal, paid conversion, rejection, and suppression.
5. WHEN performance is summarized THEN the system SHALL calculate cost per accepted account, time in each stage, duplicate rate, unsupported-claim rate, policy pass rate, reviewer overturn rate, and applicable cost and latency percentiles.
6. WHEN communication metrics exist THEN the system SHALL NOT optimize routing, scoring, or experiments on opens alone and SHALL prioritize accepted evidence, qualified conversations, activation, proposal, paid, rejection, and suppression outcomes.
7. POST-MVP, WHEN experiments are enabled THEN the system SHALL assign stable variant IDs, preserve exposure and eligibility context, and apply documented attribution windows without rewriting historical assignments.
8. WHEN Growth Studio user interactions occur THEN the system SHALL instrument Growth Studio with Skawr Analytics for approved internal product-usage events while excluding secrets, raw personal data, and prohibited evidence.
9. WHEN queue stalls, connector yield shifts materially, policy expiry approaches, cost exceeds limits, or quality gates regress THEN the system SHALL alert authorized operators.

### Requirement 20: Data governance and secret protection

**User Story:** As an administrator, I want retention, privacy, and connector secrets enforced centrally, so that operations remain compliant and auditable.

#### Acceptance Criteria

1. WHEN collection occurs THEN the system SHALL minimize data to approved organization facts and purpose-required evidence and SHALL NOT generate personal emails, harvest personal mobile numbers, or construct person-level profiles.
2. WHEN raw pages, browser traces, or screenshots are stored THEN the system SHALL apply purpose-specific short retention, access control, and sanitization and SHALL retain extracted evidence only while current and needed.
3. WHEN a correction, deletion, or suppression request is approved THEN the system SHALL propagate it to databases, search indexes, previews, artifacts, caches, queues, and processors and SHALL retain only an auditable tombstone without deleted content where legally permitted.
4. WHEN data would be sent to an external LLM or processor THEN the system SHALL enforce approved processor, field, purpose, region or transfer basis, and redaction policy and SHALL block unapproved personal or secret data.
5. WHEN a connector credential, API key, token, or signing secret is configured THEN the system SHALL store it through approved secret management with encryption in transit and at rest, least-privilege access, rotation support, environment separation, and no inclusion in workflow exports, logs, prompts, screenshots, or artifacts.
6. WHEN a secret is created, accessed for administration, rotated, failed, or revoked THEN the system SHALL emit an audit event without revealing the secret value.
7. WHEN browser or evaluator output is persisted or displayed THEN the system SHALL sanitize active content, credentials, tokens, and unsafe markup.
8. WHEN a Saudi recipient or property is involved THEN the system SHALL enforce applicable PDPL purpose, consent, retention, correction, deletion, suppression, and opt-out controls and SHALL preserve an auditable consent and suppression ledger.

### Requirement 21: Reuse of existing Skawr infrastructure

**User Story:** As an engineer, I want Growth Studio to reuse existing Skawr capabilities, so that the MVP does not rebuild proven crawling, Search, Analytics, dashboards, auth, or scheduling infrastructure.

#### Acceptance Criteria

1. WHEN inbound intent sources are integrated THEN the system SHALL reuse the existing `/cro/audit` and `/saas/import` flows as governed candidate sources.
2. WHEN CRO audit execution is integrated THEN the system SHALL replace process-local in-memory state and fire-and-forget work with the durable workflow runtime.
3. WHEN crawling and scheduling are implemented THEN the system SHALL reuse applicable `skawr-scraper` patterns and centralized queue and cron conventions, with schedules enqueuing durable work rather than executing full pipelines inline.
4. WHEN interactive Search previews and known-item tests are implemented THEN the system SHALL reuse applicable `skawr-search` and indexer catalog ingestion, hybrid retrieval, Arabic Search, and approved Fireworks embedding capabilities.
5. WHEN the operator UI is implemented THEN the system SHALL live in `skawr-dashboards`, reuse its app shell and table/dialog components, and use Zitadel SSO and role claims rather than adding a separate identity system.
6. WHEN internal product usage and approved outcome events are instrumented THEN the system SHALL reuse Skawr Analytics rather than introduce a second product-analytics system.
7. WHEN a reused component cannot meet a mandatory safety, durability, tenancy, or policy requirement THEN the system SHALL wrap or upgrade it before use rather than weakening this specification.

### Requirement 22: MVP launch flow and quality gates

**User Story:** As a founder, I want a focused, measurable launch, so that Growth Studio broadens only after its findings, policies, and economics are trustworthy.

#### Acceptance Criteria

1. WHEN the MVP launches THEN it SHALL target Saudi/MENA Commerce and Marketplace/Directory Accounts and SHALL implement and enable only those two Assessment Packs as required launch packs.
2. WHEN MVP connectors are configured THEN Salla, Shopify, and Zid MAY be available as convenient connectors but SHALL NOT be architectural eligibility requirements.
3. WHEN the MVP end-to-end flow runs THEN it SHALL support approved CSV or submitted URL → source policy and secure URL check → Account and DigitalProperty resolution → archetype and capability classification → catalog sampling → applicable Search, Analytics, CRO, and Engagement & Onboarding evaluation → Eligibility → Fit, Confidence, Timing/Value, and Risk → Package Composer → review queue → bilingual artifact → optional Search preview → approved manual CRM or sheet export.
4. WHEN a launch evaluation sample is declared THEN it SHALL contain at least 30 and preferably 50 deeply reviewed Accounts, identify the sampling period and selection method in advance, and include the top routing band produced without post-hoc denominator changes.
5. WHEN top-band precision is calculated THEN the denominator SHALL be every Account in the predeclared top-band sample and the numerator SHALL be Accounts with at least one human-confirmed, reproducible, commercially relevant finding supported by accepted evidence.
6. WHEN launch precision is checked THEN the top-band precision defined in criterion 22.5 SHALL be at least 80% before broadening discovery or enabling a new required launch pack.
7. WHEN unsupported-claim quality is checked THEN an unsupported claim SHALL mean any factual, causal, performance, identity, eligibility, pricing, entitlement, or commercial assertion not supported by accepted evidence or an applicable approved catalog claim, and sampled published artifacts SHALL contain zero such claims.
8. WHEN duplicate quality is checked THEN a duplicate SHALL mean multiple active Accounts representing the same organization without an approved split rationale, and the predeclared sample duplicate rate SHALL be below 2%.
9. WHEN policy quality is checked THEN every Account accepted for review, artifact publication, CRM export, or external action SHALL have passed all applicable non-expired source, field, purpose, action, URL-safety, consent or basis, and suppression controls.
10. WHEN cost and latency gates are checked THEN the system SHALL compare measured per-accepted-account cost and end-to-review latency against thresholds declared before the launch sample begins and SHALL meet those thresholds before scale-up.
11. WHEN Engagement & Onboarding findings are counted toward precision THEN popup, banner, exit-intent, survey, guidance, or push absence alone SHALL NEVER qualify as a valid opportunity.
12. WHEN a pack, source, connector, template, or external action is post-MVP THEN its absence SHALL NOT block MVP launch unless another MVP criterion explicitly depends on it.

---

## Glossary

- **Account**: A business or organization identified by a stable UUID, independent of any domain or platform, that aggregates one or more DigitalProperties.
- **DigitalProperty**: A separately addressable domain, subdomain, site, store, app, documentation property, or marketplace presence assessed individually and aggregated to an Account.
- **Primary archetype**: The Account's dominant business model used as one input to pack applicability.
- **Secondary archetype/capability**: An additional business model or observable capability that can make other evaluations applicable without replacing the primary archetype.
- **Connector**: A versioned adapter or configuration for a platform, source, or external system; connector identity is not an Account eligibility criterion.
- **Evaluator**: A versioned implementation of a stable contract that accepts typed inputs and produces typed evidence-backed outputs.
- **Assessment Pack**: A versioned configuration of applicable evaluators and rules defining what to evaluate for supported archetypes, capabilities, inputs, locales, and freshness bounds.
- **Growth Package**: A named, commercially valid, catalog-versioned combination or phase of Skawr products and services that may be recommended or sold.
- **Funnel Template**: A reusable, parameterized, versioned internal workflow definition describing how an account is discovered, evaluated, reviewed, demonstrated, and advanced toward success events.
- **Package Composer**: The rules and review component that selects the smallest commercially valid Growth Package, supports reasoned overrides or phases, and revalidates evidence, entitlements, lifecycle, and eligibility.
- **Opportunity category**: Search, bundled Analytics, CRO, or Engagement & Onboarding. A demonstrated need may also produce `Opportunity detected; no current Skawr offer`.
- **Engagement & Onboarding**: The opportunity category for popup concepts, announcement or hellobar-style banners, contextual guidance, surveys, and push concepts. Onboarding is one use case; absence of these mechanisms alone is not an opportunity.
- **Eligibility**: The hard pre-scoring status `Pass`, `Review Required`, or `Blocked`, determined from policy, safety, suppression, basis, and data-dependency controls.
- **Fit**: How well accepted evidence, Account attributes, and an available Skawr offer align; separate from Eligibility and Confidence.
- **Confidence**: How reproducible, corroborated, current, reliable, and complete the supporting evidence is; never set by an LLM.
- **Timing/Value**: The separately recorded commercial timing and credible operational value of an opportunity.
- **Risk**: The separately recorded uncertainty or delivery/commercial risk that cannot override a hard Eligibility blocker.
- **BusinessContactPoint**: An organization-level contact route with source, classification, purpose, basis or consent, allowed channels, evidence, expiry, and suppression; it is not a person profile.
- **Product catalog**: The authoritative, versioned source for offer IDs, lifecycle, dates, regions, currencies, billing, prerequisites, incompatibilities, eligibility, entitlements, requirements, approvals, pricing policy, allowed claims, and CTAs.
- **Basic Analytics**: The Analytics entitlement included with the lowest Search tier and unavailable standalone.
- **Advanced Analytics**: The Analytics entitlement included with the second and higher Search tiers and unavailable standalone.
- **Free import experience**: The no-cost import-your-store and personalized preview acquisition experience; it is not a free Search subscription or subscription trial.
- **Compounding loop**: Search captures intent; bundled Analytics observes; CRO diagnoses and prioritizes; Engagement & Onboarding executes interventions; Analytics measures outcomes.
- **Evidence**: A sourced, timestamped, versioned, reproducible observation or approved submitted fact with provenance and a screenshot, snippet, or structured record where applicable.
- **Known-item retrieval**: A Search test that checks whether an item proven to exist in permitted public inventory is returned and how it ranks for deterministic or reviewed variants.
- **Source-policy gate**: The field-, purpose-, and action-specific control that approves, requires review of, prohibits, expires, or pauses collection and use.
- **Artifact**: A generated audit, summary, readiness report, Growth Blueprint, or preview grounded in accepted evidence and an immutable catalog/template/model snapshot.
- **Suppression**: An auditable state that prevents configured collection, eligibility, export, or contact and propagates across internal processors.
- **Growth Radar**: The internal dashboard for account opportunities, review work, workflow health, commercial outcomes, quality, cost, and learning metrics.
- **Growth Studio runtime**: The internal workflow runtime for discovery, evaluation, review, artifacts, and approved acquisition orchestration; it does not include customer-facing campaign editing, SDKs, rendering, push delivery, audience selection, or campaign execution.
- **PDPL**: Saudi Arabia's Personal Data Protection Law and associated obligations applicable to personal-data processing and direct marketing.
