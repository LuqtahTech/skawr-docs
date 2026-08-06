# Launch Tasks — Agent-Ready Work Items

> Concrete tasks for each critical gap. Each task is self-contained and executable.

---

## 🔴 Critical: Uptime Monitoring (UptimeRobot)

**Goal:** Get alerted within 5 minutes of any service going down.

### Tasks
1. **Sign up** — Create account at uptimerobot.com (human task, not automatable)
2. **Add monitors** — Configure these HTTP monitors (5-min interval):
   - `Search API` → `https://api.skawr.com/api/v1/health` (keyword: "ok")
   - `Login` → `https://login.skawr.com/health` (keyword: "ok")
   - `Analytics` → `https://analytics.skawr.com` (status 200)
   - `Admin Dashboard` → `https://admin.skawr.com` (status 200)
   - `Client Dashboard` → `https://dashboard.skawr.com` (status 200)
   - `Website` → `https://skawr.com` (status 200)
   - `SaaS Landing` → `https://skawr.com/search` (status 200)
   - `CRO Landing` → `https://skawr.com/cro` (status 200)
   - `Zitadel` → `https://id.skawr.com` (status 200 or 301)
3. **Add Slack alert** — My Settings → Alert Contacts → Slack webhook
4. **Add email alert** — Add your personal email as backup alert contact
5. **Test** — Pause one monitor, verify alert fires within 5 minutes

**Outcome:** Slack notification within 5 min of any outage.

---

## 🔴 Critical: Alerting Pipeline

**Goal:** Never discover an outage from a customer complaint.

### Tasks
1. **Create a #skawr-alerts Slack channel** (or use existing)
2. **Wire UptimeRobot → Slack webhook** (done in task above)
3. **Wire GlitchTip → Slack** — In GlitchTip settings, add a Slack webhook integration for error spike alerts
4. **Test the pipeline** — Trigger a test alert from both UptimeRobot and GlitchTip, verify Slack delivery

**Outcome:** Single Slack channel receives both downtime alerts and error spikes.

---

## 🔴 Critical: Support Channel

**Goal:** Customers can reach you when they need help.

### Tasks
1. **Create support@skawr.com** — Use Google Workspace or a free forwarding service (ImprovMX free tier: forward to personal email)
2. **Add "Contact Support" to client dashboard** — File: `skawr-dashboards/skawr-dashboard-client/src/components/Layout/Sidebar.tsx` — Add a footer link: `support@skawr.com`
3. **Add support link to pricing page** — File: `skawr-web/app/search/_components/Pricing.jsx` — Add below the tier cards: "Need help? Contact us at support@skawr.com"
4. **Add support link to API docs** — File: `skawr-web/app/search/docs/page.tsx` — Add to sidebar or footer
5. **Set up auto-reply** — Configure email auto-responder: "Thanks for contacting Skawr. We'll reply within 24 hours."

**Outcome:** Visible support contact on all customer-facing surfaces, with guaranteed response acknowledgment.

---

## 🔴 Critical: Onboarding Email Sequence

**Goal:** New users get guided from signup to first successful search within 24 hours.

### Tasks
1. **Create email templates** — 3 emails in HTML (matching Skawr brand):
   - **Email 1 (immediate on signup):** "Welcome to Skawr" — API key shown, SDK install command, quickstart link
   - **Email 2 (day 2 if no events received):** "Did you integrate?" — code snippet, link to dashboard, "reply if you need help"
   - **Email 3 (day 12):** "Your trial expires in 2 days" — usage summary, upgrade CTA to /search/pricing
2. **Implement sending** — In `skawr-search/skawr-indexer/app/payments/notifications.py`:
   - Hook Email 1 into the trial provisioning flow (after Polar webhook creates account)
   - Hook Email 3 into the trial expiry scheduler (2 days before expiry)
3. **Implement Email 2 trigger** — Add a daily cron/scheduled task that checks: "accounts created 48h ago with 0 search API calls" → send Email 2
4. **Configure SES** — Verify `skawr.com` domain in AWS SES (or use the existing aiosmtplib setup)
5. **Test** — Create a test trial, verify all 3 emails arrive at expected times

**Outcome:** Every trial user receives 3 touchpoints driving them toward activation and conversion.

---

## 🔴 Critical: Backup Verification

**Goal:** Prove that backups actually restore correctly.

### Tasks
1. **Add a restore test to CI** — Create `skawr-search/scripts/test_backup_restore.sh`:
   - Pull latest R2 backup (limit to 100 docs)
   - Spin up a temporary OpenSearch container
   - Run `r2_restore.py --limit 100 --recreate`
   - Verify document count matches
   - Tear down container
2. **Schedule monthly restore test** — Add a GitHub Actions workflow (`test-backup-restore.yml`) that runs on the 1st of each month
3. **Document recovery procedure** — Add to `skawr-docs/docs/platform/disaster-recovery.md`:
   - Step 1: SSH to VPS
   - Step 2: `python scripts/r2_restore.py --recreate`
   - Step 3: Verify via health check
   - Step 4: Check product count matches expected
   - Estimated recovery time: ~15 minutes for 5K products, ~1 hour for full index

**Outcome:** Monthly proof that backups restore, plus a documented recovery runbook.

---

## 🔴 Critical: Incident Response Plan

**Goal:** When things break, follow a checklist instead of panicking.

### Tasks
1. **Create `skawr-docs/docs/platform/incident-response.md`** with:
   ```
   ## Incident Severity Levels
   - P1 (Critical): All search down, all customers affected → respond in 15 min
   - P2 (Major): One service down or degraded → respond in 1 hour
   - P3 (Minor): Non-customer-facing issue → respond next business day

   ## Response Steps (P1)
   1. Acknowledge alert in Slack (#skawr-alerts)
   2. SSH to VPS: `ssh root@173.212.246.10`
   3. Check containers: `docker ps --format "table {{.Names}}\t{{.Status}}"`
   4. Check failing service logs: `docker logs <container> --tail 200`
   5. Common fixes:
      - Container crashed → `docker compose up -d <service>`
      - DB connection exhausted → `docker restart postgres`
      - Disk full → `docker system prune -f`
      - OpenSearch OOM → restart with `docker restart opensearch`
   6. Verify recovery: run `./scripts/health_check_all.sh`
   7. If fix takes >30 min: update status page, email affected customers
   8. Post-incident: write 3-line summary in #skawr-alerts

   ## Escalation
   - If you can't SSH → Contabo dashboard → restart VPS
   - If data loss suspected → DO NOT restart, assess first
   ```

**Outcome:** A repeatable playbook for any outage.

---

## 🔴 Critical: SLA Measurement

**Goal:** Know your actual uptime percentage before promising it to customers.

### Tasks
1. **Use UptimeRobot's uptime %** — After 30 days of monitoring, you'll have real data
2. **Remove SLA claims from pricing page until measured** — OR add disclaimer: "SLA commitments begin after 30-day baseline measurement"
3. **After 30 days:** If uptime >99.5%, keep the Growth SLA claim. If >99.9%, keep Scale claim.
4. **Document SLA credit process** — If you violate SLA, what do customers get? (Standard: 10% credit per 0.1% below SLA, capped at 30%)

**Outcome:** Data-backed SLA claims, not aspirational ones.

---

## 🔴 Critical: Customer Communication

**Goal:** Customers know about planned maintenance and incidents before they discover them.

### Tasks
1. **Add "Subscribe to updates" on /status page** — Simple email input → store in a DynamoDB table or Supabase
2. **Create incident email template** — Subject: "[Skawr] {Service} — {Status}" / Body: what happened, ETA, what to do
3. **Create maintenance email template** — Subject: "[Skawr] Planned Maintenance — {Date}" / Body: when, duration, affected services
4. **Wire into incident response** — Step 7 of the runbook: "send incident email to subscribers"

**Outcome:** Customers are informed proactively, not reactively.

---

## 🔴 Critical: Legal Pages

**Goal:** Privacy policy and ToS live on the website before first customer.

### Tasks
1. **Create `/Users/smsaleh/Documents/Skawr/skawr-web/app/privacy/page.tsx`** — Use a standard SaaS privacy policy template, customize for:
   - Data collected (search queries, product data, usage metrics)
   - Data storage (Germany VPS, PostgreSQL)
   - Third parties (Fireworks AI for embeddings, Polar.sh for billing)
   - Retention (event data: 2 years, account data: until deletion)
   - Contact: privacy@skawr.com
2. **Create `/Users/smsaleh/Documents/Skawr/skawr-web/app/terms/page.tsx`** — Cover:
   - Service description
   - Acceptable use
   - SLA (with disclaimer until measured)
   - Limitation of liability
   - Termination (trial expiry = immediate cutoff)
3. **Link from footer** — Add Privacy and Terms links to all footers (SaaS, CRO, marketplace)

**Outcome:** Legal coverage before first paying customer.

---

## 🔴 Critical: API Versioning

**Goal:** Customers know their integrations won't break without warning.

### Tasks
1. **Add API version header** — In `skawr-search/skawr-indexer/app/main.py` middleware, add response header: `X-API-Version: 2026-07-01`
2. **Document versioning policy** — Add to API docs:
   - "Breaking changes will be announced 90 days in advance"
   - "Deprecated endpoints return `Sunset` header with removal date"
   - "Current version: v1 (stable)"
3. **No immediate action needed on v2** — Just document the policy so customers trust the stability

**Outcome:** Documented stability guarantee for API consumers.

---

## 🟡 High-Value Nice-to-Haves

### Changelog (high impact, low effort)

1. **Create `skawr-web/app/changelog/page.tsx`** — Simple MDX page listing recent changes
2. **Add first 5 entries** (backfill from recent PRs):
   - "July 2026: Domain consolidation to skawr.com"
   - "July 2026: AI reranker (Qwen3) now active for Growth+ tiers"
   - "July 2026: CRO audit tool launched (free instant audit)"
   - "June 2026: Zitadel SSO migration complete"
   - "June 2026: Blue/green zero-downtime deploys"
3. **Link from footer + dashboard**

### API Rate Limit Headers (high impact, low effort)

1. **File:** `skawr-search/skawr-indexer/app/middleware/rate_limiting.py`
2. **Add headers to every response:**
   - `X-RateLimit-Limit: {tier_limit}`
   - `X-RateLimit-Remaining: {remaining}`
   - `X-RateLimit-Reset: {unix_timestamp}`
3. **Document in API reference**

### Knowledge Base / Help Center (medium effort, high value)

1. **Create `skawr-web/app/help/page.tsx`** — FAQ page with expandable sections
2. **Initial content (5 articles):**
   - "How to get your API key"
   - "Installing the search SDK"
   - "Understanding your usage dashboard"
   - "How billing works (trials, upgrades, cancellation)"
   - "Connecting your Salla store"
3. **Link from dashboard sidebar + support auto-reply**

### Load Testing Baseline (medium effort, critical for SLA)

1. **Install k6** — `brew install k6`
2. **Create `skawr-search/scripts/load_test.js`:**
   ```js
   import http from 'k6/http'
   export const options = { vus: 50, duration: '60s' }
   export default function () {
     http.post('https://api.skawr.com/api/v1/search',
       JSON.stringify({ query: 'laptop', limit: 10 }),
       { headers: { 'X-API-Key': __ENV.API_KEY, 'Content-Type': 'application/json' } }
     )
   }
   ```
3. **Run and document results** — "50 concurrent users: p99 = Xms, error rate = Y%"
4. **Store baseline** — Add to `skawr-docs/docs/platform/capacity-baseline.md`

---

## Priority Order (suggested agent execution sequence)

1. Uptime Monitoring (human: signup, then configure)
2. Support Channel (30 min)
3. Legal Pages (1-2 hours — template + customize)
4. Incident Response Plan (30 min — just write the doc)
5. Alerting Pipeline (15 min after UptimeRobot)
6. Changelog (1 hour)
7. API Rate Limit Headers (2 hours)
8. Onboarding Emails (4 hours — templates + wiring)
9. Backup Verification (2 hours)
10. Customer Communication (2 hours)
11. SLA Measurement (wait 30 days after monitoring starts)
12. API Versioning (1 hour)
13. Knowledge Base (3 hours)
14. Load Testing (2 hours)
