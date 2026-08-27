# Skawr Import Validation Report — Implementation Spec

**Status:** Ready for build
**Context:** Skawr's existing product import flow (`/saas/import` — upload CSV/JSON or paste a feed URL, no signup required) already parses and indexes merchant catalogs. It currently **silently skips or swallows bad rows** (broken encoding, missing fields, duplicates, etc.) instead of surfacing them. This spec turns that existing, already-computed validation into a visible, shareable report — a near-zero-net-new-logic change with outsized trust/growth value.

**Read this first if you are a coding agent:** this is an *extension* of existing functionality, not a greenfield build. Do not design a new validation engine before confirming what already exists. Section 1 is a mandatory discovery phase — do it before writing any code.

---

## 1. Discovery phase (do this before building anything)

Before implementing, locate and document:

1. **The import entry point(s)** — find the route/handler behind `/saas/import` (CSV upload path and feed-URL path may be separate code paths — check both).
2. **The parsing/validation logic** — find where rows are read, validated, and either indexed or dropped. Look specifically for:
   - Encoding handling (especially Arabic/UTF-8 issues)
   - Required-field checks (price, category, SKU, title, etc.)
   - Duplicate detection (SKU or product-ID collisions)
   - Any existing error/warning objects that are currently computed but discarded or only logged, not shown to the user
3. **Where results currently surface** — find the UI component that shows "X products indexed" / progress bar, since the new report likely replaces or extends this same component.
4. **The indexing pipeline output** — confirm whether skipped/flagged rows are: (a) fully dropped with no record kept, (b) logged server-side but not returned to the client, or (c) already returned to the client but just not rendered. This materially changes scope — (c) is a pure front-end task, (a) requires backend changes to retain and return the data.
5. **Auth/session state during import** — confirm current behavior matches "no signup required" (per product owner confirmation) — check whether any session/anonymous-ID is created regardless, since that affects how CTA capture (§6) can work.

**Output of this phase:** a short written note (in the PR description or a `DISCOVERY.md` scratch file) stating which of the above already exists vs. needs to be built, before proceeding to implementation. If (a) above is true — data is fully dropped, not retained anywhere — the effort is meaningfully larger than assumed in this spec's estimate, and that should be flagged back to the product owner before proceeding.

---

## 2. Goal

Replace (or augment) the current silent progress bar with a **visible, plain-language validation report** shown immediately after upload, using data the system likely already computes internally. Turn a boring "indexing your products…" moment into a "this actually caught real problems in my data" moment — building trust and creating a natural, honest upsell path, without requiring signup.

---

## 3. Functional requirements

### 3.1 Report must show, at minimum
For each import:
- Total rows detected
- Rows successfully indexed (✅)
- Rows skipped, grouped by reason, with count per reason (⚠️) — e.g.:
  - Broken/invalid Arabic encoding
  - Missing required field (specify which: price / title / category / image / SKU)
  - Duplicate SKU or product ID
  - Malformed price or currency value
  - Any other reason already detected by existing logic (confirm exact list during discovery — do not invent categories that don't map to real checks)
- A short, plain-language headline summarizing the outcome, e.g.: *"26,561 of 26,601 products indexed. We caught 40 encoding issues and 12 missing categories along the way."*

### 3.2 Never silently drop without disclosure
Any row not indexed must appear in the report under some reason category. If the underlying logic has a catch-all/unknown-failure case, surface it honestly as "X products couldn't be processed — flagged for review" rather than omitting it.

### 3.3 Report must work per data source
Both the CSV/JSON upload path and the feed-URL path must produce the same report structure — confirm during discovery whether they currently share a validation code path or are separate; if separate, the report schema (§4) should be the shared contract both paths write into, even if the underlying parsers differ.

### 3.4 No new signup requirement
This feature must not introduce an auth/signup gate that doesn't already exist. If a lightweight session/anonymous ID is already created today (per discovery §1.5), reuse it for the CTA/lead-capture step (§6) rather than inventing a new identity mechanism.

---

## 4. Report data schema

Suggested shape (adjust field names to match existing codebase conventions found in discovery):

```json
{
  "importId": "string (uuid)",
  "source": "csv | json | feed_url",
  "sourceLabel": "string (filename or feed URL, for display)",
  "totalRows": 26601,
  "indexedCount": 26561,
  "skippedCount": 40,
  "flaggedCount": 12,
  "issues": [
    {
      "reasonCode": "encoding_error | missing_field | duplicate_sku | malformed_price | other",
      "reasonLabel": "human-readable string, plain language, no jargon",
      "count": 40,
      "sampleRows": [
        { "rowNumber": 1432, "identifier": "SKU or row snippet", "detail": "short specific reason" }
      ]
    }
  ],
  "detectedPlatform": "salla | zid | shopify | woocommerce | magento | unknown",
  "processedAt": "ISO timestamp"
}
```

Notes:
- `sampleRows` should cap at a small number (e.g. 3-5 per issue type) — enough for the merchant to recognize and fix the pattern themselves, not a full error log dump.
- `detectedPlatform` is optional for v1 of this specific feature but should reuse platform-fingerprinting logic if it already exists elsewhere in the codebase (see the separate Instant Audit Tool spec, which independently needs the same detection — check whether this logic already exists before building it twice).

---

## 5. UI/UX requirements

- Report replaces or immediately follows the existing progress indicator — do not make the user navigate to a separate page to see it.
- Lead with the plain-language headline sentence (§3.1), not a raw table, above the fold.
- Follow with a compact breakdown by issue type — icon + count + label, expandable to see sample rows, collapsed by default.
- Tone: matter-of-fact and specific, never alarmist, never vague. "40 products skipped — Arabic text encoding was broken" not "Some products had errors."
- Must be screenshot/share-friendly: clean visual hierarchy, no dependency on interactive elements to convey the headline number, works as a static image if screenshotted.
- Include a lightweight native "share" affordance if feasible (copy-as-image or copy-link), but do not block launch on this if it adds meaningful scope — can ship as a fast-follow.

---

## 6. Contextual CTA logic

CTA shown below the report, chosen by the dominant issue type found (not generic):

| Dominant issue | CTA framing |
|---|---|
| High Arabic encoding error count | "Skawr's search is built Arabic-first — see how we handle this automatically" → link to Smart Search feature/demo |
| High missing-category count | Nudge toward Smart Search's taxonomy/categorization handling |
| Clean import, low issue count | Positive reinforcement + soft nudge toward next step (e.g. "Your catalog looks solid — see how fast search feels on it" → live demo) |
| High duplicate-SKU count | Practical tip copy, lower-key CTA (this is a data-hygiene issue, not a Skawr-solves-this moment — don't force a product pitch where it doesn't fit) |

Since no signup is required, the CTA at this stage should point to: (a) continuing to explore Skawr (e.g. try search on their now-indexed catalog), or (b) a low-friction contact capture ("email me this report") — not a hard paywall. Do not gate the report itself behind any capture step, consistent with the existing no-signup model.

---

## 7. System architecture

### 7.1 High-level flow

```
[Client: upload CSV/JSON or submit feed URL]
        │
        ▼
[Existing import handler/endpoint]
        │
        ├─→ [Existing parser/validator] ──→ (currently: indexes good rows, drops bad ones)
        │                                    (change: also emit structured issue records, per §4 schema)
        │
        ▼
[New/extended response payload]
        │  includes: totalRows, indexedCount, issues[] (per §4)
        ▼
[Client: report UI component] ──→ renders §5 report + §6 CTA
```

### 7.2 Backend changes (scope depends on discovery §1.4 outcome)
- If validation logic already computes per-row pass/fail reasons internally but discards them: **retain** these records in memory for the duration of the request/job and **return** them in the API response instead of only using them for internal skip logic. This is the minimal-scope path.
- If validation logic only tracks aggregate counts, not per-row reasons: extend the validator to tag *why* each row failed at the point of failure, using the `reasonCode` enum in §4, rather than just incrementing a generic "skipped" counter.
- If import is processed asynchronously/queued for large feeds: ensure the job's final result payload includes the full `issues[]` structure before marking the job complete, and that the client polling/webhook mechanism (whichever exists) can retrieve it.

### 7.3 Frontend changes
- New report component (or significant extension of the existing progress/result component) consuming the schema in §4.
- Contextual CTA component (§6), parameterized by dominant issue type — implement as a simple lookup/config table (`ctaByIssueType`), not hardcoded conditionals scattered in the view, so it's trivial to add/adjust CTA mappings later.
- Optional: share/screenshot affordance (§5) — treat as separate, deferrable task.

### 7.4 Data retention & privacy
- Sample row data (§4 `sampleRows`) may contain merchant product data — confirm existing data retention/privacy handling for uploaded feeds applies equally here (i.e., don't introduce a new, less-protected storage path for this data just because it's "just an error log").
- No new PII is introduced by this feature unless the optional "email me this report" capture (§6) is built — if so, follow the same lead-capture/privacy handling used elsewhere in the product (do not invent a new pattern).

---

## 8. Guidance for Claude Code / coding agents specifically

- **Search before writing.** Before implementing any new validation check, grep/search the codebase for existing terms like `skip`, `invalid`, `encoding`, `duplicate`, `validate`, `parseRow`, `feed`, `import` to find current logic. Assume detection logic already exists in some form; the task is primarily **plumbing it through to the response and UI**, not reinventing it.
- **Reuse existing enums/constants** for field names, error types, and platform detection if they already exist elsewhere in the codebase (e.g., if platform fingerprinting was already built for another feature, import it rather than duplicating).
- **Write the schema contract (§4) as a shared type/interface first** (TypeScript type, or equivalent for the stack in use), used by both backend response and frontend component, so both sides can be implemented/tested against the same contract even in parallel.
- **Add a test fixture set**: a small sample CSV/feed with deliberately broken rows covering each `reasonCode` in §4, so the report UI can be developed and tested without needing a real merchant feed. Store this fixture in the test suite for regression coverage going forward.
- **Do not change existing indexing behavior** — rows that were already being skipped should continue to be skipped (this is additive visibility, not a behavior change to what gets indexed). Flag explicitly in the PR if any edge case seems to require an actual behavior change, rather than silently altering indexing logic.
- **Keep the CTA config data-driven** (§7.3) so a non-engineer (or a future agent) can update CTA copy/routing without touching component logic.
- **Instrument basic analytics events** at minimum: report shown, report issue-type breakdown (which types appeared, counts), CTA clicked (which variant). Reuse whatever analytics/event system already exists in the codebase rather than adding a new one.

---

## 9. Non-functional requirements

- **Performance:** report generation should not meaningfully slow down the existing import flow — if validation is already computed during parsing (likely), this is just serialization/response-shape work, not new computation.
- **i18n/RTL:** report copy should support Arabic rendering given the target market, consistent with however the rest of the import flow currently handles localization (check existing pattern rather than introducing a new one).
- **Accessibility:** issue severity should not rely on color alone (icon + text label per issue, consistent with confidence-state pattern used in the separate Instant Audit Tool spec, if convenient to align visually).

---

## 10. Acceptance criteria

- [ ] Uploading a feed/CSV with deliberately broken rows (per test fixture) shows a report with accurate counts per issue type, not just a total.
- [ ] No previously-indexed row's indexing outcome changes as a result of this feature (additive only).
- [ ] Report renders without requiring signup/login, consistent with current import flow.
- [ ] CTA shown matches the dominant issue type per the table in §6.
- [ ] Both CSV/JSON upload and feed-URL paths produce a report in the same schema.
- [ ] Sample rows shown are capped and do not expose more merchant data than necessary to make the finding actionable.

---

## 11. Out of scope for this iteration

- Standalone public landing page separate from the existing import flow (not needed — no signup wall exists to route around, per product owner confirmation).
- Automated fixing of flagged issues (e.g. auto-repairing encoding) — v1 is detection/disclosure only.
- Cross-feature platform-fingerprinting unification with the Instant Audit Tool — worth doing eventually (avoid building the same detection twice), but not a blocker for shipping this feature; flag as a follow-up refactor if both features end up with separate implementations.

---

## 12. Open questions for product owner

1. Confirm: is validation logic currently synchronous (immediate response) or does it run as an async/queued job for larger feeds? This determines whether §7.2's "retain and return" change is straightforward or requires job-payload changes.
2. Is there an existing analytics/event pipeline this should log into, or should one be selected as part of this work?
3. Should the "email me this report" capture be included in v1, or deferred to a fast-follow once the core report ships?
