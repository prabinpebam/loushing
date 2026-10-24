---
title: Orchestrate
summary: Run bounded agent work through small increments, proportionate checks, durable evidence and regular course corrections.
useWhen:
  - You are starting a multi-step task and need an execution approach
  - An agent must continue safely while you are away
  - Work needs a clear plan, validation loop and resumable handoff
area: agent-workflow
tags: [execution-modes, progress-review, handoffs]
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
  - A task with an intended outcome and permission boundaries
  - A writable workspace or approved session storage for work records
  - Access to the target project's existing checks when validating code
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agent-orchestration
  skill: orchestrate
related:
  - partOf: agent-orchestration
    reason: Standalone adaptation; the kit adds deeper execution skills and a throughput reviewer.
examples:
  - prompt: Use orchestrate to complete this bounded task unattended without committing or publishing.
    expect: A mode, small validated increments, explicit permissions, current records and a handoff.
---

## What it does

Orchestrate turns a multi-step request into bounded execution. It chooses what
kind of result should come next, keeps checks proportionate and records enough
evidence for another session to resume.

## How it works

Your agent chooses a goal and attention mode, sets limits, and runs
plan → act → check → record → review → adapt. The complete procedure and three
record templates live in this folder. Other skills and reviewer agents are optional.

## Try it

Ask: "Use orchestrate for this task. Work unattended for one interval, keep to
these files, and stop at validated and ready without committing."

## What it adds to your project

A work plan, progress log and handoff, using existing locations or `.work`.
It applies the project's existing checks rather than installing a runner or
editing agent configuration.

## Good to know

- A mode never grants merge, push, deployment or spending permission.
- Missing evidence is recorded rather than replaced with a success claim.
- [Pinned source and MIT attribution](references/source.md) explain the
  independent adaptation.
