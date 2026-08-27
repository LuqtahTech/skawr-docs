# Requirements Document

## Introduction

This feature implements the AUTH-C002 "verify-before-privilege" identity model across the Skawr auth and billing surface. The guiding principle is that identity trust is earned progressively: anonymous preview needs no identity, self-service signup produces an authenticated-but-untrusted session, and the only canonical proof of a committed, verified identity is a paid Polar subscription tied to a Polar-verified checkout email.

The feature spans three services:

- **skawr-login** (Zitadel Login v2 BFF): self-service signup, Google sign-in callback, and a new scheduled sweep job.
- **skawr-indexer** (core SaaS API): the Polar webhook provisioning path, the internal entitlement endpoint, and the anonymous guest preview path.
- **skawr-analytics**: the downstream provisioning target (`/api/v1/provision/auto`).

Much of the desired behavior (fail-closed entitlement, guest search-only keys, verified-only Google linking) already exists in the codebase. This document locks that behavior in as testable invariants and specifies the new work: Google auto-reclaim of squatted unverified-never-paid emails, and a 14-day unverified-never-paid expiry sweep. It also adds a cross-service non-functional requirement to guard against regressing the already-merged fail-closed billing/entitlement behavior.

## Glossary

- **Login_Service**: The skawr-login FastAPI BFF (`login.skawr.com`) that renders auth flows and brokers Zitadel session/OIDC calls.
- **Indexer_Service**: The skawr-indexer core SaaS API (`api.skawr.com`), the billing source of truth.
- **Analytics_Service**: The skawr-analytics backend that owns no billing state and provisions accounts on request.
- **Signup_Handler**: The `POST /signup` handler in Login_Service.
- **Google_Callback_Handler**: The `GET /google/callback` handler in Login_Service that completes a Google IDP intent.
- **Expiry_Sweep_Job**: A new scheduled job in Login_Service that first deactivates, and later hard-deletes, stale unverified-never-paid Zitadel users.
- **Provisioning_Handler**: The `subscription.created` handler in Indexer_Service that creates/links an APIClient and triggers Analytics provisioning.
- **Entitlement_Endpoint**: The `GET /api/v1/internal/entitlement` endpoint in Indexer_Service.
- **Guest_Preview_Service**: The anonymous guest/import path in Indexer_Service (`POST /api/v1/guest` and the import guest-mint path).
- **Zitadel**: The OIDC identity provider (`id.skawr.com`), source of truth for user identity and email verification state.
- **Polar**: The payment provider whose checkout produces a Polar-verified customer email.
- **Polar_Verified_Email**: The customer email supplied by Polar in a subscription/checkout webhook payload.
- **Self_Asserted_Email**: An email typed by a user during self-service signup, whose ownership is unproven.
- **Unverified_Session**: A password session created for a user whose Zitadel email `isVerified` is `false`.
- **Never_Paid_Account**: An account whose email is reported as not entitled by the Entitlement_Endpoint (no active or period-valid paid subscription).
- **Search_Only_Key**: A browser-safe `pk_`-prefixed API key granting search/track access only, never account or write access.
- **Service_Token**: The shared `SERVICE_API_TOKEN` bearer credential used for service-to-service authentication.
- **Verification_Age**: The elapsed time since a Zitadel user with an unverified email was created.
- **Deactivate_Threshold**: The configurable Verification_Age (default 30 days), measured from account creation, beyond which an unverified-never-paid account becomes eligible for Deactivation.
- **Delete_Threshold**: The configurable Verification_Age (default 90 days), measured from account creation, beyond which a deactivated unverified-never-paid account becomes eligible for hard deletion.
- **Deactivation**: Reversibly disabling a Zitadel user (Zitadel v2 deactivate) so that the user cannot log in, while retaining the user record and its email; reversed by reactivation when the account owner returns. Because a plain unverified signup email is not stored anywhere outside Zitadel, the deactivated window is the only marketing/nurture reach-out window, and hard deletion is full erasure.

## Requirements

### Requirement 1: Anonymous preview stays unauthenticated and friction-free

**User Story:** As a prospective customer, I want to import and try search without signing up or verifying an email, so that I can evaluate the product with zero friction.

#### Acceptance Criteria

1. WHEN a visitor requests a guest preview, THE Guest_Preview_Service SHALL create a guest client without requiring an email address, a password, or email verification.
2. WHEN the Guest_Preview_Service creates a guest client, THE Guest_Preview_Service SHALL issue exactly one Search_Only_Key and SHALL NOT mint a secret full-access (`sk_`) key.
3. WHEN a guest client is created, THE Guest_Preview_Service SHALL set the client to an inactive, non-entitled billing state so that paid API usage is rejected until an active Polar subscription exists.
4. WHEN a guest client is created, THE Guest_Preview_Service SHALL assign a guest expiry timestamp so the ephemeral preview client is eligible for later cleanup.
5. IF a request presents a `pk_`-prefixed Search_Only_Key to exchange for an account session, THEN THE Indexer_Service SHALL reject the request with HTTP status 403.
6. WHERE an optional soft email is captured on the preview path, THE Guest_Preview_Service SHALL treat the captured email as marketing data only and SHALL NOT use the captured email as authentication or entitlement input.

### Requirement 2: Signup creates an authenticated session that is untrusted for privilege

**User Story:** As a new user, I want signup to log me in immediately, so that I get a smooth funnel, while the platform withholds trust until my identity is proven.

#### Acceptance Criteria

1. WHEN the Signup_Handler creates a Zitadel user, THE Signup_Handler SHALL create the user with email `isVerified` set to `false`.
2. WHEN the Signup_Handler creates a user, THE Signup_Handler SHALL request that Zitadel send the native email-verification message to the Self_Asserted_Email.
3. WHEN user creation succeeds, THE Signup_Handler SHALL create a password session and finalize the OIDC auth request so the user is signed in immediately.
4. THE Indexer_Service SHALL treat an Unverified_Session as proof of authentication only and SHALL NOT treat an Unverified_Session as proof of email ownership for any privilege, entitlement, or trust decision.
5. WHILE a signed-in user's email remains unverified and unpaid, THE Indexer_Service SHALL reject paid API usage with HTTP status 402.
6. IF the Self_Asserted_Email is already registered in Zitadel, THEN THE Signup_Handler SHALL return a signup failure that instructs the user to sign in instead.

### Requirement 3: Provisioning and entitlement key off the Polar-verified email

**User Story:** As the platform owner, I want provisioning and entitlement decisions to trust only the Polar-verified checkout email, so that a self-asserted signup email can never grant paid access.

#### Acceptance Criteria

1. WHEN Provisioning_Handler processes a `subscription.created` event, THE Provisioning_Handler SHALL resolve the target account by the Polar_Verified_Email from the webhook payload.
2. IF a `subscription.created` event carries no client identifier and no Polar_Verified_Email, THEN THE Provisioning_Handler SHALL abort provisioning for that event without creating an APIClient.
3. WHEN Provisioning_Handler provisions an Analytics account, THE Provisioning_Handler SHALL send the resolved APIClient email (derived from the Polar_Verified_Email) to the Analytics_Service, and SHALL NOT send a Self_Asserted_Email that was never confirmed by Polar.
4. WHEN Entitlement_Endpoint receives a request, THE Entitlement_Endpoint SHALL require a valid Service_Token and SHALL reject requests lacking a valid Service_Token.
5. WHEN Entitlement_Endpoint evaluates an email with subscription status `active`, THE Entitlement_Endpoint SHALL report the email as entitled.
6. WHILE a subscription status is `cancelled` or `grace_period`, THE Entitlement_Endpoint SHALL report the email as entitled only while the current paid period end is in the future, and SHALL report the email as not entitled once the paid period end has passed.
7. IF an email maps to no APIClient or to any status other than `active`, `cancelled`, or `grace_period`, THEN THE Entitlement_Endpoint SHALL report the email as not entitled.

### Requirement 4: Google auto-reclaim of unverified never-paid squatted emails

**User Story:** As a real email owner, I want signing in with Google to claim my email even if someone squatted it with an unverified never-paid signup, so that I am not blocked by a dead-end error.

#### Acceptance Criteria

1. WHEN a Google-verified identity completes an intent and no linked Zitadel user exists, THE Google_Callback_Handler SHALL resolve the account by the Google-verified email.
2. WHERE an existing Zitadel account matches the Google-verified email and that account's email is verified, THE Google_Callback_Handler SHALL link the Google identity to the existing account and complete sign-in.
3. WHERE an existing Zitadel account matches the Google-verified email and that account is both unverified and a Never_Paid_Account, THE Google_Callback_Handler SHALL delete the stale account and create a Google-linked account for the same email within the same callback.
4. WHEN the Google_Callback_Handler determines whether a matched account is a Never_Paid_Account, THE Google_Callback_Handler SHALL query the Entitlement_Endpoint using the Service_Token.
5. WHEN the Google_Callback_Handler creates a Google-linked account, THE Google_Callback_Handler SHALL create the account with email `isVerified` set to `true`.
6. IF an existing account matching the Google-verified email is verified OR is entitled per the Entitlement_Endpoint, THEN THE Google_Callback_Handler SHALL NOT delete that account.
7. IF the Entitlement_Endpoint is unreachable or returns an error while checking a matched unverified account, THEN THE Google_Callback_Handler SHALL treat the account as entitled for safety and SHALL NOT delete the account.

### Requirement 5: Scheduled expiry sweep of unverified never-paid accounts

**User Story:** As the platform owner, I want stale unverified never-paid accounts deactivated and then removed on a schedule, so that squatted emails are freed after a marketing reach-out window without endangering real customers.

#### Acceptance Criteria

1. WHEN the Expiry_Sweep_Job evaluates a candidate account, THE Expiry_Sweep_Job SHALL query the Entitlement_Endpoint using the Service_Token before either a Deactivation decision or a hard-deletion decision.
2. WHEN a candidate account is unverified AND a Never_Paid_Account AND whose Verification_Age exceeds the Deactivate_Threshold, THE Expiry_Sweep_Job SHALL deactivate the account.
3. WHEN a candidate account is unverified AND a Never_Paid_Account AND already deactivated AND whose Verification_Age exceeds the Delete_Threshold, THE Expiry_Sweep_Job SHALL hard-delete the account.
4. WHERE the Deactivate_Threshold is not explicitly configured, THE Expiry_Sweep_Job SHALL use a default of 30 days.
5. WHERE the Delete_Threshold is not explicitly configured, THE Expiry_Sweep_Job SHALL use a default of 90 days.
6. IF a candidate account has a verified email OR is reported as entitled by the Entitlement_Endpoint, THEN THE Expiry_Sweep_Job SHALL retain the account and SHALL neither deactivate nor hard-delete the account.
7. IF the Entitlement_Endpoint is unreachable or returns an error for a candidate account, THEN THE Expiry_Sweep_Job SHALL retain the account for that run and SHALL neither deactivate nor hard-delete the account.
8. WHEN the Expiry_Sweep_Job deactivates an account that is already deactivated, THE Expiry_Sweep_Job SHALL complete without error, so that repeated runs are idempotent.
9. WHEN the Expiry_Sweep_Job hard-deletes an account that was already deleted in a prior run, THE Expiry_Sweep_Job SHALL complete without error, so that repeated runs are idempotent.
10. WHEN the owner of a deactivated account returns through a successful login, a paid subscription, or a Google reclaim, THE Login_Service SHALL reactivate the account rather than leave the account blocked.

### Requirement 6: Preserve existing signup rate limiting

**User Story:** As the platform owner, I want signup rate limiting kept in place, so that automated abuse of the signup endpoint remains constrained.

#### Acceptance Criteria

1. THE Signup_Handler SHALL enforce a rate limit of 5 signup requests per minute per client address.
2. IF the signup rate limit is exceeded, THEN THE Login_Service SHALL reject the request with HTTP status 429.

### Requirement 7: Safety invariants — never delete or reclaim a verified or paid account

**User Story:** As a paying or verified customer, I want assurance that no automated flow deactivates, deletes, or reclaims my account, so that my access and data are never lost.

#### Acceptance Criteria

1. THE Login_Service SHALL NOT deactivate or delete a Zitadel account whose email is verified.
2. THE Login_Service SHALL NOT deactivate or delete a Zitadel account that the Entitlement_Endpoint reports as entitled.
3. WHERE an account is both unverified and a Never_Paid_Account, THE Login_Service SHALL permit deactivation, deletion, or reclaim only through the Google auto-reclaim path or the Expiry_Sweep_Job.
4. IF entitlement state cannot be determined for an account, THEN THE Login_Service SHALL treat the account as entitled and retain it, and SHALL neither deactivate nor delete the account.
5. WHEN any deactivation, reactivation, deletion, or reclaim decision is made, THE Login_Service SHALL record the account identifier, the trigger (Google reclaim or sweep), the decision type (deactivate, reactivate, delete, or retain), and the entitlement result used for the decision.

### Requirement 8: Cross-service non-functional guarantee (non-regression)

**User Story:** As the platform owner, I want this cross-service change to leave the already-merged fail-closed billing and entitlement behavior intact, so that no privilege escalation is introduced.

#### Acceptance Criteria

1. THE Indexer_Service SHALL continue to reject paid API usage for non-entitled accounts with HTTP status 402 after this feature is implemented.
2. THE Entitlement_Endpoint SHALL continue to fail closed by reporting not-entitled for unknown emails and for any subscription status outside `active`, `cancelled` (period-valid), and `grace_period` (period-valid).
3. WHEN this feature is delivered, THE implementation SHALL include automated regression coverage asserting that provisioning and entitlement decisions use the Polar_Verified_Email and never a Self_Asserted_Email.
4. WHEN this feature is delivered, THE implementation SHALL include automated regression coverage asserting that neither the Google auto-reclaim path nor the Expiry_Sweep_Job deletes a verified or entitled account.
5. THE implementation SHALL keep entitlement checks authenticated by the Service_Token across all consuming services.
