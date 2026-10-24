---
name: coordinate
description: Use when keeping a progress log, reporting status, writing a handoff at the end of a work stretch, delegating to sub-agents, or getting an independent review before a risky merge. Durable progress records, status tables, handoffs another session can resume from, bounded delegation, and reports that lead with what a person can do now.
---

# Coordinate: records, reviews, delegation and handoffs

Work that isn't written down can't be resumed, reviewed or trusted. Keep three records, and keep them current as you go rather than reconstructing them at the end.

## Start without a harness

Read the task and existing records. Reuse their locations; otherwise use
`.work\work-plan.md`, `.work\progress.log` and `.work\handoff.md` inside the target
workspace. Record their paths in the plan and check whether these records belong
in version control; never record credentials or private data. If local policy
requires session storage, use that instead. The bundled templates provide all
three; no project facts file, sibling skill or reviewer agent is required.

State goal, observable done-when and limits. Select one goal (a visible prototype,
one assumption checked, or production-ready work) and an attention mode (owner
collaborating or unattended). Without unattended bounds use one 45-minute
interval, requested scope only, no merge/push/deploy/spend/destructive actions,
and checkpoint rather than taking additional permission.

## The three records

| Record | What it holds | Where |
|---|---|---|
| **Work plan** | Intent or its IDs, mode and bounds, increments with checks/state, working defaults, shortcuts and findings | Existing plan or `.work\work-plan.md`; [template](templates/work-plan.md) |
| **Progress log** | One timestamped line per meaningful step | Existing log or `.work\progress.log`; [format](templates/progress-log.md) |
| **Handoff** | Done with evidence, in progress, owner actions, Try it and missing checks | Existing handoff or `.work\handoff.md`; [template](templates/handoff.md) |

Read all three before starting work in a new session. They are the memory.

### Progress log lines

`YYYY-MM-DD HH:MM [goal · attention] <item>: <what happened>; <evidence>; <next>`

Goal tags: `ux-sooner`, `prove-assumption`, `production-ready`. Attention tags: `with-me`, `unattended`. Items are the work plan's IDs (I1 increments, H1 hypotheses, W1 working defaults), with the product IDs they serve in brackets when there's product intent.

```
2026-01-31 14:05 [production-ready · unattended] I3 (3.2) setup flow: builds; unit 42 pass, e2e "first run" 3/3; merging
2026-01-31 14:30 [production-ready · unattended] review: adjust; full suite queued twice for copy fixes, back to tier 1
```

### Status

The work plan ends with a status table, one row per increment: state (not started, in progress, done, blocked) and the evidence in a sentence or two: the commands run, the counts, the run IDs, what was skipped and why.

## Reporting

Lead with what a person can do now that they couldn't before, then the evidence, then what's blocked and on whom, then what's next. Say what wasn't checked. Keep it short enough to read in a minute.

## Delegation

- Delegate only work that needs its own context: a broad exploration, an independent review, a long command whose output only matters if it fails, research with sources.
- Give a sub-agent a bounded objective, the context it needs, and exactly what to return. Don't redo its work. Run independent ones in parallel and keep working meanwhile.
- Never delegate a single continuous trace you can follow with a few searches.
- Without sub-agents, do the same work as a separate, bounded pass, and write its result down before continuing.

## Independent review

Before merging something risky (shared infrastructure, security, data, anything hard to undo), get an independent review of the diff against the hard requirements and the done-when lines: a reviewer sub-agent where the tool has one, otherwise a fresh pass that reads only the diff and the requirements. Fix what it finds, with tests.

Review is a bounded pass, not a required custom agent. Ask: does the change serve
the goal, preserve existing behavior and data boundaries, cover failures and
recovery, and have evidence for every claim? Report file/location, consequence
and fix for concrete findings. If no independent person/tool is available,
label the review a self-review rather than claiming independent verification.

Match evidence to impact: related unit/type checks for code; affected integration
or browser checks for interaction; applicable broad suites/build before a release,
dependency/build/security change or unbounded shared change. Prose needs
proofreading and relevant link/example checks, not a full code suite. A speed
claim needs before/after measurements. Record command, result and omissions.
Review does not grant permission to merge, push or deploy.

## The handoff

End every unattended stretch with a handoff another person or agent can act on without asking anything:

- **Done:** what a person can do now, with the evidence (tests, runs, commits).
- **In progress:** what, how far, which branch.
- **Waiting on you:** each decision, account or credential, with the options, a recommendation, and the working default in use; and each merge, push or release that's ready but outside the agent's bounds, with the exact command and what to watch.
- **Try first:** the one thing to open or run, and what they should see.
- **Not checked:** what was skipped deliberately, and why.
- **Changes to the intent:** assumptions proven or disproven, promises at risk, differences between what was built and what was specified, for whoever owns the product intent.

Before ending, read the handoff as a new session: can it identify the exact next
action, the files/branch involved and what success looks like without asking?
Remove secrets and unverifiable claims, and mark unproven/blocked rows honestly.
Optional `orchestrate` and `stage-validation` skills add detail, not prerequisites.
See [source and license](references/source.md).
