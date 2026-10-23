---
title: UI lighting
summary: Gives any web UI one light, with long shadows that soften with distance, bounced colour, lit edges and a switch to turn it on.
useWhen:
  - You want long shadows on a web UI that stay attached and fade as a real light would
  - You want a Long shadows switch beside the theme toggle, in light and dark mode
  - You want to control the light's direction, elevation, size, bounce and tints
  - You want dappled shade from a gobo, such as a palm, moving slowly over the page
  - You want to reproduce Loushing's lighting on another site or design system
notFor:
  - Ordinary drop shadows from a design system's elevation tokens
  - Lighting 3D scenes or canvases; this lights page surfaces
area: interface-design
tags: [lighting, shadows, webgl, design-system]
agents:
  copilot-vscode: tested
  copilot-cli: expected
  claude-code: expected
  codex: expected
  cursor: expected
  agents: expected
status: beta
version: 0.2.0
effects: [runs-scripts]
requires:
  - A browser with WebGL2 for cast shadows; edges still follow the light without it
  - Node.js 20 or later, to run the check
license: MIT
origin: original
owner: Prabin Pebam
examples:
  - prompt: Use the ui-lighting skill to add long shadows to this site, with a switch beside the theme toggle.
    expect: The agent copies the kit, marks raised surfaces with elevations, adds the switch and panel, and runs the check on its copies.
  - prompt: Our cards have a folded top-right corner. Make their long shadows follow the fold.
    expect: The agent sets --light-cut-size and --light-cut-corner on those cards, and the shadow's edge starts at the fold.
  - prompt: Check that our lighting matches the reference.
    expect: The check passes on the project's copies, and a side-by-side review with the demo page finds no differences.
---

## What it does

UI lighting gives a web page one light, the way a room has a sun. Raised cards and
buttons stand on the page as solid blocks, and the light casts long shadows from them
that stay attached, start crisp and grow softer and fainter the further they reach,
by how big the light is. Overlapping shadows never get darker. Lit walls throw a soft
glow of their own colour onto the page beside them, edges are lit on the side facing
the light, and shadows from tall objects beyond the view drift slowly across it. Or a
gobo casts them instead: a palm held in the light, its dappled shade swaying gently
and merging with the cards' shadows without ever darkening them. On a raised card
these shadows keep their size and blur and slide sideways by its height, as they
would on a real step. A
**Long shadows** switch beside the theme toggle turns it on and off, in light and dark
mode, and a **Lighting** panel changes the direction, elevation, size, bounce, tints,
what casts the off-frame shadows and how they move.

## How it works

The kit holds the exact engine, renderer and styles behind Loushing's own lighting,
plus a small adapter for settings and saving, the switch and panel, and a demo page.
Your agent follows `SKILL.md`: survey the page, copy the files unchanged, give the
page's surfaces elevations, add the switch and panel, and verify. The physics is
documented equation by equation in the references, and a check script proves your
copies behave exactly like the reference: it compares the shadows against a
brute-force ray tracer and checks the CSS and renderer contracts.

## Try it

Ask: "Use the ui-lighting skill to add long shadows to this site." Then turn on
**Long shadows** beside the theme toggle and open **Lighting** to move the light.

## What it adds to your project

The engine, renderer, styles, adapter and panel files, and the `gobos/` folder,
copied into a folder you choose. Your agent adds `data-elevation` to raised surfaces, a background and
isolation to the page, four host tokens and the switch and panel beside your theme
toggle. Nothing is installed: no packages and no build step. The check script stays
in the kit and runs from there.

## Good to know

- It draws with WebGL2 in one layer above your content and below sticky bars and
  menus. Without WebGL2, only the lit edges remain.
- Tested in Chromium-based browsers on desktop. Shadows of sticky surfaces and scroll
  boxes stay attached where the browser has scroll-driven animations. A gobo merges
  with other shadows exactly where the browser supports `plus-lighter` blending.
- It respects reduced motion, more contrast, forced colours and print, and never
  takes clicks or changes your theme.
- Shadows lower the contrast of text they fall on, as real shadows do.
