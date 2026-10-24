---
name: progress-review
description: Use when reviewing an interval of agent work, about every 30 minutes, or when progress stalls through repeated failures, growing scope or missing evidence. Uses records and current results to choose keep course, adjust or change course, with ranked concrete next actions.
---

# Progress review: keep course, adjust, or change course

About every 30 minutes of running work, stop briefly and ask whether this is still the fastest path to something the owner can use. Use the task's review interval or 30 minutes by default. Review at the end of every work interval too, and at once when a stall signal appears.

## Start and gather evidence

Read the task, current goal, bounds, plan, log, diff, check results and running
commands. Reuse existing records; otherwise write a short goal/done-when/limits
in `.work\work-plan.md` using the bundled [plan](templates/work-plan.md), and the
review in `.work\progress.log` using the [log format](templates/progress-log.md).
Record locations in the plan. Follow local record/ignore policy and never log
secrets. Missing history is a finding, not permission to invent it. No other
skill, custom agent or harness is required.

Modes mean: **UX sooner** produces a reachable realistic flow with reviewed
captures and a Try it; **prove-assumption** tests one predeclared criterion that
changes a decision; **production-ready** supplies proof against the task's
done-when lines. **With-me** favors a reviewable increment about every 15 minutes;
**unattended** uses bounded 45-minute intervals and a handoff. If no bounds exist,
checkpoint after one interval; do not infer merge, push, deploy, cost or destruction
permissions.

## How

- Answer the questions below as a separate pass, from evidence rather than memory.
- If an independent reviewer is already available and permitted, it may answer
  the same questions; no named custom agent is needed.
- Write the verdict as one progress log line, then execute the highest-value
  safe action rather than treating the review as a substitute for progress.

## The questions

Answer each with evidence:

1. **Constraint:** what limits progress now? Is the work serving it?
2. **Mode:** is the goal mode still the most valuable one? Working with the owner, are they getting something they can see within about 15 minutes? Unattended, is the most valuable item moving, inside its bounds, with a handoff in view?
3. **Intervals:** is anything past its interval, or holding work without a resumable checkpoint for about an hour? No automatic commit or merge is implied.
4. **Checks at the right moment:** is anything running checks this stage doesn't need (a full suite for a style fix, hardening a prototype), or skipping checks it does need (security, data integrity, the live deploy)?
5. **Quality on the first try:** did the owner have to point out something basic that checking before showing would have caught?
6. **Feedback latency:** what has the owner waited longest for, and why?
7. **Traced to intent:** does the work trace to the product intent or the stated goal, or has it drifted into something nobody asked for?
8. **Waste:** what was done since the last review that didn't move the plan or the owner's experience?

## Stall signals

Review at once, without waiting for the interval, when:

- the same failure, or the same kind of fix, has come back twice;
- there's been no new evidence (a passing check, a result, something shown) for a whole interval;
- the scope has grown past the increment that was planned;
- the owner has been waiting on something longer than the mode promises;
- you're about to do foundational work that no current goal needs.

## Changing course

| Finding | Change |
|---|---|
| The same approach failed twice | Try a different approach, not a third attempt at the same one; or prove the risky part on its own first |
| The goal's end condition is met | Switch goal mode, and log why |
| The increment keeps growing | Cut it to the smallest piece that still produces something usable, and queue the rest |
| Blocked on something only the owner can provide | Record it with options and a recommendation, and move to the next unblocked item |
| Checks don't match the stage | Drop what the stage doesn't need, or add what it does, and say so |
| Drifted from the intent | Stop, return to the last traced item, and note what was set aside |

The output is a verdict (keep course, adjust, or change course), the top three changes ranked by expected gain in validated progress per unit of time, each with a concrete action, and one line for the progress log.

## Judge checks without another skill

Prose generally needs proofreading and affected-link checks; code needs related
unit/type checks; UI and integration need focused browser/integration coverage.
Full suites and a production build belong before release, on dependency/build or
security changes, unbounded shared impact and unexplained narrow failures.
Measurements belong with speed claims and felt-wait changes, not prose.
Check actual commands and outputs before calling a run redundant or complete.

For each proposed adjustment say what it stops, what it produces next, its check
and its timebox. Do not rank by tasks completed or lines written. Preserve a
failed experiment's result if it changes a decision.

At session end use the bundled [handoff](templates/handoff.md) at
`.work\handoff.md`: done/evidence, current work, blocks/owner actions, Try it,
not checked and changes to intent. Optional `execution-modes`, `coordinate` and
`stage-validation` skills add depth. See [source and license](references/source.md).
