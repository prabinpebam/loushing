---
title: Coordinate
summary: Keep plans, progress and handoffs resumable, with concrete evidence, bounded delegation and clear owner actions.
useWhen:
  - Work must survive a session ending or changing agents
  - You need a concise status report with evidence rather than activity
  - You are coordinating a bounded review or delegation
area: agent-workflow
tags: [handoffs, execution-modes, progress-review]
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
  - Access to the task, current work state and validation evidence
  - A writable workspace or approved session storage for records
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agent-orchestration
  skill: coordinate
related:
  - partOf: agent-orchestration
    reason: Standalone adaptation; the kit adds mode selection, validation and progress-review workflows.
examples:
  - prompt: Use coordinate to leave a handoff another agent can resume without asking me.
    expect: Done with evidence, current state, blocks, exact next action and deliberately skipped checks.
---

## What it does

Coordinate makes work understandable beyond the current conversation. It keeps
the plan, progress log and handoff aligned and reports what a person can do now,
what proves it and what still needs the owner.

## How it works

Your agent uses three bundled templates, records meaningful outcomes as they
happen and checks the handoff from a new session's perspective. Delegation and
review have bounded objectives; a separate self-review is the fallback when an
independent reviewer is unavailable.

## Try it

Ask: "Use coordinate to summarize this work and leave a handoff with the exact
next command, expected result and anything unverified."

## What it adds to your project

A work plan, timestamped progress log and handoff in existing record locations
or `.work`. It does not install agents or require external session storage.

## Good to know

- Records must not contain secrets or invent approvals.
- Self-review is labeled honestly, not called independent verification.
- [Pinned source and MIT attribution](references/source.md) are included.
