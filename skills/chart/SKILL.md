---
name: chart
description: "Use when quantitative data needs a truthful, accessible chart: comparisons, trends, distributions, proportions or correlations. Choose encodings, verify scales and labels, author static SVG or use an existing renderer, and include source data without requiring Slate or Semiotic."
---

# Chart

Make a measured claim understandable without distorting the data. This independent
workflow needs no charting kit or sibling skill. Use an existing project renderer
when available; otherwise author a simple static SVG from explicit source values.
Do not claim to support a complex chart without the tooling to lay it out correctly.

## Establish the evidence

Record the audience, question, takeaway, source/date, units, population, missing
values, uncertainty and requested dimensions. Preserve a machine-readable copy of
the input next to the chart. Never send data to an external rendering service.

## Choose the encoding

| Question | Starting point |
| --- | --- |
| Compare categories | Bars or dots with a common zero baseline for bars |
| Change over time | A line on an ordered time axis; show missing periods honestly |
| Relationship | Scatterplot with labeled units and relevant uncertainty |
| Distribution | Histogram with stated binning or a correctly computed box plot |
| Parts of a whole | Stacked bar; a pie only for few nonnegative parts with a real total |
| Hierarchy / network / flow | A suitable existing layout engine, or a table if unavailable |

Two values often need a sentence, not a chart. Use tables when exact lookup is the
job. A causal diagram is not a quantitative chart.

## Author the chart

1. Validate values and accessors. Reject non-finite numbers, inconsistent units,
   invalid dates and negative proportions; distinguish missing values from zero.
2. Set an explicit plot rectangle after reserving title, axes, labels, legend and
   source/caption bands. Choose scales from the entire relevant data range.
3. For a hand-authored linear axis, map `v` using
   `p = pMin + (v - domainMin) / (domainMax - domainMin) * (pMax - pMin)`.
   Handle a constant domain explicitly with a documented expanded range.
   Vertical coordinates run downward; do not invert the data accidentally.
4. Bars begin at zero, including a correctly positioned zero line for negative
   values. Do not truncate, use 3D perspective, or compare areas as if they were
   lengths. A line need not start at zero, but its scale must be visible and honest.
5. Use direct labels where possible. Keep legends close, units explicit, time
   intervals proportional and decimal precision consistent with the source.
6. Encode series redundantly with labels, line styles, patterns or position;
   never use color alone. Use host semantic colors with measured contrast.
7. For SVG, provide a `viewBox`, unique scoped IDs, `role="img"`, an accessible
   title and a takeaway description. Use semantic `<text>` rather than outlined
   glyphs. Avoid scripts, handlers, external resources and `foreignObject`.
8. Pair the figure with a caption and the actual data in an accessible HTML table.
   Give table headers scope and include units and missing-value explanations.

## Source and regeneration

Keep input data, encoding choices and any generator beside the output. Use the
project's existing generation command; do not hand-edit generated SVG. When no
generator exists, keep readable SVG and the calculations that map source values to
geometry. Verify every depicted value against the source after changes.

The skill bundles no renderer and needs no package install. Use an approved existing
library for complex statistical/network layouts rather than pretending a manually
drawn picture is a statistically computed chart.

## Embed and inspect

- Inline SVG can inherit host CSS variables. An SVG loaded with `img` cannot:
  choose a fixed palette safe on its actual surface or supply explicit theme variants.
- Keep the chart readable at its smallest supported size. Shorten/wrap labels or
  change layout before shrinking text below the surrounding reading scale.
- Measure text after fonts load. No label may collide with another, an axis,
  connector, mark or plot boundary. Leave clear caption and legend space.
- Check supported themes: normal text 4.5:1 and essential marks 3:1 contrast.
- Render in the actual host. Confirm marks are present, the dominant takeaway is
  legible, units are right and no clipping/overflow occurs at narrow width or zoom.
- Compare data-table totals and representative endpoints/zero/negative values with
  both source data and painted geometry. A well-formed SVG is not evidence of accuracy.

Report the data source, output, checks and unverified statistical assumptions.
See [source and differences](./references/source.md).
