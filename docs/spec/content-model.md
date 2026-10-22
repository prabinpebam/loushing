# Content model

> **TL;DR.** The catalog lists **skills** (one capability, one folder) and **kits** (a
> system of several skills, agents, templates and tools with its own repository,
> installer and releases). Curated **stacks** show which items work together and in what
> order. Every item has one **item card**, which is the single source for its listing,
> its plain-language page, its install plan and its machine-readable entry. Organization
> uses a few facets, not a deep folder tree.

This page defines what the catalog contains and how items describe and relate to
each other. The [product spec](product-spec.md) explains why. The
[repository organization](repository-organization.md) says where files live, and
[distribution](distribution.md) says how items reach a person's agent.

## What to call things

You asked what to call Slate, agentic-craft and agent-orchestration. Each is more than
a skill. Each one:

- bundles several parts (skills, reviewer agents, templates, scripts and an installer)
  that are designed to work together;
- has its own repository, version, changelog, tests and setup steps;
- usually adds a method or a runtime, not only instructions.

The [benchmarks](../research/benchmarks.md#vocabulary-across-ecosystems) show that
"skill" is the shared word for one capability, but no word for a bigger system has
settled. Claude Code, Copilot, Cursor and Codex call an installable bundle a
**plugin**, and the multi-vendor Agent Plugins standard defines one format for it.
"Kit" and "harness" are not used as a type anywhere surveyed, so choosing either
introduces a word.

Plugin is still a poor fit for the type itself. A plugin packages skills, agents,
commands, hooks and MCP servers into an agent host. Your kits also set up a project:
they write sections into `AGENTS.md`, copy templates, create a documentation host and
ship their own tests. A catalog name should describe that whole system, and "plugin"
can stay the name of one way to deliver it.

| Term | Meaning it carries | Fit | Risk |
| --- | --- | --- | --- |
| **Kit** (recommended) | A set of parts with instructions, meant to be used together | Plain, friendly, matches "skills + agents + tools + setup"; not taken by any agent vendor | Can sound small; the page has to show the depth |
| Harness | Gear that directs and controls something | Your own word; matches the "harness engineering" idea of steering agents | In agent tooling, "agent harness" usually means the agent runtime itself (Claude Code, Codex CLI), so newcomers may expect a product that runs agents |
| Plugin | An extension installed into an agent host | The industry's packaging term, now with a multi-vendor standard | Covers agent-host packaging, not project setup; using it as the type confuses the item with one way to deliver it |
| Package | Something distributed through a package manager | Accurate for the npm channel | Says nothing about the parts or method; easily confused with npm packages |
| Toolkit / suite / system | A broad set of tools | Descriptive | Generic; weak as a type label and badge |

**Working default (decision [O1](product-spec.md#10-decisions)):** call them **kits**
in the catalog and on item pages, with a one-line definition wherever the word first
appears: "A kit bundles several skills, agents, templates and tools into one system
with its own setup." Each kit's own README may keep calling itself a harness. Where an
agent host supports plugins, a kit can also be packaged as that host's plugin. That is
a distribution channel, not a different kind of item.

## Item types

| Type | What it is | Lives in | Example | Installs as |
| --- | --- | --- | --- | --- |
| **Skill** | One capability an agent loads on demand: a `SKILL.md` folder that may carry scripts, references and assets | Loushing (`skills/<name>/`), or inside a kit | A single document-conversion or review skill | Its folder, copied into each chosen agent's skills location |
| **Kit** | Several parts that work as one system, with its own repository, releases and installer | Its own repository; Loushing holds a pointer | Slate, agentic-craft, agent-orchestration | The kit's own installer, run by the Loushing CLI, or the kit's documented setup |
| **Stack** | A curated combination of items for one outcome, with the order to set them up and how they hand off | Loushing (`stacks/<name>.md`) | "Plan, build and document a product": agentic-craft + agent-orchestration + Slate | Each member, in order, in one confirmed run |

**Parts** are the skills, agents, templates and tools inside a kit. A kit's page lists
its parts, and each part is searchable, but parts are not installed alone unless the
kit says they can be. This keeps a kit's method intact.

**Not item types yet (decision [O3](product-spec.md#10-decisions)):** standalone
custom agents (`.agent.md`), instruction files, prompt files, hooks and MCP server
configurations. Today they reach people only as parts of kits. The model leaves room
for each: when the first real standalone one is added, it becomes a type with its own
install target and card fields. Nothing is planned until then.

### Skill or kit? The rule

An item is a **kit** if any of these are true. Otherwise it is a skill.

1. It contains more than one skill, or skills plus agents or templates that only make
   sense together.
2. It has an installer, a build step, a runtime or dependencies.
3. It needs its own releases, changelog, tests or CI.
4. It writes outside its own folder when installed, such as project instruction files.

The same rules decide when a skill [moves to its own
repository](repository-organization.md#when-a-skill-gets-its-own-repository).

## The item card

Each item has exactly one **item card**. It is the single source for the catalog
listing, the item page, search, the install plan and the agent-readable entry. Nothing
about an item is written twice.

- **Skills** keep their card in `about.md` beside `SKILL.md`. The frontmatter holds
  the metadata below; the body holds the plain-language explanation for the item page.
  The CLI does not copy `about.md` into the agent's skills folder.
- **Kits** keep their card in their own repository, as `about.md` at the root, so it
  travels with the code. Loushing holds a short pointer, `external/<id>.yaml`, that
  pins the source. If a kit has no card yet, the pointer can carry one temporarily. A
  skill that has [moved to its own
  repository](repository-organization.md#when-a-skill-gets-its-own-repository) works
  the same way.
- **Stacks** are their own card: `stacks/<name>.md`.

`SKILL.md` stays the agent's file: its `name` and `description` are written for an
agent deciding whether to load the skill. The card is written for a person deciding
whether to get it. The build reads both, and a check fails if the card's name differs
from `SKILL.md`.

### Card fields

| Field | Required | Applies to | Purpose | Rule |
| --- | --- | --- | --- | --- |
| `id` | Yes | All | Stable identifier in URLs, the CLI and the index | Lowercase, digits and hyphens, at most 64 characters; equals the skill's `name` and folder; never reused, even after removal |
| `type` | Yes | All | `skill`, `kit` or `stack` | Fixed vocabulary |
| `title` | Yes | All | Display name | Sentence case; may differ from `id` ("Definition of Done") |
| `summary` | Yes | All | One sentence: what a person gets | At most 140 characters, outcome first, no jargon |
| `useWhen` | Yes | All | Two to five situations, in the person's words | Each starts with a verb or "you…"; feeds search |
| `notFor` | Recommended | All | When to choose something else | Names the alternative when one exists |
| `area` | Yes | All | Primary job area, exactly one | From the [controlled vocabulary](#organization-facets-not-folders) |
| `tags` | Optional | All | Up to five extra terms | From the tag list; new tags are added to the list in the same change |
| `agents` | Yes | Skill, kit | Agents it is known to work with, and how well | Per agent: `tested`, `expected` or `unsupported` |
| `status` | Yes | All | `experimental`, `beta`, `stable`, `deprecated` or `moved` | `moved` and `deprecated` need `replacedBy` or a reason |
| `version` | Yes | Skill, kit | Semantic version of the item | Raised by the author on every published change |
| `source` | Yes | Kit | Repository, pinned release tag or commit, and path | Never a moving branch for the default channel |
| `parts` | Generated | Kit | Skills, agents, templates and tools inside | Read from the kit, not typed by hand |
| `install` | Yes | Kit | The kit's install contract: command, arguments per agent, scopes, what it writes, how to remove it | See [kits in distribution](distribution.md#kits) |
| `requires` | Optional | All | Runtimes, tools and accounts needed (Node 22+, Python 3.10+, a Google account) | Shown before install |
| `effects` | Yes | Skill, kit | What it can do: `runs-scripts`, `network`, `writes-outside-folder`, `needs-credentials` | Declared by the author, checked by the build where possible |
| `related` | Optional | All | Typed links to other items | See [relationships](#relationships) |
| `members` | Yes | Stack | Ordered items, with a one-line role for each | Each member exists in the catalog |
| `examples` | Recommended | Skill, kit | "Try it" prompts and the result to expect | At least one before `stable` |
| `license` | Yes | Skill, kit | SPDX identifier | Third-party content keeps its original license |
| `origin` | Yes | Skill, kit | `original`, or `adapted` with the source URL | Shown on the page; adapted content credits its source |
| `owner` | Yes | All | Who maintains it | Default: the catalog owner |
| `updated` | Generated | All | Date of the last published change | From Git history |
| `media` | Optional | All | Screenshots or short recordings, with alt text | Local files; light and dark where relevant |

### The page body

The card's Markdown body explains the item to a person who has never read the source.
It always has these sections, in this order, so every item page reads the same:

1. **What it does:** two or three sentences, in plain words, about the outcome.
2. **How it works:** what the agent does differently once the item is installed. For
   kits, the parts and how they hand off, with a diagram when there are more than
   three parts.
3. **Try it:** one or more prompts to give the agent, and what should happen.
4. **What it adds to your project:** the files and folders it adds or changes, and any
   scripts it runs.
5. **Good to know:** limits, known issues, and when to use something else.

The [item pages](item-pages.md) section of the spec shows how these sections, the card
fields and the source files are laid out together.

## Relationships

Relationships answer "what works well with this?" They are typed, so the page can say
*why* two items belong together, not just list them.

| Relation | Meaning | Direction | Shown as |
| --- | --- | --- | --- |
| `pairsWith` | Each works alone; together they do more | Both ways (declared once, shown on both) | "Works well with" plus the one-line reason |
| `feedsInto` | This item's output is the other's input | One way | "Hands off to…" and, on the other page, "Picks up from…" |
| `requires` | This item does not work without the other | One way | "Needs…", installed first or offered together |
| `partOf` | A part inside a kit | Generated from the kit | "Part of…" |
| `alternativeTo` | Solves the same job differently | Both ways | "Also consider…" with the difference |
| `replacedBy` | Newer item supersedes this one | One way | A banner on the old page |

Rules:

- Every relation carries a reason of at most 100 characters. A relation without a
  reason is not shown.
- `requires` is used sparingly. The three current kits deliberately do not require each
  other, so they relate with `pairsWith` and `feedsInto`.
- A stack is the place for order and handoff across more than two items, rather than a
  chain of `feedsInto` links.

Example, using the three current kits (taken from their READMEs):

| From | Relation | To | Reason |
| --- | --- | --- | --- |
| agentic-craft | `feedsInto` | agent-orchestration | Specs and Definitions of Done become the goal and checks of each work plan |
| agent-orchestration | `feedsInto` | agentic-craft | Evidence and refuted assumptions go back into the spec |
| Slate | `pairsWith` | agentic-craft | Specs and decisions become browsable documentation |
| Slate | `pairsWith` | agent-orchestration | Work plans and handoffs can be published as pages |

## Organization: facets, not folders

People look for skills by the job in front of them, and agents filter by what they can
run. So the catalog is organized by **facets**, combined freely, rather than one
category tree. Folders in the repository are flat (`skills/<id>/`) and never encode a
category, so recategorizing never moves files or breaks links.

| Facet | Values | Used for |
| --- | --- | --- |
| **Type** | Skill, kit, stack | Browsing and badges |
| **Job area** | One per item, from a short controlled list | Primary browsing, home page sections |
| **Agent** | VS Code Copilot, Copilot CLI, Claude Code, Codex, Cursor, any Agent Skills agent | Filtering; the install command adapts |
| **Effects** | Runs scripts, uses the network, writes outside its folder, needs credentials | Trust filtering and warnings |
| **Status** | Experimental, beta, stable, deprecated | Default view hides deprecated |
| **Tags** | Free-ish list, curated | Search and related suggestions |

**Job areas** are not defined yet: they come from the real skills, not from a guess
(decision [O4](product-spec.md#10-decisions)). The working rule: derive at most eight
areas from the first ten to fifteen real items, so that each area has at least two
items and none has more than a third of the catalog. Review the list whenever the
catalog doubles. Candidate areas, to be confirmed against the real items, include:
product and planning, documentation and writing, engineering workflow, documents and
office files, data and analysis, communication, and research.

## Identity, versions and lifecycle

- **IDs are permanent.** A renamed item keeps its old ID as an alias, and the old URL
  redirects. A removed item's ID is never reused.
- **Versions are semantic.** Major: the skill's behavior or install location changes in
  a way that needs action. Minor: new capability. Patch: wording and fixes. Kits
  follow their own release tags; the pointer pins one.
- **Status moves one way:** experimental → beta → stable → deprecated → removed, with
  `moved` when a skill goes to its own repository. A deprecated item keeps its page,
  marked, for at least two catalog releases.
- **Namespaces.** Kit parts are addressed as `<kit>/<part>` (for example
  `agentic-craft/ground`) so that generic part names never collide with standalone
  skills. Standalone skills use a bare ID. The CLI refuses to install two different
  items into the same skill folder name without confirmation.

## The catalog index

The build turns all cards into one generated index, `catalog.json`, plus per-item
JSON and Markdown. The same index feeds the website, search, the CLI and agents. The
fields and endpoints are in [agent access](agent-access.md); the build and checks are
in [repository organization](repository-organization.md#build-and-checks).
