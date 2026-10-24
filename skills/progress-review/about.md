---
title: Progress review
summary: Use current evidence to decide whether to keep course, adjust or change approach when agent work slows down.
useWhen:
  - A work interval is ending or about 30 minutes have passed
  - The same failure has returned twice
  - Scope is growing without new evidence or a useful result
area: agent-workflow
tags: [progress-review, execution-modes, handoffs]
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
  - Access to the task, work records and actual check results
  - A writable workspace or approved session storage for the verdict and next action
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agent-orchestration
  skill: progress-review
related:
  - partOf: agent-orchestration
    reason: Standalone adaptation; the kit adds a throughput-reviewer agent and connected execution skills.
examples:
  - prompt: Use progress-review to find the fastest path from this stalled task to a useful checked result.
    expect: An evidence-backed verdict and up to three ranked, timeboxed changes with concrete next actions.
---

## What it does

Progress review checks whether activity is producing useful, validated outcomes.
It looks for repeated fixes, misplaced checks, drifting scope and delays in what
the owner can actually try.

## How it works

Your agent reads the task, records, diff and real results, then answers a fixed
set of questions about constraints, mode, intervals, quality and waste. It writes
a keep/adjust/change verdict and acts on the highest-value safe next step.
No custom reviewer agent is required.

## Try it

Ask: "Use progress-review on this interval. What should stop, what should happen
next and what evidence will show that it helped?"

## What it adds to your project

A review entry and ranked next actions in existing work records, or `.work`
using the bundled plan, log and handoff templates.

## Good to know

- Missing history is reported, not reconstructed as fact.
- The measure is useful validated progress, not tasks or lines completed.
- [Pinned source and MIT attribution](references/source.md) are included.
