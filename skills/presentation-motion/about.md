---
title: Presentation motion
summary: Designs slide animation around meaningful proof states, with interruption, backward navigation and reduced-motion fallbacks.
useWhen:
  - You want slide motion that explains a relationship, sequence or change
  - You want to review reveals, direct jumps and interruption in an existing deck
notFor:
  - Rendered video or decorative autoplay animation
area: documentation
tags: [presentations, diagrams]
agents: { copilot-vscode: expected, copilot-cli: expected, claude-code: expected, codex: expected, cursor: expected, agents: expected }
status: beta
version: 0.1.0
effects: []
requires:
  - Access to the target deck and its player or browser code
license: NOASSERTION
licenseNote: The source kit has no declared license; check with the owner before reuse.
origin: adapted
owner: Prabin Pebam
derivedFrom: { kit: slate, skill: slate-presentation-motion }
related:
  - { partOf: slate, reason: "Independent motion workflow; the kit adds its motion runtime, recipes and validators" }
examples:
  - prompt: Use presentation-motion to add a staged handoff diagram to our existing web deck.
    expect: Meaningful holds and reveals, tested forward, backward, interrupted and with motion off.
---

## What it does

Plans motion as a visual argument, with pauses the presenter controls. It also checks
that navigation always wins and every fact remains available without animation.

## How it works

Your agent identifies the player, writes a motion thesis, builds the static final
composition and implements proof states through the existing player or browser APIs.
It reviews what actually moves, not only a configuration file.

## Try it

Ask your agent to review a deck for useful reveals, then implement one mechanism and
check backward navigation, direct jumps and reduced motion.

## What it adds to your project

A motion plan and the deck changes you authorize. The skill bundles only instructions
and provenance; it does not install a player, script package or synchronization service.

## Good to know

This is the independent version of Slate Presentation Motion, not its runtime.
Existing-player capabilities determine what can be implemented. Agent compatibility
is expected, not yet tested. The source kit has no declared license.
