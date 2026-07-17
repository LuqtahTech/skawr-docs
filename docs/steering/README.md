# Skawr Steering Files

Canonical documentation for AI agents and developers working on any Skawr repo.
These files replace the outdated HTML docs and serve as the primary reference.

## Files

| File | Purpose |
|------|---------|
| `skawr-ecosystem.md` | Master reference: all products, repos, infrastructure, auth, conventions, gotchas |
| `skawr-search-platform.md` | Technical reference for skawr-search/skawr-indexer: APIs, multi-tenancy, billing, Salla/Shopify |
| `skawr-analytics.md` | Technical reference for skawr-analytics: SDKs, event model, insights, frontend |
| `skawr-pricing-and-infra.md` | Pricing tiers, infrastructure strategy, scaling thresholds, billing integration |

## Usage

These files are designed to be used as Kiro steering files (`.kiro/steering/`) across
any Skawr workspace. Copy the relevant files into your repo's `.kiro/steering/` directory
or reference them from here.

## Maintenance

- **Last updated**: July 2026
- **Update frequency**: Update whenever repo structure, pricing, or infrastructure changes
- **Source of truth**: These files supersede the HTML pages in `docs/` (most of which are outdated)
