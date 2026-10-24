---
title: Craft
summary: Connect a product idea to user outcomes, ranked risks and evidence-backed success criteria before choosing the interface.
useWhen:
  - You have an idea or feature request but need to decide what is worth building
  - You want a coherent product spec rather than an unconnected list of screens
  - You need to know what would prove the result is valuable
area: product-planning
tags: [specs, jobs-to-be-done, definition-of-done]
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
  - A product idea, request or existing spec to reason about
  - A writable workspace for the resulting product notes
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agentic-craft
  skill: craft
related:
  - partOf: agentic-craft
    reason: Standalone adaptation; the kit adds deeper specialist skills and reviewer agents.
examples:
  - prompt: Use craft to turn this feature request into a grounded plan with success criteria.
    expect: A promise-to-UI chain, ranked assumptions, observable done-when rows and a concrete Try it.
---

## What it does

Craft turns a product request into a connected argument for what to build, for
whom and why. It ties screens to capabilities, capabilities to jobs and jobs to
promises, then names the risks and the evidence that would show success.

## How it works

Your agent follows the complete procedure in this folder, from promise through
flows and views to assumptions and success criteria. It also covers the minimum
design, copy, wait and measurement decisions. Two templates give the result a
portable structure; no other skills or reviewer agents are required.

## Try it

Ask: "Use craft to ground this idea, name its riskiest assumption and define the
first result a person can try."

## What it adds to your project

A spec and Definition of Done, normally in `docs\product`, or equivalent sections
in an existing feature note. It does not install a framework or change your agent
configuration.

## Good to know

- Working defaults are labeled, not presented as approved product decisions.
- It defines product intent, not a mandatory execution process.
- This is an independent adaptation of agentic-craft, not an upstream sync.
  [Source and MIT attribution](references/source.md) are included.
