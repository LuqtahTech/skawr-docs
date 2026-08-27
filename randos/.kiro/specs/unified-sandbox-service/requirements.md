# Requirements Document

## Introduction

The Unified Sandbox Service provides a single, re-entrant sandbox environment spanning both Skawr Search SaaS and Skawr Analytics. It replaces the current one-shot guest onboarding flow with a persistent, cross-product demo experience that lets prospects explore both products within 30 seconds of landing — without signup, without hitting production infrastructure limits, and without losing their progress. This document captures the formal requirements derived from the approved design.

## Glossary

- **Sandbox_Service**: The central orchestrator module (implemented as a FastAPI router within skawr-indexer) responsible for sandbox session lifecycle management including creation, access, extension, conversion, and cleanup.
- **Sandbox_Session**: A time-bounded demo environment that provisions both a search index and analytics project for a single visitor, identified by a unique token.
- **Demo_Data_Seeder**: The component responsible for generating and injecting realistic demo data (search products and analytics events) into sandbox resources.
- **Cleanup_Scheduler**: A periodic background process that garbage-collects expired sandbox resources every 6 hours.
- **Sandbox_Auth_Middleware**: The authentication layer extension that validates sandbox tokens and enforces sandbox-specific rate limits and permissions.
- **Sandbox_Token**: A 64-character cryptographically random string (generated via `secrets.token_urlsafe(48)`) used to identify and authenticate a sandbox session.
- **Demo_Template**: A pre-configured industry template (ecommerce, saas, media) defining the product catalog and analytics event patterns for sandbox seeding.
- **Conversion**: The process of transforming a sandbox session into a real trial account while preserving all demo data.
- **Sandbox_API_Key**: A restricted API key (permissions limited to search and autocomplete) associated with a sandbox session.
- **Resource_Budget**: The maximum resource allocation per sandbox (~5MB OpenSearch + ~2MB PostgreSQL) supporting approximately 100 concurrent sandboxes on the VPS.

## Requirements

### Requirement 1: Sandbox Session Creation

**User Story:** As a website visitor, I want to create a sandbox environment instantly, so that I can explore both Skawr Search and Skawr Analytics without signing up.

#### Acceptance Criteria

1. WHEN a visitor submits a sandbox creation request with a valid template, THE Sandbox_Service SHALL provision a new sandbox session with status "active" within 5 seconds
2. WHEN a sandbox session is created, THE Sandbox_Service SHALL generate a unique 64-character Sandbox_Token using cryptographically secure random generation (via `secrets.token_urlsafe(48)`)
3. WHEN a sandbox session is created, THE Sandbox_Service SHALL create a corresponding API client record with is_sandbox set to true, client_type set to "sandbox", and an associated Sandbox_API_Key with permissions restricted to "search" and "autocomplete" only
4. WHEN a sandbox session is created, THE Sandbox_Service SHALL set the session expiry to exactly 7 days from creation time and cache the session mapping in Redis with key "sandbox:{token}" and TTL matching the expiry duration
5. WHEN a sandbox session is created, THE Sandbox_Service SHALL return the sandbox token, full API key, 8-character API key prefix, search endpoint, analytics dashboard URL, expiry time, template name, product count, and event count
6. IF sandbox provisioning fails mid-process due to OpenSearch or analytics seeding failure, THEN THE Sandbox_Service SHALL mark the session status as "failed", clean up any partially-created resources (indices, events, projects, API client records), and return a 503 response with a retry-after header of 30 seconds

### Requirement 2: Cross-Product Demo Data Seeding

**User Story:** As a website visitor, I want my sandbox pre-loaded with realistic demo data, so that I can immediately experience the value of both products.

#### Acceptance Criteria

1. WHEN a sandbox session is provisioned, THE Demo_Data_Seeder SHALL create an OpenSearch index named "sandbox_{session_id}" containing demo products from the selected template
2. WHEN a sandbox session is provisioned, THE Demo_Data_Seeder SHALL seed the search index with at least 150 and at most 200 demo products from the template catalog
3. WHEN a sandbox session is provisioned, THE Demo_Data_Seeder SHALL create an analytics project with is_sandbox set to true and generate 7 days of synthetic event history with the environment field set to "sandbox" on every event
4. WHEN seeding analytics events, THE Demo_Data_Seeder SHALL generate between 3000 and 4000 total events (daily_event_count multiplied by days_back) distributed across the 7-day window with a peak-hour bias centered around hour 14 local time
5. WHEN seeding analytics events, THE Demo_Data_Seeder SHALL produce events with at least 3 distinct event names, at least the template-configured user count of distinct user IDs, and a MENA-weighted geographic distribution where at least 50% of events originate from SA and the remainder from AE, EG, KW, and BH
6. WHEN seeding analytics events, THE Demo_Data_Seeder SHALL generate sessions following the 30-minute inactivity timeout rule, with each funnel step's conversion rate within 10 percentage points of the template-configured session pattern conversion rates
7. WHEN a sandbox session is provisioned, THE Demo_Data_Seeder SHALL complete all search and analytics seeding within 5 seconds from the start of the provisioning request
8. IF search data seeding succeeds but analytics seeding fails, or vice versa, THEN THE Demo_Data_Seeder SHALL roll back all partially-created resources and report the provisioning as failed

### Requirement 3: Sandbox Re-entry

**User Story:** As a returning visitor, I want to resume my sandbox session, so that I can continue exploring without starting over.

#### Acceptance Criteria

1. WHEN a visitor presents a valid Sandbox_Token for an active session, THE Sandbox_Service SHALL retrieve the associated session and return the session status, analytics_project_id, search index identifier, API key prefix, demo template name, expires_at timestamp, and usage metrics (search_count, analytics_views, api_calls)
2. WHEN a sandbox token is validated, THE Sandbox_Service SHALL first check Redis cache for the session mapping before falling back to PostgreSQL
3. WHEN a Redis cache miss occurs during token validation, THE Sandbox_Service SHALL query PostgreSQL and re-cache the result in Redis with a TTL equal to the time remaining until session expiry
4. WHEN a visitor accesses a sandbox session, THE Sandbox_Service SHALL update the last_accessed_at timestamp on the session record within the same request lifecycle
5. WHEN a visitor presents an expired Sandbox_Token, THE Sandbox_Service SHALL return a 410 Gone response with a message indicating the sandbox has expired
6. IF a visitor presents a Sandbox_Token that does not match any session record in Redis or PostgreSQL, THEN THE Sandbox_Service SHALL return a 404 response with a message indicating the session was not found
7. IF a visitor presents a Sandbox_Token for a session with status "converted" or "destroyed", THEN THE Sandbox_Service SHALL return a 410 Gone response with a message indicating the sandbox is no longer available

### Requirement 4: Demo Templates

**User Story:** As a website visitor, I want to choose from industry-specific demo templates, so that I can see data relevant to my business type.

#### Acceptance Criteria

1. THE Sandbox_Service SHALL support at least three demo templates: ecommerce, saas, and media, each stored as a Demo_Template record with an active boolean flag indicating availability for selection
2. WHEN a visitor requests available templates, THE Sandbox_Service SHALL return only templates where the active flag is true, including for each template: id, name, description (maximum 500 characters), product count, and event types, without requiring authentication
3. WHEN a sandbox creation request specifies a template, THE Sandbox_Service SHALL validate that the template references a Demo_Template record with its active flag set to true
4. IF a sandbox creation request specifies a template that does not exist or has its active flag set to false, THEN THE Sandbox_Service SHALL reject the request with an error response indicating whether the template was not found or is inactive, and SHALL NOT create the sandbox
5. WHEN a template is used for seeding, THE Demo_Data_Seeder SHALL generate product entries up to the template-configured product catalog size cap of 200 items and daily event entries up to the cap of 1000, discarding any generated data that would exceed these caps
6. IF no Demo_Template records have their active flag set to true, THEN THE Sandbox_Service SHALL return an empty list when a visitor requests available templates

### Requirement 5: Sandbox Session Extension

**User Story:** As a visitor who needs more time, I want to extend my sandbox expiry, so that I can continue evaluating the product.

#### Acceptance Criteria

1. WHEN an authenticated sandbox user requests an extension specifying a whole number of days between 1 and 14 inclusive, THE Sandbox_Service SHALL extend the session expiry by the requested number of days and return the new expiry date in the response
2. WHILE extending a session, THE Sandbox_Service SHALL enforce a maximum total lifetime of 30 days from the original creation date
3. IF an extension request would exceed the 30-day maximum, THEN THE Sandbox_Service SHALL reject the request and return the current expiry date together with the maximum allowed extension in days
4. IF the sandbox session has already expired at the time of the extension request, THEN THE Sandbox_Service SHALL reject the request with an error indication that the session has expired
5. WHEN a session is extended, THE Sandbox_Service SHALL update both the PostgreSQL record and the Redis cache TTL to reflect the new expiry within a single operation such that if either update fails the session expiry remains unchanged
6. IF the extension request specifies a value outside the range of 1 to 14 whole days, THEN THE Sandbox_Service SHALL reject the request with an error indicating the permitted range

### Requirement 6: Sandbox to Trial Conversion

**User Story:** As a visitor ready to commit, I want to convert my sandbox into a trial account, so that I keep all the data and configurations I explored.

#### Acceptance Criteria

1. WHEN a visitor submits a conversion request with a valid sandbox token, email address, password, display name, and terms acceptance, THE Sandbox_Service SHALL create a user account, transition the sandbox session status to "converted", and set the converted_at timestamp
2. WHEN a sandbox is converted, THE Sandbox_Service SHALL update the API client record to set is_sandbox to false and is_guest to false, linking it to the new user account
3. WHEN a sandbox is converted, THE Sandbox_Service SHALL update the analytics project to set is_sandbox to false with ownership transferred to the new user
4. WHEN a sandbox is converted, THE Sandbox_Service SHALL preserve all search index documents and analytics event records such that the document count and event count are identical before and after conversion
5. WHEN a sandbox is converted, THE Sandbox_Service SHALL set the trial expiry to 14 days from conversion and delete the Redis sandbox key
6. IF a conversion request uses an email that already has an existing account, THEN THE Sandbox_Service SHALL reject the conversion request with a conflict response indicating the email is taken and offering options to merge data into the existing account, use a different email, or log in to the existing account
7. IF the sandbox session has already been converted, THEN THE Sandbox_Service SHALL reject the conversion request with an error response indicating the sandbox has already been converted
8. IF the sandbox session has expired at the time of conversion, THEN THE Sandbox_Service SHALL reject the conversion request with an error response indicating the sandbox is no longer active
9. IF a conversion encounters a system error mid-process, THEN THE Sandbox_Service SHALL leave the sandbox session in "active" status with all data and flags unchanged

### Requirement 7: Automated Cleanup of Expired Sandboxes

**User Story:** As a system operator, I want expired sandboxes automatically cleaned up, so that the VPS resources remain within budget.

#### Acceptance Criteria

1. THE Cleanup_Scheduler SHALL run a cleanup cycle every 6 hours, skipping the cycle if a previous cleanup cycle is still in progress
2. WHEN a cleanup cycle runs, THE Cleanup_Scheduler SHALL identify all sandbox sessions where status is "active" and expires_at is earlier than the current time
3. WHEN cleaning an expired session, THE Cleanup_Scheduler SHALL perform the following operations in order: delete the OpenSearch index "sandbox_{session_id}", purge associated analytics events and project, soft-delete the API client, and delete the Redis session key, and upon successful completion of all operations set the session status to "cleaned"
4. IF any individual cleanup operation fails for a session, THEN THE Cleanup_Scheduler SHALL log the failure, skip the remaining operations for that session, leave the session status as "active" for retry in the next cycle, and continue processing the next session in the batch
5. WHEN processing expired sessions, THE Cleanup_Scheduler SHALL batch process in groups of 50 with a maximum processing time of 120 seconds per batch to avoid long-running transactions
6. WHEN a cleanup cycle completes, THE Cleanup_Scheduler SHALL log a report containing counts of expired sessions found, sessions successfully cleaned, search indices deleted, analytics data purged, and errors encountered with corresponding session identifiers

### Requirement 8: Data Isolation

**User Story:** As a system operator, I want sandbox data completely isolated from production, so that sandbox activity has zero impact on paying customers.

#### Acceptance Criteria

1. THE Sandbox_Service SHALL use a "sandbox_" prefix for all sandbox OpenSearch indices to prevent production search queries from scanning sandbox data
2. THE Demo_Data_Seeder SHALL tag all sandbox analytics events with environment set to "sandbox" to ensure production dashboards exclude them
3. THE Sandbox_Service SHALL mark all sandbox projects with is_sandbox set to true so the query layer can enforce project-level filtering
4. WHILE a production search query executes, THE Sandbox_Service SHALL exclude all indices matching the "sandbox_" prefix from the query scope so that no sandbox documents appear in production results
5. WHILE a production analytics query executes for a non-sandbox project, THE Sandbox_Service SHALL apply a filter condition excluding events where environment equals "sandbox" or where the associated project has is_sandbox set to true
6. IF a production API key is used to request data from a project marked with is_sandbox set to true, THEN THE Sandbox_Service SHALL reject the request with an error indicating access is denied to sandbox resources
7. IF a query result set is found to contain documents originating from a sandbox index or sandbox-tagged events after filtering, THEN THE Sandbox_Service SHALL discard those results before returning the response and SHALL log the isolation violation for operator review

### Requirement 9: Rate Limiting and Quota Enforcement

**User Story:** As a system operator, I want per-IP rate limits on sandbox creation, so that abuse does not exhaust VPS resources.

#### Acceptance Criteria

1. WHILE a visitor's IP address has 3 or more sandbox sessions in "active" state, THE Sandbox_Service SHALL reject new sandbox creation requests from that IP address with an error response indicating the concurrent session limit has been reached
2. WHILE an IP address has created 5 or more sandboxes within a rolling 60-minute window, THE Sandbox_Service SHALL reject further creation requests with a rate limit exceeded response
3. WHEN a rate limit or quota is exceeded, THE Sandbox_Service SHALL return a response indicating the limit type that was exceeded and the number of seconds until the visitor may retry
4. THE Sandbox_Service SHALL track active sandbox counts and creation rates per IP address using Redis counters
5. WHEN a second or subsequent sandbox creation request arrives from the same IP within a rolling 60-minute window, THE Sandbox_Service SHALL require CAPTCHA verification before proceeding with sandbox creation
6. IF CAPTCHA verification fails or is not completed within 120 seconds, THEN THE Sandbox_Service SHALL reject the sandbox creation request with an error response indicating verification failure

### Requirement 10: Sandbox Authentication

**User Story:** As a developer integrating sandbox access, I want sandbox tokens treated as a first-class auth mechanism, so that sandbox users can access both search and analytics seamlessly.

#### Acceptance Criteria

1. WHEN a request includes a Bearer token that is exactly 64 characters long and does not contain a period separator, THE Sandbox_Auth_Middleware SHALL treat it as a sandbox token, validate it against the stored hash, and inject the sandbox context (session ID, project ID, client ID, permissions, and expiry timestamp) into the request state
2. IF a Bearer token matches the sandbox token format but does not correspond to any active sandbox session, THEN THE Sandbox_Auth_Middleware SHALL return a 401 Unauthorized response with an error message indicating the token is invalid or expired
3. THE Sandbox_Auth_Middleware SHALL restrict sandbox-authenticated requests to the permission set of "search" and "autocomplete" only for the search API
4. IF a sandbox-authenticated request attempts an operation outside the allowed permission set, THEN THE Sandbox_Auth_Middleware SHALL return a 403 Forbidden response with an error message indicating the denied operation and the allowed permissions
5. WHEN a sandbox token is presented to the analytics dashboard endpoints, THE Sandbox_Auth_Middleware SHALL grant access limited to read-only analytics queries (summary, top-events, recent-events, funnel, retention, timeseries) scoped to the sandbox project only, and SHALL deny access to project settings, API key management, and data export endpoints
6. THE Sandbox_Service SHALL store sandbox tokens hashed (SHA-256) in PostgreSQL and store the token-to-session mapping in Redis with a TTL equal to the session expiry duration of 7 days

### Requirement 11: Sandbox Analytics Dashboard

**User Story:** As a website visitor, I want to view a read-only analytics dashboard for my sandbox, so that I can evaluate the analytics product with realistic data.

#### Acceptance Criteria

1. WHEN a visitor accesses the sandbox analytics dashboard route with a valid Sandbox_Token, THE Sandbox_Service SHALL render the analytics dashboard with all read operations available (viewing charts, applying date range filters, selecting event filters, and navigating between analytics pages) and all write operations disabled (creating/editing funnels, saving dashboards, creating/editing cohorts, modifying event rules, and exporting data)
2. WHILE displaying a sandbox analytics dashboard, THE Sandbox_Service SHALL show a persistent banner at the top of every page indicating sandbox mode and containing a call-to-action that navigates the visitor to the sandbox-to-trial conversion flow
3. WHILE a sandbox analytics session is active, THE Sandbox_Service SHALL filter all analytics data to the sandbox project only
4. WHILE in sandbox mode, THE Sandbox_Service SHALL disable project settings modification, SDK setup instructions, and webhook configuration by rendering those controls in a non-interactive state
5. IF a sandbox user attempts a disabled write operation, THEN THE Sandbox_Service SHALL display an inline message indicating the action requires a trial account and provide a link to the conversion flow

### Requirement 12: Resource Budget Enforcement

**User Story:** As a system operator, I want each sandbox bounded to a resource budget, so that the shared VPS infrastructure remains performant.

#### Acceptance Criteria

1. IF a sandbox attempts to index more than 200 products, THEN THE Sandbox_Service SHALL reject the indexing request and return an error indicating the product limit has been reached while preserving all previously indexed products
2. IF a sandbox attempts to store more than 5000 analytics events, THEN THE Sandbox_Service SHALL reject the event ingestion request and return an error indicating the event limit has been reached while preserving all previously stored events
3. THE Sandbox_Service SHALL support a maximum of 100 concurrent active sandboxes within the total resource budget of 500MB OpenSearch and 200MB PostgreSQL
4. IF the number of active sandboxes reaches 100 or total OpenSearch memory usage exceeds 475MB or total PostgreSQL usage exceeds 190MB, THEN THE Sandbox_Service SHALL return a 503 status code for new sandbox creation requests while continuing to serve existing sandboxes
5. WHEN a sandbox has had no API request for more than 24 hours, THE Sandbox_Service SHALL classify the sandbox as inactive and exclude it from the active sandbox count

### Requirement 13: Error Handling and Recovery

**User Story:** As a website visitor, I want graceful error handling during sandbox operations, so that failures do not leave me with a broken experience.

#### Acceptance Criteria

1. IF sandbox provisioning fails mid-process (OpenSearch index creation or analytics seeding failure), THEN THE Sandbox_Service SHALL mark the session as "failed", remove any partially-created OpenSearch indices and seeded analytics data within 10 seconds, and return a 503 response with a retry-after header of 30 seconds
2. IF a conversion request fails due to an internal system error (unhandled exception, dependency timeout, or infrastructure failure — excluding client input validation errors), THEN THE Sandbox_Service SHALL roll back any in-progress modifications and preserve the sandbox in its last successfully committed state without partial modifications
3. IF the cleanup scheduler encounters errors while cleaning a specific session, THEN THE Cleanup_Scheduler SHALL log the error, skip that session, continue processing remaining sessions, and retry the failed session on the next scheduled cleanup cycle up to a maximum of 3 retry attempts before flagging it for manual review
4. IF the number of active sandbox sessions reaches 90% of the configured maximum capacity, THEN THE Sandbox_Service SHALL trigger an emergency cleanup of sandboxes that have received no API requests for more than 3 days and alert administrators via error tracking
5. IF a sandbox session flagged as "failed" from a provisioning error is retried by the same visitor within 5 minutes, THEN THE Sandbox_Service SHALL attempt a fresh provisioning rather than resuming the failed attempt
