---
title: agent-orchestration
summary: Helps your agent choose how to run the work, check progress about every 30 minutes and change course when it stalls.
useWhen:
  - You want a reviewable version of an idea early, before polishing it
  - You want the agent to keep going unattended within clear time and scope limits
  - Progress has stalled and you want the agent to notice and try another approach
  - You need durable progress logs and handoffs another session can pick up
notFor:
  - Deciding what to build or what success means (use agentic-craft)
  - Writing documentation pages (use Slate)
area: agent-workflow
tags: [execution-modes, progress-review, handoffs]
agents:
  copilot-vscode: tested
  copilot-cli: expected
  claude-code: expected
  codex: expected
  cursor: expected
  agents: expected
status: beta
version: 0.1.0
effects: [runs-scripts]
requires:
  - Node.js 20 or later, for the installer
  - Git, to get the kit
license: MIT
origin: original
owner: Prabin Pebam
docs: https://github.com/prabinpebam/agent-orchestration#readme
anatomy:
  hub: orchestrate
  hubLine: Start here; it picks the mode and routes the rest
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
    - { file: AGENTS.md, role: "An Orchestration section between markers, with project facts for you to fill in" }
  next: Fill in the Project facts in the Orchestration section of AGENTS.md.
related:
  - { feedsInto: agentic-craft, reason: Evidence and refuted assumptions go back into the spec }
  - { pairsWith: slate, reason: Work plans and handoffs can be published as pages }
examples:
  - prompt: Show me the UX sooner. Get a clickable home page running that I can review.
    expect: The agent states the mode, its goal, done-when and limits, then keeps a preview running and reports what you can try.
  - prompt: Keep going unattended on the checkout flow for the next hour. Hand over if you get stuck.
    expect: Bounded work intervals, a progress log, a review about every 30 minutes and a handoff another session can resume.
---

## What it does

agent-orchestration gives your agent a way to run work and to notice when it isn't
working. It picks an execution mode for the goal in front of it, works in bounded
intervals, checks every so often whether the work is producing useful, validated
progress, and changes approach when it stalls. Success is useful outcomes per hour,
not a checklist done early.

## How it works

The `orchestrate` skill is the entry point. It picks a goal mode (show me the UX sooner,
prove the risky assumption, make this production-ready) and an attention mode (work with
me, or keep going unattended), then runs a plan, act, check, record and review loop. The
`stage-validation` skill matches checks to the stage, `progress-review` asks whether the
work is still worth it, and `coordinate` keeps progress logs, handoffs and delegation
honest. A throughput reviewer agent challenges the approach about every 30 minutes.

## What it adds to your project

The installer copies the five skills into the folder your agent reads, adds the
throughput reviewer where your agent supports agents, and adds an Orchestration section
to `AGENTS.md` between markers for your project facts: commands per validation tier,
where the progress log lives, and how branches and merges work. Templates for a work
plan, progress log and handoff are copied only with `--templates`.

## Good to know

- It works without a formal spec. When agentic-craft's spec and Definitions of Done
  exist, it uses them as each work plan's goal and checks.
- It never decides to commit, push, merge or deploy on its own; those stay with you.
- The installer has no `--json` or `--uninstall` yet, so the Loushing CLI will show its
  steps rather than run it until those exist.
