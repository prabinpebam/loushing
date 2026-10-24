---
title: Documentation site
summary: Turns notes and plans into a navigable static documentation site, using your existing reader or plain HTML.
useWhen:
  - You want notes or research turned into pages people can browse
  - You want diagrams, navigation and source links without installing a documentation kit
notFor:
  - Installing the Slate reader, Canvas viewer or component library
area: documentation
tags: [static-site, diagrams]
agents: { copilot-vscode: expected, copilot-cli: expected, claude-code: expected, codex: expected, cursor: expected, agents: expected }
status: beta
version: 0.1.0
effects: []
requires:
  - Source material and an agent that can edit files
license: NOASSERTION
licenseNote: The source kit has no declared license; check with the owner before reuse.
origin: adapted
owner: Prabin Pebam
derivedFrom: { kit: slate, skill: slate }
related:
  - { partOf: slate, reason: "Independent authoring workflow; the kit adds its reader, components and validators" }
examples:
  - prompt: Use documentation-site to turn these notes into a small browsable site without Slate.
    expect: Topic pages, linked navigation and accessible visuals in the existing host or plain HTML.
---

## What it does

Organizes your material into pages with clear answers, navigation, source links and
visuals where they explain better than text.

## How it works

Your agent inventories the sources, maps topics to pages, chooses representations and
authors in your existing documentation system. Without one, it writes ordinary HTML.
It then checks links and inspects the rendered pages.

## Try it

Ask your agent to turn a folder of notes into a documentation site, with no new kit.

## What it adds to your project

Only the pages, navigation and local assets you agree to create. Installing the skill
adds instructions and a source note, not a runtime, packages or project-wide rules.

## Good to know

This is the independent version of Slate's main authoring skill. It does not include
Slate's reader, Canvas, components or automated checks. Agent compatibility is
expected, not yet tested. The source kit has no declared license.
