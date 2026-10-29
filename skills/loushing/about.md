---
title: Loushing finder
summary: Find a workflow for your task, inspect its plan and ask before installing anything.
useWhen:
  - You want to find an existing skill or kit for a task
  - An agent needs catalog metadata and explicit install consent
notFor:
  - Automatically approving installations or replacing local files
area: agent-workflow
tags: [execution-modes]
agents:
  copilot-vscode: expected
  copilot-cli: expected
  claude-code: expected
  codex: expected
  cursor: expected
  agents: expected
status: experimental
version: 0.1.0
effects: [network, runs-scripts, writes-outside-folder]
requires:
  - The local CLI checkout or access to the static catalog
  - Your explicit approval before installation
license: UNLICENSED
licenseNote: Release and licensing approval are pending.
origin: original
owner: Prabin Pebam
examples:
  - prompt: Find a workflow to review this spec, but do not install anything yet.
    expect: A candidate with its page, effects and plan; no installation without your consent.
---

## What it does

The finder helps your agent discover a suitable workflow rather than guessing
an item name. It explains the candidate and asks before changing your project.

## How it works

It searches with the local CLI or reads the static catalog, previews the selected
agent and scope, and waits for your consent. Source trust and exact-plan consent
remain separate for kits.

## Try it

Ask: “Find a skill to write clearer error messages. Show me its effects before
installing anything.”

## What it adds to your project

The finder itself adds instructions only. Following an approved plan can copy
skills or run a verified kit installer; those effects require your decision.

## Good to know

The npm package and this skill are not released. The regression tasks are
synthetic, not evidence from real agents or participants. Agent compatibility is
expected, not tested in those products.
