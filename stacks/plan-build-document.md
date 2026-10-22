---
id: plan-build-document
type: stack
title: Plan, build and document a product
summary: Decide what to build, run the work in checked steps and publish the plan as a site people can browse.
useWhen:
  - You are starting a product with an agent and want a spec, a way of working and docs from day one
  - You want specs, work plans and evidence to stay connected as the work moves
notFor:
  - A single quick task that needs no spec or docs (use one kit, or none)
area: product-planning
tags: [specs, execution-modes, static-site]
status: beta
owner: Prabin Pebam
members:
  - id: agentic-craft
    role: Writes the spec, the assumptions to test and the Definitions of Done
  - id: agent-orchestration
    role: Turns each stage into a work plan, runs it and records the evidence
  - id: slate
    role: Publishes the spec, decisions and progress as browsable pages
handoffs:
  - from: agentic-craft
    to: agent-orchestration
    gives: Spec and Definitions of Done
    uses: Goal and checks for each work plan
  - from: agent-orchestration
    to: agentic-craft
    gives: Evidence and refuted assumptions
    uses: Updates to the spec
  - from: agentic-craft
    to: slate
    gives: Spec and decisions
    uses: Pages in the docs site
  - from: agent-orchestration
    to: slate
    gives: Work plans and handoffs
    uses: Pages in the docs site
examples:
  - prompt: Plan the first stage of this product with craft, then show me the UX sooner, and keep the spec in the Slate docs.
    expect: A spec and stage Definition of Done in docs/, a work plan with goal and limits, a running preview and the docs updated as it goes.
---

## What it does

Three kits that each work alone, set up so their work flows into each other. Craft
decides what is worth building and what done means, orchestration runs the work and
checks it against that, and Slate keeps the whole story browsable.

## After setup

Your project has the three kits' skills where your agent looks, a Craft section and an
Orchestration section in `AGENTS.md` for your project facts, and a `docs/` site. Fill in
the project facts, write a one-page brief in `docs/`, and ask your agent to start with
the `craft` skill.

## Good to know

- None of the three requires the others. You can drop any one and keep the rest.
- This is the setup this catalog itself was planned and built with.
