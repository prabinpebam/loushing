// Shared test fixtures: a valid skill card and a throwaway catalog root.
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const card = (extra = '') => `---
title: Tidy notes
summary: Turns messy meeting notes into a short list of decisions and actions.
useWhen:
  - You have raw notes from a meeting
  - You want decisions and owners pulled out
area: documentation
tags: [specs]
agents: { copilot-vscode: tested, claude-code: expected }
status: beta
version: 1.0.0
effects: []
license: MIT
origin: original
owner: Prabin Pebam
---

## What it does

Reads your notes and writes the decisions, the actions and who owns each.
${extra}
## How it works

The agent follows the steps in SKILL.md.

## What it adds to your project

One folder with SKILL.md.

## Good to know

It never sends your notes anywhere.
`;

/** A throwaway catalog root: the real taxonomy plus the given skills. */
export function fixture(skills) {
  const dir = mkdtempSync(join(tmpdir(), 'loushing-fixture-'));
  mkdirSync(join(dir, 'catalog'));
  cpSync(join(root, 'catalog', 'taxonomy.yaml'), join(dir, 'catalog', 'taxonomy.yaml'));
  for (const [id, files] of Object.entries(skills)) {
    for (const [name, text] of Object.entries(files)) {
      const file = join(dir, 'skills', id, name);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
    }
  }
  return dir;
}

export const skillMd = (id) => `---\nname: ${id}\ndescription: Use when you have raw meeting notes to tidy.\n---\n\n# ${id}\n\n1. Read the notes.\n`;
