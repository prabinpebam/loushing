---
title: Stage validation
summary: Match checks to a change's impact and stage, record what each result proves and release only the tested state.
useWhen:
  - You need to choose the smallest check that covers a change
  - Work is entering a build-check-fix loop
  - You must decide whether a result is ready to show, merge or release
area: agent-workflow
tags: [definition-of-done, execution-modes, handoffs]
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
  - A change or task with observable done-when lines
  - Access to the target project's existing tests, build and relevant runtime
  - Explicit separate permission before merge, push or deployment
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agent-orchestration
  skill: stage-validation
related:
  - partOf: agent-orchestration
    reason: Standalone adaptation; the kit adds mode selection, coordination and throughput review.
examples:
  - prompt: Use stage-validation to choose checks for this change and record exactly what they prove.
    expect: Impact-scoped commands, observed results, honest coverage gaps and a concrete Try it.
---

## What it does

Stage validation chooses evidence that fits the work. A prototype needs to be
tryable; production work needs proof for every affected requirement. Broad
checks run for explicit triggers, not automatically after every edit.

## How it works

Your agent discovers the project's existing commands, maps the change to
validation tiers and runs a focused build-check-fix loop. It records passing,
unproven and blocked outcomes, reviews risky changes and preserves the exact
tested state for any authorized merge or release.

## Try it

Ask: "Use stage-validation on this diff. Run the narrow checks it needs and tell
me what remains unproven before release."

## What it adds to your project

Evidence beside done-when rows, focused test updates where needed, and plan,
log and handoff records in existing locations or `.work`. Templates are bundled;
a test runner is not.

## Good to know

- Missing tooling is a limitation or blocker, never a passing check.
- The skill does not authorize installs, commits, pushes or deployment.
- [Pinned source and MIT attribution](references/source.md) are included.
