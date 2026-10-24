---
title: Perceived performance
summary: Give every wait honest feedback while preserving input, focus and the view people are using.
useWhen:
  - You are adding a save, load, upload, refresh or background task
  - People cannot tell whether an action is working or finished
  - Refreshing content disrupts typing, selection or focus
area: interface-design
tags: [performance, ui-copy, design-system]
agents:
  copilot-vscode: expected
  copilot-cli: expected
  claude-code: expected
  codex: expected
  cursor: expected
  agents: expected
status: beta
version: 0.1.0
effects: []
requires:
  - Access to the target interaction and its completion and failure states
  - The project's existing runtime or manual fixtures to measure and exercise waits
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agentic-craft
  skill: perceived-performance
related:
  - partOf: agentic-craft
    reason: Standalone adaptation; the kit adds measurement, copy and broader design workflows.
examples:
  - prompt: Use perceived-performance to make this save flow honest and non-disruptive.
    expect: A measured wait class, immediate acknowledgement, retained input and tested failure recovery.
---

## What it does

Perceived performance matches feedback to the length and nature of a wait.
It prevents silent work, flashing indicators, premature success messages and
refreshes that replace what a person is using.

## How it works

Your agent inventories actions, measures provisional wait classes and chooses
patterns for instant, responsive, waiting and long work. It specifies status,
input preservation, recovery and accessibility, then exercises fast, slow,
failed, cancelled and superseded actions.

## Try it

Ask: "Use perceived-performance on this upload. Keep the screen usable, show
honest progress and cover failure, cancellation and retry."

## What it adds to your project

A wait inventory in an existing flow or `docs\design\waits.md`, and implementation
and tests in the project's existing stack. No tracker library or scripts are bundled.

## Good to know

- Feeling responsive is not evidence that the underlying operation became faster.
- Success is shown only after the operation really completes.
- [Pinned source and MIT attribution](references/source.md) are included.
