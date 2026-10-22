# Loushing: Definitions of Done

This page says what success means for the [product spec](product-spec.md). The
project's Definition of Done is made from its promises. Each stage a person can try
has its own, made from the user-can statements it delivers. Every row names the
evidence that would prove it, and its result is recorded beside it once known.

> **TL;DR.**
> - **Success is:** the site reads as your own collection, not a pitch. Anyone who
>   wants one of your items finds it by task, decides within a minute and has it
>   working in their agent within three. You add a skill in under 15 minutes. Nothing
>   is ever installed, run or published without being shown first.
> - **Stages:**
>   1. A catalog you can read: a static site with real items and manual setup.
>   2. One command for skills.
>   3. Kits and stacks.
>   4. Agents as users.
>   5. Stays current and grows.
> - **Order:** stage 1 shows the experience soonest and tests whether a catalog is
>   wanted ([A1](product-spec.md#9-assumptions-and-risks)). A spike on reaching every
>   agent ([A3](product-spec.md#9-assumptions-and-risks)) runs beside it, because the
>   CLI design depends on it.
> - **Against the promise:** stage 1 is built and deploys to GitHub Pages; it waits
>   on your real skills, approved Chopper renders and the test with people. See
>   [§4](#4-against-the-promise).

## 1. Project Definition of Done

| # | Promise | Done when | Evidence | Result |
| --- | --- | --- | --- | --- |
| PD1 | P1 Found by the task | For 20 real task phrases, written by someone other than the author, the right item is in the top five results for at least 16 | A scripted search run against the published index, kept as a regression test | |
| PD2 | P2 Understood before it is installed | 4 of 5 first-time people, after 60 seconds on an item page, correctly say what it does, when to use it and what it changes | A moderated test with 5 people on 3 items | |
| PD3 | P3 One step to working | For every supported agent and both scopes, one command makes a skill available in a new session. A first-time person goes from the page to a working skill in 3 minutes or less | An end-to-end check per agent on Windows and macOS; a timed session with 3 people | |
| PD4 | P4 No surprises | No install, update or removal runs code or overwrites a changed file without confirmation. Every installed file matches its published hash. The public catalog contains no item that failed the publication check | Negative-case tests in the CLI; a hash check in CI; the publication check on every build | |
| PD5 | P5 Better together | Every stable item has at least one Works well with reason or states that it stands alone. Each stack installs from a clean project in one confirmed command and passes its own Try it | Build check; one end-to-end run per stack | |
| PD6 | P6 Agents are first-class users | An agent with only the finder skill finds and, with consent, installs the right item in at least 7 of 10 scripted tasks. The JSON index and the website show the same data | A scripted agent trial; a build check comparing the index and the pages | |
| PD7 | P7 Stays current, safely | `outdated`, `update` and `remove` work for skills and kits. A renamed or moved item keeps its installs and links working | CLI tests; a rename and move rehearsal on a test item | |
| PD8 | P8 Adding takes minutes | You add a new skill, from folder to live, in 15 minutes or less of your time, writing its description once | Timed for 5 real additions | |
| PD9 | The outcome is valuable | You use the catalog to set up your own items on a new project or machine instead of copying folders. People who want an item set it up from its page without needing to ask you | Your own report; GitHub issues and messages | |
| PD10 | Nothing live breaks | Every merge passes the checks before deploy. The site meets the [performance targets](product-spec.md#7-performance-and-waits). No published install command fails for a stable item | CI checks; a weekly install smoke test of every stable item; a Lighthouse run in CI | |
| PD11 | Docs | The spec's As built section records what was built, and the Get started and For agents pages match the CLI | Review at each stage | |
| PD12 | The design system holds | Every screen is a valid view spec of registered blocks; components use tokens only; every contrast pair passes in light, dark and more-contrast; every component shows every state in the library | The [enforcement checks](../design/design-system.md#enforcement) on every pull request | |
| PD13 | Chopper is a quiet delight | Cameos follow every [rule of presence](../design/chopper.md#rules-of-presence); every shown scene passed QA against the character sheet; no test participant finds him distracting; "Hide Chopper" works | The [Chopper checks](../design/chopper.md#checks); the A14 comparison in the prototype test | |
| PD14 | P9 Personal, not a pitch | Every page reads as your own collection, in your voice: no store or marketplace language, no superlatives, no claims that an item is better than others, no telling the reader to use it, and no popularity numbers. The site says plainly that these are the things you use and, for anyone who wants one, how to get it. In the test with people, at least 4 of 5 describe the site as one person's own collection, not a store or a directory | The copy check over every built page (banned pitch words); a review of Home, Catalog, Get started, For agents and 3 item pages against the [voice table](product-spec.md#8-copy); the question in the test with people | |

## 2. Stages

### Stage 1: A catalog you can read

A person can find your real skills and kits by task, understand each one in plain
language, and set it up by hand with clear steps.

- **Delivers:** U1, U2, U3, U4, U5, U7, U8 (reading), U9, U19 (stable links), U20, and
  U14 for skills and kit pointers (without the CLI).
- **Settles:**
  - A1 (a curated catalog is wanted) and A2 (a page lets a person decide in a minute),
    through a test with 5 people.
  - A5 (agent-drafted cards), A7 (keyword search), A8 (publishable content) and A9
    (sizes), using the first real items.
  - A14 (Chopper without distraction), A16 (visual-first pages) and A18 (his stories
    stay fresh) in the same test with people, and A15 (Chopper stays on model) and A17
    (one drawing standard across sizes) through the 4-render pilot, which also sets k.
  - Beside it, **a spike** settles A3 (reaching every agent) by placing one skill in
    each agent's folder, with no product code needed.
- **Try it:** open the site, type "write documentation for my project", and open the
  Slate kit. Within a minute you should be able to say what it does and what it adds.
  Then follow the Git steps and see the kit working in your agent.
- **Mode:** show me the UX sooner. Real content, simple code, no CLI.

| # | Done when | Evidence | Result |
| --- | --- | --- | --- |
| 1.1 | The site lists at least 5 of your real skills and all three kits, each with a complete page that meets the [quality bar](item-pages.md#quality-bar-for-every-page) (U3) | Build check; review | |
| 1.2 | A person finds the right item for a task by searching in their own words (U1, U2) | 10 task phrases against the index | |
| 1.3 | A person sees what an item adds and its effects, and reads its source at the pinned version, without leaving the page (U4, U5) | Review of 3 pages | |
| 1.4 | A person gets an item by Git or Download, follows the steps for their agent, and it works (U7) | One manual run per agent from the spike | |
| 1.5 | A kit page explains its parts and how it fits with the other kits (U8, U9) | Review of the three kit pages | |
| 1.6 | You add a skill by adding a folder and an `about.md`, and the check names every problem with its fix (U14) | Timed addition of 2 skills | |
| 1.7 | An item that fails the publication check is never built into the site or index (U22) | A test fixture with a planted secret | |
| 1.8 | Every page meets WCAG 2.2 AA in light and dark themes, works with the keyboard and on a phone, and meets the performance targets | Automated accessibility check; one capture per state and theme; Lighthouse | |
| 1.9 | The spike shows, for each target agent, the folders where it discovers a skill, at project and personal scope | A table of results kept in the [distribution](distribution.md#install-targets) page | |
| 1.10 | Every view is built from a view spec with the design system's components and tokens, and the [enforcement checks](../design/design-system.md#enforcement) pass | CI checks; the component library reviewed in every context | |
| 1.11 | Each view follows its [visual-first plan](../design/visual-first.md#per-view): a person can read an item's agents, effects and files from its page at a glance, and every visual has a text equivalent | Review of 3 item pages and Home; the A16 measure in the test with people | |
| 1.12 | Every zone the site shows has at least 4 approved Chopper moments at its size, each render measured to the [drawing standard](../design/chopper.md#drawn-for-its-size); cameos follow every [rule of presence](../design/chopper.md#rules-of-presence), a reload shows a fresh pick, and "Hide Chopper" hides them | The [Chopper checks](../design/chopper.md#checks); the A14 and A18 comparisons | |
| 1.13 | Every page reads as your personal collection, in your voice, and says how to get an item for anyone who wants one, with no pitch (P9) | The copy check in the site tests; a review against the [voice table](product-spec.md#8-copy) | |

**Depends on:** which skills to publish first (your decision). The site technology and
hosting (O6, O7) and the palette (O22) are decided. Your review of the typeface (O23)
and the Chopper drawing standard (O33) are needed before the prototype test.

### Stage 2: One command for skills

A person gets any skill into their agent with `npx loushing add`, and can remove it
and restore a set.

- **Delivers:** U6, U12, U13, U21, and U18 for skills.
- **Settles:** A3 in the product (the CLI reaches every agent) and A10 (npm and GitHub
  work on a managed device).
- **Try it:** in an empty project, copy the command from a skill page and run it. The
  CLI shows what it will add, adds it, and tells you to start a new chat. The skill
  then works. Run `npx loushing remove <id>` and the project is clean again.
- **Mode:** prove the risky assumption first (publish a 0.0.x CLI that installs one
  skill), then make it production-ready.

| # | Done when | Evidence | Result |
| --- | --- | --- | --- |
| 2.1 | `npx loushing add <skill>` installs a skill for each supported agent at both scopes, and it is discovered in a new session (U6) | End-to-end test per agent on Windows and macOS | |
| 2.2 | Installed files match the published hashes, and a mismatch writes nothing (U21) | A test with a tampered fixture | |
| 2.3 | A changed file is never overwritten without a choice; a cancelled run leaves nothing behind (U21) | Negative-case tests | |
| 2.4 | `remove` deletes exactly what was added (U12) | A test comparing the project before and after | |
| 2.5 | `install` restores a project's set from `loushing.lock.json` (U13) | A test on a fresh clone | |
| 2.6 | Every command accepts `--json` and `--yes`, and the exit codes follow [agent access](agent-access.md#exit-codes) (U18) | CLI tests | |
| 2.7 | The package is published from CI with provenance, has no dependencies, and runs on Node.js 22 and later | The npm provenance badge; CI matrix | |
| 2.8 | `npx loushing --version` and a skill install work on a managed corporate device through its package proxy | A manual run, recorded | |

**Depends on:** your approval to publish `loushing` to npm and set up trusted
publishing, and access to each agent for testing.

### Stage 3: Kits and stacks

A person sets up a kit, or a whole stack, with one confirmed command.

- **Delivers:** U8 (setting up), U10, and U6, U11 and U12 for kits.
- **Settles:** A4 (kit installers can be driven by one contract).
- **Try it:** in an empty project, run `npx loushing add <stack>` for the "Plan, build and
  document a product" stack. The CLI shows Slate, agentic-craft and agent-orchestration in
  order, with what each changes. After one confirmation all three are set up, and the
  stack's Try it works.
- **Mode:** make this production-ready, after stage 2's CLI is proven.

| # | Done when | Evidence | Result |
| --- | --- | --- | --- |
| 3.1 | Each of the three kits meets the [install contract](distribution.md#kits): non-interactive install, dry run, uninstall and JSON output | Contract tests in each kit's own repository | |
| 3.2 | `add <kit>` shows the kit's dry-run plan, runs the installer on confirmation and records it (U8) | End-to-end test per kit | |
| 3.3 | `add <stack>` sets up its members in order, skips those already installed, and resumes after a failure (U10) | End-to-end test with a forced failure | |
| 3.4 | `remove <kit>` runs the kit's uninstall and leaves the project as before (U12) | A test comparing the project before and after | |
| 3.5 | Kit and stack pages show the same plan as the CLI | Build check | |

**Depends on:** changes in the kit repositories: Slate needs an installer that follows
the contract, and all three need uninstall and JSON output. Each change is made in its
own repository.

### Stage 4: Agents as users

An agent finds and installs the right item mid-task, with the person's consent.

- **Delivers:** U17, U18 (completed), and the finder skill.
- **Settles:** A6 (agents use the catalog when it is relevant).
- **Try it:** with the finder skill installed, ask your agent to "set up documentation
  for this project". It should propose the Slate kit, explain what it will change, and
  install it once you agree.
- **Mode:** prove the risky assumption.

| # | Done when | Evidence | Result |
| --- | --- | --- | --- |
| 4.1 | `catalog.json`, per-item JSON and Markdown, and `llms.txt` are published and match the pages (U17) | Build check; schema validation | |
| 4.2 | `find --json` returns ranked candidates with install plans (U17) | CLI tests | |
| 4.3 | The finder skill leads an agent to propose the right item in at least 7 of 10 scripted tasks, and it never installs without consent | A scripted trial in two agents | |

**Depends on:** nothing outside the product.

### Stage 5: Stays current and grows

People keep items current, and the catalog grows without breaking anything.

- **Delivers:** U11, U15, U16, U19 (redirects and the Gone page), the What's new view
  and feed.
- **Settles:** A13 (upkeep stays within 30 minutes a week).
- **Try it:** after a new catalog release, run `npx loushing outdated`, then `update`.
  Your edited file is kept, and the item's What's new entry explains the change. Open
  an old link to a moved skill, and it takes you to the right page.
- **Mode:** make this production-ready.

| # | Done when | Evidence | Result |
| --- | --- | --- | --- |
| 5.1 | `outdated` and `update` work for skills and kits, keeping local edits (U11) | CLI tests | |
| 5.2 | Moving a skill to its own repository keeps its ID, links and installs working (U15, U19) | A rehearsal on a test skill | |
| 5.3 | Old IDs and URLs redirect, and removed items show a reason and alternatives (U19) | Build check of aliases; a test of the Gone page | |
| 5.4 | You can install items from a private catalog, and none of them appears in the public build (U16, U22) | A test with a private fixture source | |
| 5.5 | What's new and its feed list each catalog release with item changes | Build check | |

**Depends on:** your decision on how private catalogs work (O9).

## 3. Order by value and risk

- **Stage 1 first.** It shows the experience with real content soonest, is cheap to
  change, and its test with people decides whether the site is worth building (A1,
  A2). The A3 spike runs beside it because it needs no product code and its result
  shapes stage 2.
- **Stage 2 next.** One command is the core of the promise (P3) and the most
  uncertain technically (A3, A10).
- **Stage 3 depends on stage 2** and on changes in the kit repositories. Those can
  start during stage 2.
- **Stage 4 depends on stage 2's JSON output.** It can run alongside stage 3.
- **Stage 5 is last.** Updates and moves matter once people have installed items and
  the catalog has grown.

## 4. Against the promise

Stage 1 is built in `site/` and deploys to GitHub Pages on every push to `main`. A
person can open the site, search the three kits and their parts by task, read a
plain page for each with what it adds and its effects, read the source at the pinned
version, and follow the Git or Ask-your-agent steps for their agent. Every control is
custom and drawn from tokens in the Harbour palette, and the site speaks as your own
collection (P9), held by the copy check. 34 tests, the token checks and the style lint
pass. Four Chopper pilot renders exist as drafts; none is approved, so no cameo shows
yet. No individual skills are published, and nothing installs in one step. In the
order they block the promise:

1. **Your skills:** stage 1 needs at least 5 of your real skills (1.1).
2. **Your decisions:** Chopper's drawing standard after the pilot (O33) and approval
   of each render (1.12); the typeface and tribute line (O23, O26) before the
   prototype test; the names (O1, O2, O13).
3. **The test with people** (A1, A2, A14, A16, A18 and the P9 question) and the
   automated accessibility and Lighthouse runs (1.8).
4. **The A3 spike:** where each agent discovers skills. This blocks the CLI design.
5. **npm publishing approval** and access to a managed device. These block stage 2's
   evidence.
6. **Kit installer changes** in three repositories. These block stage 3.
