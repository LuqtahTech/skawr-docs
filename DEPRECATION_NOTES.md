# Skawr Docs — Status & Navigation Guide

## Primary Reference: `docs/steering/`

The **canonical source of truth** for AI agents and developers is now the `docs/steering/` folder:

| File | Covers |
|------|--------|
| `skawr-ecosystem.md` | Full ecosystem overview (5 products, 16 repos, infra, auth, conventions) |
| `skawr-search-platform.md` | skawr-indexer technical reference (APIs, billing, Salla/Shopify) |
| `skawr-pricing-and-infra.md` | All pricing tiers + infrastructure strategy + scaling thresholds |

These steering files are also usable as `.kiro/steering/` docs in any Skawr workspace.

---

## Legacy HTML Pages Status

### Outdated / Deprecated Sections

| Section | Status | Notes |
|---------|--------|-------|
| `platforms/mobile-app/` | **Decommissioned** | iOS app removed from App Store |
| `system/architecture.html` | **Outdated** | References old component names. See `steering/skawr-ecosystem.md` instead |
| `developer/integration-guides.html` | **Missing** | Never created; see SDK READMEs instead |
| `developer/sdk-docs.html` | **Missing** | See `skawr-sdks/README.md` and `skawr-analytics/backend/skawr_sdk/` |
| `partnerships/salla-plugin.html` | **Missing** | See `steering/skawr-search-platform.md` §7 (Salla Integration) |
| `partnerships/white-label.html` | **Missing** | Not applicable anymore |
| `support/troubleshooting.html` | **Missing** | Never created |
| `support/contact.html` | **Missing** | Never created |

### Accurate Sections

| Section | Status |
|---------|--------|
| `analytics/` | ✅ Positioning, competitor analysis, MVP direction still accurate |
| `platform/skawr-platform-overview.md` | ✅ Recently updated (July 2026) |
| `platform/gap-analysis-and-projects.md` | ✅ Comprehensive project inventory |

### Not Documented in HTML (covered in steering)

- **skawr-login** (Zitadel Login v2 custom UI)
- **CRO product** (skawr.com/cro — landing, pricing, audit tool)
- **Blue/green deploys** (zero-downtime container swap)
- **Polar.sh billing integration**
- **Domain consolidation** (analytics.skawr.com, login.skawr.com, admin.skawr.com, dashboard.skawr.com)

---

## Recommendation

For up-to-date technical reference:
1. **Start with** `docs/steering/skawr-ecosystem.md` for orientation
2. **For search/indexer work**: `docs/steering/skawr-search-platform.md`
3. **For analytics work**: the canonical `skawr-analytics.md` technical reference lives in the workspace `.kiro/steering/` (kept current there); the published mirror was removed as stale. See also `skawr-analytics/docs/features-catalog.md`.
4. **For pricing/billing changes**: `docs/steering/skawr-pricing-and-infra.md`
5. **For repo-specific details**: Individual repo READMEs (all updated July 2026)

---

*Last Updated: July 2026*
