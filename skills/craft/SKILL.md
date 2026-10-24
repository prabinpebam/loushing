---
name: craft
description: Use when starting product or feature work, deciding what is worth building, or connecting a request to user outcomes. Creates a promise-to-UI chain, ranked assumptions, evidence-backed success criteria and practical experience requirements, without requiring other skills.
---

# Craft: product reasoning

A way of deciding, with AI agents, what is worth building and what success means. It keeps every decision tied to what a person was promised, names what the plan takes on faith, and defines success as evidence. This standalone skill contains the complete reasoning procedure; complementary skills can deepen a step but are never required.

## Start without a harness

Read the request and any existing product artifacts first. Reuse their locations and IDs.
Otherwise propose `docs\product\spec.md` and `docs\product\definition-of-done.md`,
starting from this skill's [spec](templates/spec.md) and
[Definition of Done](templates/definition-of-done.md) templates. For a small change,
put the same sections in a single feature note instead. Record these locations in
the note itself; no installer, configuration file or agent is needed.

Distinguish confirmed facts, evidence, assumptions and working defaults. Do not
present a proposed product decision as approved.

## Complete procedure

1. **Promise (P1).** Write the outcome in a customer's words and the concrete failure
   that would break it. Name non-goals. Replace "easy" with an observable outcome.
2. **Jobs (J1).** For each real person and situation, write "When I…, I want to…,
   so I can…", linked to its promise. Cover first use, everyday work and recovery.
3. **Capabilities (U1).** Write one testable "A person can…" per capability, linked
   to its jobs, without control names or implementation details. Include protections
   such as not publishing private material accidentally.
4. **Flows.** For each multi-step capability, list the steps, defaults and branches:
   cancel, retry, offline, refusal and returning later. Give each failure a recovery
   action. Describe any agent-facing path with machine-readable outcomes and exit codes.
5. **Views.** Only now map capabilities to views, regions, content and state. Remove
   a view with no capability; repair a capability with no delivery path. Reuse existing
   tokens, components and layouts before adding anything.
6. **Assumptions (A1).** At every link ask what must be true. Classify desirability,
   usability, feasibility and viability; rank high-impact, low-evidence beliefs first.
   For each, record impact, evidence today, a measurable criterion, the cheapest
   check, and what each outcome changes. Mark open, confirmed, refuted or accepted.
   Put choices that require a decision, rather than a test, in an O1 decision table
   with options, recommendation and working default.
7. **Success.** For each promise write a PD1 row: promise, measurable done-when,
   evidence required, result. Cut stages by value and risk; each delivers U IDs,
   has a "Try it" and rows such as 1.1 with proof named in advance. Include value
   observed with people, negative cases, accessibility and performance, not just
   successful execution. Name external dependencies and who can unblock them.
8. **Experience requirements.** For UI, specify tokens and component tiers, light,
   dark and contrast contexts, rest/hover/active/focus/disabled and relevant
   error/empty/loading states, small screens, keyboard and screen-reader behavior.
   Buttons name outcomes with verbs, errors explain recovery and preserve input,
   and a glossary gives each concept one term. Classify waits: under 100 ms show
   the result; 100 ms–1 s use delayed inline feedback; 1–10 s name the work while
   retaining the old view; over 10 s show progress and let people leave or cancel.
   Acknowledge actions within 100 ms; never claim success before it is real.
9. **Measurement.** Define each felt metric's start/end and target. For a speed
   claim use fixture data, repeated runs on the same machine, a recorded baseline
   and before/after comparison. Set explicit build budgets; do not infer speed
   from the presence of a spinner.
10. **Critique and maintain.** Walk the chain top to bottom for orphans, gaps,
    implementation leaks, untestable statements and unexamined beliefs. Report
    each with its ID and a proposed fix. Keep an "As built" section and update
    affected links when evidence refutes an assumption. Finish with what can be
    tried, what proves it, what remains unproven and the decision needed next.

## The spine

Every piece of work hangs off one chain. Never start lower in the chain than the work justifies, and never let a lower link contradict a higher one.

```
Customer promise  →  Scenarios / jobs to be done  →  User-can statements  →  Task flows  →  UI and views
       (why)               (when and for whom)            (what's possible)        (in what order)    (what it looks like)
```

Each link is checked against the one above it. Beliefs are ranked, success has
evidence, and the experience has explicit design, copy, wait and measurement rules.

## Optional complementary skills

Use these only if available and more depth would help. The procedure above works alone.

| You're about to… | Optional skill |
|---|---|
| Start a product, a feature or a big change; write or critique a spec | `ground` |
| Find what the plan takes on faith, rank the risks, or decide what to validate first | `assumptions` |
| Define what success means, what "done" must prove, or how far a product is from its promise | `definition-of-done` |
| Add or change UI, or define a design system | `design-system` |
| Write any words a person reads in the product | `ui-copy` |
| Add something that makes a person wait (a save, a load, a sync) | `perceived-performance` |
| Set performance targets or budgets, change loading or rendering, or judge a claim that something is faster | `performance` |

For a new screen, address grounding, component reuse, words and waits together,
whether or not any complementary skills are installed.

## Rules that hold everywhere

1. **Grounded or not built.** A screen, setting or behaviour traces to a user-can statement, which traces to a promise. If it doesn't, either the spec is missing something (fix the spec first) or the work isn't needed.
2. **Name what you're taking on faith.** Every plan rests on beliefs about people, value and feasibility. List them, rank them by how badly the plan fails if they're wrong, and say what would confirm each.
3. **Success means evidence.** Success is a row in a Definition of Done with the evidence that would prove it: a test, a measurement, an observation of a person, a screenshot looked at. Never "should work".
4. **The spec is the source of truth.** When what was built differs from the spec, the spec's "As built" section says so, and a refuted assumption changes every link it touches.
5. **Complete by definition.** A UI requirement includes light and dark, every state (rest, hover, active, focus, disabled, error, empty, loading), keyboard and screen reader, and small screens. They're part of what's asked for, not polish.
6. **Never a silent wait, never a lie.** Every wait has a sign where it happens; "Saved" means saved.
7. **Every value is a token; every component documents itself.** UI is assembled from a library, not hand-styled per page.
8. **Copy is part of the design.** Words follow written rules and a glossary.
9. **Measure before and after.** A performance claim without a baseline and a comparison isn't one.
10. **Portable artifacts.** Plain Markdown and JSON with stable IDs (P1 promises, J1 jobs, U1 user-can statements, A1 assumptions, O1 decisions, PD1 and 1.1 Definition of Done rows), so people, other agents and other tools can cite them without rereading everything.

## Where this stops

These skills define product intent: what to build, for whom, why, and what proves it worked. They don't prescribe how the work is carried out (the order of tasks, check schedules, progress tracking or how agents run). Any working practice can consume the artifacts by their IDs. When its findings change the intent (an assumption refuted, a promise at risk, a build that differs from the spec), fold them back into the spec here.

## Finish

Check that every view serves a U ID, each U serves a job, and each job serves a
promise. Each success row needs observable evidence or an explicit blocked/unproven
state. Deliver the artifact locations and a concrete "Try it", not a list of skills
to load next. See [source and license](references/source.md) for provenance.
