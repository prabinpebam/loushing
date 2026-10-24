---
title: Ground
summary: Trace a request from customer promise to jobs, capabilities, flows and views, and find the missing links.
useWhen:
  - You are starting a product or feature spec
  - A request jumps straight to a button or screen
  - You want to critique whether a spec serves its promises
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
  - A request or spec and access to its supporting context
  - A writable workspace for product notes
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agentic-craft
  skill: ground
related:
  - partOf: agentic-craft
    reason: Standalone adaptation; the kit adds specialist risk, design and evidence workflows.
examples:
  - prompt: Use ground to review this spec for orphan screens and missing recovery paths.
    expect: Findings traced to IDs, each with a fix and the evidence needed to resolve it.
---

## What it does

Ground connects the outcome a person was promised to the interface that delivers
it. It exposes screens nobody needs, unsupported capabilities and flows that
forget cancellation, failure or waiting.

## How it works

Your agent writes or reviews five links in order: promise, jobs, user-can
statements, task flows and views. Stable IDs make gaps and fixes easy to cite.
The skill includes spec and success-criteria templates plus enough risk, copy
and wait guidance to complete the work on its own.

## Try it

Ask: "Use ground on this feature request. Show the chain and fix any gap before
proposing the screen."

## What it adds to your project

A new or updated product spec, usually `docs\product\spec.md`, and observable
success rows where needed. Existing product artifacts are reused.

## Good to know

- It can handle a small feature note without requiring a full product spec.
- Decisions still awaiting the owner remain working defaults.
- [Pinned source and MIT attribution](references/source.md) explain the
  independent adaptation.
