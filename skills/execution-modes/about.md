---
title: Execution modes
summary: Choose whether to show the experience, prove an assumption or harden the result, with explicit evidence and stopping rules.
useWhen:
  - You need to decide what an agent should produce first
  - A prototype is being hardened before its direction is validated
  - You want clear expectations for collaborative or unattended work
area: agent-workflow
tags: [execution-modes, handoffs]
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
  - A task and the current evidence about its direction or risks
  - A writable workspace or approved session storage for the selected mode and bounds
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agent-orchestration
  skill: execution-modes
related:
  - partOf: agent-orchestration
    reason: Standalone adaptation; the kit adds connected execution, validation and progress reviews.
examples:
  - prompt: Use execution-modes to decide what to do first and what evidence ends this interval.
    expect: One goal and attention mode, explicit bounds, deferred work and an observable end condition.
---

## What it does

Execution modes makes the next result explicit. It distinguishes seeing a usable
experience, testing a decision-changing belief and making validated work
production-ready, then pairs that goal with the owner's level of involvement.

## How it works

Your agent inspects the task and evidence, selects a mode and records what comes
first, what can wait, how it will be checked and when to switch or stop.
Bundled plan, log and handoff templates preserve the decision.

## Try it

Ask: "Use execution-modes on this feature. Pick the next useful result, explain
what can wait and set the evidence needed to move on."

## What it adds to your project

A mode and bounded next increment in a work plan, plus shortcut, evidence and
handoff records as work proceeds. Default record locations are under `.work`.

## Good to know

- Prototype shortcuts are recorded, not mistaken for production completeness.
- Broad safety and release checks still apply before release.
- No other skill is required. [Pinned source and MIT attribution](references/source.md)
  are included.
