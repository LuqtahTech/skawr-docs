# Launch Readiness — Gap Analysis

> What professional SaaS companies have that we're missing.
> Last updated: July 2026

---

## Already Have ✅

- **Product** — Search works, billing works (Polar.sh subscriptions, trials, dunning)
- **Landing pages** — SaaS landing (`/saas`) + CRO landing (`/cro`)
- **Pricing page with checkout** — `/saas/pricing` → Polar.sh hosted checkout
- **API documentation** — Swagger/OpenAPI at `/docs` on `api.skawr.com`
- **Published SDKs** — `@skawr/search` (npm), Python SDK (PyPI), Flutter SDK (pub.dev)
- **Error tracking** — GlitchTip at `errors.ziyad.one`
- **Web analytics** — Umami at `umami.ziyad.one` + Skawr Analytics (`analytics.skawr.com`)
- **CI/CD** — GitHub Actions across all repos (blue/green deploys for indexer, Amplify for web)
- **Multi-tenant isolation** — Tenant-scoped indexes, API key auth per tenant
- **Rate limiting** — Per-tenant rate limits on `api.skawr.com`
- **SSL/TLS everywhere** — Traefik + Let's Encrypt auto-renewal on VPS, Amplify handles web

---

## Missing / Needed Before Launch 🔴

### 1. Uptime Monitoring

No external monitoring (UptimeRobot, BetterStack, Cronitor). If the VPS goes down at 3am, nobody knows until a customer complains.

**Risk**: Silent outages, SLA violations, lost trust.

### 2. Status Page

No public status page for customers to check. *(Creating one now at `skawr.com/status`)*.

**Risk**: Customers have no self-service way to check if an issue is on their end or ours.

### 3. Alerting

No PagerDuty/Slack/email alerts when services go down. GlitchTip catches errors but doesn't alert on full service unavailability.

**Risk**: Response time measured in hours instead of minutes.

### 4. Backup Verification

R2 backups exist but no automated restore testing. We assume backups work but haven't proven it.

**Risk**: Discovering backups are corrupt during an actual incident.

### 5. Incident Response Plan

No documented procedure for outages. No runbook, no escalation path, no communication template.

**Risk**: Panicking during an incident, forgetting steps, inconsistent customer communication.

### 6. SLA Commitment

Pricing page mentions 99.5%/99.9% SLA but there's no enforcement mechanism — no monitoring to measure uptime, no credit issuance process.

**Risk**: Making promises we can't measure or enforce.

### 7. Customer Communication Channel

No way to notify customers of planned maintenance or incidents. No email list, no in-app banner, no status page subscription.

**Risk**: Customers discover outages on their own, eroding trust.

### 8. Onboarding Email Sequence

No welcome email, no "your trial is expiring" email, no SDK setup guide email. Polar.sh handles billing emails only.

**Risk**: Low activation rate, surprise trial expiry, users not integrating properly.

### 9. Support Channel

No help desk, no chat widget, no `support@skawr.com` listed anywhere. Customers have no way to reach us.

**Risk**: Customers churn silently because they can't get help.

### 10. Changelog

No public changelog for customers to see what's new. Updates happen but nobody outside the team knows.

**Risk**: Customers don't discover new features, don't perceive value improvement.

### 11. API Versioning Strategy

Currently v1 only. No documented deprecation policy, no sunset headers, no migration guides.

**Risk**: Breaking changes with no warning when v2 ships.

---

## Growth Studio Deployment Checklist 🟠

> Added July 2026. Growth Studio is a new internal service (`skawr-growth`) that requires deployment and configuration before the acquisition workflow can run end-to-end.

### Must-do before first use

| # | Item | How | Status |
|---|------|-----|--------|
| 1 | **Deploy Growth stack to VPS** | `docker compose up -d` on Contabo (same as indexer pattern) | ⬜ |
| 2 | **Configure Traefik route** | Add `growth-api.skawr.com` → port 8010 in the Traefik config | ⬜ |
| 3 | **Create CI/CD deploy workflow** | Copy `deploy-indexer.yml` pattern, target `skawr-growth` | ⬜ |
| 4 | **Set up Zitadel Growth project** | Create "Growth" project + audience in `id.skawr.com` admin | ⬜ |
| 5 | **Configure dual-write on skawr-web** | Set `GROWTH_INGRESS_URL/KEY_ID/SECRET` in Amplify env vars | ⬜ |
| 6 | **Share Search SERVICE_API_TOKEN** | Copy from indexer `.env` into Growth's `GROWTH_SEARCH_SERVICE_TOKEN` | ⬜ |
| 7 | **Verify Growth API health** | `curl https://growth-api.skawr.com/health/ready` → status=ready | ⬜ |
| 8 | **Run E2E validation on production DB** | `python3 scripts/e2e_validate.py` against the deployed instance | ⬜ |
| 9 | **Add UptimeRobot monitor** | Monitor `growth-api.skawr.com/health/live` | ⬜ |
| 10 | **Seed MVP sources + catalog** | `python3 scripts/seed.py` on the deployed instance | ⬜ |

### Already configured (local `.env`)

- ✅ Fireworks AI key (`GROWTH_FIREWORKS_API_KEY`)
- ✅ HubSpot CRM token (`GROWTH_HUBSPOT_API_TOKEN`)
- ✅ Google Sheets SA + spreadsheet ID (`GROWTH_SHEETS_*`)
- ✅ Contact-route encryption key (`GROWTH_CONTACT_ROUTE_KEYS`)

### Post-deploy verification

- [ ] CRO audit scan creates a Growth candidate (dual-write working)
- [ ] Reviewer can see accounts in the dashboard at `/growth`
- [ ] Workflow editor loads and can save/publish
- [ ] Approved export appends a row to Google Sheets
- [ ] Kill-switch test: activate → verify action blocked → resume

---

## Nice to Have (Post-Launch) 🟡

| Item | Tools/Options | Why |
|------|---------------|-----|
| **Session replay** | Clarity, rrweb | Debug customer issues without asking them to reproduce |
| **Feature flags** | LaunchDarkly, Flagsmith, Unleash | Gradual rollouts, kill switches, per-tenant features |
| **Customer feedback tool** | Canny, UserVoice | Structured roadmap input from paying customers |
| **Knowledge base / help center** | GitBook, Mintlify, Notion | FAQ + guides to reduce support load |
| **API rate limit headers** | `X-RateLimit-Remaining`, `X-RateLimit-Reset` | Customers can self-manage their usage |
| **Webhook retry dashboard** | Custom UI in client dashboard | Customer-facing failed webhook visibility |
| **Multi-region** | Second VPS in MENA (Bahrain, UAE) | Currently Germany-only, no data residency compliance |
| **Load testing** | k6, Locust, Artillery | No documented capacity limits or breaking points |
| **Penetration testing** | Third-party security audit | No formal security assessment |
| **SOC 2 / ISO 27001** | Compliance program | Not needed yet but enterprise customers will ask |
| **GDPR/PDPL compliance docs** | Legal review + documentation | Saudi Personal Data Protection Law (PDPL) compliance |

---

## Recommended Priority (First Week)

> These are ordered by effort-to-impact ratio. All can be done in a day or less.

### Day 1–2

1. **Sign up for UptimeRobot** (free tier: 50 monitors, 5-min intervals)
   - Monitor: `api.skawr.com/api/v1/health`, `login.skawr.com/health`, `analytics.skawr.com`, `admin.skawr.com`, `dashboard.skawr.com`, `skawr.com`
   - Alert via: Slack webhook + email

2. **Deploy the `/status` page** — already built, just push to `main`

3. **Set up Slack webhook alerts from UptimeRobot** — instant notification on any downtime

### Day 3–4

4. **Create `support@skawr.com`** — even if it just forwards to personal email for now

5. **Add "Contact Support" link** to:
   - Client dashboard footer
   - Pricing page FAQ section
   - API docs sidebar

6. **Write a 3-email onboarding sequence**:
   - Email 1 (immediate): Welcome + quickstart link + SDK install command
   - Email 2 (day 2): "Did you integrate?" + code example + dashboard link
   - Email 3 (day 12): "Your trial expires in 2 days" + upgrade CTA

### Day 5

7. **Document the incident response process** — even if it's simple:
   ```
   1. Alert fires (UptimeRobot → Slack)
   2. SSH to VPS: ssh root@173.212.246.10
   3. Check containers: docker ps --format "table {{.Names}}\t{{.Status}}"
   4. Check logs: docker logs <container> --tail 100
   5. If DB issue: docker exec -it postgres psql -U skawr
   6. If full outage: docker compose -f docker-compose.yml up -d
   7. Update status page (redeploy triggers fresh health checks)
   8. Post-incident: write brief summary in #incidents Slack channel
   ```

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-07 | UptimeRobot over BetterStack | Free tier is sufficient for launch, easy Slack integration |
| 2025-07 | Built-in status page over Statuspage.io | Zero cost, matches brand, no vendor dependency |
| 2025-07 | Email onboarding via SES (not Mailchimp) | Already using SES for notifications, no new vendor |
| 2025-07 | Skip PagerDuty for now | Solo founder, Slack + email is enough until team grows |
