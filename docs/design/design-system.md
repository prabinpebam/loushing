# Design system

The rules that keep every Loushing screen consistent: one token source, four tiers of
sealed components, and views assembled entirely from data. The method comes from
agentic-craft's design-system skill. This page applies it to Loushing and sets the
look: modern and clean, harbour mist, ink and teal with a coral spark, and one
hand-drawn character.

> **TL;DR.**
> - **Is there strict discipline?** The method existed through Craft (tokens only, four
>   tiers, sealed components, views from data, enforced by tests), but Loushing had no
>   product design system until now. It now has a token source that passes every
>   contrast check in light, dark and more-contrast, a component inventory, a view
>   format, and the list of checks that enforce it.
> - **The look:** a clean system with one hand-drawn character. The Harbour palette:
>   mist, ink and harbour teal, with coral for the one highlight per view; everything
>   except [Chopper](chopper.md) is crisp and geometric ([O22](#decisions-on-this-page)).
>   Every control is custom: pill buttons, a custom Select, custom checkboxes and a
>   thin scrollbar. A highlighted card gets a folded corner, the dog-ear.
> - **The rules:** components read tokens only, never raw values or primitives;
>   fundamentals are sealed; screens are [view specs](#views-from-data) made of blocks;
>   [visual first](visual-first.md) decides how each piece of information is shown;
>   layouts, not views, own Chopper's places.
> - **Now vs stage 1:** tokens, contrast checks and the token reference run today.
>   Components, the library and the style, copy, accessibility and Chopper checks start
>   with the site code in stage 1.
> - **Open:** the typeface (O23) is a working default for your review.

Related pages: [visual first](visual-first.md) · [Chopper](chopper.md) ·
[lighting system](lighting.md) ·
[tokens](tokens.md) · [product spec](../spec/product-spec.md#5-views) ·
[item pages](../spec/item-pages.md) ·
[Definitions of Done](../spec/definition-of-done.md).

## Where we stand

<div class="slate-card-grid" data-cols="3">
  <article class="slate-card">
    <p class="slate-card__kicker">Method</p>
    <p class="slate-card__metric">Ready</p>
    <p class="slate-card__body">Craft's design-system skill: DTCG tokens, four tiers, sealed components, views from data, enforcement tests.</p>
  </article>
  <article class="slate-card">
    <p class="slate-card__kicker">Tokens</p>
    <p class="slate-card__metric">Passing</p>
    <p class="slate-card__body">Primitives, semantic roles, scales and component tokens in design/tokens, with 32 contrast pairs held in every context.</p>
  </article>
  <article class="slate-card">
    <p class="slate-card__kicker">Views</p>
    <p class="slate-card__metric">Format set</p>
    <p class="slate-card__body">A view schema with 19 block types, and Home and skill page examples.</p>
  </article>
  <article class="slate-card">
    <p class="slate-card__kicker">Components</p>
    <p class="slate-card__metric">Specified</p>
    <p class="slate-card__body">The inventory below. Built in stage 1, with the site.</p>
  </article>
  <article class="slate-card">
    <p class="slate-card__kicker">Chopper</p>
    <p class="slate-card__metric">0 of 89</p>
    <p class="slate-card__body">Renders approved; 4 pilot drafts wait for your review. The character sheet, scenes, set pieces, stories, drawing standard and generation skill are ready.</p>
  </article>
  <article class="slate-card">
    <p class="slate-card__kicker">Enforcement</p>
    <p class="slate-card__metric">2 of 9</p>
    <p class="slate-card__body">Checks running today. The rest start with the site code.</p>
  </article>
</div>

## Look and feel

<div class="slate-card-grid" data-cols="2">
  <article class="slate-card">
    <h3 class="slate-card__title">A clean system, one character</h3>
    <p class="slate-card__body">Crisp geometry, generous space, rounded tiles and pill buttons. The only hand-drawn thing on screen is Chopper, so he reads as a character, not as a style.</p>
  </article>
  <article class="slate-card">
    <h3 class="slate-card__title">Harbour: mist, ink, teal and coral</h3>
    <p class="slate-card__body">A cool mist page, ink text, harbour teal for buttons, links and the current place, and coral kept for the one highlight in a view. Dark mode is harbour night, with a soft halo so Chopper stays visible.</p>
  </article>
  <article class="slate-card">
    <h3 class="slate-card__title">The dog-ear</h3>
    <p class="slate-card__body">A highlighted card gets a coral folded corner and a soft tint, not a side border. One per view, at most.</p>
  </article>
  <article class="slate-card">
    <h3 class="slate-card__title">Show, then tell</h3>
    <p class="slate-card__body">Tiles, grids, chips, trees, paths and timelines frame the content. Text content stays text and stays short. See visual first.</p>
  </article>
  <article class="slate-card">
    <h3 class="slate-card__title">Quiet motion</h3>
    <p class="slate-card__body">Short, functional transitions by default. Experimental lighting is on by default in Loushing, with slow off-frame shadow drift; it can be turned off, the drift can be stopped independently, and it freezes for reduced motion.</p>
  </article>
</div>

### Colour roles

Components use these roles, never the primitives behind them. The full list with every
value is the generated [token reference](tokens.md).

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `color.bg` | Mist `#f8fafd` | Night `#14181b` | The page |
| `color.bg-raised` | White | Ink `#1b1f23` | Cards, panels, inputs |
| `color.bg-sunken` | Mist 100 `#eef3f7` | Night 700 | Tiles and wells |
| `color.text` | Ink `#1b1f23` | Mist 100 | Body text and headings |
| `color.text-muted` | Ink 600 | Night 300 | Meta and secondary text |
| `color.action` | Harbour teal `#1d5f7a` | Harbour 300 | Primary buttons, with white (light) or night (dark) text |
| `color.accent` | Harbour teal | Harbour 300 | Links, selection, current place |
| `color.focus` | Coral 700 `#b04f27` | Coral 300 | The focus ring |
| `color.decor` | Coral `#f08a5d` | Coral `#f08a5d` | Illustration highlights and the dog-ear; never text or controls |
| `color.tint-coral`, `tint-harbour`, `tint-gold` | Coral, harbour and gold 100 | The same at 900 | Badge fills, secondary buttons and highlighted cards |
| `color.positive`, `color.negative` | Green 700, crimson 700 | Green 400, red 400 | Status; crimson is kept apart from coral |
| `color.series-1…5` | Coral, harbour, gold, blue, sage at 600-700 | The same at 300 | Charts and data visuals |

### Contrast

Every pair in `design/tokens/checks.json` holds in light, dark and more-contrast: text
at 4.5:1 and outlines, focus and chart series at 3:1.

<div class="slate-metrics">
  <div class="slate-metric">
    <p class="slate-metric__value">15.9:1</p>
    <p class="slate-metric__label">Text on the page, light</p>
  </div>
  <div class="slate-metric">
    <p class="slate-metric__value">16.0:1</p>
    <p class="slate-metric__label">Text on the page, dark</p>
  </div>
  <div class="slate-metric">
    <p class="slate-metric__value">6.8:1</p>
    <p class="slate-metric__label">Harbour teal links on the page, light</p>
  </div>
  <div class="slate-metric">
    <p class="slate-metric__value">3.4:1</p>
    <p class="slate-metric__label">Dark outline on a sunken tile (minimum 3)</p>
  </div>
</div>

### Type, space and shape

| Scale | Values | Notes |
| --- | --- | --- |
| Typeface | Inter Variable for UI and text; JetBrains Mono for commands and code | Self-hosted Latin subset; system fallbacks ([O23](#decisions-on-this-page)) |
| Text sizes | xs 0.75 · sm 0.875 · md 1 · lg 1.25 · xl 1.75 · 2xl 2.5 · 3xl 3.5 rem | 3xl only for the Home hero; reading text is md at leading 1.6 |
| Space | 1 · 2 · 3 · 4 · 6 · 8 · 12 · 16 · 24 (× 0.25 rem) | No other gaps |
| Radius | sm · md · lg (tiles) · xl · pill (buttons, chips) | |
| Sizes | Controls 2.75 rem (44 px targets) · reading measure 42 rem · tile minimum 16 rem · page 80 rem | |
| Chopper frames | sm 56 · md 96 · lg 160 px | The one size exception to rem: drawn images keep their [drawn scale](chopper.md#drawn-for-its-size), so text zoom never resizes them |
| Motion | fast 120 · base 200 · slow 320 ms; standard and bounce easings | Bounce is for Chopper's settle only |
| Layers | cameo 0 · raised 1 · sticky 100 · overlay 300 · toast 500 | Chopper is always below everything interactive |
| Header glass | Page colour at 70 % over a 12 px Gaussian blur of the page behind | Nothing painted on the glass. Solid bar for more contrast, forced colours and reduced transparency, and where backdrop blur isn't supported |
| Breakpoints | sm 40 · md 56 · lg 72 · xl 90 rem | Side gutters (and gutter cameos) only from xl |

### Token rules

- **Four kinds, read in one direction.** Primitives (`p.*`) are read only by semantic
  roles. Components read semantic roles (`color.*`, `shadow.*`), scales and their own
  component tokens (`c.<component>.*`), never primitives and never raw values.
- **Three contexts.** Light and dark follow the system setting, with a manual switch;
  more-contrast follows `prefers-contrast: more` and raises muted text, outlines and
  dividers. Forced-colours mode uses system colours, and Chopper is hidden.
- **Only colours change between light and dark.** A shadow keeps one shape in every
  context and takes its colours from roles. The token builder writes context
  differences as `light-dark()`, which accepts colours only.
- **Generated outputs are never edited.** `design/tokens/dist/tokens.css` and the
  [token reference](tokens.md) come from the source; the build fails when they are
  stale.

## Tiers and components

| Tier | What it is | Rules |
| --- | --- | --- |
| **Tokens** | Every value: colour, space, type, shape, motion, layers | The only place a raw value may appear |
| **Fundamentals** | The smallest parts, used everywhere | Sealed: props only, no class or style pass-through, every state documented |
| **Compounds** | Fundamentals assembled for one Loushing purpose; most map to a view block | Use fundamentals and tokens only; take plain data, never fetch |
| **Layouts** | Page frames with named regions, and the only owners of Chopper's zones | Regions take blocks from a view spec; no content of their own |

**Fundamentals:** Button, IconButton, Link, Icon, Chip, Badge, Input, SearchBox, Tabs,
CopyField, Toggle, Tooltip, Skeleton, Divider, Tile, Metric.

CopyField uses a small, icon-only copy control at the code or prompt block’s top-right,
without a separate button row. Its 16 px glyph keeps a 44 px interaction target.
The tooltip and accessible name identify what is copied; success shows a check and
announces “Copied”. A clipboard failure selects the original text and shows a
persistent manual-copy instruction.

Links and selection states never use underlines, including on hover or focus.
Title-bar navigation and selected tabs use the action color and semibold weight for the
current item; ordinary navigation remains medium weight. Breadcrumbs and other text
links use the action color and medium weight; links embedded in prose use semibold
weight so they remain identifiable without color alone. Keyboard focus keeps its
outline. Borders separating sections or tab groups are dividers, not selection cues.

The shared footer leads its links with “More of my work”, pointing to the owner’s
[personal site](https://prabinpebam.github.io/atiya). This link opens in a new tab,
with an external-link arrow, a tooltip and a screen-reader notice. Other links keep
their existing navigation behavior.

| Compound | Shows | Block |
| --- | --- | --- |
| Hero | The page's promise and the search box | `hero` |
| StatStrip | Catalog counts and freshness as number tiles | `stat-strip` |
| AreaTile, ItemTile, StackTile | Job areas, items and stacks as tiles, in bento, tile or list arrangements; a short last row of item tiles is completed with faint placeholder slots | `area-tiles`, `item-tiles`, `stack-tiles` |
| FacetBar | Filters with counts, held in the URL | `facet-bar` |
| ItemHeader | Type badge, name, summary, status, version, agent chips | `item-header` |
| GetItPanel | Install methods as tabs, a copyable command, the effects line | `get-it-panel` |
| EffectsChips | Scripts, network, writes outside the folder, credentials: icon plus word | `effects-chips` |
| CompatGrid | Agents by tested, expected or not supported, with a word in every cell | `compat-grid` |
| AddsTree | The files an item adds, as a tree | `adds-tree` |
| KitAnatomy | A kit's parts in groups, and how they connect | `kit-anatomy` |
| StackPath | A stack's members in order, with what each hands to the next | `stack-path` |
| ReleaseTimeline | Releases, newest first | `release-timeline` |
| WorksWith | Related items as small cards with the relation; a short last row is completed with faint placeholder slots | `works-with` |
| ItemBody | The card's plain-language sections, as text | `item-body` |
| SourceViewer | Read-only files at the pinned version | `source-viewer` |
| EmptyState | No results, not found, gone, empty catalog: what happened and what to do | `empty-state` |
| Banner | Experimental, deprecated and moved notices | Part of `item-header` |
| ChopperCameo | One Chopper moment in a zone: one image, or a set piece's two; decorative, at natural size | None: placed by layouts |

**Layouts:** Landing (Home), Index (Catalog, What's new), Item (skill, kit and part
pages), Path (stack pages), Article (Get started, For agents), Message (Not found,
Gone). Each declares its regions and its [cameo zones](chopper.md#where-he-appears).

**Every state, in every context.** Each component documents and shows default, hover,
focus-visible, pressed, disabled, loading, error and empty where they apply, in light,
dark, more-contrast and forced-colours, and at 320 px wide and 200% zoom.

### Responsive title bar

The sticky title bar stays on one row. Navigation never wraps or becomes a second
horizontal strip; secondary controls move into a native disclosure before they crowd
the brand.

| Viewport | Title bar | Menu |
| --- | --- | --- |
| Below `breakpoint.lg` (72rem) | Brand, bulb icon, menu button | Main navigation, header search where present, long-shadow switch and theme control |
| 72rem to below `breakpoint.xl` (90rem) | Brand, main navigation, long-shadow switch, theme and bulb controls | None; search stays available on the catalog |
| 90rem and above | The same row, plus header search where present | None |

The same links and controls serve every width: no duplicate search fields, IDs or
saved settings. The menu overlays the page below the bar, scrolls within the remaining
viewport height, works without JavaScript, and retains native Enter/Space behavior.
With JavaScript, Escape returns focus to its trigger, outside clicks dismiss it, and
the navigation and lighting panels never remain open together. Navigation links and
icon controls have `size.control` targets.

## Views from data

A screen is a view spec: a layout and, for each region, an ordered list of blocks.
Each block names a compound through the component registry, and its data is a query
against the catalog index, resolved before rendering. Views hold no numbers or claims
typed by hand and never place Chopper.

The format is `design/views/view.schema.json`, extending Craft's view template with
Loushing's 19 block types. The examples are `home.view.json` and `skill.view.json`.

```json
{
  "layout": "landing",
  "regions": {
    "masthead": [{ "type": "hero", "title": "Skills for the job in front of you", "search": true }],
    "pulse": [{ "type": "stat-strip", "stats": { "from": "counts" } }],
    "bento": [{ "type": "area-tiles", "items": { "from": "areas", "sort": "order" } }]
  }
}
```

The words in views (such as the hero title) are working copy, reviewed with the
`ui-copy` skill before release.

## Accessibility

- WCAG 2.2 AA throughout; the contrast pairs above are tested, not assumed.
- A 3 px coral focus ring on every interactive element, never removed.
- Targets at least 44 px (`size.control`); spacing between small chips.
- Reflow to one column at 320 px; nothing scrolls sideways except code.
- Every visual has a text equivalent ([visual first](visual-first.md#quality-and-accessibility)).
- `prefers-reduced-motion` removes non-essential motion; `forced-colors` gets system
  colours and no decorative images.
- Chopper is invisible to assistive technology ([rules](chopper.md#rules-of-presence)).

## Enforcement

| Check | What it catches | Command or test | Runs |
| --- | --- | --- | --- |
| Token contrast | Any pair below its minimum in any context | `check-tokens.mjs` | Now |
| Token outputs current | A stale CSS file or token reference | `build-tokens.mjs --check` | Now |
| Style lint | Raw values, primitives in components, hover outside a hover media query | `lint-styles.mjs site/src` | Stage 1 |
| Copy lint | Glossary violations and banned words in UI strings | `lint-copy.mjs` | Stage 1 |
| Registry | A block type with no compound, or a compound with no registry entry | Unit test over `view.schema.json` | Stage 1 |
| Sealed fundamentals | A fundamental that accepts `class` or `style`, or lacks a state's story | Unit test over the library | Stage 1 |
| Views valid | A view spec that fails the schema or names an unknown region | Schema test | Stage 1 |
| Accessibility | Automated violations on every view and state, in every context | axe in end-to-end tests | Stage 1 |
| Chopper | `scenes.json` fails its schema or its set piece and story rules; an approved render lacks its master, prompt or measurements, or is off the drawing standard; a cameo is sized by CSS, focusable, has alt text, is mirrored, is the largest paint, or exceeds the moment or image budget | Unit and end-to-end tests ([details](chopper.md#checks)) | Stage 1 |

Checks run on every pull request; a failing check blocks the merge.

## The library

The site has a component library at `/library/`, generated from the components' own
documentation and stories, not written separately. It shows every fundamental and
compound in every state and context, the tokens, the layouts with their regions and
cameo zones, and every approved Chopper render and set piece. It is the place to review a change
before it reaches a page.

### Local engineering increment (29 October 2026)

The catalog-quality increment generates `/library/` and one isolated
page per story from `site/src/stories/components.mjs`. It reuses the real components,
catalog data, layout shell and token CSS; no second component implementation or
per-story styling is introduced.

| Generated evidence | Source and limit |
| --- | --- |
| Examples and applicable states | Stories cover every exported fundamental and registered compound, plus result status and the shared lighting panel. Hover, focus and pressed states use the real controls; they are not static simulations. |
| Component documentation | Source JSDoc, signatures/defaults, source-level imports and stylesheet token dependencies are emitted to `/library/components.json`. This is source extraction, not a TypeScript type-checker model or exact per-selector token attribution. |
| Contexts | Light and dark, each with normal and more contrast, plus system forced colours. Context links change only the library preview, not saved site preferences. |
| Layouts | Existing region and cameo-zone definitions are listed from `LAYOUTS`. Existing Chopper images and placements are unchanged; the new library pages do not load cameos. An approved-render gallery remains blocked on approval and is not claimed complete. |
| Browser checks | `node site/validation/check.mjs --all` uses the installed local browser and axe. It checks built routes and stories in five contexts, with narrow-screen contexts and representative keyboard/clipboard journeys. Automated results are not a full WCAG conformance claim. |

Scrollable command and source text is keyboard focusable. Title-bar breakpoints use
its container and the same breakpoint values, so enlarged text can bring back the
existing disclosure rather than forcing the controls beyond the viewport.

The optional tooling and commands are documented in
[the validation guide](../working-guide.md#site-quality-checks). This is local
engineering evidence only; it does not mark PD12 or stage 1.10 complete, and does
not claim a capture of every interaction-state combination.

## Making a change

<ol class="slate-steps">
  <li class="slate-step">
    <p class="slate-step__title">Tokens first</p>
    <p>Change or add a token in design/tokens. Add a contrast pair to checks.json for any new colour role.</p>
  </li>
  <li class="slate-step">
    <p class="slate-step__title">Check and build</p>
    <p>Run check-tokens and build-tokens; commit the regenerated token reference.</p>
  </li>
  <li class="slate-step">
    <p class="slate-step__title">Component</p>
    <p>Pick its tier, define its props, give it component tokens if it needs its own values, and document every state.</p>
  </li>
  <li class="slate-step">
    <p class="slate-step__title">Block</p>
    <p>If views need it, add the block type to view.schema.json and the registry, and use it in a view spec.</p>
  </li>
  <li class="slate-step">
    <p class="slate-step__title">Review</p>
    <p>Check it in the library in every context, run the checks, and ask the design-system auditor to review the change.</p>
  </li>
</ol>

## Decisions on this page

| # | Question | Recommendation | Decided |
| --- | --- | --- | --- |
| O22 | Visual direction and palette | The Harbour palette: mist, ink, harbour teal and coral; a clean, geometric system around one hand-drawn character | Decided: Harbour, from your palette |
| O23 | Typeface | Inter Variable, self-hosted as a Latin subset, with JetBrains Mono for code; no web font service | Working default: needs your review |
| O24 | Where design source lives | `design/` holds tokens, view specs and Chopper; components and layouts live with the site code in `site/` | Working default |
