---
title: Design system
summary: Build UI from tokens, documented components and validated view data, with local token and style checks.
useWhen:
  - You need a design system before building more screens
  - UI changes keep introducing raw values or one-off components
  - You want to audit token, component and view boundaries
area: interface-design
tags: [design-system, ui-copy]
agents:
  copilot-vscode: expected
  copilot-cli: expected
  claude-code: expected
  codex: expected
  cursor: expected
  agents: expected
status: beta
version: 0.1.0
effects: [runs-scripts]
requires:
  - Access to the target project's UI source and existing test runner
  - Node.js 20 or later for the bundled dependency-free scripts
  - A browser for visual, keyboard and accessibility checks
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agentic-craft
  skill: design-system
related:
  - partOf: agentic-craft
    reason: Standalone adaptation; the kit adds product grounding, copy skills and reviewer agents.
examples:
  - prompt: Use design-system to introduce tokens and enforce component tiers in this UI.
    expect: Reused or starter tokens, documented boundaries, focused checks and explicit coverage gaps.
---

## What it does

Design system gives a product reusable visual decisions and boundaries that keep
screens consistent. It covers DTCG tokens, light and dark contexts, contrast,
sealed fundamentals, compound components, layouts and views described as data.

## How it works

Your agent surveys existing conventions, starts with tokens and builds upward.
This folder includes token starters, view-schema examples, detailed references
and three dependency-free tools: token builder, token checker and style linter.
The remaining structural and browser checks belong in the project's test runner.

## Try it

Ask: "Use design-system to audit this screen. Reuse what exists, fix the token
escapes and show which checks still need implementing."

## What it adds to your project

As needed, token sources, generated CSS and a token reference, view schemas,
component documentation and enforcement tests. Defaults are described in
`SKILL.md`; existing architecture takes precedence.

## Good to know

- No packages or harness checkout are needed for the bundled scripts.
- The tools are a subset of enforcement, not a complete accessibility audit or
  ready-made design-library application.
- Starter budgets and visual choices need review rather than automatic approval.
- [Pinned source and MIT attribution](references/source.md) list every bundled resource.
