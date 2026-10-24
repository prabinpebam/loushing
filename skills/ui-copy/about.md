---
title: UI copy
summary: Write clear labels, errors and statuses using one glossary, with a local check for mechanical copy rules.
useWhen:
  - You are writing labels, buttons, errors or empty states
  - The same product concept has several names
  - You want to review interface words and accessible names together
area: interface-design
tags: [ui-copy, design-system]
agents:
  copilot-vscode: expected
  copilot-cli: expected
  claude-code: expected
  codex: expected
  cursor: expected
  agents: expected
status: beta
version: 0.1.0
effects: [runs-scripts]
requires:
  - Interface strings and the context in which people encounter them
  - Node.js 20 or later to run the optional bundled linter
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agentic-craft
  skill: ui-copy
related:
  - partOf: agentic-craft
    reason: Standalone adaptation; the kit adds connected design, wait and product-reasoning skills.
examples:
  - prompt: Use ui-copy to review this form's labels, errors and save status.
    expect: Outcome-first labels, recoverable errors, honest statuses and a consistent glossary.
---

## What it does

UI copy treats words as interface. It defines a plain, direct voice and rules for
each element, from action buttons to recovery messages, while keeping visible and
accessible names consistent.

## How it works

Your agent reviews the task context and glossary, rewrites strings, and checks
them by element type. A glossary template and dependency-free linter cover
mechanical rules; a checklist handles meaning, truthfulness and accessibility.

## Try it

Ask: "Use ui-copy to make this flow understandable without developer vocabulary.
Keep the labels, error recovery and accessible names aligned."

## What it adds to your project

Revised UI strings and glossary entries, normally in
`docs\design\copy-glossary.md`, plus findings for any behavior the copy promises.
The linter can run from this skill folder without installation.

## Good to know

- The English-language linter is heuristic, not proof of translation quality.
- Runtime expressions, missing accessible names and behavioral recovery need
  additional review.
- [Pinned source and MIT attribution](references/source.md) are included.
