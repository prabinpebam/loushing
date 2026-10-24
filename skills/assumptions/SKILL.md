---
name: assumptions
description: Use when a spec, plan or request rests on beliefs that haven't been proven, or when asked what's risky, what to validate first, or what could make the product fail. Lists assumptions and risks (desirability, usability, feasibility, viability), ranks them by impact and evidence, and turns the riskiest into questions with a criterion, the cheapest check, and the decision each result changes.
---

# Assumptions: what the plan takes on faith

## Start and output

Read the request, existing evidence and any spec. Update its assumptions register
when available; otherwise create `docs\product\assumptions.md` with the table below,
the goal, source evidence and a decisions section. For a small task the table can
live in the task note. No spec, sibling skill or harness is needed to begin.

Every spec rests on beliefs: that people have the problem, that they'll understand the solution, that it can be built, that it's worth what it costs. Naming them turns hidden risk into questions that can be answered before too much is built on them.

## Find them

Walk the chain **promise → person and situation/job → capability → task flow →
view or delivery interface** and ask at each link: what must be true for this to
hold? If the request has no chain, state the intended user and outcome first and
use those as the anchor; do not require a full spec.

| Kind | The belief is about | Examples |
|---|---|---|
| **Desirability** | Whether people want it | The job is frequent and painful enough to switch for; this promise matters more than that one |
| **Usability** | Whether people can use it | A person finds the setup without help; the default is what most people want |
| **Feasibility** | Whether it can be built and run | The service allows this; 10,000 items import in under 3 seconds; it works offline |
| **Viability** | Whether it's worth it | The cost per person fits; it's allowed (licences, privacy, policy); someone can maintain it |

Also list **risks** that aren't beliefs but could still break a promise (a dependency shutting down, a policy changing), and **open questions** that need a decision rather than a test. Those go in the spec's decisions, with options and a working default.

## Rank them

For each, note the **impact** if it's wrong (the promise or stage it would break: high, medium or low) and the **evidence** today (none, anecdote, data or proven). The riskiest assumptions have high impact and little evidence; they come first. Rank only what would change the plan.

## Make each one testable

For each assumption worth testing, write these down before anything is checked:

- **The criterion:** the observable result that would confirm or refute it ("8 of 10 first-time people finish setup unaided"; "10,000 items import in 3 seconds or less on the reference machine").
- **The cheapest check that could give that result:** a conversation, a prototype someone tries, a spike, a benchmark, a call to the real service, or existing data.
- **What changes:** the decision each outcome changes (keep the promise, change the flow, drop the stage). If no result would change anything, it isn't worth testing; note it and move on.

## The register

The spec keeps the register as a table:

| # | Assumption or risk | Kind | Impact if wrong | Evidence today | Criterion | Cheapest check | Changes | Status |
|---|---|---|---|---|---|---|---|---|
| A1 | … | Feasibility | High (P2, stage 3) | None | … | … | … | Open |

Status is open, confirmed, refuted or accepted (a risk knowingly taken, with the reason). When a result arrives, update the row and every link it touches in the same edit: a refuted assumption changes a promise, a flow, a stage or a Definition of Done row.

## In a critique

A spec is incomplete when a high-impact belief is missing from the register, or the riskiest assumption has no criterion. Report it with the row to add.

## Run the cheapest check and close the loop

Choose the highest-impact, least-supported belief whose answer changes the next
decision. Record the criterion before testing, the fixture or participant context,
time/cost bounds and permission needed. Prefer existing evidence or a safe local
prototype before real accounts, paid services or people's private data.

Record the actual result and evidence location, not just "passed". A small sample
is not proof about everyone: state coverage and uncertainty. Use **inconclusive**
in the evidence notes and keep the row open if the check cannot discriminate.
For accepted risks, name who accepted the risk, why, and a review trigger. Update
affected promises, capabilities, flows or success criteria, or list the exact
follow-up if those artifacts are owned elsewhere. End with the next decision and
the next cheapest check.

The optional `ground` skill expands the chain but is not needed here.
See [source and license](references/source.md).
