---
name: design-system
description: Use when changing UI or defining or auditing a design system. Establishes DTCG tokens, light, dark and contrast contexts, component tiers, sealed fundamentals, documented stories and data-driven views, with bundled dependency-free token and style tools.
---

# Design system: tokens to views, all from data

A design system is a set of decisions and the machinery that stops anyone bypassing them. Strict by default: every value a token, every component in one tier, every screen assembled from data by mapping it to layouts and components. Read `references/tokens.md`, `references/components.md` and `references/ui-from-data.md` for the detail; this file is the contract.

## Start and local resources

Survey the existing token source, component folders, library, schemas and test
runner. Keep working conventions rather than installing another framework.
If none exist, use `design\tokens`, `src\components\fundamentals`,
`src\components\compounds`, `src\layouts`, `src\views`, `design\views`,
and `docs\design\system.md`. Record the actual choices in that document.
No sibling skill, harness checkout or project facts section is required.

This folder includes `templates\tokens`, `templates\ui`, three scripts in `tools`,
and the four detailed references. The scripts need Node.js 20 or later and no
packages. Set `$skill` to this installed skill folder's absolute path, and run
these PowerShell commands **from the target project's root**, only when those
destinations do not already contain a design system:

```powershell
New-Item -ItemType Directory -Force design\tokens, design\views | Out-Null
Copy-Item "$skill\templates\tokens\*" design\tokens
Copy-Item "$skill\templates\ui\*" design\views
node "$skill\tools\check-tokens.mjs" --src design\tokens --checks design\tokens\checks.json
node "$skill\tools\build-tokens.mjs" --src design\tokens --css src\styles\tokens.css --md docs\design\tokens.md --json design\tokens.resolved.json
node "$skill\tools\build-tokens.mjs" --src design\tokens --css src\styles\tokens.css --md docs\design\tokens.md --json design\tokens.resolved.json --check
node "$skill\tools\lint-styles.mjs" src\components src\layouts
```

Create the component/layout folders before linting them. Review starter values
against the product instead of adopting them as approved design decisions.
Use `--help` on any bundled script for its arguments. If the project's runtime
cannot read the installed skill during CI, copy `tools` and `LICENSE` together to
`tools\design-system` and point CI there; keep `check-tokens.mjs` beside
`build-tokens.mjs`.

## When to define one

- Any product with more than a handful of screens, more than one surface (a site and an app), or more than one person or agent making UI.
- When the same value appears in two places, or when a change of look means editing pages.
- Define it before building screens, not after: tokens first, then fundamentals, then compounds, then layouts, then views.

## The tiers

| Tier | Holds | May use |
|---|---|---|
| **0. Tokens and foundations** | Design tokens (primitives, semantic roles and scales, component tokens), base element styles, icons as data, pure behaviour modules (keyboard models, geometry, formatting) | Nothing above |
| **1. Fundamentals** | The smallest components: text, heading, link, icon, image, button, field, select, checkbox, switch, tag, skeleton, progress | Tier 0 only |
| **2. Compounds** | Combinations: card, header, navigation, dialog, form section, figure, gallery, tabs, toolbar | Fundamentals and tier 0; never another compound |
| **3. Layouts** | Whole page or screen structures with named regions (slots) | Compounds, fundamentals, tier 0; never another layout |
| **Views** | A screen: data mapped to a layout and its components | Layouts and components only; **no styles of their own** |

Rules:

- **Made only from what's below.** No sideways or upward imports; no reaching inside a lower tier's markup.
- **Fundamentals are sealed:** no `class` or `style` props; they pass `data-*` attributes through and set only data custom properties. Compounds place them from their own wrapper elements and never restyle them. Global style escapes only where a component styles markup it didn't write (rendered rich text), on a named list.
- **Page-wide pieces are placed by the layout** (a lightbox, a toast region, a dialog host): a component that needs one marks its elements with data attributes and never imports it.
- **Layouts are defined once.** A new kind of screen gets a new layout only when no existing one fits, and then it's reused.
- **Behaviour beyond wiring is pure and unit-tested** in tier 0; components stay short (a size limit, tested).

## Tokens

- **Format:** W3C Design Tokens Community Group format (2025.10): `$value` objects (colours with colour space and components; dimensions and durations as `{ value, unit }`), `$type`, `$description` on every token, `$extensions` for vendor data only.
- **Three kinds:**
  - **primitives** (`p.*`): the raw palette and scales. Private: no component reads them.
  - **semantic roles and scales:** `color.text`, `color.bg-raised`, `space.4`, `text.sm`, `radius.md`, `duration.fast`, `layer.overlay`, breakpoints. What components mostly read.
  - **component tokens** (`c.<component>.*`): a component's own decisions, aliasing semantic roles, never primitives. Each group names who reads it (`$extensions.owner`: one component, or `shared` for a family's common decisions). Reading another component's owned group is an error.
- **Contexts, not branches:** a resolver merges the base set with a theme context (light, dark) and modifiers (more contrast, forced colours). Colour roles that differ become `light-dark()` pairs; components never branch on the theme. Any subtree can switch with `color-scheme`.
- **Generated, never hand-edited:** a build script writes the CSS custom properties, a token reference page and any typed helpers for scripts (breakpoints for `matchMedia`, picture `sizes`). A test fails on stale output.
- **Everything is a token:** colour, space, size, radius, border, shadow, type (family, size, weight, leading, tracking), motion (duration, easing, scale of a press or a lift), layer (z-index), opacity, breakpoints. Width queries use only breakpoint tokens. Sizes in `rem` so text size settings scale everything; `px` only for hairlines, blurs and outlines.
- **Every token is read** by something; an unread token is removed (tested).
- **Contrast is tested:** every text role at 4.5:1 on every surface in every context; non-text (outlines, focus, checked fills) at 3:1; a "more contrast" context raising muted text and outlines.

A starter token set and a dependency-free build script are bundled here:
[templates/tokens](templates/tokens/resolver.json) and
[tools/build-tokens.mjs](tools/build-tokens.mjs).

## Every component documents itself

- A doc comment: what it's for and when not to use it; `@tier`; `@a11y` notes; `@key` lines for each key it handles.
- Every prop typed and commented; defaults in one place the library can read.
- A story file: one example per variant and state, with real copy (never lorem ipsum, never invented personal facts).
- **The design library is built from the source:** it reads each component's doc comment, props (through the type checker), the tokens its styles read, what it imports (uses / used by), and its stories. Nothing in the library is kept by hand, so it can't drift.

## Views from data

The goal: **a screen can be produced entirely from data**, with no code written for it, by mapping content and state to a layout and its components. See `references/ui-from-data.md`. In short:

- **A content contract:** typed schemas for every kind of content (pages, blocks, media, people, navigation, settings), validated before anything renders or saves.
- **A component registry:** a map from a block or region type in the data to the component that renders it, with each component's props derived from the data by a pure mapping function.
- **A view spec:** `{ layout, regions: { <slot>: [ { type, ...data } ] } }`. The renderer picks the layout, then for each region renders each item through the registry. Unknown types fail validation, not rendering.
- **Structure is data too:** navigation, sections, ordering, which view a section uses (list, tiles, a grid): all in content, never hardcoded.
- **Editors write the data, never the views:** an editing UI is another set of views over the same contract, and saves go through one store that validates first.

## Accessibility, built in

Native elements first; WCAG 2.2 AA in every context; 44 px targets; a visible focus ring; the keyboard works everywhere (APG patterns for custom widgets); reduced motion honoured; hover is an enhancement (every hover rule inside `@media (hover: hover)` with an `:active` twin); no sideways scroll from 320 px; axe in every context on the library and the views.

## Enforcement

The system is only as strict as its tests. A design-system test suite (see `references/enforcement.md`) fails on: a raw value in component CSS; a primitive read by a component; a read across owned token groups; an import against the tiers; a `class`/`style` prop on a fundamental; a component without its doc comment, prop docs or story; an unread token; stale generated output; contrast below the thresholds; a hover rule outside its media query; a view with styles. Add the suite on day one; it's cheaper than any review.

The bundled tools are **a starting subset, not that whole suite**. The token
checker checks aliases, descriptions, component owners, direct primitive aliases
and the declared hex-color contrast pairs in light/dark. It does not cover
contrast modifiers or every color format. The style linter is a line-oriented
heuristic for raw values, primitive reads and hover guards; it is not a CSS parser.
Add the remaining structural and context checks in the project's existing runner.
Generate responsive helpers and the design library using the project's stack;
neither is supplied as a ready-made application.

For copy without another skill: use one glossary term per concept, sentence case,
verb-first action labels, visible and accessible names that agree, and errors that
explain recovery without losing input. For waits: acknowledge within 100 ms,
retain the old view and focus, name work that lasts over 1 s, and provide progress
and a way to leave work over 10 s. Never announce success before completion.

## Making a change

1. Need a value? Find the token. None fits? Add a semantic token (or a component token aliasing one), rebuild, and use it.
2. Need a component? Check the library. None fits? Add it in the lowest tier that can hold it, with its doc comment, props and story.
3. Need a screen? Express it as data for an existing layout. Only if none fits, add a layout.
4. Check the anatomy in every context and state before showing anyone; run the design-system suite and the affected end-to-end tests.

5. Record what passed and what needs manual review in `docs\design\system.md`.
   A passing heuristic linter is not an accessibility or tier-compliance claim.

The optional `ui-copy` skill deepens copy review. See
[source and license](references/source.md)..
