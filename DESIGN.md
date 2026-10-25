---
name: JanSahayak SafeStreets
description: "The Neighbourhood Noticeboard — a calm, paper-and-forest civic design system for the SafeStreets hazard reporting portal (Greater Noida pilot)"
colors:
  paper: "#f5f3ed"
  bright-card: "#faf9f5"
  deep-forest: "#0e2b24"
  forest-hover: "#1c4b3e"
  ink: "#17382f"
  overlay-ink: "#14352b"
  text-secondary: "#486057"
  text-quiet: "#5c6f66"
  text-faint: "#718077"
  on-glass-body: "#dce8d9"
  on-glass-quiet: "#9cb4a5"
  on-glass-icon: "#c9dfc7"
  sage: "#dce8d9"
  sage-footer: "#dfe9dc"
  sage-hover: "#e9efe8"
  sage-tint: "#eef1e9"
  sage-card-bg: "#f4f7f1"
  line-strong: "#cbd5cb"
  line: "#d2d9d0"
  line-soft: "#eef1e9"
  line-hairline: "#e2eae0"
  coral: "#e4876f"
  coral-ink: "#8c2e1b"
  coral-tint: "#f3d9cf"
  amber: "#e7b64f"
  amber-ink: "#7a540b"
  amber-tint: "#f4e8be"
  green: "#78a37d"
  green-ink: "#234a29"
  green-tint: "#d6e5d2"
  selection: "#b6cfb7"
  focus-ochre: "#bd7b3b"
  destructive: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.05em"
  headline:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.12em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  pill: "999px"
  lg: "20px"
  md: "14px"
  sm: "10px"
  xs: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  "2xl": "64px"
components:
  button-primary:
    backgroundColor: "{colors.deep-forest}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "15px 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.forest-hover}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.deep-forest}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "40px"
  chip-critical:
    backgroundColor: "{colors.coral-tint}"
    textColor: "{colors.coral-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  chip-moderate:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  chip-minor:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.green-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  chip-status:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  input:
    backgroundColor: "rgba(255,255,255,0.58)"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "48px"
    padding: "0 14px"
  card-panel:
    backgroundColor: "{colors.bright-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "clamp(34px, 7vw, 72px)"
---

# Design System: JanSahayak SafeStreets

## Overview

**Creative North Star: "The Neighbourhood Noticeboard"**

JanSahayak SafeStreets looks like a well-kept neighbourhood noticeboard translated into a modern public service. Everything sits on warm **Paper** rather than white, information is grouped the way notices are pinned — thin ruled borders that tile into a single continuous grid — and the structure is drawn in **forest green ink**. It is calm, warm, and evidence-minded: a civic record, not an alarm system, not a charity campaign, not a SaaS dashboard. Depth is flat by default; hierarchy comes from ink darkness, ruled lines, and generous paper space.

The system has two surfaces that share one world. The **public portal** (landing, report flow, public map) speaks in Noticeboard language: paper surfaces, serif editorial headings for landmarks, oversized sans display for the hero voice, pill-shaped touch targets, and the safety-map as the signature illustration. The **operations dashboard** uses the same palette, the same status semantics, and the same type ladder inside conventional shadcn primitives so operators can work at density — but it never invents colours the portal doesn't have.

Trust is the product's core asset, and the design system enforces it visually: citizen evidence, community verification, and official action each look different, and the interface never dresses itself in government authority.

**Key Characteristics:**

- Warm paper ground (`#f5f3ed`), never pure white as a page surface; white appears only as translucent glass layers (≤60%) and marker fills.
- Forest-ink hierarchy: depth is expressed as ink temperature, not drop shadows — dark ink for landmarks, muted green-grays for support, ruled hairlines for structure.
- Noticeboard boxes: 1px low-contrast borders (`#cbd5cb`) that collapse shared edges into one continuous ruled surface.
- One coral voice: coral/amber/green carry _severity and status only_, never decoration; the primary action color is deep forest.
- Editorial serif (Georgia) reserved for landmark headings — the moment of human voice — with sharp oversized sans Geist for the display voice and all UI roles.
- Status language is fixed and universal: the same chip colors and dot colors mean the same thing on the map, the cards, the tables, and the dashboard.
- Rich motion is reserved for the Report CTA (the one signature animation) and map pin life; everything else moves quietly at 150–250ms.

## Colors

The palette is a set of green-forest inks printed on warm paper, with three small status accents (coral, amber, green) used sparingly like warning labels on a public board. Neutrals are slightly green-shifted at every step so the page never reads clinical.

### Primary

- **Deep Forest** (`#0e2b24`): the ink that does the work. Primary buttons, glass navbar ground, on-map overlay headings, selected states, CTA icon chips. On glass surfaces paired with Paper text (13.6:1).
- **Forest Hover** (`#1c4b3e`): every deep-forest interactive surface shifts to this on hover — no darkening math, one fixed step.
- **Ink** (`#17382f`): body-ink and foreground role inside cards and forms.
- **Overlay Ink** (`#14352b`): text placed directly over the live map; strongest ink available (12:1 on paper).

### Status accents

- **Coral** (`#e4876f`) / **Coral Ink** (`#8c2e1b`) / **Coral Tint** (`#f3d9cf`): critical severity exclusively. Coral means "urgent hazard", nothing else. Coral never carries text below `#8c2e1b` (7.5:1 on paper).
- **Amber** (`#e7b64f`) / **Amber Ink** (`#7a540b`) / **Amber Tint** (`#f4e8be`): moderate severity, "in progress / pending review" waiting states, and the pilot-location dot.
- **Green** (`#78a37d`) / **Green Ink** (`#234a29`) / **Green Tint** (`#d6e5d2`): verified, resolved, and healthy. Green is _earned_ — it says a human or an authority acted. 6px verification dots, resolved chips, live-status "measured now" pulses.

### Neutral

- **Paper** (`#f5f3ed`): page background everywhere.
- **Bright Card** (`#faf9f5`): elevated panels that need to lift off paper (dropdowns, the report panel, process band).
- **Sage** (`#dce8d9`): the map/card surface tint; also on-glass secondary text color.
- **Sage Footer** (`#dfe9dc`): footer band only.
- **Sage Hover** (`#e9efe8`) / **Sage Tint** (`#eef1e9`) / **Sage Card BG** (`#f4f7f1`): interactive row hovers and table tints, in ascending order of strength.
- **Line Strong** (`#cbd5cb`), **Line** (`#d2d9d0`), **Line Hairline** (`#eef1e9` / `#e2eae0`): the noticeboard ruling — strongest for enclosing boxes, softest for internal row dividers.
- **Text Secondary** (`#486057`, 6.1:1): supporting copy, icons in text contexts.
- **Text Quiet** (`#5c6f66`, 4.8:1): captions on paper, ≥12px only.
- **Text Faint** (`#718077`, 3.7:1): _large text and decorative micro-labels only_; never below 4.5:1 — use Text Quiet instead below 14px (see The Ink Ladder).
- **On-Glass roles** (`#dce8d9` body / `#9cb4a5` muted / `#c9dfc7` icons): the glass navbar's own text ladder, all ≥6.8:1 on deep forest.
- **Selection** (`#b6cfb7` with Deep Forest text), **Focus Ochre** (`#bd7b3b`, 3px outline, 4px offset), **Destructive** (`oklch(0.577 0.245 27.325)`): destructive actions and errors in dashboard primitives; red is reserved for genuine errors and _never_ used for ordinary "open" workflow states.

### Map ground tinting (data-driven, not decorative)

MapLibre layers are re-skinned at load: water `#d2dfd1`, waterways `#c0d4bf`, parks `#e2ede0`, landcover `#edeae1`, residential `#f0ece3`, buildings `#eae6dc` with tops `#efece4`, map background `#f5f3ed` = Paper. Bridges, pins, and controls use the same palette; no third-party default colors may survive the skin.

### Named Rules

**The One Voice Rule.** Coral, amber, and green together cover ≤10% of any screen. If a view reads warmly colored, it is lying about severity. Severity chips, status dots, and 6px map dots are the only carriers; these accents never color headings, links, or large fills.

**The Ink Ladder Rule.** Text contrast is enforced by role, not by eye. Any text below 14px must be at least `#5c6f66` (4.5:1 on paper). `#718077` and lighter are _display-size_ colors: allowed only at ≥14px or for non-essential decorative captions. No text may sit on Paper below 11px, ever.

**The Paper Rule.** Page canvases are Paper, not white. White appears only as translucent layers (form fills 58%, glass cards 90–95%), pin centers, and button fills on dark surfaces. A full-white page section means someone imported a component without restating its ground.

**The Earned Green Rule.** Green is reserved for verified/resolved facts. "Open", unreviewed, or unverified states never receive green. A green dot must trace back to an action someone took.

**The Severity/status Split.** Severity (critical/moderate/minor) and status (Under Review → Verified → Authority Notified → Action Logged) are two independent vocabularies that never share a chip. Severity is urgency; status is progress (see Components → Status & Severity Chips).

## Typography

**Display/Body/UI Font:** Geist (loaded via `next/font`, fallback Arial/Helvetica)
**Editorial Landmark Font:** Georgia / Times New Roman system serif (no webfont needed — it is a deliberate system voice)
**Data/ID Font:** Geist Mono (loaded via `next/font`)

**Character:** A sharp, slightly tightened grotesk carries everything functional — responsive, dense, contemporary — while the human, hand-set serif voice appears only at editorial moments, like a printed masthead on the noticeboard. The pairing should always feel like a public institution that reads like a neighbour.

### Hierarchy

- **Display** (Geist, 700, `clamp(2.4rem, 6.5vw, 4rem)` / 0.92 / −0.05em): the hero overlay headline and the report-flow opening statement. One per page. Tight tracking and sub-1 leading are intrinsic to this voice.
- **Headline — Serif** (Georgia, 400, `clamp(1.75rem, 3.5vw, 2.75rem)` / 1.05 / −0.02em): section landmark headings on the public portal ("How civic reporting works", hazard categories). **Headline — Ops** (Geist, 700, 1.5rem / 1.2 / −0.01em): dashboard page titles where the serif would read as decoration.
- **Title** (Geist, 600, 1.25rem / 1.3): card titles, panel headings, hazard names at large sizes.
- **Body** (Geist, 400, 0.875–1rem / 1.65, max 65–75ch): all running copy. 16px for intros, 14px for UI paragraphs, 13px for dense table/drawer contexts.
- **Small Support** (Geist, 400–500, 0.75rem / 1.5): landlocked support copy under 12px is forbidden; 12px is the floor for any real information.
- **Label** (Geist, 700, 0.6875rem / 0.125em / uppercase): eyebrows, section labels ("WHAT NEEDS ATTENTION"), step phases, filter tab labels. Minimum 11px and always 700 weight — if it can't be bold, it isn't a Label, it's small Body.
- **Mono** (Geist Mono, 600, 0.75rem): case IDs (`GN-2026-0412`, `R-2041`), timestamps, coordinates, report numbers. IDs are always mono — they are records, not headlines.

### Named Rules

**The Serif Signature Rule.** Georgia appears only where a section _lands_: portal section headings and the hazard list names. It never appears on buttons, chips, dashboards, or body copy. If the serif appears more than three times per page, it stops being a signature.

**The Two-Ink Rule.** Emphasis inside a headline is a weight/ink change (`#17382f` → muted `#78807d` italic or 460-weight color span) at display sizes where 3:1 is legal — never a status accent color. Status colors do not typeset.

## Layout

The public portal is a **noticeboard grid**: one `1380px` max-width column (`box-grid`), side insets `clamp(12px, 3vw, 58px)` that collapse to 0 below 560px so boxes run edge-to-edge. Sections are ruled boxes (`1px solid #cbd5cb`) that share edges (`+` siblings drop `border-top`) and are stack-ruled rather than floating cards. Horizontal padding inside sections runs 24 → 40 → 56px (mobile → tablet → desktop).

- **Hero:** full-bleed live map, `calc(100dvh − 80px)` height with a `600px` (min-h-150px) floor. Text overlay is absolutely positioned top-left, `pointer-events-none`, max-width ~36rem, padded 24/40/56px. Nav is 80px tall; anchor sections scroll-mt 96px.
- **Process strip:** four equal columns (1 → 2 → 4 at 768/1024px) inside one ruled container with internal `divide-x`, cell padding 20px, hover tint `#f4f7f1`. Bands use `#faf9f5`.
- **Hazard list:** rounded (14px) ruled list; rows `20px × 24px` padding, 40px round symbol, hairline dividers, hover `#eef1e9`.
- **Report flow:** single centered column, `860px` max, 42px top / 80px bottom page padding; panel `clamp(34px, 7vw, 72px)` internal padding at radius 20px; form column max 520px, 22px field gap, 9px label-field gap.
- **Footer:** `#dfe9dc` band, 55px block padding, three-part flex (brand narrative / links / right-aligned disclaimer), wraps to stack below 900px.
- **Dashboard:** 256px fixed sidebar (`md+`), Sheet drawer below; content `max-w-7xl`, `p-4 md:p-8`; grids `gap-4` (KPI row) and `gap-6` (8/4 column split at `lg`); cards keep `border-b/-t` ruled headers/footers instead of shadows.

**Spacing scale:** 4 / 8 / 16 / 24 / 40 / 64 (`--spacing` tokens). Component gaps default to 8 (icon-text), 12–16 (control pairs), 22–26 (form fields, hero actions); section rhythm 64–122px between rules. Never invent intermediate values below 12px; above 24px, jump to the named step.

**Breakpoints:** 560px (mobile compaction), 768px (`md`, dashboard sidebar, 2-col), 900px (tablet fold: nav center links disappear, hero stacks), 1024px (`lg`, 4-col strips, 8/4 dashboards), 1380px (max width).

## Elevation & Depth

Depth is **tonal and ruled, not shadowed**. Nested surfaces lighten (Paper → Bright Card), enclosing rules thicken slightly (Line Strong), and internal dividers weaken (Line → Line Hairline). Shadows exist only where a surface genuinely floats — dropdowns, popovers, map pins, the pinned glass navbar — and every shadow value is forest-tinted (`rgba(14,43,36,…)` or `rgba(22,57,45,…)`), never neutral black.

### Shadow Vocabulary

- **Overlay Panel** (`0 16px 36px rgba(14,43,36,0.12), 0 3px 8px rgba(14,43,36,0.05)`): dropdowns, popups, floating cards.
- **Float Card** (`0 18px 40px rgba(22,57,45,0.08)`): the map card / hero map frame.
- **Glass Bar** (`0 8px 32px rgba(14,43,36,0.28)` + `inset 0 1px 0 rgba(255,255,255,0.1)`): the sticky nav only.
- **Pin Drop** (`drop-shadow 0 4px 6px rgba(14,43,36,0.25)` / `0 5px 10px rgba(24,57,45,0.15)`): map pins and their labels.
- **Resting** (`shadow-xs` 1px hairline): dashboard cards at rest — subtle enough to pass as ruled.

### Named Rules

**The Flat-By-Default Rule.** Static surfaces never shadow to imply rank; rules and ink do that. A shadow appears only on hover, focus, float, or pinned state — and always in forest ink.

## Shapes

- **Radius ladder:** `pill (999px)` for all interactive controls on the portal (`nav-links`, buttons, CTAs, chips, symbol medallions); `lg (20px)` panels; `md (14px)` lists, dropdowns, drawn cards; `sm (10px)` inputs and selects; `xs (8px)` small buttons, icon tiles, brand mark. Nothing between steps.
- **Corner silhouette:** the brand mark (`30×30`, radius `8px 8px 8px 2px`) with three rising bars is the only asymmetric corner — asymmetric corners elsewhere are imitation.
- **Ruling:** 1px borders everywhere — 2px+ borders appear only as focus outlines (3px ochre) and pin strokes (1.5px in each accent's ink).
- **Medallions:** 40px circles carrying 21px icons for hazard categories; 26–28px circles/wafers for CTA icon chips; 6px dots for status; 7px dots for location.
- **Glass treatment:** glassmorphism is confined to the navbar (24px blur, 190% saturation, 85% deep forest) and floating map cards (95% white / `backdrop-blur`). Panels on paper use translucent white ≤60% over the paper ground, never frosted blur.

## Components

### Buttons

- **Shape:** pill (`999px`); icon tiles use `xs (8px)`.
- **Primary ("Report a hazard"):** Deep Forest fill + Paper text (700 label sizing 12px/600 in current code; 48px min-height portal, 40px nav). Signature hover: label slides 22px right while a 28px rise wafer slides in from the right launching → continuing arrow, background lifts to `#1c4b3e`, −2px translate, `0 8px 18px rgba(14,43,36,.14)`. Focus ring `0 0 0 4px rgba(228,135,111,.28)`.
- **Secondary:** Paper/sage fill, Deep Forest text, Line Strong pill border; hover `#e9efe8`.
- **On-glass navbar variant:** Paper fill on Deep Forest glass, hover to Sage `#dce8d9`; its 28px rolling icon disc inverts (Paper ↔ Deep Forest ↔ Sage).
- **Dashboard (shadcn):** primary = Deep Forest background + paper text (`bg-primary` mapped to ink), secondary = sage tint, ghost = transparent with `#eef1e9` hover, outline = Line Strong border; heights 32/28/24px, radius 8–10px, focus ring 3px ring/50.
- **Text link:** 12px/600 secondary ink, 1px underline offset 5px (border-bottom `#a6b7ab`), optional 16–18px arrow; hover deepens ink and arrow nudges +0.5 ×4px.
- **States:** disabled 50% opacity, no shadow; active: scale 0.98 / translate 0.

### Status & Severity Chips

- **Severity chips** (pill, 2×8 padding, 11px/600): Critical = Coral Tint bg + Coral Ink text + `rgba(228,135,111,.4)` border; Moderate = Amber Tint + Amber Ink; Minor/Standard = Green Tint + Green Ink. Urgency labels read "High urgency / Moderate urgency / Standard priority".
- **Status chips** (pill, Paper or Sage background, Ink text, Line Strong border, 6px leading dot): plain progress chip — no filled color except the dot. Dot colors: Under Review `amber`, Community Verified `green`, Authority Notified / Assigned `deep forest`, Action Logged / Resolved `green` + ✓. Red **never** marks workflow progress.
- **Dashboard badge mapping (shadcn variants):** Open → outline+amber dot; In Progress → secondary+amber; Escalated → coral-tinted destructive styling; Resolved → green tint; errors/duplicates → destructive. Never `default` (black) for a status.

### Cards / Containers

- **Standing section box:** transparent, 1px Line Strong border, shared edges collapsed; a rare ≤18% white wash may tint it.
- **Panel card:** Bright Card background, radius `lg (20px)`, 1px Line Strong, Panel padding, no shadow at rest.
- **Floating card (map drawer/popover):** `bg-white/95 backdrop-blur`, 1px Line Strong, `shadow-xl`, radius md, 10–16px padding; footer strip in `#f8faf7` with hairline divider.
- **Dashboard card (shadcn):** white ground, hairline border, ruled header/footers (border-b/border-t), muted-tinted footer band `bg-muted/20`; KPI values 30px Geist 700 with mono-adjacent tracking; 12px descriptors.

### Inputs / Fields

- **Style:** 48px min-height, radius `sm (10px)`, 1px Line Strong border, `rgba(255,255,255,0.58)` fill, Ink text 14px, placeholder `#788a81`, 14px horizontal padding; labels 12px/600 above with 9px gap.
- **Focus:** ochre outline 3px, offset 4px (global `focus-visible`); chips/buttons use matching ring-token `ring-ring/50` in shadcn primitives.
- **Error / Disabled:** destructive border + 3px destructive/20 ring (shadcn); disabled opacity 50 + no pointer events.

### Navigation

- **Portal nav:** sticky glass bar (80px, `rgba(14,43,36,0.85)` + 24px blur + 190% saturate, white 14% bottom hairline, Glass Bar shadow). Paper brand ink; center links live in a glass pill (white 8% fill, 12% border) — Sage 11px/500 links (11.9:1) with 36px pill targets, hover white + 16% fill; language trigger pill (40px) with globe + glyph + code + chevron; CTA per Buttons; mobile → 40px round toggle + paper drawer (8px links, hairline top).
- **Dashboard sidebar:** 256px white rail, hairline border-r, 10px uppercase kicker "Platform Management", ghost/secondary 40px rows (muted text → active secondary sage + 600 weight), 10px count badges, sticky, mobile Sheet at 72px (w-288px) width.
- **Active vs hover:** active state = sage fill + semibold ink; hover = `#eef1e9` tint. Underlines are never used for nav state.

### Live Map & Pins

- **Ground:** MapLibre re-skinned to the paper/sage land layer set (see Colors); Paper background while loading with a 32px forest spinner.
- **Pins:** 32×36 teardrop, 1.5px stroke in the accent's ink, white center disc with a smaller accent dot; Critical pins pulse (2s ring, `rgba(228,135,111,0.4)`); selected pin scales 1.2 in 200ms (see Motion for allowed easing). Pin labels: 9–10px Paper/90 tooltips — informational garnish only, never sole carriers.
- **Legend:** white/90 pill card, 10px labels, 8px accent dots (Critical/Moderate/Verified), `#cbd5cb` border, hidden under 640px.
- **Overlay text:** map-topped copy uses `hero-overlay-shadow` white multi-layer blur (text is `#0e2b24`/`#14352b`, shadows are white halos) so it stays ≥ AA over any land tint.

### Signature: The Report CTA

The only place motion tells the story: hover slides the label right, a second arrow wafer travels 106px (90px mobile) in from behind, the arrow morphs from "launch" (↗) to "continue" (→), and the disc closes into the deep-forest counter-fill. All transitions 200ms base / 450ms track on `cubic-bezier(0.16, 1, 0.3, 1)`; honors `prefers-reduced-motion` by freezing transforms.

## Do's and Don'ts

### Do:

- **Do** map every status and severity through the one chip vocabulary — the same colors and dot meanings on map, cards, tables, and dashboard.
- **Do** keep the paper ground: sections sit on `#f5f3ed`, panels on `#faf9f5`/white-glass, never raw default white behind brand chrome.
- **Do** use reserved mono for every ID and timestamp (`GN-2026-0412`, `R-2041`) — records must scan as records.
- **Do** brand the live map: every MapLibre layer re-skinned to the paper/sage ramps before first paint of user-visible content.
- **Do** keep 48px minimum touch targets on portal controls (nav pills, CTA, form fields); 40px only for secondary pills.
- **Do** honour `prefers-reduced-motion`: freeze lifts, slides, pulses; keep opacity-only changes.
- **Do** label illustrative/mock data ("Illustrative — pilot data", trusted phrasing) wherever invented rows or stats appear, per PRODUCT.md.
- **Do** visually distinguish citizen reports, community verification, and official updates — different icons/chips, never interchangeable.

### Don't:

- **Don't** introduce Tailwind's stock palette colors (`blue-600`, `teal-500`, `emerald-*`…) on brand surfaces — map each blue/teal KPI accent to Ink/Secondary ink or a named status accent before shipping.
- **Don't** use red/destructive for ordinary workflow states: red = error, escalation, or moderation danger only. `#e4876f` (Coral) is severity-critical, not "open".
- **Don't** set type below 11px, or any informational text below 12px; and never use `#718077`/lighter smaller than 14px (The Ink Ladder).
- **Don't** use the Georgia serif for UI, buttons, chips, dashboards, or body — it is the editorial signature only.
- **Don't** imply government authority in visual language (no state crests, official-sounding badges, uniforms of state design); the footer's "Not a government portal" is the voice to honor.
- **Don't** use fear imagery, alarm-red washes, or inflated stats; stakes are communicated via severity chips and honest status language.
- **Don't** bounce or elastic-ease (no overshooting `cubic-bezier` with y > 1); things land with deceleration, via `cubic-bezier(0.16,1,0.3,1)` or `ease-out`.
- **Don't** leave two visual vocabularies fighting in `globals.css`: when one style supersedes another (noticeboard vs. glass nav), delete the dead rules rather than piling later overrides.
- **Don't** place decorative shadows with neutral black tint — every shadow is forest-inked, or no shadow at all.
