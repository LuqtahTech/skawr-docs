# Skawr Content Rules

Applies to all UI copy, marketing copy, docs, error messages, emails, and code
comments written for any Skawr repo.

## No em dashes

Never use the em dash character (—, U+2014) anywhere: UI text, JSX/TSX
strings, error messages, emails, docs, or code comments. Rewrite the sentence
instead:

- Split into two sentences with a period.
- Use a comma, colon, or semicolon where the grammar fits.
- Use a connecting word (and, so, which, because) instead of a dash-joined
  clause.

Do not substitute an en dash (–) or a double hyphen (--) as a workaround.
Standard hyphens are fine for compound words (e.g. "typo-tolerant") and for
placeholder table/empty-state values (e.g. "-" for "no data").

## Never transliterate the brand name

The brand name is always written **Skawr**, in Latin script, in every
language including Arabic. Never transliterate it to سكور (or any other Arabic
spelling) in UI copy, marketing, docs, legal text, emails, `logoAlt` text, or
anywhere else. "Skawr" is a wordmark and a trademark, not a word to translate,
the same way Google, Apple, and Netflix keep their Latin name inside Arabic
copy. An Arabic sentence embedding the Latin brand name is correct and normal
(e.g. "بمجرد اشتراكك في Skawr").

This applies to the brand and to brand-qualified product names: keep "Skawr" in
Latin and translate only the descriptive part. So "Skawr Search" becomes
"بحث Skawr" (not "بحث سكور"), "Skawr for Business" becomes "Skawr للأعمال", and
plain "Skawr" stays "Skawr".

The only exception is an explicit etymology note that discusses the Arabic word
the name derives from (for example, explaining the name comes from the Arabic
سكور, to scour/search). There, the Arabic word is the subject being described,
not the brand being rendered. Do not use that as license to transliterate the
brand in ordinary copy.

Other brand/technical names also stay in their canonical Latin form in Arabic
copy: Salla, Shopify, API, SDK, JSON, CRO, and similar. Translate the
surrounding prose, not the names.

Wrong: "Results in under 50ms — faster than the blink of an eye."
Right: "Results in under 50ms. Faster than the blink of an eye."

Wrong: "The verifier is only ever read from sessionStorage — never from the state."
Right: "The verifier is only ever read from sessionStorage, never from the state."

## No AI-ish emojis

Do not decorate UI copy, commit messages, PR descriptions, or docs with
emojis as a stand-in for tone (no 🚀, ✨, 🎉, 💡, 🔥, etc). This includes
status/step indicators in product UI (e.g. onboarding step lists, loading
states) — use icons from the existing icon set or plain text instead.

Exception: emoji used as literal, meaningful UI content that a human author
would deliberately place (e.g. a country flag in a language switcher) is
fine. When in doubt, leave it out.

## Rationale

Em dashes and decorative emojis are the two strongest tells of
unedited AI-generated writing. Skawr copy should read like it was written by
a person on the team, not pasted from a model.
