# Loushing: product spec

Loushing is a personal project: the AI-agent skills and kits you use in your own work,
kept in one place and explained plainly. It doesn't try to be a marketplace or the
next big thing, and it never claims these are the best skills or tells anyone to use
them. They work for you. If someone else wants to use one, each page shows how. A
person finds an item by the task it helps with, understands it in plain language and,
if they want it, gets it working in their agent in one step. An agent can do the same
through structured data. Loushing starts with your own skills, added a few at a time,
and your larger systems: Slate, agentic-craft and agent-orchestration.

> **TL;DR.**
> - **The promise:** the skills and kits I use, each explained plainly, and if you
>   want to use one yourself, how to get it working in your agent in one step.
> - **The framing:** personal, not a pitch. One person's working collection, in the
>   author's own voice. No store, no rankings, no superlatives, no "you should"
>   ([P9](#1-the-customer-promise), [voice](#8-copy)).
> - **Who:** you as author and daily user; practitioners who get a link from you or
>   find the catalog; AI agents working for any of them.
> - **What a person can do:** find items by describing a task ([U1](#3-what-a-person-can-do));
>   understand an item and what it will change before getting it (U3, U4); get it into
>   their agent with one command or without the CLI (U6, U7); see what works well
>   together and set up a stack (U9, U10); keep it current safely (U11).
> - **How:** one public repository is the catalog of record. Small skills live inside it
>   and kits live in their own repositories behind pinned pointers. One build produces a
>   static website, a JSON index for agents and the index the `npx loushing` CLI reads.
> - **Riskiest assumption:** [A3](#9-assumptions-and-risks), that one install step can
>   reach every target agent. A spike installs a sample skill in all of them.
>   [A1](#9-assumptions-and-risks), that people want a curated catalog over raw
>   repositories, is tested with a prototype.
> - **Success:** the [Definitions of Done](definition-of-done.md). A first-time person
>   decides about an item within a minute and has it working within three; adding a
>   skill takes you under 15 minutes.
> - **Look:** a clean, visual-first system in the Harbour palette (mist, ink, harbour
>   teal and coral), with Chopper in quiet background cameos. See the
>   [design system](../design/design-system.md), [visual first](../design/visual-first.md)
>   and [Chopper](../design/chopper.md).
> - **Open:** the names (kit, stack) and how private items work. Each has a working
>   default in [§10](#10-decisions). The site technology (O6) and hosting (O7) are
>   decided. The typeface, Chopper's tribute line and the logo are on the design pages.

Related pages: [content model](content-model.md) ·
[repository organization](repository-organization.md) · [item pages](item-pages.md) ·
[distribution](distribution.md) · [agent access](agent-access.md) ·
[Definitions of Done](definition-of-done.md) ·
[benchmarks](../research/benchmarks.md).

## Scope of this spec

| From your request | Where it is specified |
| --- | --- |
| A browsable, discoverable list of individual skills, added a few at a time, each with its own resources and scripts | [Content model](content-model.md), [§4.1](#41-find-an-item-u1-u2), [§5](#5-views) |
| Larger systems such as Slate, agentic-craft and agent-orchestration: what to call them, how they work, what pairs with them | [What to call things](content-model.md#what-to-call-things), [relationships](content-model.md#relationships), [kit page](item-pages.md#kit-page) |
| A simplified, plain-language detail page for each item, not only raw source | [Item pages](item-pages.md) |
| An easy way to get items: a complete npx strategy, with GitHub cloning still available | [Distribution](distribution.md) |
| Organizing skills inside Loushing, with bigger items in their own repositories | [Repository organization](repository-organization.md) |
| Research and benchmarking of similar solutions, with their customer promises and jobs | [Benchmarks](../research/benchmarks.md) |
| A strict design system with tokens and components | [Design system](../design/design-system.md) |
| A modern, clean, visual-first UI, where visuals frame the UI and text content stays text | [Visual first](../design/visual-first.md), [§5](#5-views) |
| Chopper, your dog, as a hand-drawn character in background cameos, made with your image skill from his character sheet | [Chopper](../design/chopper.md) |

**Added to make it complete** (things the request did not mention):

| Addition | Why it is needed | Where |
| --- | --- | --- |
| AI agents as first-class users, with structured data, a finder skill and non-interactive commands | Your brief names agents as an audience; agents cannot use a human-only website | [Agent access](agent-access.md), [U17, U18](#3-what-a-person-can-do) |
| Trust and safety: declared effects, script disclosure, pinned versions, hashes, provenance | Skills can contain scripts that agents run; the benchmarks show this is the ecosystem's biggest open problem | [Trust panel](item-pages.md#body-sections), [distribution security](distribution.md#security) |
| Public and private boundary | Many working skills belong to an employer or contain private details; the repository is public | [Public and private](repository-organization.md#public-and-private), [U16, U22](#3-what-a-person-can-do) |
| Updating, removing and restoring a set | Installing is only the first step; people need to stay current and move between projects and machines | [§4.7](#47-update-and-remove-u11-u12-u21), [§4.8](#48-restore-a-set-u13) |
| Stable identity: permanent IDs, redirects, moved and deprecated states | Items will be renamed and moved to their own repositories; shared links must keep working | [Identity and lifecycle](content-model.md#identity-versions-and-lifecycle) |
| Cross-agent compatibility, shown per item as tested or expected | People use different agents; the open Agent Skills format makes portability possible but not guaranteed | [Card fields](content-model.md#card-fields), [install targets](distribution.md#install-targets) |
| Curated stacks with setup order and handoffs | Pairings need an order and a reason, not just a list of links | [Content model](content-model.md#item-types), [stack page](item-pages.md#stack-page) |
| An authoring flow with one source and automatic checks | Adding a few skills at a time only scales if each addition is quick and safe | [§4.10](#410-add-a-skill-u14-u22), [build and checks](repository-organization.md#build-and-checks) |
| A newcomer's introduction | Many people have never installed a skill and need to know what one is first | [U20](#3-what-a-person-can-do), Get started view |
| Accessibility, themes, every state, performance targets | Part of any UI requirement, not polish | [Item page states](item-pages.md#every-state), [§7](#7-performance-and-waits) |

## 1. The customer promise

**The skills and kits I use, each explained plainly. If you want to use one yourself,
you can understand it in a minute and have it working in your agent in one step.**

The promise is made by one person about their own tools. P1 to P8 describe what
someone who wants an item can rely on; P9 describes how the whole site presents
itself.

| # | Promise | What breaks it |
| --- | --- | --- |
| P1 | **Found by the task, not the name.** Describing what you want to do finds the right item. | Describing a task in your own words does not put the right item in the first five results; an item can only be found by its exact name. |
| P2 | **Understood before it is installed.** Every item explains, in plain words, what it does, when to use it and what it changes. | A person has to open `SKILL.md` or source code to learn whether an item fits or what it will change. |
| P3 | **One step to working, in the agent you use.** One command, or one documented copy, puts it where your agent looks. | Files need to be moved by hand; they land where the agent does not look; it only works for one agent. |
| P4 | **No surprises.** Nothing runs or changes without being shown first, and you get exactly the version the page showed. | A script runs unannounced; the download differs from the page; a file the person edited is overwritten; a secret or private item is published. |
| P5 | **Better together.** You can see what pairs well, why, and set up a proven combination in one go. | Related items are missing or have no reason; setting up two recommended items conflicts. |
| P6 | **Agents are first-class users.** An agent can find, read and install items through structured data and plain commands. | An agent has to scrape HTML; a command waits for input with no machine-readable signal; the agent's data differs from the website. |
| P7 | **Stays current, safely.** You can tell when an item changed and update it without losing your own edits or breaking links. | No way to know an update exists; an update overwrites local edits; a rename or move breaks an install or a shared link. |
| P8 | **Adding an item takes minutes, from one source.** (For you, the author.) | The same information is written in two places; publishing needs website code changes; the catalog drifts from the source; a private item leaks. |
| P9 | **Personal, not a pitch.** It reads as one person's working collection: what I use, when I reach for it and how it works for me, with how to get it for anyone who wants to. | Store or marketplace language ("discover", "the best", "top", "powerful", "supercharge"); claims that an item is better than others; telling the reader they should use it; popularity, ratings or download counts; a voice that speaks for a company or a community rather than the author. |

**Not promised (non-goals), at least for the first release:**

- Not a marketplace, and not trying to look like one: no third-party submissions,
  accounts, ratings, comments, popularity or payments. Others can report problems
  through GitHub issues.
- Not a recommendation: items are what work for the author, not claims about what
  works best for anyone else.
- Not a host or runner for skills: Loushing never executes an item on a server.
- No listing of other authors' items, beyond "Also consider" links ([O10](#10-decisions)).
- No usage tracking in the CLI ([O11](#10-decisions)).
- No private or work items in the public catalog. Private use is a later, separate
  catalog ([O9](#10-decisions)).
- Not a replacement for vendor marketplaces. Loushing items should also work through
  them where possible ([O12](#10-decisions)).

## 2. Scenarios and jobs to be done

The people and agents:

| Who | Situation |
| --- | --- |
| **You (author and daily user)** | Write and refine skills in daily work; use them across many projects and machines, at work and at home; maintain three kits |
| **A practitioner** | A developer, designer or product person who uses an AI agent and got a link from you, or found the catalog |
| **A newcomer** | Uses AI chat but has never installed a skill |
| **An AI agent** | Working for any of the above inside VS Code Copilot, Copilot CLI, Claude Code, Codex or Cursor |

| # | When I… | I want to… | So I can… | Serves |
| --- | --- | --- | --- | --- |
| J1 | start a task and suspect a skill already exists for it | search by describing the task | get going without writing the instructions myself | P1 |
| J2 | find a candidate item | understand within a minute what it does and changes | decide confidently, without reading source | P2, P4 |
| J3 | have decided to use an item | have it working in my agent, in this project or all of them, in one step | use it right away | P3 |
| J4 | see that an item runs scripts, uses the network or needs credentials | see exactly what and read the code first | trust it, or check it against my organization's policy | P4 |
| J5 | adopt a larger system such as Slate | understand its parts, its setup and how it fits my workflow | set it up correctly the first time | P2, P5 |
| J6 | have found one useful item | see what pairs with it and set up a proven combination | get the full benefit, not a fragment | P5 |
| J7 | start a new project or machine | restore my usual set of items in one step | be productive immediately | P3, P7 |
| J8 | use items that have since improved | know, and update without losing my changes | stay current safely | P7 |
| J9 | no longer need an item | remove it and everything it added | keep my project clean | P4, P7 |
| J10 | am asked by a colleague how I do something | send one link that explains and installs it | let them adopt it without me | P2, P3 |
| J11 | (agent) am given a task I have no skill for | query the catalog and get structured candidates with an install plan | propose the right item, or install it with consent | P6 |
| J12 | (agent) install or update an item | run commands without prompts and get results and clear "a person must decide" signals | finish without hanging or overstepping | P6, P4 |
| J13 | (author) have refined a skill in daily work | publish it in minutes | make it findable and installable everywhere | P8 |
| J14 | (author) see a skill grow into a system | move it to its own repository | keep it growing without breaking anyone's install | P7, P8 |
| J15 | (author) list a kit from its own repository | have Loushing show it from the kit's own source | never maintain two descriptions that drift | P8 |
| J16 | (author) have a skill that is private or work-only | keep it out of the public catalog but still use it | share freely without leaking anything | P4, P8 |
| J17 | (newcomer) hear about agent skills | learn what skills, kits and stacks are and how to start | try one without feeling lost | P2 |

## 3. What a person can do

| # | A person can… | Jobs |
| --- | --- | --- |
| U1 | find items by describing a task in their own words, by name or by tag | J1 |
| U2 | narrow results by type, job area, agent, effects and status | J1, J4 |
| U3 | read, for any item, what it does, when to use it, when not to, and an example of using it, without opening source files | J2, J10, J17 |
| U4 | see exactly which files an item adds to their project and which effects it has, before getting it | J2, J4 |
| U5 | read any item's source files, at the exact version offered, from its page | J4 |
| U6 | get an item into their chosen agent, at project or personal scope, with one command | J3, J10 |
| U7 | get an item without the CLI, through Git or a download, with the steps to place it | J3 |
| U8 | see a kit's parts, how they work together, and what its setup will change | J5 |
| U9 | see which items work well with an item, and why | J6 |
| U10 | set up a stack's members, in order, with one confirmed command | J6 |
| U11 | see which installed items have updates, and update them without losing local edits | J8 |
| U12 | remove an installed item and everything it added | J9 |
| U13 | restore a recorded set of items in a new project or on a new machine with one command | J7 |
| U14 | (author) add a skill, or a pointer to a kit, and publish it to the site, CLI and index in one change, writing its description once | J13, J15 |
| U15 | (author) move a skill to its own repository without changing its ID or breaking installs | J14 |
| U16 | (author) keep private items out of the public catalog while still installing them for themselves | J16 |
| U17 | (agent) search the catalog and read any item's details as structured data | J11 |
| U18 | (agent) install, update and remove items without prompts, with machine-readable results and exit codes that mark when a person must decide | J12 |
| U19 | link to any item, with the link still working after renames, moves and removal | J10, J14 |
| U20 | (newcomer) learn what skills, kits and stacks are and how to start, in under five minutes | J17 |
| U21 | **can't** have an item's code run, or a file they changed overwritten, by getting or updating an item, without being asked first | J4, J8 |
| U22 | **can't** publish a private item to the public site, index or repository by accident | J16 |

## 4. Task flows

Wait classes follow the craft convention: **instant** (under 100 ms), **responsive**
(under 1 s, inline feedback), **waiting** (1-10 s, visible progress) and **long**
(over 10 s, progress with steps, can be left).

### 4.1 Find an item (U1, U2)

1. The person arrives at the home page or the catalog, or types in the search box from
   any page. *(instant: the search box is ready when the page shows)*
2. They type a task ("turn meeting notes into a spec") or a name. Results update as
   they type, ranked by match in the summary, `useWhen`, title and tags.
   *(instant per keystroke after the index loads; the first load is responsive)*
3. Each result shows type, title, summary, agent chips and effects icons. They narrow
   with filters for type, job area, agent, effects and status. The chosen filters are
   kept in the URL so the view can be shared.
4. They open an item's page ([§4.2](#42-evaluate-an-item-u3-u4-u5-u9)).

**Branches:**

- **No results:** "No items match *query*." Shows the closest matches by tag and a
  link to browse by job area. Never an empty page.
- **Index failed to load:** the browse lists, which are static, still work. Search
  says "Search isn't available right now" and offers a retry.
- **Their agent is filtered out:** the result count says how many items are hidden by
  the agent filter, with a way to clear it.

**Defaults:** deprecated items are hidden; experimental items are shown and labeled;
the agent filter is off until the person picks an agent.

**Agent path:** `npx loushing find "<task>" --json` returns ranked items with IDs,
summaries, agents, effects and install commands. See [agent access](agent-access.md).

### 4.2 Evaluate an item (U3, U4, U5, U9)

1. The page opens with the header and the Get it panel in view. *(static: no wait)*
2. They read What it does, Use it when and Not for, and copy a Try it prompt.
3. They check What it adds and the trust panel. If the item runs scripts, they open the
   source viewer at the pinned version.
4. They follow Works well with to related items, or go to a stack.

**Branches:** a deprecated or moved item shows its banner first
([states](item-pages.md#every-state)). An item without examples cannot be stable.

### 4.3 Get a skill with the CLI (U6, U21)

1. On the page, they pick their agent and scope (*This project* is the default) and
   copy the command, or paste the "Ask your agent" sentence into the agent's chat.
2. They run `npx loushing add <id>`. npx downloads the CLI the first time.
   *(waiting: npx's own progress, then the CLI's steps)*
3. The CLI resolves the item in the catalog index and shows the plan: version, files,
   destination for each agent, and declared effects. *(responsive)*
4. If there are effects or anything to overwrite, it asks for confirmation. Otherwise
   it proceeds.
5. It downloads the item at its pinned commit, verifies the hash and writes the
   files. It records the item in `loushing.lock.json`. *(waiting: one line per step)*
6. It finishes with: what was added, where, and "Start a new chat in *agent* to use
   it." Agents read skills when a session starts.

**Branches:**

- **No Node.js, or an old version:** the page's Git and Download methods do not need
  it. The CLI states the minimum version.
- **Agent not detected:** the CLI asks which agent to install for, or uses `--agent`.
  With no answer possible, such as in CI, it stops with exit code 2.
- **A folder with the same name exists and differs:** it shows which files differ and
  asks whether to keep the person's copy, replace it, or install under the item's
  namespaced name. It never overwrites silently.
- **Network refused or a proxy blocks GitHub:** "Couldn't download *id* from GitHub."
  It names the URL, the environment variables it honors, and the Download method.
- **Hash mismatch:** stop, write nothing, and report it. This is never retried silently.
- **Cancelled half-way:** files are written to a temporary folder first and moved into
  place only at the end, so a cancelled run leaves nothing behind.
- **Already installed at this version:** "Already up to date." Exit code 0.

**Defaults:** project scope; the agents detected in the project; the stable channel;
confirmation only when there are effects or conflicts.

### 4.4 Get a kit (U6, U8)

1. `npx loushing add <kit>` resolves the pointer, downloads the kit at its pinned
   release and reads its [install contract](distribution.md#kits).
2. It shows the plan: the kit's installer command, the files and sections it will
   write (taken from the installer's dry run), and the follow-up the person must do,
   such as filling in project facts. *(waiting)*
3. On confirmation, it runs the kit's installer with the mapped agent and scope
   arguments and records the result in the lockfile.
4. It prints the kit's next step from its card.

**Branches:** the installer fails, in which case its output is shown with the kit's
issue link and the project is left as the installer left it. Also: the kit has no
contract yet, in which case the CLI shows the kit's documented setup steps and runs
nothing.

### 4.5 Set up a stack (U10)

1. `npx loushing add <stack>` shows every member, in order, with each plan.
2. One confirmation runs them in order. A member already installed is skipped.
3. A failure stops the run, reports which members succeeded and how to resume.
4. It finishes with the stack's After setup steps.

### 4.6 Get an item without the CLI (U7)

1. On the page, they choose **Git** or **Download**.
2. **Git:** `git clone` of the repository (or of the kit's repository), then the
   folder to copy and the destination for their agent, as shown on the page.
   **Download:** a ZIP of the folder at this version, with its hash, plus the same
   destination.
3. For kits, the page shows the kit's own installer command to run from the clone.

### 4.7 Update and remove (U11, U12, U21)

1. `npx loushing outdated` lists installed items with newer versions, with their
   change lines.
2. `npx loushing update [id]` downloads the new version. Files the person changed since
   install (detected by hash against the lockfile) are kept unless they confirm, and a
   copy of the replaced version is saved beside them.
3. `npx loushing remove <id>` deletes exactly the files the lockfile records, and asks
   about any that were changed. For kits, it runs the kit's uninstall from its
   contract.

**Branches:** an item was renamed or moved, in which case the CLI follows the alias
and says so. An item was removed, in which case the CLI explains why and offers the
replacement, and keeps the installed copy unless asked to remove it.

### 4.8 Restore a set (U13)

1. A project's `loushing.lock.json` is committed with the project.
2. In a fresh clone or on a new machine, `npx loushing install` restores every item at
   its recorded version, per agent.
3. For personal-scope items, `npx loushing install --personal` restores the person's
   own list, kept in the user profile.

### 4.9 Agent finds and installs (U17, U18)

1. The agent recognizes a gap, or has the Loushing finder skill installed
   ([agent access](agent-access.md#the-finder-skill)).
2. It runs `npx loushing find "<task>" --json` and reads the candidates.
3. It tells the person which item it proposes and why, including the effects.
4. With the person's consent, it runs
   `npx loushing add <id> --agent <agent> --yes --json`.
5. Exit codes decide the next step: 0 done; 2 needs a person (a conflict, effects to
   approve, an unknown agent); 1 failed. In every case the JSON says why.

The CLI never accepts effects on its own: `--yes` approves the plan it printed, and
only the agent's person can authorize that.

### 4.10 Add a skill (U14, U22)

1. You put the skill folder in `skills/<id>/`, or ask the agent to create it.
2. You ask the agent to draft `about.md`. It reads `SKILL.md` and the scripts, fills
   the card, writes the plain-language body and declares the effects.
   *(long: an agent turn)*
3. `loushing check` validates format, card, identity, relations, effects, size and the
   publication check. Each problem names the file, the rule and the fix.
   *(responsive)*
4. You preview the page locally, then open a pull request. CI runs the same checks.
5. Merging releases the catalog and deploys the site. *(long: minutes; the pull
   request shows progress)*

**Branches:** the publication check finds a secret or internal URL, so the merge is
blocked and the line is named. The skill is a kit by the
[rule](content-model.md#skill-or-kit-the-rule), so the check suggests a separate
repository. The ID is already used or retired, so the check suggests alternatives.

### 4.11 List a kit (U14)

1. In the kit's repository, add `about.md` (the card) and an install contract, then
   tag a release.
2. In Loushing, add `external/<id>.yaml` pointing to that release.
3. `loushing check` fetches the card at the tag and validates it, then the flow is the
   same as [§4.10](#410-add-a-skill-u14-u22) from step 4.

### 4.12 Move a skill out (U15, U19)

The steps are in [repository organization](repository-organization.md#when-a-skill-gets-its-own-repository).
The ID, URL and installs keep working, and the page says where the item now lives.

## 5. Views

The site is separate code, not Slate ([O5, O6](#10-decisions)). Every view is built
from the catalog index and the design system, and is static except search and filters.

Each view is a [view spec](../design/design-system.md#views-from-data) of blocks in a
layout. [Visual first](../design/visual-first.md#per-view) sets how each view frames
its information; item content stays text. Layouts may hold up to two
[Chopper cameos](../design/chopper.md#where-he-appears) in reserved zones; views never
place him.

| View | Purpose | Serves | Regions and data |
| --- | --- | --- | --- |
| **Home** | Start from a task | U1, U9, U20 | Search box first; job areas; featured stacks; recently added and updated items; one line on what skills and kits are, linking to Get started |
| **Catalog** | Browse and filter everything | U1, U2 | Search; facet filters (type, job area, agent, effects, status); result list with counts; filter state in the URL |
| **Skill page** | Decide and get a skill | U3-U7, U9, U19 | See [skill page](item-pages.md#skill-page) |
| **Kit page** | Understand and set up a kit | U3-U9, U19 | See [kit page](item-pages.md#kit-page) |
| **Part page** | Understand one part of a kit | U3, U5, U8 | See [part pages](item-pages.md#kit-page) |
| **Stack page** | Set up a combination | U9, U10 | See [stack page](item-pages.md#stack-page) |
| **Get started** | Learn the basics and set up the CLI | U20, U6, U13 | What a skill, kit and stack are; where agents look; first install; restoring a set; the privacy and safety model |
| **For agents** | Machine access, for people wiring up agents | U17, U18 | Index URLs, CLI JSON commands and exit codes, the finder skill |
| **What's new** | See changes | U11 | Catalog releases, newest first, with item changes; an Atom feed |
| **Gone or not found** | Never a dead end | U19 | Removed or unknown ID: the reason, alternatives, search |

## 6. Architecture

| Part | What it is | Runs where |
| --- | --- | --- |
| **Catalog source** | Skills, pointers, stacks and taxonomy in the Loushing repository | GitHub |
| **Build** | Validates cards; fetches kit cards at pinned refs; writes `catalog.json`, per-item JSON and Markdown, `llms.txt`, the search index and the static site | GitHub Actions on each merge to `main` |
| **Website** | Pre-rendered static pages plus a client-side search index | Static hosting ([O7](#10-decisions)) |
| **CLI** | The `loushing` npm package: Node.js 22+ ([O18](distribution.md#decisions-on-this-page)), no runtime dependencies. It reads the index, downloads items at pinned commits, verifies hashes, writes files and the lockfile, and runs kit installers through their contract. | The person's machine, through `npx` |
| **Finder skill** | A small skill that teaches agents to use the CLI's `find` and `add` | Installed in the person's agent |

**Data flow.** Cards (source) → build → index and site (published) → CLI and agents
(read). Nothing else holds item data.

**Security model:**

- Installs are pinned to commits and verified by hash. Kits are pinned to release tags.
- The CLI runs no item code, except a kit's declared installer after confirmation.
- The npm package is published from CI with provenance attestation and two-factor
  protection, and has no dependencies.
- The site has no accounts, no back end and no third-party scripts.

The details are in [distribution](distribution.md#security).

**What runs nowhere:** there is no server, database, account system or telemetry
service.

## 7. Performance and waits

| Wait | Class | Pattern | Target |
| --- | --- | --- | --- |
| Item page reading | none | Static pre-rendered page | Largest contentful paint ≤ 1.5 s at p75 on a mid-range phone over 4G |
| Search index first load | responsive | Search box usable at once; results appear when ready | Index ≤ 150 KB compressed at 200 items; ready ≤ 500 ms on broadband |
| Search per keystroke | instant | Results update in place | ≤ 50 ms at 200 items |
| `npx loushing add <skill>`, CLI cached | waiting | One line per step | ≤ 5 s on broadband |
| `npx loushing add <skill>`, first run | waiting | npx progress, then the steps | ≤ 15 s on broadband |
| `npx loushing add <kit>` | waiting or long | Plan, then the installer's output | Kit installer time plus ≤ 5 s |
| Catalog release after merge | long | Pull request checks and the deploy job | ≤ 10 minutes to live |
| Chopper cameo | none | Space reserved; loaded lazily after the page is idle; no wait shown | Never the largest contentful paint; at most 3 cameo images and 90 KB per page |

## 8. Copy

**Voice: personal, not a pitch ([P9](#1-the-customer-promise)).** The site is written
by its author, in the first person, about their own tools. It speaks to the reader as
"you" only to explain how to get and use an item.

| Do | Don't |
| --- | --- |
| "The skills and kits I use", "I reach for it when…", "It works for me with VS Code Copilot" | "The best skills for AI agents", "Discover powerful skills", "Supercharge your agent" |
| "If you want to use one, here's how" | "You should install…", "Everyone needs…", "Join…" |
| Say what an item does and when the author uses it | Compare items with other people's, or claim they're better |
| Plain counts that describe the collection ("3 kits") | Popularity, ratings, downloads, "trusted by", "thousands of" |
| "Tested: I use it with this agent" | "Certified", "official", "verified by the community" |

The [copy check](#11-as-built) fails the build's tests when a page uses the banned
pitch words. The rest is reviewed by hand against this table.

**Glossary** (the site, CLI and pages use these words and no synonyms):

| Term | Meaning | Not |
| --- | --- | --- |
| **Skill** | One capability an agent loads when a task needs it | Prompt, tool, plugin |
| **Kit** | Several skills, agents, templates and tools that work as one system, with their own setup ([O1](#10-decisions)) | Harness, plugin, package |
| **Part** | A skill, agent, template or tool inside a kit | Module, component |
| **Stack** | A curated set of items for one outcome, with an order ([O2](#10-decisions)) | Bundle, collection |
| **Item** | Any skill, kit or stack | Entry, listing |
| **Get** | The action of obtaining an item by any method | Download (only for the ZIP) |
| **Install** | What the CLI does to put an item where an agent looks | Deploy, enable |
| **This project / All my projects** | Install scopes | Local/global, workspace/user |
| **Effects** | What an item can do beyond giving instructions: run scripts, use the network, write outside its folder, need credentials | Permissions (it grants none) |
| **Works well with** | A related item, with the reason | Similar, recommended |
| **Chopper** | The hand-drawn dog in background cameos; named only in the footer's tribute line and the "Hide Chopper" setting | Mascot, assistant, guide |

**Failure words** follow one pattern, *what happened · what it means · what to do*:

- "Couldn't download *id*. GitHub didn't respond. Check your connection or proxy, or
  use the download link on the item's page."
- "*file* has changes you made. Keep yours, replace it, or see the differences?"
- "*id* has moved to its own repository. Installing from there; nothing else changes."
- "This item was removed on *date*: *reason*. Try *alternative* instead."

## 9. Assumptions and risks

| # | Assumption or risk | Kind | Impact if wrong | Evidence today | Criterion | Cheapest check | Changes | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | People other than you prefer a curated, explained catalog to finding these repositories and vendor directories themselves | Desirability | High (P1, P2; whether to build a site at all) | None | 3 of 5 practitioners, each given a task, find and choose the right item within 5 minutes and say they would come back | A clickable prototype of the home page and three real item pages | Refuted: keep the catalog as a README, an index and a CLI only; drop the site | Open |
| A2 | A plain-language page lets a first-time person decide within a minute | Usability | High (P2) | Benchmarks: the leading directories lead with install and a README, not explanations | 4 of 5 first-time people correctly state what an item does and what it changes after 60 seconds on the page | The same prototype test | Change the page order or the body template | Open |
| A3 | One CLI install step can reach every target agent: VS Code Copilot, Copilot CLI, Claude Code, Codex and Cursor | Feasibility | High (P3; the whole CLI design) | Research: the Agent Skills format is shared, but discovery folders differ per agent | A sample skill installed by a prototype CLI is discovered in all five agents on Windows and macOS | A spike: copy one skill to each documented folder and ask each agent to use it | Narrow the supported agents or add per-agent adapters | Open |
| A4 | Kit installers can be driven non-interactively through one contract with dry-run and uninstall | Feasibility | High (P3, P5 for kits and stacks) | Partial: craft and orchestration have installers; Slate's setup is a separate init script | All three kits install, dry-run and uninstall through the contract with no prompts, and the dry-run lists exactly what is written | Run the three current installers in a scratch project | Add contract support to each kit before stage 3 | Open |
| A5 | An agent can draft a good item card from `SKILL.md`, needing at most 10 minutes of your edits | Usability | Medium (P8) | None | For 5 real skills, the median edit time is ≤ 10 minutes and each page passes the quality bar | Draft cards for 5 skills | Add a stricter template or a guided authoring skill | Open |
| A6 | Agents will use the catalog mid-task when the finder skill is installed | Desirability | Medium (P6) | Benchmarks: Vercel ships a similar "find skills" skill | In 10 tasks where a catalog item applies, the agent proposes the right item unprompted at least 7 times | A scripted trial after stage 4 | Change the finder skill's description, or drop it in favor of instructions | Open |
| A7 | Keyword search over summaries, `useWhen` and tags puts the right item in the top five for 80% of task phrases, with up to 200 items | Feasibility | Medium (P1) | None | 20 real task phrases against the first 15 items | Run the phrases against a simple index | Add synonyms, or semantic search | Open |
| A8 | The skills you choose can be published: no confidential content, and licenses allow it | Viability | High (P4, P8) | None | Each of the first 10 candidates passes the publication check with wording changes only | Run the check on the candidates | Keep affected skills private ([O9](#10-decisions)) | Open |
| A9 | Skills fit the size limits (5 MB, 50 files) and install fast | Feasibility | Low (P3) | None | The first 15 skills fit; a cached install takes ≤ 5 s | Measure them | Raise the limits, or move large skills to their own repositories | Open |
| A10 | `loushing` on npm and downloads from GitHub work on managed corporate devices through their package proxies | Feasibility | High (P3 at work) | npm reaches this machine only through a corporate proxy; the name `loushing` is free | `npx loushing@latest --version` and an install succeed on a managed device within 24 hours of the first publish | Publish a minimal 0.0.x CLI and try it (needs your approval to publish) | Document the Git and Download fallback as primary at work | Open |
| A11 | Agent vendors change skill folders and packaging (plugins, marketplaces) faster than items change | Risk | Medium (P3) | Research: OpenAI deprecated its skills repository for plugins; VS Code deprecated a skill-location setting; Copilot and Claude Code added plugin marketplaces ([benchmarks](../research/benchmarks.md)) | n/a | Watch vendor documentation | Keep per-agent folders in one CLI table, updated independently of items | Accepted |
| A12 | A compromised account or item could push malicious scripts to people who install | Risk | High (P4) | The Shai-Hulud worm spread through hundreds of npm packages in September 2025; skill directories scan submissions but say a pass is no guarantee ([security](distribution.md#security)) | n/a | n/a | Pinning, hashes, provenance, 2FA, review and effects disclosure ([security](distribution.md#security)) | Accepted, with mitigations |
| A13 | You can maintain the catalog in about 30 minutes a week | Viability | Medium (P7, P8) | None | Over the first 8 weeks, catalog upkeep beyond adding items stays at or under 30 minutes a week | Keep a rough log | Automate more, or slow the release cadence | Open |
| A14 | Chopper's cameos add warmth without distracting anyone from finding and deciding | Desirability | Medium (P1, P2) | None | In the prototype test, no participant calls him distracting or confusing, and median task times with and without cameos differ by ≤ 10% | Run half the prototype sessions with `?chopper=off` | Fewer cameos, fewer zones, or hidden by default ([O28](../design/chopper.md#decisions-on-this-page)) | Open |
| A15 | The image model keeps Chopper on model across scenes when given the character sheet | Feasibility | Medium (the character) | The sheet is consistent across 16 views; the image skill accepts up to 16 references and returns true alpha | All 4 pilot renders pass the [QA checklist](../design/chopper.md#making-his-images) within 2 draft rounds; later, at least 8 of every 10 | The [4-render pilot](../design/chopper.md#making-his-images), about $0.40 | Add approved renders as references, narrow the poses, or hand-correct masters | Open |
| A16 | Visual-first item pages let people grasp compatibility, effects and files faster than text | Usability | Medium (P2) | None | In the prototype test, 4 of 5 first-time people state an item's supported agents and effects correctly within 10 seconds of opening its page | The same prototype test | Move the misread block back to text ([visual first](../design/visual-first.md#the-ladder)) | Open |
| A17 | The image model can draw him at a stated scale and line width on its smallest canvas, so every image shares [one drawing standard](../design/chopper.md#drawn-for-its-size) | Feasibility | Medium (a consistent look across sizes) | None. The model's smallest canvas is about 0.66 megapixels, larger than any cameo, so figures must be drawn small on purpose | In the pilot, each final's measured line is within 20% of 1.5 px and its head height within 10% of its class, at k = 1.25, within 2 draft rounds | The same 4-render pilot | Raise k for every image together and ask for a proportionally thicker line; if still inconsistent, trim and reduce each class by a fixed per-class factor, with each class keeping one line width | Open |
| A18 | Stories and a new pick on every page view keep him a pleasant surprise rather than wallpaper or a distraction | Desirability | Low (P1, P2) | None | In the prototype test, people who notice him describe him as fun or calm, and none says he repeats; no one reloads to see him at the cost of their task | The prototype test, with a seeded story across 3 pages | Fewer threads, standalone scenes only, or fewer zones ([O35](../design/chopper.md#decisions-on-this-page)) | Open |

**Ranked:** A3 and A1 first. A3 decides whether the CLI can keep P3, and A1 decides
whether a website is worth building. Then A4 (kits), A10 (work devices), A8
(publishable content) and A2 (the page format).

## 10. Decisions

| # | Question | Options | Recommendation | Decided |
| --- | --- | --- | --- | --- |
| O1 | What to call multi-part systems such as Slate | Kit · harness · plugin · package · toolkit | **Kit**: plain, not taken by any vendor, and does not suggest an agent runtime ([reasoning](content-model.md#what-to-call-things)) | Working default: kit |
| O2 | What to call curated combinations | Stack · recipe · set · collection | **Stack**: says "layers that work together"; "collection" suggests an unordered list | Working default: stack |
| O3 | Which item types besides skills and kits | Add agents, instructions, prompts, hooks and MCP configurations now · add each when the first real one arrives | Add each when the first real one arrives | Working default: skills, kits, stacks |
| O4 | Job areas | Define now · derive from the first 10-15 items | Derive from real items with the [working rule](content-model.md#organization-facets-not-folders) | Working default: derive later |
| O5 | Where the site and CLI code live | In Loushing (`site/`, `cli/`) · separate repositories | In Loushing: they share the schema, and one change can update both | Working default: in Loushing |
| O6 | Site technology | A static-site generator with content collections and pre-rendering · a single-page app · a server framework | Static, pre-rendered pages from the index, with a client-side search index. Built in stage 1 as a dependency-free Node generator (see [as built](#11-as-built)) | Decided: as recommended |
| O7 | Hosting and domain | GitHub Pages · another static host · a custom domain | GitHub Pages from this repository first; a custom domain once the name is confirmed (O13) | Decided: GitHub Pages, deployed by a workflow; the domain waits for O13 |
| O8 | What to publish to npm | Only the `loushing` CLI · plus one package per kit | Only the CLI: kits are fetched from GitHub at pinned tags. The name `agent-orchestration` is already taken on npm. | Working default: CLI only |
| O9 | Private and work items | Out of scope · a separate private catalog read with the person's GitHub access · encryption | A separate private repository with the same layout, added as a source in the CLI in a later stage | Working default: later stage |
| O10 | Listing other authors' items | Never · as "Also consider" links · as full items | "Also consider" links only, with attribution | Working default: links only |
| O11 | Usage data | None · aggregate site analytics without cookies · CLI telemetry | None in the CLI; npm download counts and GitHub traffic are enough at first | Working default: none |
| O12 | Working with other tools (`npx skills`, plugin marketplaces) | Ignore · keep the layout compatible · publish plugin manifests for kits | Keep `skills/` compatible with the Agent Skills layout so `npx skills` works too; later, generate one `.claude-plugin/marketplace.json`, which both Claude Code and Copilot CLI read ([routes](distribution.md#routes)) | Working default: compatible layout |
| O13 | Product name | Keep "Loushing" · choose another before launch | Confirm before the first public release: check the npm name (free as of 22 October 2026), a domain and any conflicts | Open: needs your choice |
| O14 | Contributions from others | Issues only · pull requests for fixes · open submissions | Issues only at first; fixes by pull request later | Working default: issues only |
| O15 | Default install scope | This project · all my projects | This project: it is visible, reviewable and committed with the code | Working default: this project |

Later decisions live on the page they affect: O16-O17 on
[agent access](agent-access.md#decisions-on-this-page); O18-O21 on
[distribution](distribution.md#decisions-on-this-page); O22-O24 on the
[design system](../design/design-system.md#decisions-on-this-page); O30-O31 on
[visual first](../design/visual-first.md#decisions-on-this-page); and O25-O29 and O32-O35 on
[Chopper](../design/chopper.md#decisions-on-this-page).

## 11. As built

Stage 1, "A catalog you can read", is built in `site/`. This records where the build
made a choice the spec left open, or differs from it. Each is a working default you
can overturn.

**Run it.** From the repository root, with Node 24 and nothing to install:

| Task | Command |
| --- | --- |
| Preview, rebuilding and reloading on every change | `node site\scripts\dev.mjs`, then open http://127.0.0.1:4180 |
| Build once into `site/dist` | `node site\scripts\build.mjs` |
| Tests: libraries, catalog and publication checks, design system, build and links | `node --test "site/test/*.test.mjs"` |

**Technology ([O6](#10-decisions)).**

- A dependency-free Node generator: catalog data, design tokens and view specs in,
  folder-style static pages out (`items/<id>/index.html`, with `404.html` at the root).
  No framework, no package installs, no client framework; one small script adds
  search, filters, tabs, the theme switch and the Chopper toggle.
- The build writes into a staging folder and swaps it in only when everything
  succeeds. A catalog with any problem exits with the problems listed and writes
  nothing. `OUT_DIR` and `CATALOG_ROOT` let tests build elsewhere and from a fixture.
- Git history is read in one batch (`git cat-file --batch`); "What's new" and each
  item's "Updated" date come from Git, and the catalog version is the latest change
  date.

**Cards and pages.**

- A kit's card is a sidecar `external/<id>.card.md` kept in Loushing beside its
  pointer `external/<id>.yaml`, with `partNotes` describing its parts, until the kit's
  own repository carries one.
- The view schema gained the blocks these pages needed (item body sections, adds
  tree, kit anatomy, stack path, works with, source viewer, empty states with a page
  title). Views stay pure data.
- Get it shows tabs in the order Git, Ask your agent, Download, then Command, which
  says "coming soon" until the CLI exists. Downloads carry no SHA-256 yet.
- An agent a card doesn't list shows as "Not tried yet", never as unsupported.
- The trust panel (what an item adds and changes) lives inside the adds tree.
- Source files are shown without syntax highlighting.
- The catalog is a tile grid with a live search in the sidebar that filters as you
  type, without a submit button.

**Design system.**

- Fundamentals use container queries for their own narrow forms: a Metric stacks its
  icon above the value and a Tile tightens its padding below 12rem; Tabs hide their
  icons below 28rem so every tab fits.
- Home stats are a 2×2 grid on phones; the item page's Get it column is 26rem wide.
- The design-system suite (`site/test/design-system.test.mjs`) enforces tokens only,
  current generated tokens and contrast, tier imports, compounds that never render
  another compound, sealed fundamentals, documented components, views that are pure
  data, and a Chopper that never takes clicks.

- Every control is custom and drawn from tokens: rounded pill buttons, a custom
  Select (a listbox over the native select, which stays as the no-script fallback),
  custom facet checkboxes and a thin themed scrollbar. The palette is Harbour (see
  [design decisions](../design/design-system.md#decisions-on-this-page)).
- The highlight for a card is a folded corner (the dog-ear), not a side border.

**Copy check (P9).** `site/test/copy.test.mjs` builds a neutral fixture catalog, so
only the site's own words are checked, then fails if any page, attribute or agent
file uses a pitch, store or preaching word ("the best", "powerful", "marketplace",
"you should", "the owner" and others) or a word the copy rules ban. It also checks
that Home introduces the author and that every page's footer says it is a personal
collection. Item content is the item's own text and isn't checked.

**Publication check.** Built into the catalog check, strict and without an allowlist
([as built](repository-organization.md#build-and-checks)).

**Hosting ([O7](#10-decisions)).** `.github/workflows/pages.yml` runs on every push
to `main`: it checks styles and tokens, runs the tests, builds with
`BASE=/loushing/` and deploys `site/dist` to https://prabinpebam.github.io/loushing/.
The checkout takes full history and the submodules, because the catalog reads pinned
kit commits and dates from Git. The Slate docs host is not deployed.

**Chopper.** The masters ship as PNG because there is no WebP encoder in a
dependency-free build; the build trims each to its drawing and sizes it at one
reduction, k ≈ 1.67. 37 renders are drafts, shown on the site so you can review them
in place ([pilot](../design/chopper.md#the-pilot) and
[second batch](../design/chopper.md#the-second-batch)); once enough are approved,
drafts stop showing. Zones can take extra size classes from a breakpoint
(`extraSizes`): a 3:1 strip in section breaks and the footer from medium screens up,
and a tall scene in the gutter on very wide screens.

**Not built yet.** Real skills (stage 1 needs at least five from you), component
stories, automated Lighthouse and axe runs, a custom domain (O13), and the CLI.
