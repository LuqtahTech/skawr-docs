# Requirements Document

## Introduction

Skawr Analytics currently makes users scan repeated event-volume cards without a clear decision or next action. The supplied Analytics Home screenshot shows duplicated KPIs, trends, top events, generic recommendations, and repetitive cards. The supplied Heatmaps screenshot lists `/` and `/saas` with positive total interaction counts while the default click view reports zero interactions.

Repository investigation identified four capture-path failures and two rendering failures. `skawr-web` mounts `@skawr/analytics-react` without the heatmap opt-in, neither inspected browser producer captures DOM snapshots, public ingestion CORS excludes the heatmap batch and snapshot endpoints, page totals combine interaction types while the default visualization requests clicks, normalized bucket centers are divided by `grid_size` a second time, and the canvas forces a square rather than the captured page aspect ratio.

This feature makes Analytics Home an action-oriented decision queue and restores trustworthy heatmap capture and display. Delivery has two tracks: first make internal `skawr-web` dogfooding work through the React SDK, then verify and restore the active storefront producer for eligible Scale merchants. Full session replay is outside scope. Merchant Heatmaps remain Scale-tier, while approved first-party dogfooding is allowed.

## Glossary

- **Analytics_System**: The Skawr Analytics product, browser SDKs, ingestion API, processing services, and dashboard.
- **Analytics_Home**: The monitor-first landing screen for an analytics project.
- **Decision_Queue**: The capped, globally ranked collection of actionable Decision_Items on Analytics_Home.
- **Decision_Item**: A deduplicated finding that explains a change and provides one Primary_Action.
- **Needs_Attention**: A Decision_Queue category for harmful changes, risks, and urgent instrumentation failures.
- **Opportunity**: A Decision_Queue category for beneficial changes or actions with measurable upside.
- **Data_Health**: A Decision_Queue category for collection, freshness, consent, delivery, and quality conditions.
- **Ranking_Score**: A deterministic score based on business impact, affected users, confidence, and freshness.
- **Evidence**: The measured values, comparison, segment contribution, or Data_Health signal supporting a Decision_Item.
- **Primary_Action**: One executable deep link that opens the most relevant report or corrective workflow with context preserved.
- **Business_Goal**: A confirmed merchant outcome used to interpret Analytics data.
- **Inferred_Goal**: A proposed Business_Goal derived from purchase, checkout, add-to-cart, search, or revenue events.
- **Goal_Progress**: A goal metric shown against an Expected_Range with a Change_Point and Top_Driver.
- **Expected_Range**: The disclosed comparison interval for normal Goal_Progress behavior.
- **Change_Point**: The earliest displayed interval where Goal_Progress materially departs from the Expected_Range.
- **Top_Driver**: The highest-ranked measured segment or event contribution associated with a change.
- **Friendly_Event_Label**: A bilingual display name resolved from the data dictionary or a deterministic humanized fallback.
- **React_SDK**: The `@skawr/analytics-react` browser package used by `skawr-web`.
- **Storefront_Producer**: The browser producer delivered by the Search product for merchant storefront analytics.
- **Internal_Dogfooding**: First-party Analytics capture on Skawr-owned web properties.
- **Scale_Tier**: The merchant subscription tier entitled to Heatmaps.
- **Heatmap_Recorder**: The browser capability that captures heatmap interactions and DOM_Snapshots.
- **Interaction**: A click, pointer-move sample, or scroll-depth observation.
- **Interaction_Type**: One of click, move, or scroll.
- **DOM_Snapshot**: A sanitized page representation rendered behind a heatmap overlay.
- **Sensitive_Selector**: A configured selector whose matched content and descendants require masking or removal.
- **Consent_State**: One of pending, granted, or denied for analytics capture.
- **DNT**: The browser Do Not Track signal.
- **GPC**: The browser Global Privacy Control signal.
- **Normalized_Path**: The canonical page path shared by capture, snapshots, queries, and deep links.
- **Route_Template**: A configured rule that replaces dynamic path segments with stable named placeholders.
- **Route_Context**: The Normalized_Path, route instance, page dimensions, and Session active when data is captured.
- **Session**: A bounded activity period distinct from a durable anonymous visitor identifier.
- **Page_Dimensions**: The captured document width, document height, viewport width, and viewport height.
- **Heatmap_Batch**: A delivery unit containing one or more Interactions.
- **Delivery_Disposition**: An accepted, rejected, duplicate, or retryable result for a submitted Interaction.
- **CORS_Preflight**: A browser OPTIONS request that verifies cross-origin permission before ingestion.
- **Capture_Stage**: One step of configuration, eligibility, consent, recorder startup, route handling, snapshot capture, buffering, delivery, ingestion, query, or rendering.
- **Data_Health_Record**: A privacy-safe status record for one Capture_Stage.
- **Correctness_Test_Suite**: Automated property-based and example-based tests for this feature.
## Requirements

### Requirement 1: Two-Track Heatmap Enablement

**User Story:** As a Skawr operator, I want heatmap capture enabled through the correct producer for each property, so that internal and merchant traffic follow auditable entitlement rules.

#### Acceptance Criteria

1. WHEN approved Internal_Dogfooding is configured for `skawr-web`, THE React_SDK SHALL start one Heatmap_Recorder through an explicit heatmap opt-in.
2. WHEN the React_SDK heatmap opt-in is absent or false, THE React_SDK SHALL keep the Heatmap_Recorder inactive while preserving core event tracking.
3. WHERE an approved first-party project is configured for Internal_Dogfooding, THE Analytics_System SHALL permit heatmap capture without requiring merchant Scale_Tier entitlement.
4. WHEN a merchant storefront has active Scale_Tier entitlement, valid project binding, a track-only publishable key, enabled heatmaps, and permitted Consent_State, THE Storefront_Producer SHALL start one Heatmap_Recorder.
5. IF a merchant storefront lacks any merchant eligibility condition, THEN THE Storefront_Producer SHALL keep heatmap capture inactive while preserving separately entitled storefront capabilities.
6. THE Analytics_System SHALL use the React_SDK as the heatmap producer for `skawr-web` before treating the Storefront_Producer track as restored for merchants.
7. WHEN the Storefront_Producer track is verified, THE Analytics_System SHALL record the active producer version, configuration version, eligible tier, project binding result, and last successful ingestion time.
8. IF multiple initialization attempts occur in one page context, THEN THE Heatmap_Recorder SHALL maintain one listener set and one delivery schedule.

### Requirement 2: Privacy and Consent Defaults

**User Story:** As a visitor, I want heatmap collection to honor privacy signals and remove sensitive content, so that behavioral analytics does not capture data beyond the permitted purpose.

#### Acceptance Criteria

1. WHEN DNT is active or GPC is active, THE Heatmap_Recorder SHALL classify Consent_State as denied regardless of stored or host-provided consent.
2. WHILE Consent_State is pending or denied, THE Heatmap_Recorder SHALL keep Interaction capture, DOM_Snapshot capture, buffering, and delivery inactive.
3. WHEN Consent_State changes from pending to granted and DNT and GPC are inactive, THE Heatmap_Recorder SHALL evaluate all remaining capture eligibility conditions before starting.
4. WHEN Consent_State changes from granted to denied, THE Heatmap_Recorder SHALL stop capture and discard unsent Interactions and DOM_Snapshots before recording additional data.
5. WHEN a DOM_Snapshot is created, THE Heatmap_Recorder SHALL mask input elements, textarea elements, password fields, payment fields, and elements matching Sensitive_Selectors before buffering the DOM_Snapshot.
6. WHEN an Interaction targets an input, textarea, password field, payment field, or Sensitive_Selector, THE Heatmap_Recorder SHALL omit element text and sensitive attribute values.
7. THE Heatmap_Recorder SHALL remove URL query strings and fragments from captured page identity.
8. IF snapshot sanitization cannot establish the required masking, THEN THE Heatmap_Recorder SHALL reject the DOM_Snapshot while preserving eligible Interaction capture.

### Requirement 3: Stable Paths, Routes, and Sessions

**User Story:** As an analyst, I want interactions grouped under stable paths and sessions, so that SPA navigation and dynamic URLs do not fragment or misattribute behavior.

#### Acceptance Criteria

1. THE Heatmap_Recorder SHALL create a default Normalized_Path by stripping the origin, query, and fragment, adding one leading slash, collapsing duplicate slashes, and removing a trailing slash except for root.
2. THE Heatmap_Recorder SHALL preserve locale prefixes such as `/ar` and `/en` as distinct Normalized_Paths.
3. WHERE a Route_Template is configured, THE Heatmap_Recorder SHALL apply the Route_Template after default path normalization.
4. WHEN default normalization or Route_Template processing is repeated for the same path, THE Heatmap_Recorder SHALL return the same Normalized_Path.
5. WHEN browser history navigation changes the Normalized_Path, THE Heatmap_Recorder SHALL close the prior Route_Context and create exactly one new Route_Context.
6. WHEN client-side routing changes the Normalized_Path, THE Heatmap_Recorder SHALL flush the prior route buffer and reset route-specific scroll and snapshot state.
7. WHEN navigation leaves the Normalized_Path unchanged, THE Heatmap_Recorder SHALL preserve the current Route_Context without duplicating route lifecycle events.
8. THE Heatmap_Recorder SHALL use a Session identifier distinct from the durable anonymous visitor identifier.
9. WHEN inactivity reaches 30 minutes, THE Heatmap_Recorder SHALL rotate the Session identifier before capturing the next eligible Interaction.
10. WHEN eligible activity occurs before 30 minutes of inactivity, THE Heatmap_Recorder SHALL preserve the current Session identifier and update the activity time.
11. WHEN delivery occurs after a route or Session change, THE Analytics_System SHALL preserve the Normalized_Path, route instance, and Session captured with each Interaction.

### Requirement 4: Sanitized Page Background Capture

**User Story:** As a Heatmaps user, I want interactions displayed over a safe representation of the captured page, so that hotspots have visual context without exposing sensitive content.

#### Acceptance Criteria

1. WHEN an eligible Route_Context reaches a stable rendered state, THE Heatmap_Recorder SHALL capture one DOM_Snapshot for the Normalized_Path and Page_Dimensions.
2. WHEN a route change creates a new Route_Context, THE Heatmap_Recorder SHALL evaluate whether the Normalized_Path and Page_Dimensions require a new DOM_Snapshot.
3. THE DOM_Snapshot SHALL include the Normalized_Path, capture time, Page_Dimensions, device class, and content version metadata.
4. THE DOM_Snapshot SHALL exclude executable scripts, event-handler attributes, form values, authentication data, payment data, and content masked under Requirement 2.
5. WHEN a DOM_Snapshot is delivered from a customer origin, THE Analytics_System SHALL authenticate the request with the project-bound track-only key.
6. WHEN a DOM_Snapshot is selected for display, THE Analytics_System SHALL choose a variant compatible with the selected Normalized_Path, device class, and Page_Dimensions.
7. IF no compatible DOM_Snapshot exists, THEN THE Analytics_System SHALL preserve available Interaction analysis and identify the page background as missing or incompatible.
8. WHEN the dashboard renders a DOM_Snapshot, THE Analytics_System SHALL use an isolated non-executable context that blocks scripts, forms, storage, popups, and top-level navigation.
### Requirement 5: Coordinate, Bucketing, and Overlay Correctness

**User Story:** As an analyst, I want heatmap points aligned with the captured page, so that the visualization represents where visitors interacted.

#### Acceptance Criteria

1. WHEN the Heatmap_Recorder captures a positional Interaction, THE Heatmap_Recorder SHALL calculate the horizontal coordinate from the document-relative pointer position divided by document width and clamp the result to the inclusive range from 0 through 1.
2. WHEN the Heatmap_Recorder captures a positional Interaction, THE Heatmap_Recorder SHALL calculate the vertical coordinate from the document-relative pointer position divided by document height and clamp the result to the inclusive range from 0 through 1.
3. WHEN the Heatmap_Recorder captures a positional Interaction, THE Heatmap_Recorder SHALL attach Page_Dimensions and document scroll offsets active at capture time.
4. WHEN the Analytics_System assigns a normalized coordinate to a grid, THE Analytics_System SHALL place coordinate 1 in the final grid cell for the corresponding axis.
5. WHEN the Analytics_System returns a bucket center, THE Analytics_System SHALL express the bucket center once as a normalized value from 0 through 1.
6. WHEN the dashboard positions a returned bucket center, THE Analytics_System SHALL use the returned normalized value directly without dividing the value by grid size.
7. WHEN the dashboard renders an overlay, THE Analytics_System SHALL preserve the captured document aspect ratio instead of forcing a square canvas.
8. WHEN selected Interactions are aggregated, THE Analytics_System SHALL report a total equal to the sum of rendered cell counts.
9. WHEN selected Interactions are aggregated, THE Analytics_System SHALL calculate each cell intensity from the cell count relative to the maximum selected cell count.

### Requirement 6: Interaction-Type Coherence and Heatmap States

**User Story:** As a Heatmaps user, I want page totals and the selected visualization to refer to the same interaction type, so that positive counts do not lead to a misleading zero state.

#### Acceptance Criteria

1. WHEN the Analytics_System lists a Normalized_Path, THE Analytics_System SHALL provide separate click, move, scroll, and total Interaction counts for the active period and device filter.
2. WHEN a Normalized_Path has click Interactions, THE Analytics_System SHALL select click as the default Interaction_Type.
3. IF a Normalized_Path has no click Interactions and has move Interactions, THEN THE Analytics_System SHALL select move as the default Interaction_Type.
4. IF a Normalized_Path has no click or move Interactions and has scroll Interactions, THEN THE Analytics_System SHALL select scroll as the default Interaction_Type.
5. WHEN a user selects an Interaction_Type, THE Analytics_System SHALL display page counts, overlay totals, active cells, labels, and empty states for the selected Interaction_Type.
6. IF the selected Interaction_Type has zero Interactions and another Interaction_Type has Interactions, THEN THE Analytics_System SHALL identify the available Interaction_Types and provide a direct switch action.
7. IF all Interaction_Types have zero Interactions for the active filters, THEN THE Analytics_System SHALL distinguish no eligible traffic, capture disabled, consent blocked, delivery failure, ingestion failure, and valid zero behavior when corresponding Data_Health_Records are available.
8. WHEN scroll Interactions are displayed, THE Analytics_System SHALL calculate each Session's reach from the maximum scroll depth observed for the Normalized_Path.
9. WHEN scroll reach is displayed at increasing depth thresholds, THE Analytics_System SHALL produce non-increasing reached-Session counts and percentages.

### Requirement 7: Cross-Origin and Reliable Delivery

**User Story:** As a merchant, I want browser capture delivered reliably from customer origins, so that preflight, navigation, partial rejection, or retries do not silently lose or duplicate data.

#### Acceptance Criteria

1. WHEN a browser sends a CORS_Preflight for the heatmap batch endpoint or snapshot endpoint, THE Analytics_System SHALL allow POST and OPTIONS with the content type and project-bound API key headers required by the producer.
2. WHEN the Analytics_System responds to public heatmap ingestion from an allowed customer origin, THE Analytics_System SHALL return the applicable cross-origin response headers and an Origin-dependent cache variation.
3. WHEN a Heatmap_Batch is created, THE Heatmap_Recorder SHALL limit the Heatmap_Batch to 500 Interactions and the documented ingestion body-size limit.
4. WHEN a periodic interval, route change, pagehide event, or hidden-document event occurs, THE Heatmap_Recorder SHALL offer pending Interactions for delivery.
5. WHEN pagehide delivery is attempted, THE Heatmap_Recorder SHALL keep the project-bound key out of the request URL.
6. IF pagehide delivery cannot be confirmed, THEN THE Heatmap_Recorder SHALL retain eligible pending Interactions for a bounded retry rather than classify the Interactions as delivered.
7. WHEN ingestion processes a Heatmap_Batch, THE Analytics_System SHALL return accepted, rejected, duplicate, and retryable Delivery_Dispositions whose counts sum to the submitted Interaction count.
8. WHEN part of a Heatmap_Batch is accepted, THE Heatmap_Recorder SHALL retry only Interactions with retryable Delivery_Dispositions.
9. WHEN an Interaction with the same stable identifier is submitted again for the same project, THE Analytics_System SHALL preserve one analytical Interaction and classify the repeated submission as duplicate.
10. IF delivery receives a non-retryable authentication or validation result, THEN THE Heatmap_Recorder SHALL stop retrying the affected data and record the classified failure.
11. IF delivery receives a retryable network, availability, or throttling result, THEN THE Heatmap_Recorder SHALL retain the affected data within the documented retry bound and honor server retry timing.
12. THE Analytics_System SHALL preserve core page behavior when heatmap delivery fails or times out.

### Requirement 8: Action-Oriented Decision Queue

**User Story:** As a marketer or product owner, I want Home to rank decisions rather than repeat activity metrics, so that Analytics identifies the most valuable next action.

#### Acceptance Criteria

1. THE Analytics_Home SHALL present Decision_Items under Needs_Attention, Opportunity, and Data_Health categories.
2. WHEN Decision_Items from events, funnels, cohorts, goals, benchmarks, or Data_Health are eligible, THE Analytics_System SHALL rank the combined set globally by descending Ranking_Score.
3. THE Ranking_Score SHALL include disclosed contributions for business impact, affected users, confidence, and freshness.
4. WHEN two Decision_Items have equal Ranking_Scores, THE Analytics_System SHALL order the Decision_Items by descending freshness and then ascending stable finding identifier.
5. WHEN findings from different detectors represent the same metric, population, direction, and comparison period, THE Analytics_System SHALL consolidate the findings into one Decision_Item with combined Evidence.
6. WHEN a finding is materially unchanged from a previously presented finding, THE Analytics_System SHALL suppress the repeated finding until Evidence worsens, improves, resolves, or becomes newly actionable.
7. THE Decision_Queue SHALL contain no more than seven active Decision_Items across all categories.
8. WHEN a lead Decision_Item receives expanded presentation, THE Analytics_Home SHALL present the Decision_Item once rather than repeat the Decision_Item as a separate hero and queue card.
9. THE Analytics_Home SHALL avoid repeating the same event-volume signal across lead content, Decision_Queue, Goal_Progress, and live activity.
10. IF no Decision_Item qualifies, THEN THE Analytics_Home SHALL present current goal status and Data_Health without fabricating a recommendation.
### Requirement 9: Decision Content and Executable Actions

**User Story:** As a decision maker, I want each finding to explain the evidence and open the correct workflow, so that the recommendation can be acted on immediately.

#### Acceptance Criteria

1. WHEN a Decision_Item is presented, THE Analytics_System SHALL state what changed, the current value, the comparison value, and the comparison period.
2. WHEN a Decision_Item is presented, THE Analytics_System SHALL state why the change matters using the confirmed Business_Goal or a clearly labeled generic objective.
3. WHEN measured driver Evidence exists, THE Analytics_System SHALL identify the likely Top_Driver, contribution, affected users, confidence, and Evidence period.
4. IF measured driver Evidence is unavailable, THEN THE Analytics_System SHALL identify the missing Evidence without inventing a cause.
5. WHEN a Decision_Item is actionable, THE Analytics_System SHALL provide one Primary_Action that opens the most relevant report, filter, goal, alert, event definition, Heatmap, or instrumentation workflow.
6. WHEN a user follows a Primary_Action, THE Analytics_System SHALL preserve project, period, metric, segment, Normalized_Path, device, and originating finding context applicable to the destination.
7. IF the Primary_Action destination is unavailable because of access, entitlement, or missing data, THEN THE Analytics_System SHALL explain the blocking condition and provide the closest permitted corrective action.
8. THE Analytics_System SHALL use Friendly_Event_Labels in Decision_Items, actions, goal displays, and supporting evidence.

### Requirement 10: Goal Inference and Progress

**User Story:** As an ecommerce merchant, I want Analytics to understand likely commercial goals while keeping me in control, so that Home measures progress toward outcomes instead of generic event volume.

#### Acceptance Criteria

1. WHEN project events include purchase, checkout, add-to-cart, search, or revenue semantics, THE Analytics_System SHALL propose corresponding Inferred_Goals with the matched events and confidence.
2. WHEN an Inferred_Goal is proposed, THE Analytics_System SHALL require a user to confirm, edit, or dismiss the Inferred_Goal before treating the Inferred_Goal as a Business_Goal.
3. IF no ecommerce goal can be inferred with the configured minimum confidence, THEN THE Analytics_System SHALL offer a generic conversion or engagement goal for user confirmation.
4. WHEN a Business_Goal is confirmed, THE Analytics_Home SHALL present Goal_Progress with the current value, Expected_Range, Change_Point, and Top_Driver when available.
5. WHEN Goal_Progress remains inside the Expected_Range, THE Analytics_System SHALL identify the goal as within range without generating a change alert.
6. WHEN Goal_Progress leaves the Expected_Range by the configured materiality threshold, THE Analytics_System SHALL make the goal eligible for the Decision_Queue.
7. IF a Change_Point cannot be established from available history, THEN THE Analytics_System SHALL identify the required history rather than assign an estimated date.
8. IF a Top_Driver cannot be established from eligible Evidence, THEN THE Analytics_System SHALL display driver Evidence as unavailable rather than present a generic cause.

### Requirement 11: Monitor-First, Bilingual Presentation

**User Story:** As an English or Arabic user, I want a calm monitor-first Home experience, so that the most important decision remains clear on desktop and mobile.

#### Acceptance Criteria

1. THE Analytics_Home SHALL present goal status and the highest-ranked Decision_Items before raw activity and detailed event tables.
2. THE Analytics_Home SHALL move raw live monitoring to Events or keep raw live monitoring collapsed behind explicit progressive disclosure.
3. WHILE advanced filters, raw events, or lower-ranked findings are available, THE Analytics_Home SHALL keep the additional detail collapsed until the user requests disclosure.
4. THE Analytics_Home SHALL follow current Skawr app conventions for custom CSS, typography, spacing, cards, controls, chart colors, and monitor-first hierarchy.
5. THE Analytics_System SHALL provide complete English and Arabic content for Decision_Queue categories, Decision_Items, Goal_Progress, Heatmaps, Data_Health, errors, and corrective actions.
6. WHILE Arabic is active, THE Analytics_System SHALL use RTL-safe logical layout and preserve readable left-to-right rendering for technical identifiers and numeric sequences.
7. WHEN a user changes language, THE Analytics_System SHALL preserve project, period, filters, Decision_Queue context, Business_Goal, Heatmap selection, and Primary_Action destination.
8. WHEN an interactive chart or heatmap is presented, THE Analytics_System SHALL provide a keyboard-accessible textual alternative containing the decision-relevant values and Primary_Action.
9. THE Analytics_System SHALL avoid raw event keys in user-facing content when a Friendly_Event_Label is available.

### Requirement 12: Capture and Data-Health Diagnostics

**User Story:** As an operator or merchant administrator, I want silent capture gates and failures classified by stage, so that zero data can be diagnosed without exposing visitor data or credentials.

#### Acceptance Criteria

1. THE Analytics_System SHALL maintain Data_Health_Records for configuration, entitlement, DNT, GPC, Consent_State, recorder startup, route handling, snapshot capture, buffering, CORS_Preflight, delivery, authentication, ingestion, query, and rendering Capture_Stages.
2. WHEN a Capture_Stage is attempted, THE Analytics_System SHALL record the latest attempt time, success time, failure time, status, and classified reason code.
3. WHEN delivery or ingestion occurs, THE Analytics_System SHALL record privacy-safe captured, buffered, attempted, accepted, rejected, duplicate, retryable, and discarded counts for the same accounting interval.
4. WHEN eligible page traffic exists without accepted Interactions, THE Analytics_System SHALL create or update one Data_Health Decision_Item for the affected project, Normalized_Path, device class, and producer version.
5. WHEN accepted Interactions resume, THE Analytics_System SHALL resolve the matching capture Data_Health condition and record the recovery stage and time.
6. IF Heatmaps has no visible data, THEN THE Analytics_System SHALL present the earliest known failing Capture_Stage, the last successful stage, and one Primary_Action.
7. IF Data_Health_Records are insufficient to classify a zero state, THEN THE Analytics_System SHALL label the state undiagnosed and provide a capture-validation action.
8. THE Analytics_System SHALL exclude publishable keys, authorization values, raw visitor identifiers, URL query values, element text, snapshot content, and configured sensitive values from logs, metrics, traces, and Data_Health_Records.
9. WHEN a user opens a Data_Health Decision_Item, THE Analytics_System SHALL show producer type, producer version, configuration version, Normalized_Path, stage history, aggregate counts, and corrective guidance without exposing keys or personal data.
### Requirement 13: Property-Based Correctness

**User Story:** As a platform owner, I want variable-input invariants verified automatically, so that capture and prioritization remain correct across paths, dimensions, consent transitions, sensitive markup, and delivery failures.

#### Acceptance Criteria

1. THE Correctness_Test_Suite SHALL verify across generated valid document dimensions, scroll offsets, and pointer positions that normalized coordinates remain from 0 through 1 and preserve document-relative position.
2. THE Correctness_Test_Suite SHALL verify across generated normalized coordinates and grid sizes that every coordinate maps to exactly one valid bucket and coordinate 1 maps to the final bucket.
3. THE Correctness_Test_Suite SHALL verify across generated buckets and page aspect ratios that rendered bucket centers equal the server-returned normalized centers without top-left compression.
4. THE Correctness_Test_Suite SHALL verify across generated paths containing origins, queries, fragments, duplicate slashes, trailing slashes, locale prefixes, and matching Route_Templates that Normalized_Path processing is idempotent.
5. THE Correctness_Test_Suite SHALL verify across generated finding sets and input permutations that Ranking_Score ordering is deterministic and independent of producer concatenation order.
6. THE Correctness_Test_Suite SHALL verify across generated overlapping findings that cross-type deduplication produces one Decision_Item per stable finding identity without losing distinct Evidence references.
7. THE Correctness_Test_Suite SHALL verify across generated Consent_State transitions that a transition to a more restrictive state cannot produce a later Interaction or DOM_Snapshot without a newer valid grant and inactive DNT and GPC signals.
8. THE Correctness_Test_Suite SHALL verify across generated DOM trees containing form controls, password and payment fields, nested Sensitive_Selectors, event handlers, and executable content that sanitized DOM_Snapshots contain none of the protected values or executable behavior.
9. THE Correctness_Test_Suite SHALL verify across generated partial Delivery_Dispositions that retry selection contains every retryable Interaction and contains no accepted, rejected, or duplicate Interaction.
10. THE Correctness_Test_Suite SHALL verify across generated retry sequences that repeated stable Interaction identifiers produce at most one analytical Interaction per project.
11. THE Correctness_Test_Suite SHALL use representative integration examples instead of property-based iteration for browser CORS behavior, external service configuration, and end-to-end dashboard wiring.

### Requirement 14: Access, Compatibility, and Scope Boundaries

**User Story:** As a project owner, I want Heatmaps isolated to the correct project and entitlement without breaking existing analytics, so that the feature can be restored safely.

#### Acceptance Criteria

1. WHEN a browser submits Interactions or a DOM_Snapshot, THE Analytics_System SHALL derive the project from the authenticated project-bound track-only key rather than a client-supplied project identifier.
2. WHEN an authenticated user reads Heatmaps or Data_Health, THE Analytics_System SHALL enforce existing project membership and owner-linked entitlement rules.
3. IF a merchant project lacks Scale_Tier entitlement, THEN THE Analytics_System SHALL deny merchant Heatmap reads and present the existing upgrade path without exposing Heatmap data.
4. WHERE Internal_Dogfooding is approved, THE Analytics_System SHALL scope the exception to named first-party projects and origins.
5. WHEN a historical Interaction lacks new Route_Context or delivery metadata, THE Analytics_System SHALL keep the Interaction queryable and identify unavailable compatibility metadata without fabricating values.
6. WHEN heatmap capture is disabled or fails, THE Analytics_System SHALL preserve existing event tracking, attribution, storefront navigation, checkout, and Search product behavior.
7. THE Analytics_System SHALL keep full session replay, keystroke capture, unrestricted page text capture, a new analytics subscription, and a new utility-CSS framework outside this feature scope.

### Requirement 15: Operational Bounds and Safe Rollout

**User Story:** As a Skawr operator, I want bounded collection and an observable rollout, so that actionability and Heatmaps can ship without uncontrolled data growth or hidden regressions.

#### Acceptance Criteria

1. WHEN the React_SDK evaluates heatmap eligibility, THE React_SDK SHALL use the same Consent_State as core event tracking and require consent where the project configuration requires consent.
2. WHEN an eligible anonymous browser produces an Interaction, THE Heatmap_Recorder SHALL populate `anonymous_id` with the durable anonymous visitor identifier and populate `session_id` with the distinct Session identifier.
3. WHEN the Analytics_System infers ecommerce goals, THE Analytics_System SHALL evaluate purchase or revenue, checkout, add-to-cart, search, and activation semantics in that priority order.
4. IF no outcome event from the ecommerce goal hierarchy is available, THEN THE Analytics_System SHALL use generic event volume as a labeled fallback rather than an ecommerce outcome.
5. WHEN a raw page-view, click, or identify volume change is not linked to a Business_Goal, conversion step, material segment, or Data_Health condition, THE Analytics_System SHALL exclude the change from the Decision_Queue.
6. WHEN a Decision_Item remains materially unchanged after presentation, THE Analytics_System SHALL apply a 24-hour cooldown before presenting the Decision_Item again.
7. WHEN a Decision_Item changes category, changes measured impact by at least 20 percent, gains new driver Evidence, or resolves during cooldown, THE Analytics_System SHALL allow the changed Decision_Item to bypass the remaining cooldown.
8. WHEN the Heatmap_Recorder samples pointer movement, THE Heatmap_Recorder SHALL capture no more than one move Interaction per 200 milliseconds per active Route_Context.
9. WHEN a browser tab buffers Interactions, THE Heatmap_Recorder SHALL limit the pending queue to 2,000 Interactions and record the count discarded after the limit is reached.
10. WHEN a DOM_Snapshot is serialized, THE Heatmap_Recorder SHALL reject sanitized snapshot content larger than 2,000,000 UTF-8 bytes and record a `snapshot_payload_too_large` reason.
11. WHEN a route becomes stable after initial load or SPA navigation, THE Heatmap_Recorder SHALL attempt eligible DOM_Snapshot capture within 2 seconds and SHALL capture no more than one unchanged snapshot variant per Normalized_Path and Page_Dimensions in 30 minutes.
12. WHEN the Heatmap_Recorder handles a click, move, or scroll event on a reference desktop browser, THE Heatmap_Recorder SHALL complete the synchronous handler in 8 milliseconds at the 95th percentile under the documented performance test fixture.
13. WHEN the Heatmaps dashboard requests a page list or a selected overlay for a period of 90 days or less, THE Analytics_System SHALL return the response within 2 seconds at the 95th percentile under the documented reference dataset and service capacity.
14. IF filters exclude Interactions that exist outside the active filter, THEN THE Analytics_System SHALL identify the Heatmap state as filtered-out data and provide a clear-filter action.
15. IF capture is disabled, consent is blocked, delivery has a network failure, authentication is rejected, ingestion rejects data, or a DOM_Snapshot is missing, THEN THE Analytics_System SHALL present the corresponding distinct status, last capture freshness, last successful ingestion time, and one corrective action.
16. WHERE staged rollout is enabled, THE Analytics_System SHALL support independent project-level controls for the Decision_Queue, React_SDK heatmap capture, DOM_Snapshot capture, public heatmap ingestion, and the revised Heatmaps dashboard.
17. WHEN rollout controls change, THE Analytics_System SHALL preserve existing event collection and historical Heatmap reads and SHALL record the project, control, previous state, new state, actor, and change time.
18. WHEN a rollout stage is active, THE Analytics_System SHALL report capture-start rate, consent-block rate, snapshot success rate, batch acceptance rate, authentication rejection rate, retry exhaustion rate, queue discard rate, Heatmap zero-state rate, Decision_Item action rate, and deep-link success rate.
19. IF batch acceptance rate falls below 95 percent, authentication rejection rate exceeds 5 percent, queue discard rate exceeds 1 percent, or Heatmap zero-state rate increases by 20 percent relative to the preceding seven-day baseline for 15 consecutive minutes, THEN THE Analytics_System SHALL alert operators and identify the affected producer versions and projects.
20. WHEN a rollout control is disabled after a threshold breach, THE Analytics_System SHALL stop the affected new behavior while preserving core event tracking, accepted historical data, and dashboard access that does not depend on the disabled behavior.
