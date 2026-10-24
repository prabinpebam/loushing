---
title: Presentation deck
summary: Shapes a presenter-led story into concise slides, visual evidence and complete speaker notes.
useWhen:
  - You want a pitch, briefing or review with a clear throughline
  - You want concise slides and a talking track without installing a presentation kit
notFor:
  - A detailed reference document people read without a presenter
area: documentation
tags: [presentations, diagrams]
agents: { copilot-vscode: expected, copilot-cli: expected, claude-code: expected, codex: expected, cursor: expected, agents: expected }
status: beta
version: 0.1.0
effects: []
requires:
  - Source material and an agent that can edit your chosen presentation format
license: NOASSERTION
licenseNote: The source kit has no declared license; check with the owner before reuse.
origin: adapted
owner: Prabin Pebam
derivedFrom: { kit: slate, skill: presentation-deck }
related:
  - { partOf: slate, reason: "Independent deck workflow; the kit adds its slide player, minimap and components" }
examples:
  - prompt: Use presentation-deck to turn these findings into a 10-minute briefing without Slate.
    expect: A narrative spine, one claim per slide, supporting visuals and a speaker track.
---

## What it does

Turns material into a story you can present, rather than a document split into slides.
Each slide makes one claim; notes hold the explanation, caveats and transitions.

## How it works

Your agent establishes the audience and decision, writes the narrative spine, chooses
visual evidence and authors in your chosen tool or plain HTML. An outline template
travels with the skill.

## Try it

Ask for a short briefing from your notes, with speaker notes and no presentation kit.

## What it adds to your project

The outline, deck and notes you ask for. The skill itself adds only instructions,
an outline template and a source note; no player or project-wide configuration.

## Good to know

Independent of Slate. It does not supply a slide player, PowerPoint exporter or motion
runtime. Compatibility is expected, not yet tested in each agent. The source kit has
no declared license.
