---
inclusion: manual
---

# AWS Migration Handoff — Payment & Billing System

This document provides context for the future "migrate to AWS + switch to Stripe" spec. It captures decisions made during the SaaS payment integration (July 2026) and outlines what needs to happen when the migration is triggered (target: September 2026 after US LLC formation).

## What Was Built (Phase 1 — Polar.sh on VPS)

The `saas-payment-integration` spec implemented a provider-agnostic payment system in `skawr-backend/skawr-indexer/` with these abstraction points:

### Protocol Interfaces (swap these for AWS adapters)

| Protocol | Location | Current Implementation | AWS Target |
|----------|----------|----------------------|------------|
| `PaymentProvider` | `app/payments/protocols.py` | `PolarAdapter` (polar-sdk) | `StripeAdapter` (stripe-python) |
| `TaskScheduler` | `app/payments/scheduler.py` | `InProcessScheduler` (APScheduler/BackgroundTasks) | SQS + Lambda, or ECS scheduled tasks |
| `NotificationBackend` | `app/payments/notifications.py` | `SmtpNotificationBackend` (aiosmtplib) | `SesNotificationBackend` (boto3 SES) |

### Provider Selection

Active provider is selected via `PAYMENT_PROVIDER` env var in `app/payments/factory.py`. Adding Stripe means:
1. Implement `StripeAdapter` conforming to `PaymentProvider` protocol
2. Set `PAYMENT_PROVIDER=stripe` in env
3. Add Stripe-specific env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, product IDs)

### Database Schema

Billing tables are provider-agnostic:
- `subscriptions` — stores `provider_subscription_id` (works for both Polar and Stripe IDs)
- `webhook_events` — has `provider` column ('polar' or 'stripe') for distinguishing sources
- `subscription_events` — audit trail, no provider coupling

### Existing Terraform (Ready to Deploy)

The Terraform config at `skawr-backend/infrastructure/skawr-indexer/` already includes:
- VPC, ECS Fargate (1vCPU/2GB), RDS PostgreSQL, ALB, ECR, Redis (ElastiCache)
- OpenSearch (t3.small.search)
- Secrets Manager for env vars
- CodePipeline for CI/CD
- Estimated baseline: ~$180–200/mo

### What Doesn't Exist Yet (Tasks for the Migration Spec)

## Migration Tasks (September 2026)

### Prerequisites (Human Tasks)
- [ ] Form Wyoming/Delaware LLC (1–3 days)
- [ ] Get EIN from IRS (same day)
- [ ] Open Mercury bank account (same day)
- [ ] Create Stripe account with LLC EIN (same day)
- [ ] Create Stripe products mirroring Polar products (3 tiers × 2 intervals = 6 products)
- [ ] Configure Stripe Billing (dunning emails, retry schedule, customer portal)
- [ ] Set up Stripe Tax if needed (for international sales tax compliance)

### Code Tasks

1. **Stripe Adapter** (`app/payments/stripe_adapter.py`)
   - Implement `PaymentProvider` protocol using `stripe` Python library
   - Map tier config to Stripe Price IDs (env vars: `STRIPE_STARTER_MONTHLY_PRICE_ID`, etc.)
   - Use Stripe Checkout Sessions for checkout (hosted page)
   - Use Stripe Customer Portal for self-serve billing management
   - Use Stripe Billing for subscription lifecycle (upgrade/downgrade via subscription update)
   - Use Stripe Webhook signature verification (`stripe.Webhook.construct_event`)
   - Normalize Stripe webhook events into `NormalizedWebhookEvent`
   - Stripe handles dunning/retries natively (configure in Dashboard) — adapter maps `invoice.payment_failed` to `payment.failed`
   - Key difference from Polar: Stripe has native proration, usage-based billing (Stripe Metering), and Customer Portal

2. **SES Notification Backend** (`app/payments/ses_backend.py`)
   - Implement `NotificationBackend` protocol using boto3 SES
   - Use SES templates for transactional emails (trial warning, payment failed, etc.)
   - Verify sender domain in SES before deployment
   - IAM role for ECS task needs `ses:SendEmail` permission

3. **SQS/ECS Task Scheduler** (`app/payments/aws_scheduler.py`)
   - Option A: SQS + Lambda — publish scheduled messages to SQS with delay, Lambda processes
   - Option B: ECS Scheduled Tasks (cron) — simpler, just runs the same Python code on a schedule
   - Option B is recommended (matches current APScheduler approach, minimal code change)
   - Implement `TaskScheduler` protocol — `schedule_task` creates an EventBridge rule targeting ECS

4. **Subscriber Migration Script**
   - Export active Polar subscriptions (API call to list all active subscriptions)
   - For each: create Stripe Customer, create Stripe Subscription (matching tier + interval)
   - Coordinate cutover: run Polar and Stripe webhooks in parallel briefly, then disable Polar
   - Send email to customers: "We've upgraded our billing — no action needed, same price, same plan"
   - Cutover window: do this when you have <10 clients to minimize risk

5. **Webhook Endpoint Update**
   - Add `/api/v1/webhooks/stripe` route (keep `/api/v1/webhooks/polar` for transition period)
   - Both routes use the same normalization → dispatch pipeline
   - After migration complete, remove Polar webhook route

6. **Terraform Deployment**
   - Apply existing Terraform to create AWS infrastructure
   - Push Docker image to ECR
   - Configure Secrets Manager with Stripe keys + SES credentials
   - Update ALB/Route53 to point `api.ziyad.one` to new ALB (or keep VPS as fallback)
   - Verify health checks pass

7. **Stripe-Specific Features (Optional Enhancements)**
   - Stripe Metering for usage-based overage billing (replaces manual overage calculation)
   - Stripe Tax for automatic tax calculation
   - Stripe Revenue Recognition for accounting
   - Stripe Customer Portal (replaces custom billing portal frontend — may simplify dashboard code)

### Cost Comparison Post-Migration

| Item | VPS (current) | AWS |
|------|---------------|-----|
| Compute | ~$25/mo (Contabo) | ~$50–70/mo (ECS Fargate) |
| Database | Included | ~$30/mo (RDS t3.micro) |
| Search | Included (Docker OpenSearch) | ~$50/mo (OpenSearch t3.small) |
| Cache | Included (Docker Redis) | ~$15/mo (ElastiCache t3.micro) |
| Load balancer | Traefik (free) | ~$20/mo (ALB) |
| Payment processing | Polar 5%+$0.50 | Stripe 2.9%+$0.30 |
| Email | Gmail SMTP (free) | SES ~$0.10/1K emails |
| **Total (5 Growth clients)** | ~$55/mo | ~$195/mo |
| **Revenue (5 Growth clients)** | ~$465/mo (after Polar fees) | ~$481/mo (after Stripe fees) |
| **Margin** | $410/mo | $286/mo |

Key insight: AWS migration makes financial sense only when the Stripe fee savings on a growing client base outweigh the higher infrastructure cost. Breakeven is ~15 Growth-equivalent clients where Stripe saves more than AWS costs extra.

### When to Trigger This Migration

- You have the US LLC + Stripe account active
- You have 3+ paying clients (justifies the infra cost)
- OR you need the AWS SLA guarantees for a Scale-tier client
- OR you're hitting VPS resource limits (>70% CPU sustained, p99 >500ms)

### Key Decisions to Make at Migration Time

1. **Stripe Customer Portal vs custom billing portal?** — Stripe's portal handles plan changes, payment method updates, and invoice history for free. Could eliminate the custom billing portal frontend work. Downside: less customization, Stripe branding.
2. **SQS+Lambda vs ECS Scheduled Tasks?** — ECS scheduled tasks are simpler but always-on. Lambda is cheaper for low-frequency tasks (trial checker runs once/hour, not once/second).
3. **Gradual vs big-bang cutover?** — With <10 clients, big-bang is fine. Inform clients, switch DNS, test, done in an afternoon.
4. **Keep VPS as staging?** — The Contabo VPS could become a free staging environment after migration. Don't decommission it immediately.
