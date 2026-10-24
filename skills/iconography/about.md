---
title: Iconography
summary: Keeps icons coherent, correctly sourced, licensed and accessible across interfaces, documents and diagrams.
useWhen:
  - You want to choose or place icons with consistent meaning and style
  - You want to check icon licenses, attribution, contrast or accessible names
notFor:
  - Drawing original illustrations or generating brand logos
area: interface-design
tags: [design-system, diagrams]
agents: { copilot-vscode: expected, copilot-cli: expected, claude-code: expected, codex: expected, cursor: expected, agents: expected }
status: beta
version: 0.1.0
effects: []
requires:
  - Access to the chosen icon library and its license notices
license: NOASSERTION
licenseNote: The source kit has no declared license; check with the owner before reuse.
origin: adapted
owner: Prabin Pebam
derivedFrom: { kit: slate, skill: iconography }
related:
  - { partOf: slate, reason: Independent icon workflow; the kit also supplies a documentation reader and its own font }
examples:
  - prompt: Use iconography to review our settings icons for consistency and accessibility.
    expect: One coherent source, verified provenance and notices, clear names and checked contrast.
---

## What it does

Helps your agent choose icons by meaning, keep one coherent visual family and retain
the right notices. It covers controls, charts, diagrams and navigation.

## How it works

The agent uses your existing library or selects a licensed source, records the exact
asset and checks placement, names, contrast and attribution.

## Try it

Ask your agent to review the icons on one screen and fix inconsistent meaning,
missing accessible names and missing provenance.

## What it adds to your project

Only the icon and notice changes you authorize. The skill includes instructions and
a source note, but no fonts, artwork, downloads or runtime dependencies.

## Good to know

Independent of Slate. Your project must carry the licenses for the icons it uses;
this skill does not supply them. Agent compatibility is expected, not yet tested.
The source kit has no declared license.
