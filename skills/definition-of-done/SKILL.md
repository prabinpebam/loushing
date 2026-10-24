---
name: definition-of-done
description: Use when defining what success means for a product, a feature or a stage, writing success criteria, deciding what evidence would prove an outcome is valuable, or judging how far a product is from its promise. Defines project and stage Definitions of Done made from promises and user-can statements, with observable rows, the evidence each needs, and a "Try it".
---

# Definitions of Done: success criteria with evidence

## Start without other skills

Read the request and existing goals. Reuse the project's success-criteria file;
otherwise start `docs\product\definition-of-done.md` from the bundled
[template](templates/definition-of-done.md). It is fine to use this alone:
write a short promise (P1, the user outcome and what breaks it), then one
testable "A person can…" capability per outcome (U1), linked to that promise.
Mark these as working interpretations if not yet confirmed. A formal spec and
project facts file are not prerequisites.

"Done" is a table, not a feeling. A project has one Definition of Done made from its promises; each stage, a slice of the product a person can try, has its own, made from the user-can statements it delivers. Each row says what must be true and what evidence would prove it, so anyone (a person, an agent, an automated check) can tell whether it's met.

## The project Definition of Done

- One row per promise, plus the non-negotiables: what must never break (the live product, a public API), budgets kept, docs current.
- Each row: **# · promise · done when (measurable) · evidence (where the proof comes from)**.
- Include rows for value, not only function: the outcome a person gets (a task finished unaided, time saved, a return visit), and how it's observed.

| # | Promise | Done when | Evidence |
|---|---|---|---|
| PD1 | P1 … | A new person goes from X to Y in ≤ N minutes, unaided | A timed session with five first-time people |

## Stages

- Cut the product into stages that each deliver something **a person can try by hand** and judge. A stage that leaves nothing to try is too small or the wrong cut.
- Each stage has:
  - **Delivers:** the user-can statements (U…) a person gains;
  - **Try it:** what a person does to judge the outcome, in the product's terms (where they go, what they do), and what they should see; the exact commands for a given build are added by whoever builds it;
  - **Done when:** a table of rows, each with its evidence.
- Order stages by value and risk: what proves the promise soonest, and what settles the riskiest assumption before more is built on it. Identify beliefs whose failure breaks a promise, rank high-impact beliefs with little evidence first, and give each a measurable criterion and cheapest check. Say what each stage leaves a person able to do. This order is the product's priority; how work is sequenced and checked is decided where it is carried out, citing these stage and row IDs rather than redefining them.

| # | Done when | Evidence |
|---|---|---|
| 3.1 | A person can … (U4) | Unit `x.test`; end-to-end "group" |

### Good rows

- **Observable:** a test, a command and its output, a measurement, an observation of a person, a screenshot reviewed in both themes. Never "works".
- **Traced:** names the user-can statement or promise it proves.
- **Negative cases too:** what must not happen (no leak, no silent failure, nothing written outside the store).
- **Budgets:** performance, size and accessibility rows have numbers.
- **Evidence named in advance:** the evidence column says what would prove the row before work starts. The result (which test, how many passed, which run, what was observed) is recorded beside it once it's known, by whoever does the work.

### Rows that depend on others

A row that needs something outside the product (an account, a credential, a person's decision, a third party) names that dependency and who can resolve it, so it's never faked, quietly weakened or dropped.

## Against the promise

The Definitions of Done end with an honest assessment, "against the promise": how far a real person is from what was promised, with the gaps in the order they block it. Revisit it whenever evidence changes the picture: a stage proven, an assumption refuted, a row that can't be met.

## Verify and maintain

Walk each promise to a project row and each delivered capability to a stage row.
Check that thresholds, test context and evidence sources are explicit and the
"Try it" is reproducible. Add a Result column with evidence location, date and
pass/unproven/blocked state; an empty result is not a pass. Never claim user value
from a unit test alone. Replace the template's example PDn labels with unique IDs.
If there is no spec, replace its spec link with the goal written in this file.

Optional `ground` and `assumptions` skills add detail, but this procedure works
alone. See [source and license](references/source.md).
