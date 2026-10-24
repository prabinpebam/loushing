---
name: svg-illustration
description: "Use when briefing, authoring or reviewing explanatory SVG diagrams, editorial illustrations, maps, scenes or vector slide mechanisms. Model semantic geometry, text fit, collisions, sources, accessibility and theme behavior without requiring Slate or another kit."
---

# SVG illustration

Make spatial structure explain the subject. This standalone workflow works with
ordinary SVG and the target project's tooling. It includes no renderer, validator,
icon library or animation runtime; no other skill is required.

## Route before drawing

- Quantitative encoding: use an appropriate chart, with truthful scales and data.
- Formal graphs or notation: use existing layout tooling when it solves the problem.
- Text-heavy responsive content: prefer semantic HTML rather than text in a picture.
- Photorealism or painterly detail: use an authorized bitmap source, not path soup.
- Deliberate spatial explanation, scene or custom diagram: use this workflow.

Do not turn every noun into an equal box or add abstract decoration to hide weak
content. One claim and a recognizable silhouette come before detail.

## Brief and production contract

Use the [visual brief](./assets/visual-brief.md). Identify sourced entities,
relationships, quantities, sequence and uncertainty; distinguish interpretation.
Choose the actual output context before writing markup:

| Context | Contract |
| --- | --- |
| Inline web SVG | Host tokens in presentation attributes; scoped IDs; no scripts or remote assets |
| External `img` asset | Self-contained static SVG; host alt text; fixed palette or explicit theme variants |
| Motion subject | Complete static final state and stable semantic IDs; host owns animation |
| Office / print | Simple editable geometry/text and explicit colors; verify export in the actual tool |
| Icon | Small pixel-aware viewBox, minimal paths, no text; prefer licensed existing glyphs |

No context permits hidden remote tracking, executable source snippets or invented
facts. Use the existing project's security/sanitizer constraints when stricter.

## Compose from meaning

1. State the visual thesis: what is understood after 3 seconds, 30 seconds and close
   inspection. Model entities and edges before drawing.
2. Pick a dominant structure: convergence for aggregation, branching for alternatives,
   enclosure for containment, sequence for time, proximity for affinity.
3. Reserve a balanced safe area, title band, main figure and caption/legend space.
   Do not draw a decorative border around the viewBox.
4. Place major bodies and label zones before connectors. Allocate visible interior
   padding; align peers by shared coordinates/formulas, not repeated hand nudges.
5. Route lines around bodies and text. Name connector endpoints and intended ports.
   A line painted behind a label still collides with it.
6. Add detail only when it improves recognition or explains a fact. Use real labels,
   evidence and artifacts rather than generic placeholders.
7. Use one existing licensed icon source/family when familiar glyphs help. Record the
   exact upstream asset, version and license; copy official geometry, never trace
   or invent familiar icons. Include required notices and attribution locally.

## Three-box geometry model

For each subject define:

- **Body:** painted geometry, including half its stroke width.
- **Content:** rendered text or icon bounds.
- **Envelope:** body/content bounds inflated by the intended clearance.

Declare intentional containment or occlusion with its semantic reason before review.
All other text/text, text/shape, icon/label and text/line envelope intersections fail.
Fix the layout rather than deriving an overlap allowlist from defects.

For contained text, measure the union of all `tspan` line boxes after fonts load.
Its padded rectangle must fit inside the actual painted boundary. A bounding-box
test is insufficient for a circle, ellipse or curved container: test corners and
edges against the true inner shape. Heavy strokes require additional clearance.

Fix a failing label in this order: shorten, wrap, enlarge/reshape the container,
change composition, then reduce type only while still legible. Never use clipping,
`textLength`, paint order or tiny type to disguise a collision.

## Author accessible SVG

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600"
     role="img" aria-labelledby="flow-title flow-desc">
  <title id="flow-title">A short identifying title</title>
  <desc id="flow-desc">The takeaway and reading order.</desc>
  <g id="flow-relationships"></g>
  <g id="flow-subjects"></g>
  <g id="flow-labels"></g>
</svg>
```

- Prefix all IDs with a figure-specific slug. Resolve `href`, clip and marker
  references locally and uniquely, including when multiple figures share a page.
- Use native geometry and semantic `text`/`tspan`. Keep editable source or a readable
  deterministic generator; optimize only a separate delivery derivative.
- Use presentation attributes for sanitized inline output. No script, event handler,
  `foreignObject`, external resource or internal animation clock.
- Decorative figures use `aria-hidden="true"` instead of a competing name.
  Complex figures need an adjacent structured description or table and a caption.
- External images need meaningful alt text on `img`; internal SVG metadata alone is
  not the accessible name of that host image.
- Inline SVG may inherit host theme variables. An external SVG cannot; publish
  explicit variants when one fixed palette is not legible on all actual surfaces.

## Responsive and theme proof

Calculate label sizes at the smallest intended rendered width. Normal labels should
remain at least 14 px and short secondary annotations at least 12 px. If scaling
falls below that floor, use a vertical alternative, semantic HTML or a simpler
composition. A technically contained unreadable label still fails.

Keep the same facts and relationships in alternate layouts. Use a real host
breakpoint/layout mechanism, not Slate attributes that have no runtime here.
Test 200% zoom and fallback fonts; do not force horizontal scrolling just to retain
a desktop composition.

Measure contrast against each element's immediate painted surface: normal text
4.5:1, large text 3:1 and essential graphical marks 3:1 in all supported themes.
Use redundant shape, line style, position or labels; never color alone.

## Validation is two different proofs

1. **Structural:** parse XML; check duplicate IDs, dangling references, unsafe
   resources/handlers, viewBox and accessible names. Use existing project validators
   when available; do not cite a nonexistent bundled command.
2. **Rendered:** inspect the actual embedding over loopback in a browser (or the
   actual Office/print tool). Wait for fonts, measure label bounds with `getBBox()`
   in the right coordinate system, and compare padded geometry and connectors.
   Check every text/mark remains inside the safe area and outside reserved bands.
3. Review one normal and the smallest display size, supported themes and zoom.
   Capture and inspect the output, not merely its XML.
4. If the host animates, inspect first/final states, interruption, navigation and
   reduced/off mode. Motion must not be needed for meaning; never add it solely
   because the original kit animated its figures.
5. Revise the controlling geometry or composition. After repeated failed nudges,
   redesign the layout rather than shrinking text or weakening checks.

Deliver source, embedded result, sources/notices and concrete check evidence.
State unverified export, theme or motion behavior. See [source](./references/source.md).
