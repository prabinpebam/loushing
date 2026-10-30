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
> - **Against the promise:** stage 1 is built with 21 skills, three kits and one
>   stack and deploys to GitHub Pages. A local skill and kit CLI is implemented but
>   not published. Agent discovery, approved Chopper renders and the test with people
>   remain. See [§4](#4-against-the-promise) and the
>   [status of the original pending work](#5-status-of-the-original-pending-work).

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
| 1.1 | The site lists at least 5 of your real skills and every kit, each with a complete page that meets the [quality bar](item-pages.md#quality-bar-for-every-page) (U3) | Build check; review | |
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
| 2.1 | `npx loushing add <skill>` installs a skill for each supported agent at both scopes, and it is discovered in a new session (U6) | End-to-end test per agent on Windows and macOS | Local target-copy tests pass for five IDs and both scopes. Actual agent discovery, macOS and public npx delivery remain unproved |
| 2.2 | Installed files match the published hashes, and a mismatch writes nothing (U21) | A test with a tampered fixture | Implemented; CLI tamper regression verifies no destination or lockfile changes |
| 2.3 | A changed file is never overwritten without a choice; a cancelled run leaves nothing behind (U21) | Negative-case tests | Implemented; edits, unowned files, cancellation and transaction-failure rollback covered. Uncatchable process/machine failure recovery is not automatic |
| 2.4 | `remove` deletes exactly what was added (U12) | A test comparing the project before and after | Implemented; both-scope before/after comparisons, changed-file choices and unrecorded-file preservation covered |
| 2.5 | `install` restores a project's set from `loushing.lock.json` (U13) | A test on a fresh clone | Implemented; lock-only copy restores exact pins and destinations without current catalog metadata |
| 2.6 | Every command accepts `--json` and `--yes`, and the exit codes follow [agent access](agent-access.md#exit-codes) (U18) | CLI tests | Implemented for local skill commands; bin tests verify single-object JSON and exit codes 0/1/2 |
| 2.7 | The package is published from CI with provenance, has no dependencies, and runs on Node.js 22 and later | The npm provenance badge; CI matrix | Dependency-free package and validation matrix prepared. Publication, licensing choice and provenance remain blocked; matrix not yet run |
| 2.8 | `npx loushing --version` and a skill install work on a managed corporate device through its package proxy | A manual run, recorded | Unproved until the approved package is published and delivered through the managed proxy |

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
| 3.1 | Each of agentic-craft, agent-orchestration and Slate meets the [install contract](distribution.md#kits): non-interactive install, dry run, uninstall and JSON output | Contract tests in each kit's own repository | Local source contracts tested; canonical release blocked |
| 3.2 | `add <kit>` shows the kit's dry-run plan, runs the installer on confirmation and records it (U8) | End-to-end test per kit | All three real installers tested with explicit development opt-in; production pins stay manual |
| 3.3 | `add <stack>` sets up its members in order, skips those already installed, and resumes after a failure (U10) | End-to-end test with a forced failure | Ordered real-kit failure/resume and mixed skill/kit transaction tests |
| 3.4 | `remove <kit>` runs the kit's uninstall and leaves the project as before (U12) | A test comparing the project before and after | Exact tree comparisons per real kit and reverse stack removal; local edits block deletion |
| 3.5 | Kit and stack pages show the same plan as the CLI | Build check | Shared contract validation and manual-availability parity tested; released automation awaits genuine upstream pins |

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
| 4.1 | `catalog.json`, per-item JSON and Markdown, and `llms.txt` are published and match the pages (U17) | Build check; schema validation | Local build serves versioned catalog/item schemas and validates outputs; publication is not implied |
| 4.2 | `find --json` returns ranked candidates with install plans (U17) | CLI tests | Shared-ranking CLI tests and nullable-version stack discovery pass |
| 4.3 | The finder skill leads an agent to propose the right item in at least 7 of 10 scripted tasks, and it never installs without consent | A scripted trial in two agents | Finder instructions and 10/10 synthetic ranking/preview regression implemented; real two-agent trial remains blocked, not replaced |

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
| 5.1 | `outdated` and `update` work for skills and kits, keeping local edits (U11) | CLI tests | Local skill tests and a pinned disposable real-kit Git update preserve filled facts and reject changed files; real kit release remains blocked |
| 5.2 | Moving a skill to its own repository keeps its ID, links and installs working (U15, U19) | A rehearsal on a test skill | Disposable external-Git move retains ID, URL, old-link lookup, original-pin restoration and new-pin update/restore |
| 5.3 | Old IDs and URLs redirect, and removed items show a reason and alternatives (U19) | Build check of aliases; a test of the Gone page | Shared lifecycle validation and base-path HTML/JSON/Markdown redirect/Gone fixtures |
| 5.4 | You can install items from a private catalog, and none of them appears in the public build (U16, U22) | A test with a private fixture source | Explicit local-source fixture passes; one catalog per scope/lock; network auth and O9 policy remain open |
| 5.5 | What's new and its feed list each item's history from Git, and each catalog release's item changes once there are any | Build check | Git item history and release entries merge newest first in the timeline, item changes and feed; no real release fabricated or published |

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

**Engineering note, 29 October 2026.** The catalog-quality increment, committed
but not yet merged to `main` or deployed, adds pinned, hashed downloads for all 21
skills and two kits; the Slate ZIP
is withheld by the publication scan of its pinned lockfile. It also adds a generated
component library, a build-time index budget, a repeatable search benchmark and
axe/Lighthouse runners and an authored, not yet hosted-verified, CI workflow.
See the [as-built increment](product-spec.md#catalog-quality-engineering-increment)
for the exact boundaries. These checks do **not** close 1.4's manual run per agent,
1.8's full accessibility/performance promise, 1.10's every-state evidence, participant
tests or Chopper approval. The stage summary below is not new release
evidence.

The same-machine, five-run-per-profile comparison now meets the unchanged mobile
LCP lab target (p75 1,521.48 → 818.08 ms). Mobile TBT remains high at 2,512.49 ms;
the change is not a material TBT improvement. The [as-built comparison](product-spec.md#catalog-quality-engineering-increment)
records the profiles and remaining boundary. Hosted CI and real-device/field
performance still need evidence.

Stage 1 is built in `site/` and deploys to GitHub Pages on every push to `main`.
The development catalog contains **25 items: 21 skills, three kits and one stack**.
Nineteen skills are independent adaptations of kit workflows; UI lighting and the
optional Loushing finder are also listed. With the finder's folder, `skills/loushing`,
committed, the root production build makes 169 pages and the site suite passes
135/135. Pages, pinned source viewing, manual setup, search, agent-readable outputs
and a release-derived feed are built (empty until real releases are registered).
The earlier account of no skills and four hidden
Chopper drafts was stale: the current site intentionally shows draft renders for
review, as recorded in the [as-built section](product-spec.md#11-as-built).

The local CLI now supplies skill install, safe conflict handling, exact removal
and restore, JSON, find/info, and skill update/outdated. This is engineering
evidence, not proof of npm delivery or agent discovery. The remaining original
work is:

1. **Stage 1 engineering and evidence:** real-task search and timed authoring
   evidence, a hosted run of the site-quality workflow, actual-device and field
   performance, and the remaining mobile TBT. The component library, automated
   accessibility/performance runners and hash-bearing item downloads exist only
   as the local engineering increment noted above.
2. **Your decisions:** Chopper's drawing standard after the pilot (O33) and approval
   of each render (1.12); the typeface and tribute line (O23, O26) before the
   prototype test; the names (O1, O2, O13).
3. **The test with people** (A1, A2, A14, A16, A18 and the P9 question), and the
   **A3 spike** confirming each actual agent's project/personal discovery folders.
4. **Stage 2 release:** npm approval, package licensing, trusted publisher/account
   setup, executed Node/OS checks and managed-proxy delivery evidence.
5. **Stage 3 release:** local canonical contracts and CLI flows are implemented and
   tested. Authorized upstream commits/releases, parent/external pin updates and
   exact contract manifests are still required; public routes remain manual.
6. **Stage 4:** real two-agent consent trials. Finder instructions, versioned schema
   files/validation and synthetic ranking/preview regression now exist locally.
7. **Stage 5:** actual authorized releases and channel promotion, plus private
   network identity/auth policy (O9). Local immutable release preparation,
   lifecycle pages, moved-skill rehearsal and explicit private-source isolation
   fixtures do not establish publication or choose an account architecture.

## 5. Status of the original pending work

Reconciled on 29 October 2026 against the working tree, then committed. Every row has
one state:

- **Built, checked locally:** implemented, and the named local check passes. Not a
  release, and not proof in a real agent or with people.
- **Built, waiting on you:** implemented; closing it needs your commit, publication,
  license, decision or review, named in the row.
- **Blocked on outside evidence:** needs evidence no local check can supply: real
  agents, hosted CI, people, devices, screen readers, field metrics, Chopper
  approvals or the Slate lockfile review.

Nothing here is published: there is no npm package, release, real-agent discovery,
hosted CI run or participant result. Local checks ran on Windows with Node 26.

| Row | State | Evidence, or what closes it |
| --- | --- | --- |
| PD1, 1.2 | Blocked on outside evidence | Search, filters and the search benchmark are built (`site/test/`, `site/scripts/benchmark.mjs`). Needs 20 real task phrases written by someone else |
| PD2, 1.11 | Blocked on outside evidence | Item pages and visual blocks are built. Needs the test with 5 people (A2, A16) |
| PD3, 1.9, 2.1 | Blocked on outside evidence | Target-folder copies are tested for five agent IDs at both scopes (`cli/test/cli.test.mjs`). Needs discovery in each real agent on Windows and macOS, and a timed session with 3 people |
| PD4 | Blocked on outside evidence | CLI negative cases, hash checks and the publication check pass locally (`cli/test/`, `site/test/`). The CI hash check is authored in `.github/workflows/cli.yml` but has not run on a hosted runner |
| PD5, 3.5 | Built, waiting on you | Works well with is build-checked; the stack installs and resumes through the development path (`cli/test/kits.test.mjs`). The kit changes are committed on each kit's `feat/install-contract` branch. Needs them merged and released, then genuine pins |
| PD6, 4.3 | Blocked on outside evidence | The finder skill and a 10/10 synthetic ranking and preview check exist (`cli/test/agent-access.test.mjs`). Needs scripted trials in two real agents |
| PD7, 5.1 | Built, checked locally | `outdated`, `update` and `remove` for skills and development kits keep local edits (`cli/test/`). Kit updates from real releases wait on those releases |
| PD8, 1.6 | Built, waiting on you | Folder plus `about.md` loading names every problem with its fix (`site/test/`). Needs your timed additions: 2 for stage 1, 5 for the project |
| PD9 | Built, waiting on you | Needs your own report on using the catalog for a new project or machine |
| PD10, 1.8 | Blocked on outside evidence | Local axe and Lighthouse runners, an index budget and an authored site-quality workflow exist. In the quality worker's lab batches, mobile LCP p75 is 818 ms against the 1,500 ms target; mobile TBT p75 is 2,512 ms and stays high, so no interaction-performance claim. Needs hosted CI, real devices, screen readers, field metrics and, after a release, the weekly install smoke test |
| PD11 | Built, waiting on you | The as-built section and this table are updated; needs your review at each stage |
| PD12, 1.10 | Built, waiting on you | The design-system suite, token check and style lint pass; a generated library is at `/library/`. Needs your review of the library in every context; every interactive state is not yet approved |
| PD13, 1.12 | Blocked on outside evidence | Cameo rules, the random picker and Hide Chopper are built and tested. Needs your approval of each render and the drawing standard (O33), and the A14 and A18 comparisons with people |
| PD14, 1.13 | Blocked on outside evidence | The copy check passes (`site/test/copy.test.mjs`). Needs your voice review and the P9 question in the test with people |
| 1.1 | Built, checked locally | 25 items with complete pages; the site suite and a clean-clone build pass |
| 1.3, 1.5 | Built, waiting on you | Pinned source views, effects and kit anatomy are built and tested. Needs your review of 3 item pages and the three kit pages |
| 1.4 | Blocked on outside evidence | Git, Ask your agent and SHA-256 ZIP downloads are built for every skill and two kits (`site/test/archives.test.mjs`). The Slate ZIP stays withheld until its pinned lockfile passes review. Needs one manual run per real agent |
| 1.7 | Built, checked locally | A planted-secret fixture is never built (`site/test/`) |
| Finder in the root build | Built, checked locally | `skills/loushing` is committed; the root production build (169 pages, 21 skill downloads) and the site suite (135/135) pass |
| 2.2 to 2.6 | Built, checked locally | Tamper, conflict, cancellation, rollback, exact remove, lockfile restore, JSON and exit codes (`cli/test/`). Recovery from a killed process or power loss is manual |
| 2.7 | Built, waiting on you | The allowlisted, dependency-free package packs and installs offline in a disposable project. Needs your package name and license, npm publication with trusted publishing and provenance, and a hosted run of the Node and OS matrix |
| 2.8 | Blocked on outside evidence | Needs the published package fetched through the managed proxy |
| 3.1 | Built, waiting on you | Each kit's contract tests pass locally (`test/install-contract.test.mjs` in agentic-craft and agent-orchestration; `scripts/test-install-contract.mjs` in Slate). Committed and pushed on each kit's `feat/install-contract` branch, which the parent repository pins. Needs merging and releases in each kit repository, then the parent and catalog pins moved to the released commits |
| 3.2 to 3.4 | Built, checked locally | Real installers through the explicit development path: plan, consent, lock, ordered stack, failure and resume, exact removal (`cli/test/kits.test.mjs`). Public routes stay manual until released pins exist |
| 4.1, 4.2 | Built, checked locally | Versioned schemas validate every output; `find --json` and `info` share the site's ranking (`site/test/`, `cli/test/agent-access.test.mjs`) |
| 5.2, 5.3 | Built, checked locally | A disposable move to an external repository keeps ID, links and restores; aliases, redirects and Gone pages are build-checked |
| 5.4 | Built, waiting on you | A local private-source fixture never reaches the public build. Needs your decision on private catalogs (O9) |
| 5.5 | Built, waiting on you | What's new and the feed list Git item history; immutable release tooling and merged release entries are tested; the registry is empty. Needs your first authorized catalog release |
| A13 | Blocked on outside evidence | Needs a record of real weekly upkeep against 30 minutes |
| O1, O2, O13, O23, O26 | Built, waiting on you | Working defaults are in place; the names, domain, typeface and tribute line are your decisions |
