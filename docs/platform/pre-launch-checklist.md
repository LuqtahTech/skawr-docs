# Pre-Launch Checklist

Last updated: <!-- update this date before each review -->

---

## Section A: First Customer Readiness (SaaS Search Product)

Everything below **MUST** work before onboarding the first paying customer.

---

### Search & Indexing

- [ ] Search API responds at `api.skawr.com/api/v1/health`
- [ ] OpenSearch cluster healthy (green status)
- [ ] Hybrid search returns results (BM25 + vector)
- [ ] Autocomplete endpoint responds
- [ ] AI reranker active (`RERANKER_ENABLED=true`)
- [ ] Rate limiting enforced per tier
- [ ] Multi-tenant index isolation verified (client A can't see client B's data)

### Billing & Subscriptions

- [ ] Polar.sh checkout flow works end-to-end
- [ ] Trial creation works (14-day, no CC)
- [ ] Trial expiry hard-cuts access
- [ ] Webhook from Polar → account provisioned
- [ ] Annual billing option functional
- [ ] Dunning grace period (7 days) tested

### Salla Integration

- [ ] OAuth flow works with real Salla dev store
- [ ] Product sync (initial bulk) completes
- [ ] Webhook `product.created`/`updated`/`deleted` work
- [ ] Widget renders on Salla storefront
- [ ] App uninstall cleanup works
- [ ] Real `SALLA_CLIENT_ID`/`SECRET` set on VPS

### Shopify Integration

- [ ] Theme app extension installs
- [ ] OAuth callback works
- [ ] Product sync triggers on install
- [ ] Widget intercepts default search
- [ ] Works in dark mode

### Dashboards

- [ ] Client dashboard loads at `dashboard.skawr.com`
- [ ] Admin dashboard loads at `admin.skawr.com`
- [ ] Login via Zitadel SSO works
- [ ] API key creation/rotation works
- [ ] Usage stats display correctly

### Auth

- [ ] `login.skawr.com` renders login form
- [ ] Email/password signup works
- [ ] Google OAuth works
- [ ] Zitadel SSO → callback → authenticated
- [ ] Password reset flow works

### Infrastructure

- [ ] VPS disk usage < 70%
- [ ] PostgreSQL connections healthy
- [ ] Redis responding
- [ ] OpenSearch JVM pressure < 75%
- [ ] Docker containers all running (no crash loops)
- [ ] Traefik routing all domains correctly
- [ ] TLS certificates valid (not expiring within 30 days)
- [ ] Daily PostgreSQL backups configured
- [ ] OpenSearch R2 backups running (cron)
- [ ] Recovery plan documented and tested

### Monitoring

- [ ] UptimeRobot (or equivalent) monitoring `api.skawr.com`
- [ ] GlitchTip receiving errors (`SENTRY_DSN` configured)
- [ ] Health endpoints respond: `/health`, `/api/v1/health`

### Legal & Compliance

- [ ] Privacy policy published at `skawr.com/privacy`
- [ ] Terms of service published at `skawr.com/terms`
- [ ] Cookie consent (if applicable)
- [ ] Data processing agreement template ready

### Documentation

- [ ] API reference accessible (`skawr.com/search/docs` or `api.skawr.com/docs`)
- [ ] SDK README accurate (install + first search in <5 minutes)
- [ ] Pricing page accurate and checkout works

---

## Section B: Live Tools Audit (Marketing / Public-Facing)

Things that should work on the public website.

---

### CRO Audit Tool (`/cro/audit`)

- [ ] URL input accepts valid URLs
- [ ] SSRF guard blocks private IPs
- [ ] Rate limiting works (5/hour per IP)
- [ ] Scan returns results within 60 seconds
- [ ] Results display correctly (4 pillars)
- [ ] Email delivery of results works

### SaaS Landing (`/search`)

- [ ] Page loads, no console errors
- [ ] Dark mode toggle works
- [ ] All CTAs link to correct destinations
- [ ] Pricing page loads with correct tiers
- [ ] "Get Started" → checkout flow initiates

### Import Tool (`/search/import`)

- [ ] URL import accepts a store URL
- [ ] Products are indexed
- [ ] Search works on imported products
- [ ] Progress indicator shows status

### CRO Landing (`/cro`)

- [ ] Page loads correctly
- [ ] Pricing page shows correct tiers
- [ ] CTAs link to booking (`cal.com/skawr`)

### Marketplace (`skawr.com/marketplaces`)

- [ ] Search returns results
- [ ] Results from multiple marketplaces appear
- [ ] Item detail pages load
- [ ] Mobile responsive
