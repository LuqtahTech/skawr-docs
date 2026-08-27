# Implementation Plan: Unified Sandbox Service

## Overview

Implement the Unified Sandbox Service as a new router module within skawr-indexer, with supporting changes in skawr-analytics (backend + frontend) and skawr-web. The service provides a persistent, cross-product sandbox environment for prospects to explore Skawr Search and Analytics without signup.

Implementation spans three codebases:
- **skawr-indexer** (primary): Sandbox session manager, demo data seeder, cleanup scheduler, auth middleware, API endpoints
- **skawr-analytics** (backend + frontend): Sandbox project support, read-only dashboard mode
- **skawr-web**: Sandbox entry point and search playground

## Tasks

- [ ] 1. Database models and migration (skawr-indexer)
  - [ ] 1.1 Create Alembic migration for sandbox tables and model extensions
    - Add `SandboxSession` table with all columns (id, token, ip_address, fingerprint, email, client_id, analytics_project_id, search_index_id, demo_template, status, created_at, expires_at, last_accessed_at, converted_at, converted_user_id, search_count, analytics_views, api_calls)
    - Add composite indices: `idx_sandbox_expires`, `idx_sandbox_status_expires`, `idx_sandbox_ip`
    - Add `DemoTemplate` table (id, name, description, product_catalog JSONB, product_count, event_schema JSONB, daily_event_count, user_count, session_pattern JSONB, is_active, created_at)
    - Extend `APIClient` model: add `is_sandbox` boolean (default false, server_default="false")
    - Extend `APIKey` model: add `is_sandbox` boolean and `sandbox_session_id` FK
    - File: `skawr-search/skawr-indexer/alembic/versions/xxxx_add_sandbox_tables.py`
    - Update SQLAlchemy models in `app/models.py` or a new `app/domain/sandbox_entities.py`
    - _Requirements: 1.2, 1.3, 2.1, 4.1_

  - [ ] 1.2 Create demo template seed data fixtures
    - Create JSON fixture files for 3 templates: ecommerce, saas, media
    - Each template: product_catalog (150-200 products), event_schema (3+ event types), session_pattern (funnel + conversion rates), daily_event_count, user_count
    - Ecommerce: electronics/fashion products, pageview→product_viewed→add_to_cart→checkout→purchase funnel
    - SaaS: feature usage events, signup→onboard→activate→retain funnel
    - Media: content consumption events, browse→view→engage→subscribe funnel
    - File: `skawr-search/skawr-indexer/alembic/seed_data/sandbox_templates/`
    - Add Alembic data migration to INSERT templates from fixtures
    - _Requirements: 4.1, 4.2, 2.2, 2.5_

  - [ ]* 1.3 Write property tests for sandbox data model validation
    - **Property 5: Session expiry is 7 days from creation**
    - **Property 8: Extension respects 30-day maximum**
    - **Validates: Requirements 1.4, 5.1, 5.2, 5.3**

- [ ] 2. Sandbox session manager service (skawr-indexer)
  - [ ] 2.1 Implement SandboxSessionManager core class
    - Create `app/services/sandbox_manager.py`
    - Implement `create_session()`: rate limit check → generate token → create APIClient → create session → seed data → create API key → activate → cache in Redis
    - Implement `get_session()`: Redis lookup first, PostgreSQL fallback, re-cache on miss, update last_accessed_at
    - Implement `extend_session()`: validate active status, enforce 30-day max, update PostgreSQL + Redis TTL atomically
    - Implement `destroy_session()`: delete Redis key, delete OpenSearch index, purge analytics, soft-delete client, mark session destroyed
    - Token generation: `secrets.token_urlsafe(48)` for 64-char token
    - Token storage: SHA-256 hash in PostgreSQL, plaintext in Redis with TTL
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.5_

  - [ ] 2.2 Implement convert_session method
    - Create user account (coordinate with auth service)
    - Update APIClient: set is_sandbox=False, is_guest=False, link to user
    - Update analytics project: set is_sandbox=False, transfer ownership
    - Set trial expiry: guest_expires_at = now + 14 days
    - Delete Redis sandbox key
    - Preserve all search index docs and analytics events (no deletion)
    - Handle email conflict (409 Conflict response)
    - Handle already-converted sessions (reject)
    - Handle expired sessions (reject)
    - Ensure atomicity: on system error, leave sandbox in active state unchanged
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ]* 2.3 Write property tests for session lifecycle
    - **Property 1: Sandbox creation round trip**
    - **Property 9: Conversion preserves data and updates flags**
    - **Property 10: Conversion is not repeatable**
    - **Property 11: Email conflict blocks conversion**
    - **Validates: Requirements 1.1, 1.2, 1.3, 3.1, 6.1-6.7**

- [ ] 3. Demo data seeder (skawr-indexer)
  - [ ] 3.1 Implement DemoDataSeeder for search data
    - Create `app/services/sandbox_seeder.py`
    - Implement `seed_search_data()`: create OpenSearch index named `sandbox_{session_id}`, bulk-index products from template catalog (150-200 items)
    - Use pre-configured OpenSearch index template for optimal mappings
    - Load products from template's product_catalog JSONB
    - Create corresponding `SearchIndex` record in PostgreSQL
    - Enforce 200-product cap per template
    - _Requirements: 2.1, 2.2, 2.7, 8.1, 12.1_

  - [ ] 3.2 Implement DemoDataSeeder for analytics events
    - Implement `seed_analytics_data()`: create analytics project (is_sandbox=True), generate 7 days of events
    - Generate user pool with activity levels (power/regular/casual at 10%/30%/60%)
    - MENA-weighted geo distribution: SA 50%, AE 20%, EG 15%, KW 10%, BH 5%
    - Device distribution: mobile 60%, desktop 30%, tablet 10%
    - Peak-hour bias centered at hour 14
    - Funnel event sequences following template conversion rates (±10%)
    - 30-minute session inactivity timeout enforcement
    - All events tagged with environment="sandbox", is_bot=False, is_test=False
    - Bulk INSERT using chunked batches of 500
    - Target: 3000-4000 total events across 7 days
    - Call skawr-analytics backend internal API to create project and insert events
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 8.2, 12.2_

  - [ ]* 3.3 Write property tests for analytics seeding
    - **Property 3: Analytics seeding temporal and statistical validity**
    - **Property 4: Session inactivity timeout invariant**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6**

  - [ ]* 3.4 Write property tests for search data seeding
    - **Property 2: Sandbox index naming and population**
    - **Validates: Requirements 2.1, 2.2, 8.1, 12.1**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Rate limiting and quota enforcement (skawr-indexer)
  - [ ] 5.1 Implement per-IP rate limiting and quota checks
    - Create `app/services/sandbox_rate_limiter.py`
    - Implement concurrent quota: max 3 active sessions per IP (query PostgreSQL)
    - Implement hourly rate limit: max 5 creations per IP per rolling 60-minute window (Redis counter with TTL)
    - Return 429 with retry-after header when limits exceeded
    - Include limit type and seconds-until-retry in error response
    - Track creation counts using Redis sorted sets or counters
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 5.2 Implement CAPTCHA verification for repeat creations
    - Require CAPTCHA on 2nd+ sandbox creation within 60-minute window from same IP
    - 120-second timeout for CAPTCHA completion
    - Reject with verification failure error if CAPTCHA fails/times out
    - _Requirements: 9.5, 9.6_

  - [ ] 5.3 Implement resource budget enforcement
    - Check total active sandbox count (max 100)
    - Check OpenSearch memory usage (max 475MB triggers 503)
    - Check PostgreSQL usage (max 190MB triggers 503)
    - Return 503 for new sandbox creation when limits reached, continue serving existing
    - Classify sandboxes with no API request for 24h as inactive (exclude from count)
    - _Requirements: 12.3, 12.4, 12.5_

  - [ ]* 5.4 Write property tests for rate limiting
    - **Property 17: Per-IP concurrent quota enforcement**
    - **Property 18: Per-IP hourly rate limit enforcement**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 6. Sandbox auth middleware (skawr-indexer)
  - [ ] 6.1 Implement SandboxAuthMiddleware
    - Create `app/middleware/sandbox_auth.py`
    - Detect sandbox tokens: Bearer token that is exactly 64 chars and contains no period separator
    - Validate token against Redis (fast path) then PostgreSQL (fallback)
    - Inject sandbox context into request state: session_id, project_id, client_id, permissions, expiry
    - Return 401 if token invalid or expired
    - Enforce permission set: only "search" and "autocomplete" for search API
    - Return 403 if sandbox request attempts disallowed operations
    - For analytics endpoints: grant read-only access to summary, top-events, recent-events, funnel, retention, timeseries scoped to sandbox project only
    - Deny access to project settings, API key management, data export from sandbox tokens
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 6.2 Write property tests for sandbox auth
    - **Property 19: Sandbox API key permission restriction**
    - **Property 20: Sandbox analytics data filtering**
    - **Validates: Requirements 10.2, 10.3, 10.4, 11.3**

- [ ] 7. Sandbox API router (skawr-indexer)
  - [ ] 7.1 Implement sandbox router endpoints
    - Create `app/api/sandbox_routes.py`
    - `POST /api/v1/sandbox/create`: no auth required, accepts template + optional email, returns SandboxCreateResponse
    - `GET /api/v1/sandbox/session`: Bearer sandbox_token, returns session details + usage stats
    - `POST /api/v1/sandbox/extend`: Bearer sandbox_token, accepts days (1-14), returns new expiry
    - `POST /api/v1/sandbox/convert`: Bearer sandbox_token, accepts email/password/name/accept_terms
    - `DELETE /api/v1/sandbox/session`: Bearer sandbox_token, returns 204
    - `GET /api/v1/sandbox/templates`: no auth, returns active templates list
    - Wire into main FastAPI app via router include
    - _Requirements: 1.1, 1.5, 3.1, 4.2, 5.1, 6.1_

  - [ ] 7.2 Implement request/response schemas (Pydantic models)
    - Create `app/schemas/sandbox_schemas.py` or extend `app/schemas.py`
    - SandboxCreateRequest, SandboxCreateResponse
    - SandboxSessionResponse, SandboxUsageStats
    - SandboxExtendRequest, SandboxExtendResponse
    - SandboxConvertRequest, SandboxConvertResponse
    - TemplateListResponse, TemplateInfo
    - Input validation: template must be active, days must be 1-14, email format
    - _Requirements: 1.5, 4.2, 5.1, 5.6, 6.1_

  - [ ]* 7.3 Write unit tests for sandbox router endpoints
    - Test create endpoint with valid/invalid templates
    - Test session retrieval with valid/expired/invalid tokens
    - Test extension with various day values and boundary conditions
    - Test conversion with valid data, email conflicts, expired sessions
    - Test templates endpoint returns only active templates
    - _Requirements: 1.1-1.6, 3.1-3.7, 4.2-4.6, 5.1-5.6, 6.1-6.9_

- [ ] 8. Data isolation enforcement (skawr-indexer)
  - [ ] 8.1 Implement production query isolation from sandbox data
    - Modify search query execution to exclude indices with "sandbox_" prefix when API key is not a sandbox key
    - Add `X-Skawr-Sandbox: 1` header to responses from sandbox API keys
    - Ensure sandbox search queries only hit the sandbox's own index
    - Add safety check: if any sandbox document appears in production results, discard and log
    - _Requirements: 8.1, 8.4, 8.6, 8.7_

  - [ ]* 8.2 Write property tests for data isolation
    - **Property 15: Production search never touches sandbox indices**
    - **Property 16: Production analytics excludes sandbox events**
    - **Validates: Requirements 8.4, 8.5**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Cleanup scheduler (skawr-indexer)
  - [ ] 10.1 Implement SandboxCleanupScheduler
    - Create `app/services/sandbox_cleanup.py`
    - Run every 6 hours via APScheduler (cron trigger)
    - Skip cycle if previous cleanup still in progress (use Redis lock)
    - Query expired sessions: status="active" AND expires_at < now()
    - Batch processing: groups of 50, max 120 seconds per batch
    - Per-session cleanup order: delete OpenSearch index → purge analytics events/project → soft-delete APIClient → delete Redis key → set status="cleaned"
    - On per-session failure: log error, skip session (leave as "active" for retry), continue batch
    - Max 3 retry attempts per session before flagging for manual review
    - Log cleanup report: expired found, cleaned, search deleted, analytics purged, errors
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ] 10.2 Implement emergency cleanup trigger
    - When active sessions reach 90% of max capacity (90 sandboxes)
    - Emergency cleanup: remove sandboxes idle > 3 days
    - Alert administrators via error tracking (Sentry/GlitchTip)
    - _Requirements: 13.4_

  - [ ]* 10.3 Write property tests for cleanup scheduler
    - **Property 12: Cleanup identifies exactly expired sessions**
    - **Property 13: Cleanup removes all session resources**
    - **Property 14: Cleanup batch size invariant**
    - **Property 23: Cleanup fault tolerance**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 13.3**

- [ ] 11. Error handling and provisioning failure recovery (skawr-indexer)
  - [ ] 11.1 Implement provisioning failure rollback
    - On OpenSearch or analytics seeding failure: mark session as "failed"
    - Clean up partial resources within 10 seconds (orphan indices, partial events, API client records)
    - Return 503 with retry-after: 30 header
    - If same visitor retries within 5 minutes of a "failed" session, attempt fresh provisioning
    - _Requirements: 1.6, 13.1, 13.5_

  - [ ]* 11.2 Write property tests for failure atomicity
    - **Property 21: Provisioning failure atomicity**
    - **Property 22: Conversion failure atomicity**
    - **Validates: Requirements 13.1, 13.2**

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Analytics backend sandbox support (skawr-analytics)
  - [ ] 13.1 Extend analytics Project model with sandbox fields
    - Add `is_sandbox` boolean column (default False, server_default="false") to Project model
    - Add `sandbox_session_token` string column (nullable, indexed) to Project model
    - Create Alembic migration in `skawr-analytics/backend/migrations/`
    - Update query layer: production analytics queries exclude projects where is_sandbox=True
    - Exclude events where environment="sandbox" from non-sandbox project queries
    - _Requirements: 8.2, 8.3, 8.5_

  - [ ] 13.2 Add sandbox project creation endpoint to analytics backend
    - Add internal endpoint or service function for sandbox router to call
    - Accept project creation with is_sandbox=True and sandbox_session_token
    - Accept bulk event insertion for sandbox seeding
    - Enforce read-only mode for sandbox projects (block settings modification, webhook config)
    - Scope sandbox token auth to read-only analytics queries (summary, top-events, recent-events, funnel, retention, timeseries)
    - _Requirements: 2.3, 10.5, 11.1, 11.3, 11.4_

  - [ ]* 13.3 Write unit tests for analytics sandbox isolation
    - Test that production queries exclude sandbox projects
    - Test that sandbox-authenticated requests are read-only
    - Test event filtering by environment="sandbox"
    - _Requirements: 8.2, 8.3, 8.5, 11.1, 11.3_

- [ ] 14. Analytics frontend sandbox dashboard (skawr-analytics)
  - [ ] 14.1 Implement sandbox dashboard route and UI
    - Create new route: `/sandbox/[token]/page.tsx` in `skawr-analytics/frontend/app/`
    - Validate sandbox token on page load via API call to sandbox session endpoint
    - Render full analytics dashboard with all read operations available
    - Disable all write operations: creating/editing funnels, saving dashboards, creating cohorts, modifying event rules, exporting data
    - Show persistent sandbox banner at top with expiry countdown and "Start free trial" CTA
    - Filter all analytics data to sandbox project only
    - Render disabled controls in non-interactive state
    - Show inline message on disabled actions: "This action requires a trial account" with link to conversion
    - Handle expired/invalid tokens: show SandboxExpired component with option to create new sandbox
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 14.2 Write unit tests for sandbox dashboard components
    - Test banner renders with correct expiry
    - Test write operations are disabled
    - Test expired token shows expiry screen
    - _Requirements: 11.1, 11.2, 11.5_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Frontend sandbox entry point (skawr-web)
  - [ ] 16.1 Implement sandbox entry page and search playground
    - Create sandbox entry route (e.g., `/try` or within existing SaaS section)
    - "Try it now" button triggers POST to `/api/v1/sandbox/create`
    - Template selection UI (ecommerce, saas, media) with descriptions
    - On creation success: store sandbox_token in httpOnly cookie
    - Redirect to unified sandbox experience with search playground
    - Search playground: use returned API key to call search endpoint with demo products
    - Display sandbox state: template, product count, event count, expiry
    - Link to analytics dashboard (sandbox URL from response)
    - Conversion CTA: "Start free trial" button → conversion form
    - _Requirements: 1.1, 1.5, 4.2, 6.1_

  - [ ]* 16.2 Write unit tests for sandbox entry components
    - Test template selection and creation flow
    - Test sandbox state display
    - Test conversion CTA navigation
    - _Requirements: 1.5, 4.2_

- [ ] 17. Re-entry and token persistence (skawr-web + skawr-indexer)
  - [ ] 17.1 Implement sandbox re-entry flow
    - On page load, check for sandbox cookie (sandbox_token)
    - If cookie exists: call GET `/api/v1/sandbox/session` to validate
    - If session active: restore sandbox state (search playground + analytics link)
    - If session expired (410): show expiration message + option to create new sandbox
    - If session not found (404): clear cookie, show fresh entry point
    - If session converted (410): clear cookie, redirect to login
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 3.7_

- [ ] 18. Integration wiring and configuration
  - [ ] 18.1 Wire sandbox router into skawr-indexer main app
    - Register sandbox router in `app/main.py` or `app/api/routes.py`
    - Add sandbox middleware to middleware stack
    - Add sandbox configuration constants to `app/config/` (MAX_SANDBOXES_PER_IP=3, SANDBOX_TTL_DAYS=7, etc.)
    - Register cleanup scheduler in application startup lifecycle
    - Add environment variables: SANDBOX_ENABLED, SANDBOX_MAX_CONCURRENT, SANDBOX_TTL_DAYS
    - Update `.env.example` with new sandbox-related variables
    - _Requirements: 1.1, 7.1, 9.1_

  - [ ] 18.2 Wire analytics sandbox support into skawr-analytics
    - Register sandbox token auth in analytics middleware
    - Add sandbox project filtering to all analytics query endpoints
    - Ensure sandbox dashboard route is accessible without standard JWT auth (uses sandbox token)
    - _Requirements: 10.5, 11.1, 11.3_

- [ ] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (23 properties total)
- Unit tests validate specific examples and edge cases
- The sandbox router is within skawr-indexer — no new microservice or Docker container needed
- Analytics seeding communicates with skawr-analytics backend via internal HTTP calls
- The existing guest onboarding flow (#177) in `public_routes.py` is preserved (sandbox is additive, not a replacement)
- Python backend uses `hypothesis` library for property-based tests
- Frontend tests use the existing test framework in each repo (vitest for Next.js apps)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "5.1", "7.2"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.2", "5.2", "5.3", "6.1"] },
    { "id": 3, "tasks": ["2.3", "3.3", "3.4", "5.4", "6.2", "7.1"] },
    { "id": 4, "tasks": ["7.3", "8.1", "10.1", "10.2", "11.1"] },
    { "id": 5, "tasks": ["8.2", "10.3", "11.2", "13.1"] },
    { "id": 6, "tasks": ["13.2", "13.3", "18.1"] },
    { "id": 7, "tasks": ["14.1", "18.2"] },
    { "id": 8, "tasks": ["14.2", "16.1"] },
    { "id": 9, "tasks": ["16.2", "17.1"] }
  ]
}
```
