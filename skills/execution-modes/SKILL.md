---
name: execution-modes
description: Use when choosing, switching or explaining how to run a piece of work. Defines the goal modes (show me the UX sooner, prove the risky assumption, make this production-ready) and the attention modes (work with me, keep going unattended) - what each produces first, what it defers, what evidence ends it, and when to switch.
---

# Execution modes

A mode is a **goal** plus an **attention** level. The goal says what kind of result comes next; the attention says how the owner is involved. "Show me the UX sooner, keep going unattended" is a mode; so is "make this production-ready, work with me".

## Start and record the choice

Read the task, existing intent and current evidence. Use an existing work plan or
start `.work\work-plan.md` from the bundled [template](templates/work-plan.md);
write goal, observable done-when and limits if there is no formal spec. Record
mode, why it fits, next output, checks, deferred shortcuts, time/scope bounds,
permissions and end condition. Announce the choice in one line. No project facts
section, other skill or agent is needed.

Default to production-ready for a routine established-product fix, UX sooner
for an unvalidated interaction, and prove-assumption when one unknown could
invalidate the plan. With a participating owner choose work-with-me; when away,
choose unattended. Without stated bounds, use one 45-minute interval, requested
scope only, no merge/push/deploy/spend/destruction, and checkpoint at the end.

## Goal modes

### Show me the UX sooner

Produce something the owner can play with or review early, so they can judge the concept before anything is hardened.

- **First:** the main flow, end to end, on real screens with realistic content. Fixtures, fakes and stubs behind it are fine.
- **Keep:** whatever affects the judgement: the real words, the real layout at real sizes, the waits a person would feel, the states the flow can reach.
- **Defer:** persistence, rare edge cases, full accessibility and performance work, refactoring, broad tests. Write every shortcut on the work plan's **shortcuts** list so production work can find them.
- **Evidence:** the owner can reach it (a link, a command, a build) with a **Try it** that says what to look at; you've looked at a screenshot or recording of each key screen first.
- **Ends when:** the owner gives a verdict (keep, change, drop), or the questions it was built to answer are answered. Then switch: production-ready for what's kept, or another round.

### Prove the risky assumption

Run the smallest experiment that settles one uncertainty, product or technical, before more is built on it.

- **Before starting:** state the belief, the result that would confirm or refute it, and what changes in the plan for each outcome. If no result would change anything, it isn't worth testing.
- **First:** the cheapest experiment that could give that result: a spike, a prototype, a benchmark, a call to the real service, or a short script for watching a person try it.
- **Bound it:** usually one 45-minute interval, on a throwaway branch. Experiment code isn't merged into the product unless it's rebuilt to the production bar.
- **Evidence:** the result against the criterion, with the run, the numbers or the observation, recorded against the assumption's ID where the product intent tracks it (A1), or against a hypothesis in the work plan (H1) when there's no product intent.
- **Ends when:** the result is in, or the time is up (record "inconclusive", what was learned and the next cheapest test). Then return to the plan with the decision it changes.

### Make this production-ready

Bring validated work up to the project's quality bar: correct, tested, accessible, fast enough, secure, maintainable, documented.

- **When:** after the concept or direction is validated, or for routine changes in an established product, scaled to the size of the change.
- **First:** replace what's on the shortcuts list, cover the failure branches, then apply the project's quality standards (its design system, copy rules, accessibility, performance budgets and security requirements).
- **Evidence:** the checks the change needs (the validation table below, including broad checks before a release), and every Definition of Done row or done-when line with its proof.
- **Ends when:** every row passes or is blocked with its reason, and the change is merged and released as far as the bounds allow, without breaking anything live. When merging, pushing or deploying isn't within the bounds, or the project doesn't deploy, it ends at "validated and ready to release", with the exact owner action in the handoff.

### Choosing and switching

- One goal at a time. When a request mixes them ("show me, and make it solid"), do them in order: show, then harden.
- Don't harden what isn't validated: no production work on a concept the owner hasn't seen, unless they ask for it.
- Don't build on an unproven belief that could sink the plan; prove it first.
- Recheck the goal at every progress review. Switch when its end condition is met, or when evidence says another goal is worth more now. Log the switch and why.

## Attention modes

### Work with me

The owner is collaborating: trying things, giving feedback, deciding.

- About **15 minutes from report to something they can see.** Focused increments, one change at a time.
- Before showing each increment, only the fast checks, 5 minutes or less: the unit tests the change touches and the one end-to-end test that covers it. No full suite or benchmark between the owner and the next thing they'll see.
- Broad-check triggers still hold: when the change touches a release, dependencies, unbounded shared infrastructure, or the production or security path, run applicable full suites and production build before merge/release, while the owner reviews when tools permit, otherwise at session end.
- Ship where they'll see it, and say exactly what to reopen or reload.
- Queue new feedback rather than widening the running change. Ask only what can't be decided; offer choices with a recommendation first.

### Keep going unattended

The owner is away. Continue within explicit bounds.

- **Bounds first:** time (when to stop), scope (which goal, which items), what never to touch, what to escalate. Use theirs; otherwise write reasonable ones at the top of the work plan.
- **Intervals:** work in **45-minute intervals**, each ending in what works merged into the work branch, or a recorded checkpoint.
- **Decide, don't ask.** Resolve ambiguity with the most reasonable option, write it in the work plan's decisions as a working default (W1), and keep going. W1 records execution choices; a product question the intent already lists (O1) is cited with the working default used, not copied, and a new product question goes in the handoff's changes to the intent.
- **Escalate only when needed:** something only the owner can provide (an account, a credential, a decision with lasting consequences), or something irreversible, public or costly. Record it with the options and a recommendation, then continue with everything that isn't blocked.
- Run the broad checks before merging risky changes, review progress about every 30 minutes, and keep the log current.
- **End with a handoff:** done with evidence, in progress, blocked and on whom, exact Try it, not checked and changes to intent. Use the bundled [handoff](templates/handoff.md).

## Validation without another skill

| Change | Smallest evidence before claiming it works |
|---|---|
| Prose or copy | Proofread; verify affected links and rendered context when relevant |
| Logic or types | Related unit tests; type check when signatures/types change |
| UI or integration | Affected integration/end-to-end tests and a capture actually reviewed |
| Release, dependency/build, security, unbounded shared change, unexplained failure | Applicable full suites, type checks and production build/budgets |
| Speed claim or felt-wait change | Same-environment baseline comparison with fixture data |

Use existing project commands. Record missing tooling and untested coverage,
not fabricated proof. A prototype may defer completeness, never basic safety,
privacy or truthful status. A spike result must be reproducible enough to support
its decision. Never authorize publishing from a mode label.

## Re-evaluate and finish

At about 30 minutes, interval end, or a repeated failure, ask whether the mode
still maximizes useful validated progress. Record keep/adjust/change, why, and
the next smallest action in `.work\progress.log`, using the bundled
[log format](templates/progress-log.md). If product decisions remain open,
label working defaults and hand over options rather than inventing approval.
Stop at the selected end condition and preserve the plan and handoff for resume.

Optional `orchestrate`, `stage-validation` and `coordinate` skills deepen
execution, checks and records. See [source and license](references/source.md).
