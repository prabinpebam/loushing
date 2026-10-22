# Loushing planning

> A starting place for planning a skills and resources library for humans and AI agents.
> This is the documentation workspace, not the future skills-browser product.

## Two distinct experiences

| | Planning documentation | Skills-browser product |
| --- | --- | --- |
| Purpose | Capture the brief, evidence, designs, decisions, and specifications | Help humans and AI agents browse, discover, and use skills and related resources |
| Implementation | Slate documentation harness | Separate application code; technology undecided |
| Current state | Draft product spec and benchmark research | Specified as a draft; not implemented |

Slate's navigation, search, and themes belong to this documentation reader.
They do not determine the future product's information architecture or UI.

## Start here

| Read | Use it to |
| --- | --- |
| [Initial brief](brief.md) | See the confirmed intent and the questions still open |
| [Product spec](spec/product-spec.md) | Review the promise, jobs, what a person can do, flows, views, assumptions and the decisions waiting on you |
| [Benchmarks](research/benchmarks.md) | Review the customer promises and jobs that similar catalogs and marketplaces address |
| [Content model](spec/content-model.md) | See what skills, kits and stacks are, the item card, relationships and facets |
| [Repository organization](spec/repository-organization.md) | See what lives in Loushing and what lives in its own repository |
| [Item pages](spec/item-pages.md) | See the plain-language detail page for each type of item |
| [Distribution and install](spec/distribution.md) | See the `npx loushing` strategy, Git and download routes, and security |
| [Agent access](spec/agent-access.md) | See how AI agents find, read and install items |
| [Definitions of Done](spec/definition-of-done.md) | See what success means and the five delivery stages |
| [Working guide](working-guide.md) | Preview, author, organize, and validate these documents |

## Three editable harnesses

| Harness | Role | Canonical source |
| --- | --- | --- |
| Slate | Documentation authoring and reader | The `slate/` Git submodule, connected to [your Slate repository](https://github.com/prabinpebam/slate) |
| Agentic Craft | Product reasoning: what is worth building and what success means | The `agentic-craft/` Git submodule, connected to [your Craft repository](https://github.com/prabinpebam/agentic-craft) |
| Agent Orchestration | Execution control: how the work is carried out, checked, and adapted | The `agent-orchestration/` Git submodule, connected to [your Orchestration repository](https://github.com/prabinpebam/agent-orchestration) |

All three are ordinary editable Git repositories with their own push destinations.
Each works without the others. Reusable improvements belong in those source
repositories; project-specific plans and policy remain here. The
[contribution workflow](working-guide.md#edit-and-push-harness-changes) explains
how to push a harness change and refresh this workspace without editing generated
copies.

### How they hand off

| Step | Harness | Produces or uses |
| --- | --- | --- |
| 1. Decide what and why | Craft | Customer promise, jobs, user-can statements, flows and UX direction, assumptions and risks, Definitions of Done, each with a stable ID |
| 2. Decide how and when | Orchestration | Chooses the next action and mode from that intent, such as showing the UX sooner, proving the riskiest assumption first, or making it production-ready; records a work plan with bounds |
| 3. Do and check | Orchestration | Builds, validates at the level the stage needs, reviews progress, and keeps a log and handoffs |
| 4. Feed back | Craft | Records the evidence beside Definition of Done rows, confirms or refutes assumptions, and updates "As built" |
| Any step | Slate | Presents the product and execution artifacts as browsable pages when that helps |

Orchestration works without a Craft spec for code tasks; it then states a short goal,
done when, and limits in its own work plan. Neither execution nor documentation
redefines product intent, and Craft does not prescribe how the work is run.

## Waiting on you

The spec is a draft. Its recommendations are working defaults until you decide them in
the [decisions table](spec/product-spec.md#10-decisions). Most urgent: the names for
multi-part systems and curated sets (kit and stack), the site technology and hosting,
and which of your skills to publish first. No skills have been imported, and the job
areas will be derived from the first real items. "Loushing" is still a working name.
