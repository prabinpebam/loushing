---
title: Chart
summary: Turns quantitative data into truthful, accessible charts with clear scales, source data and rendered checks.
useWhen:
  - You want to show a trend, comparison, proportion or distribution accurately
  - You want to review chart scales, labels, accessibility and data provenance
notFor:
  - Explanatory illustrations without quantitative data
area: documentation
tags: [diagrams]
agents: { copilot-vscode: expected, copilot-cli: expected, claude-code: expected, codex: expected, cursor: expected, agents: expected }
status: beta
version: 0.1.0
effects: []
requires:
  - Quantitative source data and a way to inspect the rendered result
license: NOASSERTION
licenseNote: The source kit has no declared license; check with the owner before reuse.
origin: adapted
owner: Prabin Pebam
derivedFrom: { kit: slate, skill: chart }
related:
  - { partOf: slate, reason: Independent chart workflow; the kit adds its Semiotic renderer and automated checks }
examples:
  - prompt: Use chart to show these monthly totals as a static SVG with the data table.
    expect: A labeled chart with truthful scales, a source caption and the accessible underlying data.
---

## What it does

Helps your agent choose the right chart, preserve the facts and verify what the marks
actually show. It covers scales, units, missing values, labels and accessibility.

## How it works

The agent uses your existing renderer, or calculates a simple static SVG directly.
It keeps the source data and encoding decisions beside the result, adds a data table
and inspects the chart in its real setting.

## Try it

Ask for a chart from your data, with its takeaway, source and accessible data table.

## What it adds to your project

The chart, source data and any generator you agree to create. Installing the skill
adds instructions and provenance only; it installs no renderer or packages.

## Good to know

Independent of Slate and Semiotic. Complex layouts need suitable existing tooling;
this version does not claim the kit renderer's automated guarantees. Compatibility
is expected, not yet tested in each agent. The source kit has no declared license.
