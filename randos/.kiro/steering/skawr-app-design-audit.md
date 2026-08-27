---
inclusion: manual
---

# Skawr Application Interface — Design Audit & Pattern Guide

> Steering file for AI agents building features in the Skawr Analytics and Dashboard apps.
> Source of truth: `globals.css` (analytics), `tokens.css` + `tailwind-preset.js` (dashboards), component implementations.

---

## A. App Shell & Chrome

### Two Shell Variants

Skawr has two distinct shell implementations sharing the same design language:

| Property | Analytics (globals.css) | Dashboards (SidebarLayout.tsx) |
|----------|------------------------|-------------------------------|
| Framework | Custom CSS grid | Tailwind + React Router |
| Sidebar width | 240px | w-60 (240px) |
| Topbar height | 56px | None (integrated header) |
| Layout model | CSS Grid (`grid-template-columns: 240px 1fr`) | Flexbox (`flex min-h-screen`) |
| Mobile breakpoint | 1024px | lg (1024px) |

### Sidebar Navigation (Analytics — Primary Pattern)

```
Width:          240px fixed
Padding:        16px 12px (block/inline)
Border:         1px solid var(--line) on inline-end side
Background:     var(--bg) — same as page background
Scroll:         overflow-y: auto with 6px thin scrollbar
```

**Nav Items:**
```
Height:         ~34px (8px padding-block + content)
Padding:        8px 12px
Font-size:      13.5px
Color:          var(--ink-2) → hover: var(--ink) → active: var(--primary)
Icon:           16×16px, color var(--ink-3) → active: var(--primary)
Gap:            10px between icon and label
Border-radius:  8px (var(--radius))
Hover BG:       var(--bg-sunken)
Active BG:      var(--primary-soft) (rgba orange at 8% opacity)
Active weight:  font-weight 500
Transition:     background 0.12s, color 0.12s
```

**Nav Section Headers (group labels):**
```
Font-size:      11px
Weight:         600
Transform:      uppercase
Letter-spacing: 0.06em
Color:          var(--ink-4)
Padding:        20px 12px 6px (first group: 4px top)
```

**Counters/Badges on Nav Items:**
```
Position:       margin-inline-start: auto (pushed to end)
Font-size:      11px
Color:          var(--ink-4)
Numeric:        tabular-nums
```

**Workspace Switcher (top of sidebar):**
```
Padding:        10px 12px
Background:     var(--bg-sunken)
Border:         1px solid var(--line)
Border-radius:  8px
Margin-bottom:  16px
Mark:           28×28px rounded-6px square, brand orange bg, white text
Name:           13px weight-600
Tier label:     11px color var(--ink-3)
Dropdown:       absolute popover, shadow-md, 4px padding, max-height 320px
```

### Topbar (Analytics)

```
Height:         56px
Grid position:  spans full width (grid-column: 1 / -1)
Padding:        0 24px
Gap:            16px between elements
Border:         1px solid var(--line) on bottom
Background:     var(--bg)
Font-size:      13px
```

**Brand Mark:**
```
Logo square:    28×28px, border-radius 6px, var(--primary) bg
Font:           Space Grotesk 14px bold, white
Brand text:     weight-600, letter-spacing -0.01em
Min-width:      208px (reserving sidebar-width minus padding)
```

**Breadcrumbs:**
```
Color:          var(--ink-3), separator var(--ink-4)
Current page:   color var(--ink) (not bold, just darker)
Separator:      "/" character with 8px gap
Hidden on:      mobile (<1024px)
```

**Chips (topbar action pills):**
```
Height:         32px
Padding:        0 12px
Border:         1px solid var(--line)
Border-radius:  8px
Background:     var(--bg-raised)
Font-size:      13px
Color:          var(--ink-2) → hover: var(--ink)
Hover border:   var(--line-strong)
Active:         border-color var(--primary), color var(--ink)
Transition:     border-color 0.15s, color 0.15s
```

**Live Indicator Chip:**
```
Dot:            7×7px circle, bg var(--pos) (green)
Label:          mono font, 11.5px
```

**Avatar:**
```
Size:           30×30px circle
Background:     var(--primary-soft)
Color:          var(--primary)
Font:           12px weight-600 (initial letter)
```

### Content Area

```
Overflow:       overflow-y auto (scrollable)
Scrollbar:      6px width, rounded 3px thumb in var(--line-strong)
No max-width:   content stretches to fill (constrained by grid layouts within)
```

### Mobile Drawer Pattern

**Trigger:** Hamburger button (`.menu-btn`) — hidden on desktop, `display: inline-flex` below 1024px.
```
Button:         36×36px, border 1px var(--line), radius 8px
Icon:           18×18px SVG (3 horizontal lines)
ARIA:           aria-label="Toggle navigation", aria-expanded, aria-controls="primary-nav"
```

**Drawer Behavior:**
```
Position:       fixed, top 56px (below topbar), bottom 0, inset-inline-start 0
Width:          min(280px, 86vw)
Z-index:        60 (drawer), 55 (scrim)
Transform:      translateX(-100%) → translateX(0) when .open
Transition:     transform 200ms ease
Shadow:         var(--shadow-md)
RTL:            translateX(100%) → translateX(0) for .open
```

**Scrim (backdrop):**
```
Background:     rgba(0, 0, 0, 0.4)
Opacity:        0 → 1 on .open
Transition:     opacity 200ms ease
Body overflow:  hidden when drawer-open (prevents scroll-behind)
```

**Accessibility:**
- Focus trap: cycles Tab between tabbable elements inside drawer
- On open: stores `document.activeElement`, focuses first tabbable after 60ms
- On close: restores previous focus
- Escape key dismiss: handled via focus trap keydown
- Swipe-to-close: touch gesture (80px threshold, direction-aware for RTL)

### RTL Support (sidebar + shell)

```css
.screen[dir="rtl"] { grid-template-columns: 1fr 240px; }
.screen[dir="rtl"] .sidebar { border-right: none; border-left: 1px solid var(--line); }
```
- Uses `inset-inline-start` / `inset-inline-end` for logical positioning
- `margin-inline-start: auto` for count badges
- Font switches to IBM Plex Sans Arabic as primary

---

## B. Information Density

### Above-the-Fold Budget

A typical dashboard view at 1080p packs:
- Page header: ~80px (28px top padding + 32px title + 20px lede)
- Filter row: ~44px
- KPI grid (4 columns): ~100px per card
- First chart card: visible top portion

This means ~4 KPI cards + the top of one chart card are visible without scrolling — high density by design.

### Card Sizing & Padding

**Analytics Cards (`.card`):**
```
Background:     var(--bg-raised)
Border:         1px solid var(--line)
Border-radius:  12px (var(--radius-lg))
Shadow:         var(--shadow-sm) — 0 1px 2px rgba(0,0,0,0.05)
No fixed height — content-driven
```

**Dashboard Cards (Tailwind):**
```
Background:     bg-card (hsl var)
Border:         border border-border
Border-radius:  rounded-xl (12px)
Shadow:         shadow (default Tailwind)
Padding:        p-6 (24px) for CardHeader/CardContent
```

**KPI Tiles (Analytics `.kpi`):**
```
Padding:        16px 18px
Gap:            8px between label/value/row
Compact:        designed for grid placement, no extra margin
```

### Table Row Heights & Alignment

**Analytics Tables (`.tbl`):**
```
Header height:  ~32px (10px padding + 12px content)
Row height:     ~37px (12px padding + 13px content)
Font-size:      13px (body), 11px uppercase (headers)
Column align:   left by default, .num class = text-align right
Numeric:        font-variant-numeric: tabular-nums
Last row:       no bottom border
```

**Dashboard DataTable:**
```
Header:         px-4 py-2.5, bg-muted/50, text-muted-foreground
Row:            px-4 py-2.5, divide-y divide-border
Hover:          hover:bg-muted/30 transition-colors
Font-size:      text-sm (14px)
Sorting icon:   ArrowUpDown 12×12px, primary color when active
Empty state:    centered text, py-8, text-muted-foreground
```

**Data-Table Grid (Analytics `.dt`):**
```
Header BG:      var(--bg-sunken)
Header padding: 10px 16px
Header radius:  var(--radius) var(--radius) 0 0 (top corners only)
Row padding:    12px 16px
Columns:        CSS custom property --dt-cols (flexible)
Gap:            12px between columns
```

### KPI Display

```
Label:          11px, uppercase, 0.04em tracking, weight 500, var(--ink-3)
Value:          Space Grotesk 30px bold, letter-spacing -0.02em, line-height 1
Delta row:      12px, color var(--ink-3), flex with 8px gap
Delta badges:   .badge.pos (green) / .badge.neg (red) for +/- indicators
```

### Density Philosophy

The apps lean toward "see everything at once" — compact padding (16-18px in KPI tiles), small font sizes (11-13px for data), and dense grids (4-column KPIs). Focus mode is achieved through full-page views for specific analyses (funnels, retention) rather than collapsing the overview.

---

## C. Interactive Patterns

### Button Hierarchy

**Analytics (Custom CSS):**

| Variant | Background | Border | Color | Height |
|---------|-----------|--------|-------|--------|
| Default (secondary) | var(--bg-raised) | var(--line) | var(--ink) | 34px |
| Primary | var(--primary) | var(--primary) | #fff | 34px |
| Ghost | transparent | transparent | var(--ink) | 34px |
| Accent | var(--accent) | var(--accent) | #fff | 34px |
| Disabled | any | any | opacity 0.45 | 34px |

```
Padding:        0 14px
Border-radius:  8px
Font-size:      13px, weight 500
Gap:            6px (icon + label)
Transition:     all 0.15s
Hover (default): border var(--line-strong), shadow-sm
Hover (primary): var(--primary-hover) — darker orange
Mobile:         min-height 40px, font-size 14px
```

**Dashboards (CVA + Tailwind):**

| Variant | Classes | Height |
|---------|---------|--------|
| default | `bg-primary text-primary-foreground shadow hover:bg-primary/90` | h-9 (36px) |
| destructive | `bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90` | h-9 |
| outline | `border border-input bg-background shadow-sm hover:bg-accent` | h-9 |
| secondary | `bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80` | h-9 |
| ghost | `hover:bg-accent hover:text-accent-foreground` | h-9 |
| link | `text-primary underline-offset-4 hover:underline` | h-9 |

```
Sizes:          sm: h-8 px-3 text-xs | default: h-9 px-4 | lg: h-10 px-8 | icon: h-9 w-9
Border-radius:  rounded-md (6px)
Focus ring:     focus-visible:ring-1 focus-visible:ring-ring (outline: none)
Disabled:       pointer-events-none opacity-50
```

### Form Inputs

**Analytics (auth pages — the canonical input style):**
```
Height:         min-height 44px (touch-friendly)
Padding:        12px 14px
Border:         1px solid var(--line)
Border-radius:  8px
Font-size:      16px (prevents iOS zoom)
Background:     var(--bg)
Focus:          border-color var(--primary), box-shadow 0 0 0 3px var(--primary-soft)
Transition:     border-color 0.15s
Label:          13px weight-500, color var(--ink-2), margin-bottom 6px
Field spacing:  margin-bottom 16px between fields
```

**Dashboards (Input component):**
```
Height:         h-9 (36px)
Padding:        px-3 py-1
Border:         border border-input
Border-radius:  rounded-md (6px)
Font-size:      text-base (16px) → md:text-sm (14px)
Background:     bg-transparent
Focus:          focus-visible:ring-1 focus-visible:ring-ring
Disabled:       cursor-not-allowed opacity-50
Placeholder:    text-muted-foreground
```

**Login page inputs (with icons):**
```
Padding-left:   38px (making room for 16×16 icon at left 13px)
Border-radius:  10px
Icon position:  absolute, left 13px, top 50%, translateY(-50%)
Icon color:     var(--text-muted)
Focus glow:     0 0 0 3px var(--primary-glow) (rgba orange at 20%)
```

### Dropdowns & Menus

**Analytics (inline popovers):**
```
Position:       absolute, inset-inline-start 0, top calc(100% + 4px)
Background:     var(--bg-raised)
Border:         1px solid var(--line)
Border-radius:  8px
Shadow:         var(--shadow-md)
Padding:        4px
Z-index:        50
Max-height:     320px, overflow-y auto
Dismiss:        mousedown outside → close
Animation:      none (instant show/hide)
```

**Dashboards (Radix Dropdown):**
```
Position:       Radix handles via portal
Background:     bg-popover
Border:         border (1px)
Border-radius:  rounded-md (6px)
Shadow:         shadow-md / shadow-lg (sub-menus)
Padding:        p-1 (4px)
Z-index:        z-50
Side offset:    4px
Max-height:     var(--radix-dropdown-menu-content-available-height)
Animation:      animate-in/out, fade + zoom-95 + slide-from-side (200ms)
Item padding:   px-2 py-1.5 (8px × 6px)
Item radius:    rounded-sm (4px)
Focus:          bg-accent (keyboard navigation highlight)
```

### Modals & Dialogs

**Dashboards (Radix Dialog):**
```
Overlay:        fixed inset-0 z-50, bg-black/80, fade-in/out animation
Content:        fixed centered (50%/50% + translate), z-50
Max-width:      max-w-lg (512px)
Padding:        p-6 (24px)
Border:         border
Border-radius:  sm:rounded-lg (on small+ screens)
Shadow:         shadow-lg
Animation:      fade + zoom-95 + slide from center (200ms)
Close button:   absolute right-4 top-4, X icon 16×16, opacity-70 → hover 100%
Focus ring:     ring-2 ring-ring ring-offset-2 on close button
```

### Tabs & Toggles

**Login Page Tabs:**
```
Layout:         flex, border-bottom 1px solid var(--divider)
Tab padding:    10px 16px, flex: 1
Font:           13px weight-600
Inactive:       color var(--text-muted), border-bottom 2px transparent
Active:         color var(--primary), border-bottom-color var(--primary)
Hover:          color var(--text-primary)
Transition:     color 0.2s, border-color 0.2s
```

**Dashboard Tabs (Radix):**
```
List:           inline-flex h-9, bg-muted, p-1, rounded-lg
Trigger:        px-3 py-1, rounded-md, text-sm font-medium
Active:         data-[state=active]:bg-background, shadow, text-foreground
Focus:          ring-2 ring-ring ring-offset-2
Transition:     transition-all
```

**Language Toggle (Topbar):**
```
Container:      inline-flex, bg var(--bg-sunken), border var(--line), radius 6px, padding 2px
Button:         3px 9px padding, font 11.5px
Active:         bg var(--bg-raised), shadow-sm, weight 500, color var(--ink)
Inactive:       transparent bg, color var(--ink-3)
```

---

## D. Data Visualization

### Chart Color Palette (5 Colors)

Defined in `tokens.css` as HSL values, shared across all dashboards:

| Slot | HSL | Approximate Hex | Semantic Role |
|------|-----|-----------------|---------------|
| chart-1 | 13 81% 63% | #ED7453 (coral/orange) | Primary metric, brand-adjacent |
| chart-2 | 168 73% 51% | #23E2C0 (teal) | Secondary metric, accent |
| chart-3 | 122 39% 49% | #4CAF50 (green) | Tertiary, positive/growth |
| chart-4 | 222 100% 67% | #5688FF (blue) | Quaternary, comparison |
| chart-5 | 16 60% 72% | #E0A28F (muted peach) | Fifth series, subtle |

**Logic:** The palette moves around the color wheel (warm → cool → warm) with decreasing saturation to maintain distinction. Chart-1 is brand-adjacent but NOT the exact brand orange — it's slightly lighter to work at area-fill opacity. The brand orange `#E95223` is reserved for UI actions, never data by default.

**Analytics sparkline colors** (SVG utility classes):
- `.stroke-ink` — primary line (default, highest priority)
- `.stroke-primary` — brand accent line
- `.stroke-acc` — teal accent line
- `.stroke-neg` — red negative trend line
- `.stroke-line` — axis/grid lines (var(--line-strong))

### Chart Container Styling

**Analytics AreaChart:**
```
Container:      SVG, width 100%, viewBox-based (320×80 default)
preserveAspectRatio: none (stretches to fill)
Background:     transparent (inherits card bg)
Axis line:      1px stroke var(--line-strong) at bottom edge
Area fill:      linear-gradient, top 12% opacity → bottom 0% opacity
Stroke width:   1.6px, strokeLinecap round
Annotation:     dashed vertical line (2 2 dasharray) + 3px circle with card-bg fill
```

**Dashboard charts** use shadcn/ui chart wrappers (Recharts under the hood):
```
Container:      card with p-6 padding
Border:         border border-border
Radius:         rounded-xl
Shadow:         shadow
```

### Axis Label Typography

```
Font-size:      11px
Color:          var(--ink-3) / text-muted-foreground
Weight:         400 (regular)
Numeric:        tabular-nums
Alignment:      left for Y-axis, center for X-axis
```

### Tooltip Styling

Follows the popover pattern:
```
Background:     var(--bg-raised) / bg-popover
Border:         1px solid var(--line) / border
Border-radius:  8px / rounded-md
Shadow:         var(--shadow-md) / shadow-md
Padding:        8-12px
Font-size:      12-13px
Color:          var(--ink) / foreground
```

### Empty States

**DataTable empty:**
```
Text:           "No data available" (configurable message)
Style:          text-sm text-muted-foreground text-center py-8
```

**DashboardPageTemplate error:**
```
Container:      flex, p-4, rounded-xl, border
Colors:         bg-red-50 dark:bg-red-900/20, text-red-700 dark:text-red-300, border-red-200
Icon:           AlertCircle 20×20, flex-shrink-0
Title:          font-semibold "Error Loading {title}"
Message:        text-sm "Failed to load dashboard data. Please try refreshing the page."
```

---

## E. Color Application Rules

### When Primary Orange Appears

| Context | Color Used | Application |
|---------|-----------|-------------|
| CTA buttons | `var(--primary)` #E95223 | `.btn.primary`, `.auth-btn` |
| Active nav item | `var(--primary-soft)` + `var(--primary)` | Background tint + text/icon |
| Focus rings | `var(--primary-soft)` | 3px box-shadow glow |
| Brand badge/mark | `var(--primary)` | 28×28 square in topbar/sidebar |
| Active chip border | `var(--primary)` | `.chip.active` border only |
| Avatar background | `var(--primary-soft)` | Subtle tinted circle |
| Links (auth footer) | `var(--primary)` | Text color only |
| Tier gate icon | `var(--primary-soft)` + `var(--primary)` | Icon container |
| Sort indicator | `text-primary` | Active column sort arrow |

**Never orange by default:** Chart data, table cell text, body copy, borders, backgrounds. The brand orange is an interaction/attention color, not a data color.

### Neutral Scale & Depth Layers

**Light mode surface stack:**
```
Layer 0 (sunken):     var(--bg-sunken) = #F4F4F5 — recessed areas, table headers, chip bg
Layer 1 (base):       var(--bg) = #FFFFFF — page background, sidebar
Layer 2 (raised):     var(--bg-raised) = #FFFFFF — cards, popovers (same as base in light)
Layer 3 (popover):    var(--bg-raised) + shadow-md — floating menus
```

**Dark mode surface stack:**
```
Layer 0 (sunken):     var(--bg-sunken) = #111113 — deeply recessed
Layer 1 (base):       var(--bg) = #18181B — page background
Layer 2 (raised):     var(--bg-raised) = #1F1F23 — cards, dialogs
Layer 3 (popover):    var(--bg-raised) + shadow-md — floating menus
```

### The Warm HSL Neutrals (30° Hue in Light Mode)

The login page and dashboard tokens use `hsl(30, ...)` for light-mode neutrals:
```
--bg:           hsl(30 20% 95%)     — warm off-white
--card-bg:      hsl(30 20% 97%)     — slightly lighter warm
--card-border:  hsl(30 10% 88%)     — warm gray border
--input-bg:     hsl(30 12% 96%)     — warm input fill
```

**Why 30° hue?** The warm shift prevents the "clinical/cold" feel of pure gray. It subtly echoes the orange brand color in the environment, making the UI feel intentionally designed rather than default. The analytics app uses Zinc scale (more neutral) while the dashboards and login use the warmer 30° palette. Both approaches are valid within the system.

### Border Opacity as Depth Cue

The dashboard tokens define borders via HSL saturation/lightness rather than explicit opacity, but the analytics app uses solid colors with a clear hierarchy:

```
var(--line):        #E4E4E7 (light) / #27272A (dark) — default separator
var(--line-strong): #D4D4D8 (light) / #3F3F46 (dark) — emphasized separator

Dashboard opacity pattern:
border-border/50    — 50% opacity borders on glassmorphism cards
border-border       — full opacity for standard cards
```

In the dashboard `SidebarLayout`, the `/50` opacity modifier creates a softer boundary on backdrop-blur surfaces — the glass effect means hard borders look wrong.

---

## F. Typography in Context

### Font Stack

| Role | Font | Fallbacks |
|------|------|-----------|
| Body | Plus Jakarta Sans | -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif |
| Display/Headings | Space Grotesk | Plus Jakarta Sans, sans-serif |
| Monospace | JetBrains Mono | ui-monospace, monospace |
| Arabic | IBM Plex Sans Arabic | Plus Jakarta Sans, sans-serif |

### Size Hierarchy in Analytics

| Element | Size | Weight | Extras |
|---------|------|--------|--------|
| Page title (h1) | 32px | 700 | Space Grotesk, -0.025em tracking, line-height 1.1 |
| Card title | (inherited from context) | 600 | — |
| Nav section header | 11px | 600 | uppercase, 0.06em tracking |
| Nav item | 13.5px | 400 (500 when active) | — |
| Body text | 14px | 400 | line-height 1.5 |
| Table body | 13px | 400 | — |
| Table header | 11px | 600 | uppercase, 0.04em tracking |
| KPI value | 30px | 700 | Space Grotesk, -0.02em tracking |
| KPI label | 11px | 500 | uppercase, 0.04em tracking |
| Badge text | 11px | 500 | — |
| Button text | 13px | 500 | — |
| Chip text | 13px | 400 | — |
| Eyebrow (page) | 11px | 600 | uppercase, 0.06em tracking |
| Lede (subtitle) | 14px | 400 | color var(--ink-3), max-width 60ch |

### Dashboard Font Scale (Tailwind Preset)

| Token | Size | Line-height | Use |
|-------|------|-------------|-----|
| skawr-2xs | 0.5rem (8px) | 0.75rem | Micro labels |
| skawr-xs | 0.64rem (10px) | 1rem | Tiny metadata |
| skawr-sm | 0.8125rem (13px) | 1.25rem | Table cells, secondary text |
| skawr-base | 0.875rem (14px) | 1.375rem | Body text |
| skawr-md | 0.9375rem (15px) | 1.5rem | Slightly larger body |
| skawr-lg | 1rem (16px) | 1.5rem | Emphasized body |
| skawr-xl | 1.125rem (18px) | 1.75rem | Section titles |
| skawr-2xl | 1.25rem (20px) | 1.75rem | Card titles |
| skawr-3xl | 1.5625rem (25px) | 2rem | Page subtitles |
| skawr-4xl | 1.6875rem (27px) | 2.25rem | Page titles |
| skawr-5xl | 1.953rem (31px) | 2.5rem | Hero numbers |
| skawr-6xl | 2.441rem (39px) | 3rem | Display headlines |

### Monospace Usage

Applied via `.mono` class or `font-mono` in Tailwind:
- **Live indicator label** in topbar (11.5px)
- **Timestamps** in event streams
- **API keys** and code snippets
- **Login page footer** ("skawr.com" — 11px, 0.04em tracking)
- **Technical metadata** (request IDs, UUIDs)
- Feature setting: `font-feature-settings: 'zero'` (slashed zero for clarity)

### The Uppercase Label Pattern

Used consistently across both apps for category/section headers and metadata labels:
```
Font-size:      11px
Weight:         500–600
Transform:      text-transform: uppercase
Letter-spacing: 0.04em (table headers, KPI labels) or 0.06em (nav sections, eyebrows)
Color:          var(--ink-3) or var(--ink-4) (tertiary/quaternary)
```

This pattern signals "meta-information" — it's never used for actionable or primary content.

---

## G. Dark Mode in Apps

### Approach

**Analytics:** `[data-theme="dark"]` selector — implies manual toggle (JS sets the attribute on `<html>`).

**Dashboards + Login:** `@media (prefers-color-scheme: dark)` — follows OS preference automatically.

Both approaches coexist across the ecosystem. The analytics app gives users explicit control. The dashboards defer to system settings.

### Surface Stack in Dark Mode

| Layer | Analytics | Dashboards (HSL) |
|-------|-----------|------------------|
| Deepest (sunken) | #111113 | hsl(225 6% 18%) |
| Base (page) | #18181B | hsl(225 10% 11%) |
| Raised (cards) | #1F1F23 | hsl(225 8% 14%) |
| Popover | #1F1F23 + shadow | hsl(225 8% 14%) + shadow |

**Key difference:** Dashboard dark mode uses a cool 225° hue (blue-gray) while analytics uses near-neutral zinc. Both avoid pure black (#000).

### Border Subtlety in Dark Mode

```
Analytics:
  --line:        #27272A  (lighter than base bg, subtle)
  --line-strong: #3F3F46  (visible emphasis)

Dashboards:
  --border:      hsl(225 6% 20%)   (very subtle against 11% bg)
  --input:       hsl(225 6% 24%)   (slightly more visible for form fields)
```

Borders become more subtle in dark mode — they're closer in lightness to their surrounding surfaces. The dashboards use `/50` opacity modifiers on border classes for glassmorphism cards, making borders nearly invisible.

### Text Contrast

**Analytics dark text scale:**
```
--ink:    #F4F4F5  (primary text — not pure white, avoids glare)
--ink-2:  #D4D4D8  (secondary — slightly dimmer)
--ink-3:  #A1A1AA  (tertiary — metadata, labels)
--ink-4:  #71717A  (quaternary — disabled, placeholder)
```

**Dashboards dark text:**
```
--foreground:       hsl(30 20% 93%)  (warm off-white primary)
--muted-foreground: hsl(30 10% 55%) (warm medium gray secondary)
```

Both avoid pure white (#FFF) for primary text — using 93-96% lightness instead. This reduces eye strain in sustained dark-mode usage.

### Semantic Colors in Dark Mode

Colors shift to lighter/more saturated variants for readability against dark backgrounds:
```
Green:  #16A34A → #4ADE80  (brighter, less saturated)
Red:    #DC2626 → #F87171  (lighter, less intense)
Orange: #E95223 → #ED7453  (lighter coral, softer)
Warn:   #D97706 → #FBBF24  (much brighter yellow)
```

Soft backgrounds also increase opacity slightly (6-8% → 10-12%) to remain visible.

---

## H. State Management in UI

### Loading States

**Skeleton Pattern (Dashboards):**
```
Animation:      shimmer — bg-[length:200%_100%] gradient slides left-to-right
Colors (light): from-gray-200 via-gray-300 to-gray-200
Colors (dark):  from-gray-600 via-gray-500 to-gray-600
Border-radius:  rounded-lg (8px)
Shadow:         shadow-sm (subtle depth even while loading)
```

**TableSkeleton:**
- Renders actual table structure with skeleton cells
- Alternating row backgrounds (gray-50/30 on even rows)
- Staggered row entry animation (`slideInUp 0.6s ease-out`, 100ms delay per row)
- Proportional widths: first col 140px, middle 80px, last 100px

**CardSkeleton:**
- Mimics real card layout: header row (title + icon), large value block, footer line
- Uses `animate-pulse` (Tailwind default pulse)
- Gradient background: `from-white via-gray-50 to-white`

**DashboardPageTemplate loading:**
- Shows real title + icon immediately (no skeleton for header)
- Subtitle replaced with "Loading..." text
- Grid of CardSkeleton components (count matches expected stats)

### Error States

**Inline Error (DashboardPageTemplate):**
```
Container:      flex items-start gap-3 p-4 rounded-xl border
Light:          bg-red-50, text-red-700, border-red-200
Dark:           bg-red-900/20, text-red-300, border-red-800
Icon:           AlertCircle 20×20, flex-shrink-0, mt-0.5
Title:          font-semibold, no margin
Message:        text-sm, mt-1
```

**Auth Error (Analytics):**
```
Container:      var(--neg-soft) bg, 1px solid var(--neg) border, radius 8px
Padding:        12px
Color:          var(--neg)
Font-size:      14px
Margin-bottom:  16px
```

**Login Error (with icon):**
```
Layout:         flex, align-items center, gap 10px
Background:     var(--error-bg)
Border:         1px solid var(--error-border), radius 10px
Padding:        12px 14px
Icon:           16×16 SVG circle with exclamation mark
Font-size:      13px, line-height 1.4
ARIA:           role="alert"
```

### Empty States

**DataTable:** Centered text, `text-sm text-muted-foreground text-center py-8`, configurable message (default "No data available").

**Project Switcher (no projects):** Inline text `padding: 10px, fontSize: 12.5px, color: var(--ink-3)`, message "No projects yet."

**Tier Gate (upgrade prompt):**
```
Layout:         flex column, centered, padding 64px 32px
Icon:           48×48px, radius 12px, var(--primary-soft) bg, var(--primary) color
Title:          Space Grotesk 22px bold, -0.02em tracking
Description:    14px var(--ink-3), max-width 40ch, line-height 1.5
CTA:            .btn.primary, height 40px, padding 0 20px, font-size 14px
```

### Success Feedback

Toast notifications are not visible in the CSS/component files read — likely handled by a toast library (e.g., sonner or react-hot-toast) not captured here. The pattern would follow the popover style:
- Position: fixed bottom-right or top-center
- Background: var(--bg-raised)
- Border + shadow: consistent with other popovers
- Duration: 3-5 seconds with dismiss

### Disabled States

Consistent across both apps:
```
Analytics:  opacity: 0.45, cursor: not-allowed
Dashboards: opacity-50, pointer-events-none (also cursor-not-allowed on inputs)
```

---

## I. Spacing System

### Base Grid

The system uses a **4px base grid** with common multipliers:

| Token | Value | Usage |
|-------|-------|-------|
| 1 unit | 4px | Icon-to-text micro gap, padding adjustments |
| 2 units | 8px | Tight gaps (badge icon gap, inline spacing) |
| 3 units | 12px | Standard inline padding, table cell padding |
| 4 units | 16px | Standard block padding, component spacing |
| 5 units | 20px | Section title padding-top |
| 6 units | 24px | Page content padding, card padding (p-6) |
| 7 units | 28px | Page head top padding |
| 8 units | 32px | Page horizontal padding, auth card padding |
| 10 units | 40px | Large padding (feed-pad bottom) |
| 12 units | 48px | — |
| 16 units | 64px | Tier-gate vertical padding |

### Common Gaps

```
Card grid gap:          16px (KPI grid)
Section gap:            24px (split-page gap, dashboard space-y-6)
Feed padding:           24px 32px 40px (top, sides, bottom)
Page head to content:   16px (page-head bottom padding)
KPI grid to next:       32px (margin-bottom on .kpi-grid)
Toolbar to content:     16px (toolbar-row bottom padding)
Between filter chips:   8px
```

### Padding Hierarchy

| Level | Range | Usage |
|-------|-------|-------|
| Micro | 2-4px | Tab container padding (p-1), toggle padding |
| Tight | 6-8px | Nav item vertical, badge padding, chip inline |
| Standard | 10-14px | Button padding, input padding, table cells |
| Comfortable | 16-20px | KPI tiles, sidebar padding, mobile page padding |
| Spacious | 24-32px | Card padding (p-6), page content padding, auth card |
| Section | 36-48px | Auth card padding-top (40px), page head top (28px) |
| Hero | 64-80px | Tier gate padding, landing sections |

### Responsive Padding Collapse

Below 1024px:
```
Page head:      28px → 20px (top), 32px → 16px (sides)
Feed padding:   24px 32px → 16px 16px
Page title:     32px → 26px → 22px (at 640px)
Buttons:        min-height increases to 40px
Nav items:      padding increases to 12px 14px (larger touch targets)
KPI grid:       4-col → 2-col (at 1024px) → 1-col (at 640px)
```

---

## J. Accessibility Patterns

### Focus Ring Styling

**Analytics (custom CSS):**
```
Input focus:    border-color var(--primary) + box-shadow 0 0 0 3px var(--primary-soft)
No outline:     outline: none on inputs (replaced by box-shadow ring)
Chip/button:    no explicit focus-visible style in globals (relies on browser default or component)
```

**Dashboards (Tailwind):**
```
Buttons:        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
Inputs:         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
Tabs:           focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
Dialog close:   focus:ring-2 focus:ring-ring focus:ring-offset-2
```

**Focus vs Hover distinction:**
- Hover: background color change (subtle, e.g., bg-muted/30)
- Focus: ring/outline (visible, high-contrast)
- Both never apply simultaneously as the visual; focus wins when keyboard-navigating

### Touch Target Sizes

```
Minimum heights (mobile < 1024px):
  Buttons:      40px min-height
  Chips:        38px min-height
  Nav items:    ~41px (12px + 14.5px font + 12px padding)
  Auth inputs:  44px min-height
  Menu button:  36×36px

Desktop:
  Buttons:      34px
  Chips:        32px
  Nav items:    ~34px
  Inputs:       36px (h-9)
```

iOS zoom prevention: inputs on mobile forced to `font-size: 16px !important`.

### ARIA Patterns

**Drawer/Navigation:**
```html
<aside id="primary-nav" role="navigation" aria-label="Primary">
<button aria-label="Toggle navigation" aria-expanded={isOpen} aria-controls="primary-nav">
```

**User Menu:**
```html
<div aria-haspopup="menu" aria-expanded={menuOpen}>
<div role="menu">
  <button role="menuitem">Sign out</button>
</div>
```

**Error Alerts:**
```html
<div class="err" role="alert">...</div>
```

**Dialog (Radix):**
- Automatic focus trap
- `aria-labelledby` via DialogTitle
- `aria-describedby` via DialogDescription
- `sr-only` "Close" label on X button

**Focus Management (Drawer):**
- On open: saves `document.activeElement`, focuses first tabbable after 60ms delay
- On close: restores saved focus reference
- Tab trap: wraps from last→first and first→last (Shift+Tab)
- Only active below 1024px (when acting as modal drawer)

### RTL Implementation

**CSS Logical Properties:**
```css
inset-inline-start: 0;       /* instead of left/right */
inset-inline-end: 0;
border-inline-end: 1px solid; /* instead of border-right */
margin-inline-start: auto;   /* instead of margin-left */
padding-inline: 30px 36px;   /* instead of padding-left/right */
```

**Font switching:**
```css
[dir="rtl"] { font-family: 'IBM Plex Sans Arabic', 'Plus Jakarta Sans', sans-serif; }
[dir="rtl"] .display { font-family: 'IBM Plex Sans Arabic', sans-serif; }
```

**Grid flip:**
```css
.screen[dir="rtl"] { grid-template-columns: 1fr 240px; }
```

**Swipe-to-close direction awareness:**
- LTR: swipe left to close (dx < -80px threshold)
- RTL: swipe right to close (dx > 80px threshold)

**Component props:** `dir: 'ltr' | 'rtl'` passed through layout, `isAr` boolean derived for conditional logic.

---

## Appendix: Key Design Tokens Quick Reference

### Analytics (`globals.css`)
```css
--primary:        #E95223 (light) / #ED7453 (dark)
--primary-soft:   rgba(233,82,35,0.08) / rgba(237,116,83,0.12)
--primary-hover:  #D4471E / #E95223
--accent:         #0BBFA0 / #34D399
--bg:             #FFFFFF / #18181B
--bg-raised:      #FFFFFF / #1F1F23
--bg-sunken:      #F4F4F5 / #111113
--line:           #E4E4E7 / #27272A
--ink:            #18181B / #F4F4F5
--radius:         8px
--radius-lg:      12px
```

### Dashboards (`tokens.css`)
```css
--background:     30 20% 95% (light) / 225 10% 11% (dark)
--card:           30 20% 97% / 225 8% 14%
--primary:        13 81% 63% (both modes — #ED7453)
--border:         30 10% 88% / 225 6% 20%
--radius:         0.75rem (12px)
```

### Shared Brand Constants
```
Primary orange:   #ED7453 (lighter) / #E95223 (darker/hover)
Teal accent:      #23E2C0 / #0BBFA0
Body font:        Plus Jakarta Sans
Heading font:     Space Grotesk
Mono font:        JetBrains Mono
Arabic font:      IBM Plex Sans Arabic
```
