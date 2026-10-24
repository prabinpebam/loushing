---
name: orchestrate
description: Use when starting multi-step work, choosing how an agent should execute a task, or continuing unattended. Selects a goal and attention mode, sets bounds, plans small increments, scopes validation, records evidence and reviews progress without requiring other skills or agents.
---

# Orchestrate: run the work, watch it, adapt

How an agent carries out work: which mode, which checks, how progress is recorded and reviewed, and when to change course. It doesn't decide what's worth building. It takes that from the project's product intent when there is some, and from the task when there isn't.

## The measure

**Useful, validated outcomes per unit of time.** Not tasks completed, not checklists ticked, not foundations laid before anything needs them. The owner's time and attention are the constraint: never make them wait on checks a change doesn't need, and never make them catch basic mistakes.

## Start: intent, mode, bounds

1. **Intent.** Read the task and existing product notes, spec or success criteria; cite their IDs (P1, U3, A2, 1.2). When none exist, write three lines in the work plan and start: **goal** (what's true when this is finished), **done when** (what can be observed), **limits** (what not to touch), and use the plan's own IDs (I1 increments, H1 hypotheses, W1 working defaults). Never stop a code task to ask for a formal spec.
2. **Mode.** Pick one goal and one attention level:

   | Goal | Pick it when |
   |---|---|
   | **Show me the UX sooner** | The concept or the experience isn't validated yet, and seeing it would change decisions |
   | **Prove the risky assumption** | One unknown, product or technical, could sink the plan, and a small experiment can settle it |
   | **Make this production-ready** | The direction is validated, or the change is routine work in an established product |

   | Attention | Pick it when |
   |---|---|
   | **Work with me** | The owner wrote in the last 30 minutes, or is testing and giving feedback |
   | **Keep going unattended** | They said they're away or "unattended", or haven't written for 30 minutes |

   Say the mode in one line before starting ("Mode: show me the UX sooner, work with me"). The owner can change it with a word.
3. **Bounds.** Unattended work always has explicit bounds: time, scope, what never to touch, whether the agent may merge, push or deploy, and what to escalate. Use the owner's; propose them when there are none, and never assume publishing is allowed.

## Start with only this folder

Reuse existing work records. Otherwise use `.work\work-plan.md`,
`.work\progress.log` and `.work\handoff.md` in the target workspace, from the bundled
[plan](templates/work-plan.md), [log](templates/progress-log.md) and
[handoff](templates/handoff.md) templates. Record these paths in the plan. Check
whether records should be ignored before committing; do not put secrets in them.
Respect a workspace that prohibits these files by using its approved session
storage instead. No installer, project facts section or sibling skill is required.

If the owner supplies no stop time, bound unattended work to one 45-minute
interval and checkpoint. Default to only the requested scope; no merge, push,
deploy, destructive change, paid operation or real-data test is authorized.
Continue safe independent work while an irreversible decision is blocked.

## What the selected mode produces

| Goal | Produce first | Completion evidence |
|---|---|---|
| UX sooner | A reachable main flow with realistic words, sizes and states; fixtures allowed, shortcuts recorded | Try it plus reviewed captures; ask for a keep/change/drop verdict, never call it production-ready |
| Prove an assumption | One belief, a criterion fixed before testing, the cheapest bounded experiment and decisions for both outcomes | Actual result against the criterion; if time expires record inconclusive and next cheapest test |
| Production-ready | Replace shortcuts and cover success, failure and recovery against explicit done-when rows | The affected checks and each row's proof; ready for owner action if release permissions are absent |

With the owner, aim for an increment they can inspect in about 15 minutes and
keep pre-show checks focused. Unattended, checkpoint at 45 minutes, review around
30 minutes, and leave a handoff. A mode never suspends release/security checks.

## The loop

```
plan the next increment → act → check (the smallest check that covers it) → record → review about every 30 minutes → adapt
```

- **Plan:** the next increment is the smallest piece that produces something usable or learned. Give it an I ID, done-when, affected files, check and exact Try it in the work plan.
- **Act and check:** use the validation table below; fix failures, changing approach after two failed fixes of the same kind.
- **Record:** keep a timestamped log line for each meaningful outcome, its evidence and next action; put command, count/result and skipped coverage beside the done-when row.
- **Review:** about every 30 minutes, at interval end, or when work stalls, ask what limits progress, whether the mode still fits, what the owner is waiting for, whether scope grew, whether checks are proportionate, and what activity produced no new evidence.
- **Adapt:** keep course, adjust, or change course: switch mode, cut scope, try another approach, or park the item and take the next most valuable one.

## Minimum validation procedure

Inspect the target project's existing commands; never assume a package manager.
For prose, proofread and check affected links or executable examples if present.
For code, run affected unit tests and type checks when signatures change. For
rendering, input, styles or integration, add focused integration/end-to-end checks
and look at a capture. Before a release, dependency/build/security change, shared
change with unbounded impact or unexplained targeted failure, run the applicable
full suites and production build. Benchmark baseline versus current for speed
claims and changes to felt waits; do not run performance work for prose alone.

Never run two heavy suites together. Record missing tools as missing evidence,
not passing checks; no installs or network access follow merely from this skill.
Review risky diffs in a separate requirements-based pass (another reviewer is
optional). Test fixtures, not the owner's live data. Merge only with permission,
and only the tested state; after further edits rerun affected checks.

## Records and finish

Log format: `YYYY-MM-DD HH:MM [goal · attention] I1: outcome; evidence; next`.
Use goal tags `ux-sooner`, `prove-assumption`, `production-ready` and attention
tags `with-me`, `unattended`. Record mode switches, blocked items and working
defaults explicitly. At a review, write keep/adjust/change and the next action.

End with a handoff: what a person can do now and its proof, work in progress,
blocks and who can resolve them, the exact Try it, checks deliberately skipped,
and findings that change the intent. No permission means stop at validated and
ready, with the exact owner action; it does not mean silently publishing.

## Optional complementary skills

The complete procedure is above. These add depth when available:

| You're about to… | Optional skill |
|---|---|
| Choose or switch a mode; decide what to produce first and what to defer | `execution-modes` |
| Decide which checks to run or what evidence a stage needs; run a build-check-fix loop; merge | `stage-validation` |
| Pause after about 30 minutes of work, finish an interval, or notice progress stalling | `progress-review` |
| Keep the progress log, report status, delegate, get an independent review, or hand over | `coordinate` |

## Rules that hold everywhere

1. **Validated outcomes, not activity.** Each increment ends in something the owner can use, or something learned that changes a decision.
2. **No premature foundations.** Build infrastructure, abstractions and hardening when the current goal needs them, not before the direction is validated.
3. **Smallest check that covers the change.** Scope checks to what the change can affect; escalate for stated reasons.
4. **Decide, don't ask, when you can.** Ask only what can't be decided from context. Otherwise choose the most reasonable option, write the assumption down, and keep going.
5. **Evidence or it didn't happen.** Report what was checked and how, and say what wasn't.
6. **Durable records.** Anything another session or agent needs is written down: the work plan, the progress log, the handoff. Memory doesn't survive.
7. **Never take the owner's focus or data.** No focus-stealing windows, no restarting their running app or server without asking, no tests against their real data, accounts or remotes.
8. **Escalate the irreversible.** Anything destructive, public, costly or outside the bounds waits for the owner, with the options laid out, while other work continues.

## When tools differ

Coding agents and editors don't offer the same capabilities, and none is complete. Use what's there; fall back when it isn't:

| Capability | When it's missing |
|---|---|
| Sub-agents or custom agents | Do the review or exploration yourself, as a separate pass with the same questions |
| A clock or timer | Read the time at each step boundary (the shell's date command) and from the log's timestamps |
| Background commands | Run long checks at the end of an interval, not in the middle of an edit |
| Memory between sessions | The work plan, the progress log and the handoff are the memory; read them first |
| Writing outside the workspace | Keep records in the approved workspace location; check ignore policy and record the paths in the plan |
| Permission to push or deploy | Stop at "validated and ready", and put the exact owner action in the handoff |
| Skill loading | Read this file and its local templates directly |

See [source and license](references/source.md) for this independent adaptation.
