---
title: ai-integration
summary: Helps your agent add or update AI in an app, from choosing providers and local or cloud policy to settings, security and migrations.
useWhen:
  - You are adding AI to an app and need cloud, local or hybrid providers that fit your policy
  - You want provider settings, setup, progress and error states designed in your app's own UI
  - Data must stay on the device, with local-only routing and no cloud fallback
  - An AI integration needs updating after API, model or auth changes, with a migration and rollback
notFor:
  - An AI runtime, SDK or ready-made chat UI; your app makes the calls
  - Deciding what product to build or what success means (use agentic-craft)
area: product-planning
tags: [ai-providers, local-models, privacy, migrations]
agents:
  copilot-vscode: expected
  copilot-cli: expected
  claude-code: expected
  codex: expected
  cursor: expected
  agents: expected
status: experimental
version: 0.1.0
effects: [runs-scripts, network]
requires:
  - Node.js 22 or later, for the installer and tools
  - Git, to get the kit
license: MIT
origin: original
owner: Prabin Pebam
docs: https://github.com/prabinpebam/ai-integration#readme
anatomy:
  hub: ai-integration
  hubLine: The one skill; it reads its references when a task needs them
install:
  command: [node, tools/install.mjs]
  project: ["{projectDir}"]
  scopes: [project]
  agents:
    flag: "--target"
    map: { copilot-vscode: github, copilot-cli: github, claude-code: claude, codex: agents, cursor: agents, agents: agents }
  dryRun: ["--dry-run"]
  targets:
    github: { skills: .github/skills }
    claude: { skills: .claude/skills }
    agents: { skills: .agents/skills }
  next: Reload your agent's skills if needed, then ask it to add or update AI in your app.
related:
  - { pairsWith: agentic-craft, reason: AI settings and states are built with your app's design system and copy rules }
examples:
  - prompt: Add document Q&A to this app, local-only, with Ollama. Reuse our settings UI. Keep documents on-device, show setup and cancellation states, and start with offline tests.
    expect: A requirements profile with no secrets, a local-only shortlist, and a plan with Ollama settings, UI states and offline tests, before any live call.
  - prompt: Review our existing speech integration for API, model and auth changes. Keep our provider allowlist and saved settings; propose a migration and rollback before changing behavior.
    expect: An inventory of the current integration, the changes found in official sources, and a reversible migration with rollout and rollback for you to approve.
partNotes:
  install: Copies the skill and all its resources into one agent's skills folder in a project
---

## What it does

ai-integration gives your agent a workflow for adding AI to an application, or updating
AI that is already there. It starts from what a person should be able to do and your
limits: the data involved, where it runs, which providers are allowed, and whether it is
cloud, local or hybrid. Only then does it pick providers and models. It covers text,
vision, images, speech, Q&A, embeddings and more, with settings, security, accessible UX
and migrations. It is not an AI runtime or a UI framework: the integration is built in
your app, with your code and your design system.

## How it works

One skill, `ai-integration`, loads when a task involves AI in an app. Your agent records
the requirements in a profile that holds no secrets, filters a dated provider catalogue
by environment and allowlist before anything else, and reads the chosen provider's
official docs before wiring it. References cover the workflow, provider notes, UX states,
modalities, security and maintenance. An offline script, `scripts/ai.mjs`, validates
profiles, queries and compares catalogues, and prints an implementation plan as Markdown.
It never calls a model.

## What it adds to your project

The installer copies the skill with all its references, assets and scripts into one
agent's skills folder: `.github/skills/ai-integration`, `.agents/skills/ai-integration`
or `.claude/skills/ai-integration`, chosen with `--target`. It keeps a small manifest
there so later upgrades are exact. It doesn't change `AGENTS.md` or `CLAUDE.md`. It
refuses to overwrite files you edited or files it doesn't own, and rejects links. Run it
with `--dry-run` first; to upgrade, run the same command from a newer checkout.

## Good to know

- The provider catalogue is documentation research, not tested integrations. Models,
  prices and terms change, so your agent re-reads official sources before implementing.
- Profiles take references to secrets, never keys. Live checks, downloads and billable
  calls need your explicit permission, synthetic data and a budget.
- A local runner doesn't prove local inference. Local-only needs explicit routing and
  egress tests, with no cloud fallback.
- Its scripts work offline. Only `catalogue source-check --network` reaches the internet,
  for bounded reads of public documentation.
- The installer takes one target per run and has no personal setup or `--uninstall`. It
  doesn't follow the Loushing install contract yet, so the Loushing CLI will show its
  steps rather than run it.
