---
name: visual-first
description: Use when designing or reviewing any Loushing site screen, layout, block or component, or when deciding how to present a piece of information in the UI. Applies the visual-first ladder (show it if a visual is clearer, otherwise tell it briefly), the pattern catalog mapped to Loushing data, text brevity limits, and the accessibility and quality rules every visual must meet. Visual first applies to UI and layout, never to content - text content stays text.
---

# Visual first: show it when showing is clearer

The authority is [docs/design/visual-first.md](../../../docs/design/visual-first.md).
This skill is the working checklist; if they disagree, the page wins and this skill is
fixed. It works with the Craft `design-system` skill (tokens, tiers, views from data)
and `ui-copy` (the words); it does not replace them.

## The ladder (ask in order, stop at the first yes)

1. **Is it a quantity, a comparison or a trend?** Show a number tile, a bar or a
   sparkline, with the number as text.
2. **Is it a set of things a person scans or picks from?** Show tiles or a grid, each
   with an icon or glyph, a title and at most one line.
3. **Is it an order, a sequence or a history?** Show steps, a path or a timeline.
4. **Is it a structure: parts, a hierarchy, a file layout, how pieces connect?** Show
   a tree, an anatomy diagram or a flow.
5. **Is it a yes/no or status across several cases?** Show a grid of states (chips or
   a compatibility matrix) with a text label in every cell.
6. **Otherwise, tell it.** Plain text, as short as it can be (limits below).

Visuals must earn their place: if a visual would be decoration, needs a legend longer
than the text it replaces, or slows the page beyond its budget, use text.

## What stays text

The content of an item (what it does, use it when, how it works, examples), headings,
commands, code, legal and safety statements, and every error message. Visual first
changes how the UI frames content, never the content itself.

## Pattern catalog (Loushing blocks)

| Information | Block | Not |
| --- | --- | --- |
| Catalog size and freshness | `stat-strip` (number tiles) | A sentence of counts |
| Job areas, item lists, featured kits | `area-tiles`, `item-tiles` (bento or tiles) | Bulleted lists |
| Which agents an item works with | `compat-grid` (agent × tested/expected/no, with text) | A paragraph |
| Effects (scripts, network, writes, credentials) | `effects-chips` (icon and word) | Prose |
| Files an item adds | `adds-tree` (a file tree) | A list of paths in text |
| A kit's parts and how they connect | `kit-anatomy` (grouped parts and a flow) | Nested bullets |
| A stack's members and handoffs | `stack-path` (ordered path with handoff labels) | A numbered paragraph |
| Releases and changes | `release-timeline` | A changelog wall |
| Related items | `works-with` (small cards with the relation) | A list of links |
| Getting it | `get-it-panel` (tabs per method, copy button, steps) | Instructions in prose |

New information that fits none of these adds a block type to
`design/views/view.schema.json` and a component, through the design system's rules.

## Text limits

| Element | Limit |
| --- | --- |
| Tile title | 4 words |
| Tile or card line | 1 line, ≤ 90 characters |
| Hero standfirst | ≤ 140 characters |
| Section intro | ≤ 2 sentences, or none |
| Labels and chips | 1-2 words |
| Empty state | What happened and what to do, ≤ 2 short lines |

## Every visual must

- Carry its meaning in text too: numbers as text, a text label in every chip and cell,
  never colour alone. Charts have a text summary or table.
- Use tokens only: colours from semantic roles and series tokens, never raw values.
- Meet contrast: text 4.5:1, graphics and boundaries 3:1, in light, dark and
  contrast-more (`design/tokens/checks.json`).
- Work at 320 px wide and at 200% zoom: grids reflow to one column; diagrams have a
  list form on small screens.
- Have a keyboard path through anything interactive, in reading order.
- Render from data (the view and the catalog index), never from hand-typed numbers.
- Be static unless motion explains something; respect `prefers-reduced-motion`.

## Icons and illustrations

- **Icons:** one set (Material Symbols Rounded, working default), one weight, sized by
  `size.icon`; decorative icons are `aria-hidden`, meaningful ones have a label.
- **Diagrams** (anatomy, paths, trees) are generated from data as SVG with tokens.
- **Chopper** is the only character illustration. He is decoration that layouts place
  in zones; he never carries information. Use the `chopper` skill.

## Review before you finish

- [ ] Each piece of information went through the ladder; the choice is the first yes.
- [ ] No content was turned into a picture; text content is still text.
- [ ] Text limits hold; nothing repeats what a visual already shows.
- [ ] Every visual has a text equivalent and passes contrast in all three contexts.
- [ ] It reflows at 320 px and 200% zoom.
- [ ] It is built from the view spec and the index, with tokens only.
