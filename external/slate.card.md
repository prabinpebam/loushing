---
title: Slate
summary: Turns notes, research and plans into a visual-first documentation site your team can browse, with no build step.
useWhen:
  - You want to turn notes, transcripts or research into structured, navigable pages
  - You want charts, diagrams and infographics in your docs instead of walls of text
  - You keep specs and decisions next to the code and want people to browse them
  - You want slide-style presentations from the same documentation
notFor:
  - Deciding what to build or what success means (use agentic-craft)
  - Running and checking agent work (use agent-orchestration)
area: documentation
tags: [static-site, diagrams, presentations]
agents:
  copilot-vscode: tested
  copilot-cli: expected
  claude-code: unsupported
  codex: unsupported
  cursor: unsupported
  agents: unsupported
status: beta
version: 0.11.1
effects: [runs-scripts]
requires:
  - Node.js 22 or later, for the setup and check scripts
  - Git, to add Slate to your project
  - Any static file server to preview, such as Python's http.server
license: NOASSERTION
origin: original
owner: Prabin Pebam
docs: https://github.com/prabinpebam/slate#readme
anatomy:
  hub: slate
  hubLine: The main skill; it loads the others when a page needs them
install:
  command: [node, scripts/init-project.mjs]
  project: ["--repo", "{projectDir}", "--host", "docs"]
  scopes: [project]
  inputs:
    - { name: projectName, flag: "--project", ask: Project name for the docs site, example: My project }
  agents:
    supported: [copilot-vscode, copilot-cli]
  adds:
    - { path: docs/index.html, role: The documentation site's page }
    - { path: docs/docs-manifest.json, role: Navigation; you register pages here }
    - { path: docs/slate.config.json, role: Site settings }
    - { path: docs/project.theme.css, role: Your theme overrides }
    - { path: docs/landing.html, role: A starter landing page }
    - { path: docs/shell/, role: "Slate's reader, generated; never edit it" }
    - { path: .github/skills/slate/SKILL.md, role: Points Copilot to the Slate skill }
  next: Add pages to docs/ and register them in docs/docs-manifest.json, then preview over HTTP.
related:
  - { pairsWith: agentic-craft, reason: Specs and decisions become browsable documentation }
  - { pairsWith: agent-orchestration, reason: Work plans and handoffs can be published as pages }
examples:
  - prompt: Turn these meeting notes into a Slate page with a diagram of the decisions.
    expect: A new page in the docs host, registered in the manifest, with a short summary, headings and a diagram.
  - prompt: Check the docs site for broken links and pages missing from navigation.
    expect: The agent runs Slate's host check and lists each problem with the file to fix.
partNotes:
  init-project: Sets up a docs host in a project - the reader, a manifest, a starter page and the Copilot adapter
  runtime-host: Syncs the reader runtime into a host, or checks the host has no missing or changed runtime files
  build-site: Builds the docs host into a static _site folder for GitHub Pages
  build-canvas: Bundles the read-only Canvas viewer that the reader loads
  validate-document-attributions: Checks that every excerpt reference quotes text that exists at its source
  validate-presentation-motion: Checks a deck's motion manifest against the presentation motion contract
  canvas-document: A starter Canvas document - a read-only spatial view of records
  canvas-record-set: A starter set of records for a Canvas document
  landing: A starter landing page for a docs host
  page: A starter documentation page
  presentation: A starter presentation - slide-like sections on one scrollable page
  presentation-motion: A starter motion manifest for a presentation
---

## What it does

Slate is a documentation system and agent skill for sites that show rather than tell.
Your agent turns source material into pages with metrics, cards, steps, charts and
diagrams, registered in one manifest so the site's navigation stays right. Readers need
no installation and the site needs no build step: it is static files served over HTTP.

## How it works

The `slate` skill holds the authoring rules: page types, components, navigation and
checks. When a page needs more, it loads a focused skill for presentations, motion,
charts, icons or SVG illustrations. A setup script creates a documentation host in your
project, and a runtime script keeps the host's copy of Slate's reader in step and checks
every page and link.

## What it adds to your project

Slate is added to your project as a folder (usually a Git submodule called `slate`).
Its setup script then creates a `docs/` host with the site page, the navigation
manifest, settings, a theme file you own and a starter landing page, copies Slate's
reader into `docs/shell/`, and adds a small skill file that points Copilot to Slate.
It never overwrites files that already exist.

## Good to know

- The setup script adds a skill file for Copilot only. Other agents can follow
  `slate/SKILL.md` when you point them to it.
- Don't edit `docs/shell/`: it is regenerated from Slate. Put your changes in
  `project.theme.css` and your pages.
- Slate's own repository doesn't declare a license yet, so check with the owner before
  reusing it outside your own projects.
