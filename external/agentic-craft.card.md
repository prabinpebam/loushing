---
title: agentic-craft
summary: Helps your agent decide what is worth building and what success means, before it writes any code.
useWhen:
  - You are starting a product or feature and want a spec grounded in what people need
  - You want the riskiest assumptions named and ranked, each with a cheap way to test it
  - You need a Definition of Done that proves value, not just finished tasks
  - You are designing UI and want strict tokens, components and views built from data
notFor:
  - Running the work itself, with modes, reviews and handoffs (use agent-orchestration)
  - Publishing documentation as a site (use Slate)
area: product-planning
tags: [specs, jobs-to-be-done, definition-of-done, design-system, ui-copy]
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
  - Node.js 20 or later, for the installer and tools
  - Git, to get the kit
license: MIT
origin: original
owner: Prabin Pebam
docs: https://github.com/prabinpebam/agentic-craft#readme
anatomy:
  hub: craft
  hubLine: Start here; it routes to the right skill
install:
  command: [node, tools/install.mjs]
  project: ["{projectDir}"]
  personal: ["--global"]
  scopes: [project, personal]
  agents:
    flag: "--for"
    join: ","
    map: { copilot-vscode: copilot, copilot-cli: copilot, claude-code: claude, codex: agents, cursor: agents, agents: agents }
  dryRun: ["--dry-run"]
  targets:
    copilot: { skills: .github/skills, agents: .github/agents, agentFile: "{name}.agent.md", personalSkills: ~/.copilot/skills, personalAgents: ~/.copilot/agents }
    claude: { skills: .claude/skills, agents: .claude/agents, agentFile: "{name}.md", personalSkills: ~/.claude/skills, personalAgents: ~/.claude/agents }
    agents: { skills: .agents/skills, personalSkills: ~/.agents/skills }
  sections:
    - { file: AGENTS.md, role: "A Craft section between markers, with project facts for you to fill in" }
  next: Fill in the Project facts in the Craft section of AGENTS.md.
related:
  - { feedsInto: agent-orchestration, reason: Specs and Definitions of Done become the goal and checks of each work plan }
  - { pairsWith: slate, reason: Specs and decisions become browsable documentation }
examples:
  - prompt: Use the craft skill to write a grounded spec for a habit-tracking app. Start from the customer promise.
    expect: The agent drafts the promise, then jobs to be done, what a person can do and the task flows, before any screens.
  - prompt: What are the riskiest assumptions in docs/spec.md? Rank them and give me the cheapest check for each.
    expect: A ranked list of assumptions, each with a pass criterion, the cheapest check and the decision its result changes.
  - prompt: Write the Definition of Done for stage 1 of this spec.
    expect: Observable rows tied to the promise, each with the evidence it needs and a "Try it" step.
---

## What it does

agentic-craft gives your agent a method for product thinking. Before anything is built, it
works out what was promised to people, what they are trying to get done, and what success
would look like as evidence. Everything is written down as plain Markdown that people,
other agents and other tools can use.

## How it works

Eight skills load when a task needs them. The `craft` skill is the entry point: it holds
the chain from customer promise to jobs, to what a person can do, to task flows and then
the UI, and it routes to the right skill for the moment. Two reviewer agents check the
work: one looks for gaps in a spec, the other audits UI changes against the design
system. Templates give a starting spec, Definition of Done, token set and view schema,
and small tools with no dependencies build and check design tokens and lint styles and
copy.

## What it adds to your project

The installer copies each skill into the folder your agent reads, adds the two reviewer
agents where your agent supports them, and adds a Craft section to `AGENTS.md` between
markers. You fill in the project facts in that section once; running the installer again
keeps them. It never deletes files. Templates are copied only when you ask for them with
`--templates`.

## Good to know

- It decides what to build, not how the work runs. For execution modes, progress reviews
  and handoffs, pair it with agent-orchestration.
- The design-system skill is strict by design: every value a token, every screen made
  from data. Use it when that discipline is worth it.
- The installer has no `--json` or `--uninstall` yet, so the Loushing CLI will show its
  steps rather than run it until those exist.
