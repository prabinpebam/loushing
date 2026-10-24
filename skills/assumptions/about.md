---
title: Assumptions
summary: Find what a plan takes on faith and turn the riskiest beliefs into cheap, decision-changing checks.
useWhen:
  - A plan relies on beliefs nobody has tested
  - You need to decide what to validate before building more
  - You want to understand what could make a product fail
area: product-planning
tags: [specs, jobs-to-be-done]
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
  - A plan, request or intended user outcome
  - Access to the evidence available today
license: MIT
origin: adapted
owner: Prabin Pebam
derivedFrom:
  kit: agentic-craft
  skill: assumptions
related:
  - partOf: agentic-craft
    reason: Standalone adaptation; the kit adds connected specs, success criteria and review agents.
examples:
  - prompt: Use assumptions to find the highest-risk belief in this plan and its cheapest useful check.
    expect: A ranked register with a criterion, evidence and the decision each result changes.
---

## What it does

Assumptions makes hidden product risk explicit. It separates beliefs about
desirability, usability, feasibility and viability from decisions and external
risks, then puts high-impact beliefs with little evidence first.

## How it works

Your agent walks the intended outcome and delivery chain, writes a risk register,
and defines a criterion before testing. It picks a safe, cheap check only when
the result would change a decision, records uncertainty and updates affected
product commitments.

## Try it

Ask: "Use assumptions on this plan. What must be true, what evidence do we have,
and which belief should we test first?"

## What it adds to your project

An assumptions register in your existing spec or `docs\product\assumptions.md`,
including criteria, evidence, decisions changed and status. No scripts or
packages are bundled.

## Good to know

- A formal spec is not a prerequisite.
- An inconclusive experiment stays open; accepting a risk needs an owner and reason.
- [Pinned source and MIT attribution](references/source.md) are included.
