# Wyoming LLC Setup Checklist

> **Entity:** Wyoming single-member LLC. You are the sole member.
> **Co-founder:** Not on the US LLC. Equity/profit-share handled via a separate written agreement; real co-founder equity will live in the future Saudi/UAE entity.
> **Purpose:** Stripe, US banking, global contracts, revenue collection.
> **You:** US green card holder, SSN, currently in Saudi Arabia.

---

## Phase 1: Decide (do this now, before filing anything)

- [x] **Entity type decided: single-member LLC.** Co-founder is not on the US entity.
- [ ] **Write a co-founder agreement** covering: profit-share from the LLC (if any), roles, what happens if someone leaves, how the US LLC relates to the future Saudi/UAE equity entity. Doesn't need to be fancy — a signed PDF/Google Doc is fine. This protects you both.
- [ ] **Pick your LLC name.** Check availability on the [Wyoming Secretary of State](https://wyobiz.wyo.gov/Business/FilingSearch.aspx) business search. Must end in "LLC" or "L.L.C."

---

## Phase 2: Form the LLC (~1–3 days)

- [ ] **Get a Wyoming registered agent.** The agent receives legal mail on your behalf since you don't have a Wyoming address. Options:
  - Northwest Registered Agent — $125/yr, solid reputation
  - Wyoming Agents — $50/yr, budget
  - Most formation services bundle this
- [ ] **File Articles of Organization** with the Wyoming Secretary of State.
  - Online: [wyobiz.wyo.gov](https://wyobiz.wyo.gov/)
  - Filing fee: **$100** (+ $50 if you want same-day expedite)
  - You need: LLC name, registered agent info, organizer name/address, mailing address
  - Processing: ~1–3 business days (standard) or same day ($50 extra)
- [ ] **Receive your Certificate of Formation** (also called Articles of Organization stamped/filed). Download or save this — banks need it.

---

## Phase 3: EIN + Operating Agreement (~1 day)

- [ ] **Apply for an EIN (Employer Identification Number)** on [IRS.gov](https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online).
  - Free, instant (you have an SSN — the online application works immediately).
  - You'll get a confirmation letter (CP 575) — save the PDF.
  - Select "sole member" as the responsible party (you).
- [ ] **Draft and sign Operating Agreement.** Wyoming doesn't require you to file it, but banks demand it. Contents:
  - Member(s) and ownership percentages
  - Manager vs. member-managed (choose manager-managed with you as Managing Member)
  - Capital contributions
  - Profit/loss distribution
  - Decision-making authority
  - Transfer/withdrawal provisions
  - Dissolution terms
  - Templates: Northwest includes one free; or use [LegalZoom/Rocket Lawyer templates]; or have a startup lawyer draft one (~$500–1,000 if custom)

---

## Phase 4: US Bank Account (~1–5 days)

- [ ] **Open a business bank account.** Recommended: **Mercury** (tech-friendly, free, supports non-resident co-signers). You apply as the US-person Managing Member.
  - Documents needed:
    - Articles of Organization (Certificate of Formation)
    - EIN confirmation letter (CP 575)
    - Operating Agreement
    - Your SSN
    - Your passport or US ID
    - Proof of address (utility bill, bank statement — can be Saudi address)
  - Alternative: Chase (if you want a traditional bank; requires a branch visit in the US) or Relay (another fintech option).
- [ ] **Receive debit card + account/routing numbers.** Mercury typically approves in 1–3 business days.

---

## Phase 5: Stripe (~1 day)

- [ ] **Create a Stripe account** at [stripe.com](https://stripe.com) using the LLC as the business.
  - Business type: LLC
  - EIN: from Phase 3
  - Business address: your registered agent's address or a US virtual mailbox
  - Bank account: Mercury account from Phase 4
  - Your SSN as the responsible person
  - Should be approved same-day or within 1–2 days.
- [ ] **Test a payment** — create a test-mode charge to confirm everything is wired up.

---

## Phase 6: Wrap-up (first month)

- [ ] **Set up a US mailing address (optional but useful).** If you don't want legal/tax mail going to your registered agent (some don't forward general mail), get a virtual mailbox. Options: Anytime Mailbox, Earth Class Mail, iPostal1. ~$10–20/mo.
- [ ] **Set up Wise Business (optional).** For moving USD → SAR efficiently. Connect to your Mercury account.
- [ ] **Connect Polar.sh payout to Mercury** (if you want Polar to pay into the LLC bank account instead of a personal account).
- [ ] **File any state-specific requirements:** Wyoming has none beyond the annual report. No state income tax, no business license required at the state level.
- [ ] **Calendar your annual obligations:**
  - Wyoming Annual Report: due the 1st day of the month you formed, every year. **$60.** File at wyobiz.wyo.gov.
  - Federal tax return: **April 15** (your 1040, with LLC income on Schedule C). Extendable to Oct 15.
  - **Form 5472 + pro-forma 1120:** due with your 1040 (April 15, extendable). Reports transactions between you and the LLC / any related foreign parties. **$25K penalty if missed.** This is the one form worth paying a CPA for.
  - Note: even though you're a US person, the LLC may still be considered "foreign-owned" for 5472 purposes if you pay your Saudi co-founder from it (related-party transaction with a foreign person). Confirm with CPA.
- [ ] **Find a CPA** who handles single-member LLCs with potential 5472 obligations. You don't need them until tax season (early next year), but start looking now. Budget: $300–500/yr.

---

## Total cost summary

| Item | One-time | Annual |
|------|----------|--------|
| Wyoming filing fee | $100 | — |
| Registered agent | — | $50–125 |
| Wyoming annual report | — | $60 |
| EIN | Free | — |
| Mercury bank | Free | Free |
| Stripe | Free | Free |
| Virtual mailbox (optional) | — | $120–240 |
| CPA (1040 + 5472) | — | $300–500 |
| **Total (lean)** | **$100** | **~$410–685/yr** |
| **Total (with virtual mailbox)** | **$100** | **~$530–925/yr** |

---

## Timeline (realistic)

| Day | Milestone |
|-----|-----------|
| Day 1 | File Articles of Organization + order registered agent |
| Day 2–3 | Receive Certificate of Formation |
| Day 3 | Apply for EIN (instant) + sign Operating Agreement |
| Day 3–4 | Apply for Mercury bank account |
| Day 5–7 | Mercury approved, apply for Stripe |
| Day 7–8 | Stripe active, test payment works |
| **Day 8** | **LLC fully operational** |

---

## What NOT to worry about yet

- **Saudi/UAE entity** — form that when you actually need it (local clients, employment, raise). Don't spend time on it now.
- **Payroll / W-2s** — not needed until you pay someone as an employee (contractors get 1099s or nothing if foreign).
- **Sales tax / nexus** — Polar.sh handles this for SaaS subscriptions as MoR. If you sell direct via Stripe, revisit once revenue is meaningful.
- **Trademark** — nice to have but not blocking. Can file USPTO later (~$250–350 per class).
- **Business license** — Wyoming doesn't require one at the state level. Check your local city/county only if you have a physical office (you don't).
