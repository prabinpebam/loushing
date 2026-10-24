---
title: Definition of Done
summary: Define success as observable rows with evidence, and cut work into stages a person can try.
useWhen:
  - You need to say what done means before work starts
  - A feature works but nobody has defined whether it delivers value
  - You want an honest account of the gaps against a product promise
area: product-planning
tags: [definition-of-done, specs]
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
  - A request, product promise or set of intended user outcomes
  - A writable workspace for success criteria and evidence
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agentic-craft
  skill: definition-of-done
related:
  - partOf: agentic-craft
    reason: Standalone adaptation; the kit adds grounding, risk and experience-design workflows.
examples:
  - prompt: Use definition-of-done to define the first useful stage of this feature.
    expect: Observable rows, evidence named in advance, dependencies and a Try it.
---

## What it does

Definition of Done replaces "works" with observable success criteria. It covers
the product's promise, the value a person receives and the protections that must
not break, not just successful code paths.

## How it works

Your agent starts from existing promises or writes a small working interpretation
of the request. It creates project rows and stage rows, gives each its evidence,
and orders stages by value and risk. A bundled template keeps proof and result
beside the requirement.

## Try it

Ask: "Use definition-of-done to turn these goals into criteria we can actually
prove, with a first stage someone can try."

## What it adds to your project

A success-criteria document, normally `docs\product\definition-of-done.md`, with
stable IDs, evidence, result status, dependencies and an assessment against the
promise.

## Good to know

- It works without a formal spec or another skill.
- Missing evidence is unproven, not passed; external blocks name their resolver.
- [Pinned source and MIT attribution](references/source.md) are included.
