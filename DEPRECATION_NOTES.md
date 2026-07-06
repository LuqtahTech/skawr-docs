# Skawr Docs — Deprecation Notes

This documentation site is partially outdated. The canonical source of truth for AI agents and developers is the steering files in `.kiro/steering/` within each repo.

## Known Outdated Sections

### Mobile App (Decommissioned)
The `docs/platforms/mobile-app/` section documents a Flutter iOS app that has been **removed from the App Store** and is no longer active. The page has been replaced with a deprecation notice. Sidebar navigation across other pages still links to it — this is cosmetic and not worth a full HTML rewrite.

### Platform Architecture
The `docs/system/architecture.html` page may reference old component names. The current architecture is:
- **skawr-indexer** (in skawr-backend monorepo): Core SaaS platform API — search, multi-tenant management, Salla/Shopify integrations, billing
- **skawr-analytics**: Separate product analytics platform (FastAPI + Next.js)
- **VPS deployment**: Docker + Traefik on Contabo (not AWS yet)
- **OpenSearch**: Replaced Typesense long ago

### What's Accurate
- `docs/analytics/` — Positioning, competitor analysis, MVP direction docs are still accurate
- `docs/platforms/backend-api/` — Mostly accurate (describes SaaS platform correctly)
- `docs/platforms/scraper-service/` — Accurate
- `docs/platforms/web-app/` — Accurate for skwar-web-mvp

## Recommendation
For up-to-date technical reference, use:
- `.kiro/steering/skawr-ecosystem.md` in skawr-analytics repo
- `.kiro/steering/saas-pricing-and-infra.md` for pricing/infrastructure context
- Individual repo READMEs (recently updated July 2026)
