---
name: ground
description: Use when starting a product or feature, writing or critiquing a spec, or when a request jumps straight to UI. Grounds every decision in the chain customer promise, scenarios and jobs to be done, user-can statements, task flows, then UI and views, and checks each link against the one above.
---

# Ground: from promise to UI

## Start and output

Use the existing spec when one exists. Otherwise write `docs\product\spec.md`
using this skill's [spec template](templates/spec.md). For a small request, a
feature note with the same headings is enough. Record artifact locations there;
no project facts file, harness or other skill is required. Treat unconfirmed
decisions as working defaults, never approvals.

Work flows down a chain, and each link is justified by the one above it. Skipping links is how products end up with screens nobody needed and promises nobody kept.

```
1. Customer promise      the one sentence a person should be able to say about the product
2. Scenarios / JTBD      when I…, I want to…, so I can…  (who, situation, motivation, outcome)
3. User-can statements   what a person can do, testable, product words, no UI
4. Task flows            the steps, in order, with every branch, failure and wait
5. UI and views          screens, regions, components, copy, states
```

## 1. The customer promise

- One sentence for the whole product, in the customer's words, that they'd repeat to a friend. Then a few sub-promises (P1, P2…), each with **what breaks it**: the concrete failure that would make it a lie.
- A promise is falsifiable. "Easy to use" isn't one; "Live on the web within ten minutes of opening the app, with no terminal" is.
- Name the promises the product deliberately doesn't make (non-goals), so later work can't sneak them in.

Template:

| # | Promise | What breaks it |
|---|---|---|
| P1 | … | … |

## 2. Scenarios and jobs to be done

- Write jobs as **"When I [situation], I want to [motivation], so I can [outcome]."** One row per real situation, named for the person in it (J1, J2…), not for a feature.
- Cover the first time, the everyday, the rare-but-critical (recovery, moving, deleting, sharing), and the person who isn't the main user (a visitor, an admin, an AI agent working for the person).
- Each job names the promise it serves. A job with no promise means a missing promise or a job out of scope.

## 3. User-can statements

- **"A person can…"** statements: one capability each, testable, in product words, with no UI ("can undo the last change to a page", not "clicks the Undo button").
- Numbered (U1, U2…), each naming the job(s) it serves. Each becomes at least one Definition of Done row: ID, capability, observable done-when, evidence required and result. Use the bundled [template](templates/definition-of-done.md) in `docs\product\definition-of-done.md` if no success criteria exist.
- Include the negative capabilities that protect a promise ("can't publish a private page by accident").

## 4. Task flows

- For each user-can statement that has more than one step: the steps in order, as the person experiences them, with **every branch** (what if they're offline, already have one, cancel half-way, come back tomorrow, the service refuses).
- Classify each wait: instant <100 ms (result only), responsive 100 ms–1 s (inline status after 300 ms), waiting 1–10 s (named work, old view retained), long >10 s (progress, background work, cancel or leave). Acknowledge actions within 100 ms, preserve input and focus, and never say "Saved" before storage succeeds.
- Every failure says what happened and how to recover, in product words, while keeping input. Errors and waiting statuses are announced accessibly without stealing focus.
- Decide the defaults here: the fewest choices that get a person to the outcome, the rest deferred to later and reachable.
- An agent path, where agents are users: the same flow as commands with machine-readable output and exit codes that say "a person must act".

## 5. UI and views

- Only now: screens, regions, components and their states, reusing the project's tokens and components. If none exist, identify reusable fundamentals, compounds and layouts and keep visual decisions in tokens rather than per-page styling. A view is data mapped to layouts and components, not a hand-made page.
- Include light, dark and contrast, small screens, keyboard, screen reader, and rest/hover/active/focus/disabled plus relevant error/empty/loading states.
- Each view lists the user-can statements it serves. A view that serves none is removed; a statement no view serves is a gap.

## Critiquing a spec (or a request)

Walk the chain top to bottom and report, with the fix for each:

1. **Orphans:** UI with no user-can statement; statements with no job; jobs with no promise.
2. **Gaps:** promises no job tests; jobs with no statement; statements with no flow or no view; flows without failure branches or waits.
3. **Leaks:** UI words in user-can statements; implementation in promises; a decision made in the UI that belongs in the flow.
4. **Untestable lines:** anything a Definition of Done row couldn't check.
5. **Open decisions:** list them with options and a recommendation, and a working default so work isn't blocked (a decision table: #, question, options, recommendation, decided?).
6. **Unexamined beliefs:** a high-impact assumption missing from the register, or the riskiest one with no criterion for confirming it. For each belief record desirability/usability/feasibility/viability, impact, evidence today, measurable criterion, cheapest check, decision changed and open/confirmed/refuted/accepted status. Rank high-impact beliefs with little evidence first.

When a request arrives as UI ("add a button that…"), climb the chain before building: which user-can statement does it serve, and which promise? If the answer is obvious, note it and build. If it isn't, it may be the wrong button.

## Writing it down

The spec holds the chain, in this order, plus architecture, the assumptions register
and decisions. Keep a TL;DR at the top. Keep it current: "As built" records where
the build differs and why. End a review with ID, finding, proposed fix and the
observable evidence needed to resolve it.

Optional complementary skills (`assumptions`, `definition-of-done`, `design-system`,
`ui-copy`, `perceived-performance`) add depth; none is required to finish this
procedure. See [source and license](references/source.md).
