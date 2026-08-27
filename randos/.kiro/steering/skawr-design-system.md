# Skawr Design System — Steering File

> Authoritative reference for AI agents building UI across Skawr products.
> Two contexts: **Landing Pages** (marketing) and **App UIs** (product).

---

## 1. Brand Constants (Shared Everywhere)

Brand colors:
- Primary: #ED7453 (coral-orange, resting state)
- Primary Dark: #E95223 (hover/active, deeper orange)
- Teal Accent: #0BBFA0 (secondary, success, savings)
- Green: #4CAF50 (positive indicators)
- Error: #F44336 (light mode), #F87171 (dark mode)
- Hyperlink: #5688FF

Font families:
- Body: 'Plus Jakarta Sans', system-ui, sans-serif
- Display/Headings: 'Space Grotesk', system-ui, sans-serif
- Monospace: 'JetBrains Mono', ui-monospace, monospace
- Arabic: 'IBM Plex Sans Arabic' (RTL contexts only)
- NOTE: skawr-design specifies Gilroy (Flutter legacy) — IGNORE on web, use Plus Jakarta Sans

Selection color: rgba(237, 116, 83, 0.25) — apply on all surfaces

Dot-grid pattern (landing + login only, NOT apps):
- radial-gradient(rgba(26, 20, 16, 0.08) 1px, transparent 1px) / 32px 32px
- Dark mode: rgba(255, 255, 255, 0.06)

---

## 2. Landing Pages (Marketing)

Context: skawr-web /saas, /cro pages. Dark-first aesthetic, generous spacing, motion-heavy.

### Colors & Surfaces
- Light BG: #FFFFFF, Text: #1A1410 (warm brown-black)
- Dark BG: #0c0f1a (navy-black), Card: #141824, Overlay: #1a1f2e
- Dark mode toggle: .dark class on root wrapper
- Borders: rgba(0,0,0,0.07) light / rgba(255,255,255,0.08) dark
- Warm neutrals: 30° hue shift (NOT pure gray)

### Typography
- Display XL: clamp(3rem, 6vw, 5rem), weight 700, -0.03em tracking, line-height 1.05
- Display LG: clamp(2.25rem, 4vw, 3.5rem), weight 700, -0.025em
- Display MD: clamp(1.5rem, 3vw, 2.25rem), weight 700, -0.02em
- Body: 17-22px, Plus Jakarta Sans, line-height 1.5-1.7
- Labels: 13px mono, uppercase, 0.18em tracking
- CRO uses lighter headline weights (500 instead of 700) for editorial tone
- CRO uses italic for philosophical statements

### Buttons
- Shape: pill (border-radius: 9999px / 100px)
- Primary: bg #ED7453, white text, glow: 0 0 24px rgba(237,116,83,0.4)
- Hover: scale(1.03), glow intensifies to 0 0 36px 4px rgba(237,116,83,0.75)
- Active: scale(0.97)
- Secondary: pill outline, 1.5px border, transparent bg
- Padding: 12-18px vertical, 24-40px horizontal

### Spacing
- Section padding: 80-150px vertical (desktop), 60px (mobile)
- Container: max-width 860-960px centered
- Card padding: 24-36px

### Animations
- Scroll reveal: translateY(30px) → 0, opacity 0 → 1, 0.8s, cubic-bezier(0.16, 1, 0.3, 1)
- Stagger: 80ms delay between children
- Hover glow: scale(1.03) + shadow expansion
- Sparkbutton: particle confetti effect on hover (SaaS only)
- Easing for ALL motion: cubic-bezier(0.16, 1, 0.3, 1)
- NO permanent looping animations except status indicators

### Textures
- Dot grid: 32px spacing
- Noise overlay: opacity 0.015, SVG feTurbulence
- Radial hero gradient: orange ellipse at top-center + teal at top-right
- Glass surfaces: backdrop-filter blur(20px), 70% opacity bg

### DO NOT (landing pages)
- Use Tailwind utility classes for custom visual effects (use CSS variables)
- Make body text smaller than 16px
- Use rectangular buttons (always pill)
- Skip dark mode support
- Use the dot-grid in data-heavy sections
- Add tier recommendation badges to pricing cards

---

## 3. App UIs (Product)

Context: skawr-analytics, skawr-dashboards, skawr-login. Functional, compact, no marketing flair.

### Colors & Surfaces
Light mode layers:
- Sunken: #F4F4F5 (recessed areas, table headers)
- Base: #FFFFFF (page background)
- Raised: #FFFFFF (cards — same as base in light, differentiated by border + shadow)

Dark mode layers:
- Sunken: #111113
- Base: #18181B
- Raised: #1F1F23

- Dark mode: [data-theme="dark"] for analytics, @media prefers-color-scheme for dashboards/login
- Text (light): #18181B → #3F3F46 → #71717A → #A1A1AA (4-level ink scale)
- Text (dark): #F4F4F5 → #D4D4D8 → #A1A1AA → #71717A
- Never use pure white (#FFF) or pure black (#000) for text

### Typography
- Page title: Space Grotesk, 32px, weight 700, -0.025em
- Body: 13-14px, Plus Jakarta Sans
- Table headers: 11px, uppercase, 0.04em tracking, weight 600
- KPI values: Space Grotesk, 30px, weight 700, -0.02em
- KPI labels: 11px, uppercase, 0.04em tracking, weight 500
- Nav items: 13.5px, weight 400 (500 active)
- Buttons: 13px, weight 500
- Mono: timestamps, API keys, technical IDs — JetBrains Mono, font-feature-settings: 'zero'

### Buttons
- Shape: rectangular, border-radius 8px
- Height: 34px (desktop), 40px (mobile)
- Primary: bg var(--primary), white text, no glow
- Secondary: bg var(--bg-raised), border var(--line), text var(--ink)
- Ghost: transparent, no border
- Hover: border darkens OR bg shifts, transition 0.15s
- NO scale transforms, NO glow shadows

### App Shell
- Sidebar: 240px fixed, 16px 12px padding
- Topbar: 56px height, 24px horizontal padding
- Content: overflow-y auto, no max-width
- Mobile: drawer slides from left (200ms ease), scrim rgba(0,0,0,0.4)
- RTL: grid flips, logical properties (inset-inline-start)

### Cards
- Border-radius: 12px
- Border: 1px solid var(--line)
- Shadow: 0 1px 2px rgba(0,0,0,0.05)
- Padding: 16-24px

### Form Inputs
- Height: 36-44px
- Border-radius: 8-10px
- Focus: border-color primary + 3px box-shadow glow at 8% opacity
- Label: 13px, weight 500, above input, 6px gap

### Data Visualization
- Chart colors (5): #ED7453, #23E2C0, #4CAF50, #5688FF, #E0A28F
- Never use brand orange (#E95223) for chart data — it's reserved for UI actions
- Axis labels: 11px, var(--ink-3), tabular-nums
- Chart containers: inherit card styling

### Spacing (4px grid)
- Tight: 4-8px (badge gaps, micro spacing)
- Standard: 12-16px (table cells, component gaps)
- Comfortable: 16-24px (card padding, section gaps)
- Spacious: 24-32px (page padding)

### Animations
- ONLY CSS transitions: 0.15s ease for hover/focus states
- NO scroll-reveal, NO stagger, NO glow effects
- Exception: skeleton shimmer for loading states
- Drawer slide: 200ms ease

### DO NOT (app UIs)
- Add scroll-reveal animations
- Use pill-shaped buttons
- Use glass/blur surfaces
- Use the dot-grid background
- Use gradient text
- Make interactive elements larger than 34px height on desktop
- Add marketing-style motion (pulse, float, sparkle)
- Use Tailwind's heavy shadow-lg for regular cards

---

## 4. Hybrid Patterns (App + Marketing Feel)

Context: onboarding wizards, upgrade prompts, empty states inside apps.

Rules:
- Start with app conventions, selectively add landing expressiveness
- Allow: gradient text for ONE headline per screen
- Allow: pill CTA button for the primary action only
- Allow: subtle primary-soft radial glow behind illustrations
- Allow: dot-grid as empty-state background
- Keep: app button height (40px), app font sizes, app spacing
- Animation: fade-in-up at 0.4s (faster than landing's 0.8s), stagger at 60ms (not 80ms)
- Never override the sidebar/topbar — hybrid content lives inside the content area

---

## 5. Login Page (Bridge)

The login page mediates between landing and app:
- Uses: dot-grid (landing), warm cream bg (dashboards), card layout (app)
- Typography: Space Grotesk headline (22px), Plus Jakarta Sans body
- Inputs: 10px radius, 38px left-padding (icon space), focus glow
- Card: max-width 400px, 16px radius, centered
- Button: full-width, 10px radius (not pill), subtle glow
- Dark mode: @media prefers-color-scheme (system)
- No animations, no glass, no gradients

---

## 6. Known Inconsistencies (Accept These)

These are deliberate divergences, not bugs:
1. Analytics uses 8px base radius; dashboards use 12px — density vs comfort tradeoff
2. Analytics uses [data-theme="dark"]; dashboards use prefers-color-scheme — user control vs system default
3. Analytics uses neutral zinc dark mode; dashboards use 225° blue-gray — both are valid
4. CRO uses lighter heading weights than SaaS — editorial vs technical tone

---

## 7. Quick Decision Matrix

| Building... | Buttons | Animation | Radius | Typography | Dark mode |
|---|---|---|---|---|---|
| New landing/marketing page | Pill + glow | Scroll reveal + stagger | 12-16px | Display scale, ≥16px body | .dark class toggle |
| New app feature | Rectangular, 34px | Transitions only (0.15s) | 8-12px | 13-14px body, compact | [data-theme] or prefers-color-scheme |
| Onboarding/hybrid | One pill CTA, rest rectangular | Fade-in 0.4s, no scroll trigger | 12px | App sizes + one display heading | Match host app |
| Login/auth flow | Full-width rect, 10px radius | None | 10-16px | 22px heading, 13-14px body | prefers-color-scheme |

---

## 8. Analytics Dashboard Presentation (marketer-friendly)

Applies to skawr-analytics product UI. Goal: keep reports easy on the eye and
approachable for marketers/analysts, not just engineers. Derived from studying
Hotjar's presentation and mapped to the app-UI system above. These are defaults,
not exceptions.

- **Low density by default, progressive disclosure.** Lead with opinionated
  default views; put power controls behind an "Advanced" toggle. Monitor first,
  drill on click. Do not open with a query builder.
- **One accent on a neutral canvas.** Lead a view with coral `#ED7453` for the
  primary series and key numbers; keep everything else in the zinc ink scale.
  Never use brand orange `#E95223` for chart data (reserved for UI actions).
- **Big friendly KPI numbers, quiet labels.** KPI value Space Grotesk ~30px/700;
  label 11px uppercase, 0.04em tracking, `--ink-3`. Use `tabular-nums` on all
  figures and axis labels so numbers align and scan.
- **Soft cards, minimal chrome.** 12px radius, 1px `--line`, `0 1px 2px
  rgba(0,0,0,0.05)`, 16 to 24px padding. No heavy shadows. Per-card controls go
  in a quiet top-corner icon menu, not an always-visible button row.
- **Generous whitespace on the 4px grid.** Let charts breathe; do not fill every
  pixel. 24 to 32px page padding, comfortable card padding.
- **Funnel visualization:** horizontal step bars, single accent fill, the
  dropped portion shown as a muted/hatched remainder, step-to-step conversion %
  as the primary label with the raw count secondary, the biggest-drop step gently
  emphasized (stronger label, not a loud color).
- **Helpful empty states,** one primary action and plain microcopy, never a blank
  card. Example: "No funnel yet. Pick two or more steps to see conversion."
- **Plain, calm microcopy** (short, human, no hype). Follow the content rules: no
  em dashes, no decorative emoji.
- **One consistent icon set,** single weight, aligned to the ink scale, not
  multicolor.
- **Friendly names everywhere.** Never surface raw event keys (`$pageview`) when
  a data-dictionary label exists; prompt to name unlabeled events rather than
  showing the key.
