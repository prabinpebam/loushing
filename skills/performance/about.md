---
title: Performance
summary: Make speed claims reproducible with fixture benchmarks, comparable baselines, noise allowances and explicit budgets.
useWhen:
  - You are changing loading, rendering, data access or bundles
  - You need to prove a change is faster
  - You want performance targets and regression checks tied to user tasks
area: product-planning
tags: [performance, definition-of-done]
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
  - Access to the target project, a reference environment and deterministic fixture data
  - Existing runtime or benchmark tooling, or permission to implement a runner in the project
  - Owner approval and a privacy-safe endpoint before collecting field telemetry
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agentic-craft
  skill: performance
related:
  - partOf: agentic-craft
    reason: Standalone adaptation; the kit adds perceived-performance, success criteria and design skills.
examples:
  - prompt: Use performance to verify this loader improvement against a reproducible baseline.
    expect: Same-environment before and after runs, noise-aware comparison and an honest coverage report.
---

## What it does

Performance turns "faster" into a comparison people can inspect and repeat.
It defines felt metrics, reference conditions, baselines, regression allowances
and budgets, and separates lab results from real-use evidence.

## How it works

Your agent reuses the project's measurement tools or follows a complete procedure
to implement the smallest runner in its existing stack. A bundled JSON template
starts budgets and targets. The procedure covers raw samples, repeated cold and
warm runs, comparison rules, instrumentation and missing evidence.

## Try it

Ask: "Use performance to define and measure this task. Show what the baseline
comparison can prove and what it cannot."

## What it adds to your project

A measurement plan, fixture runner when needed, run records, an intentional
baseline and calibrated budgets under `perf`. The skill itself bundles no
executable benchmark, telemetry service or packages.

## Good to know

- Template numbers are examples, not approved project limits.
- Field telemetry is optional and requires privacy and owner approval.
- Publishing or committing a baseline is not automatically authorized.
- [Pinned source and MIT attribution](references/source.md) are included.
