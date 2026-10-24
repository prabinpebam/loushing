---
title: SVG illustration
summary: Creates explanatory SVGs with semantic geometry, readable labels, accessible descriptions and checked collisions.
useWhen:
  - You want a custom diagram, scene or vector illustration that explains a claim
  - You want to review SVG text fit, collisions, contrast and responsive composition
notFor:
  - Photorealistic imagery or statistical charts needing a layout engine
area: documentation
tags: [diagrams, presentations]
agents: { copilot-vscode: expected, copilot-cli: expected, claude-code: expected, codex: expected, cursor: expected, agents: expected }
status: beta
version: 0.1.0
effects: []
requires:
  - Source material and a way to inspect SVG in its actual target setting
license: NOASSERTION
licenseNote: The source kit has no declared license; check with the owner before reuse.
origin: adapted
owner: Prabin Pebam
derivedFrom: { kit: slate, skill: slate-svg-illustration }
related:
  - { partOf: slate, reason: "Independent SVG workflow; the kit adds its profiles, validators and motion runtime" }
examples:
  - prompt: Use svg-illustration to draw this handoff as a standalone SVG, with no Slate dependency.
    expect: A sourced, accessible diagram with readable labels and inspected geometry at actual sizes.
---

## What it does

Creates vector illustrations whose geometry explains the subject. It treats labels,
padding, connectors, safe areas and contrast as requirements rather than cleanup.

## How it works

Your agent models the facts, writes a visual brief, chooses the output context and
authors ordinary SVG. It then checks structure and inspects the painted result,
including small sizes and themes.

## Try it

Ask for an explanatory SVG from a process or system description, with the visual
brief and evidence of text-fit and collision checks.

## What it adds to your project

The SVG, visual brief and any generator you approve. The skill bundles instructions,
a brief template and provenance, not a renderer, icon library or runtime.

## Good to know

Independent of Slate. Existing project validators can help, but this version does
not bundle the kit's automated checks or require animation. Agent compatibility is
expected, not yet tested. The source kit has no declared license.
