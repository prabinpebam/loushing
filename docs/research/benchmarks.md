# Benchmarks: skill catalogs and their promises

What similar catalogs promise, which jobs they do for people, agents and authors, how
they keep their promises, and what Loushing should take from them. This page is for you
to review: the promise and job tables come first, then each benchmark in more depth.

> **TL;DR.**
> - **Twenty-one catalogs studied:** the AI-agent skill and plugin directories (Anthropic,
>   Vercel's skills.sh, GitHub's awesome-copilot, OpenAI, Cursor), the MCP server
>   registries, and mature non-AI catalogs (shadcn/ui, Raycast, VS Code Marketplace,
>   Obsidian, Homebrew, Hugging Face, npm).
> - **"Skill" is settled; the word for a bundle is not.** Every AI catalog builds on the
>   open Agent Skills format. Bundles are called plugins, packs or collections, and no
>   one uses "kit".
> - **Most promise "discover and install".** Few promise understanding before install,
>   and none explains a multi-part system, its parts and setup in plain language. That
>   gap is Loushing's opening ([P2](../spec/product-spec.md#1-the-customer-promise)).
> - **Trust is the open problem.** The best catalogs pin and check files and describe
>   their scans honestly. Most offer reputation only.
> - **Agents need a machine-readable feed.** `llms.txt`, a JSON index and CLIs with
>   JSON output are the working patterns.
> - **Review:** the [promise table](#promises-to-review) and the
>   [job coverage](#jobs-to-review). Mark what to keep, adapt or reject.

## How this was researched

On 22 October 2026, primary sources were fetched for each catalog: official
documentation, repository READMEs, manifests, live API calls, and archived snapshots
where a site blocked automated reading. Promises are quoted from those sources and
linked. Anything that could not be confirmed is listed under
[not verified](#not-verified). The job ratings are a reading of the research, not
measurements.

## Promises to review

Each benchmark's own promise, in its words. **For Loushing** is a recommendation for
you to confirm: *keep* (adopt the same promise), *adapt* (adopt part of it, changed),
or *no* (not ours).

| Benchmark | Promise, in its own words | What it means | For Loushing |
| --- | --- | --- | --- |
| [Agent Skills standard](https://agentskills.io) | "A standardized way to give AI agents new capabilities and expertise." | One open format every agent can read | **Keep**: every Loushing skill follows it, so it works anywhere |
| [anthropics/skills](https://github.com/anthropics/skills) | "Skills are folders of instructions, scripts, and resources that Claude loads dynamically to improve performance on specialized tasks." | Reference examples for learning, explicitly "for demonstration and educational purposes" | **Adapt**: Loushing items are maintained and used daily, not examples |
| [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) | "…anyone with access registers it in Claude Code with one command and installs your plugins from it." | Any Git repository can be a store | **Keep** as a route ([distribution](../spec/distribution.md#routes)) |
| [Claude.ai skills directory](https://support.claude.com/en/articles/14328846) | "…brings skills, connectors, and plugins together in one place so you can find and install everything that customizes Claude without switching between separate menus." | One place for every kind of customization | **Adapt**: one place for every kind of item, across agents rather than inside one |
| [skills.sh](https://skills.sh) | "Discover and install skills for AI agents." | A leaderboard plus a universal installer | **Adapt**: discover by task, not popularity; install with the plan shown first |
| [awesome-copilot](https://github.com/github/awesome-copilot) | "The community library for GitHub Copilot. Discover reusable agents, skills, instructions, hooks, and tools built by developers to help you ship faster with Copilot." | A large, reviewed community library, with a website and an agent feed | **Adapt**: curated by one author, not a community library |
| [OpenAI skills and plugins](https://developers.openai.com/codex/skills) | "Use agent skills to extend ChatGPT and Codex with task-specific capabilities." | Skills for authoring; plugins for distributing | **Keep** the split: an item is the thing; a plugin is one way to deliver it |
| [cursor.directory](https://cursor.directory) | "The home for Cursor enthusiasts where you can explore and generate rules, browse MCPs…" | A community hub organized by technology | **No**: community and social features are non-goals |
| [Cursor Marketplace](https://cursor.com/marketplace) | "Every plugin in the Cursor Marketplace is manually reviewed before it's listed." | A small, reviewed store | **Keep** the review promise: every item is reviewed by its author before it is published |
| [MCP Registry](https://github.com/modelcontextprotocol/registry) | "…provides MCP clients with a list of MCP servers, like an app store for MCP servers." | A machine-first index that holds metadata only | **Keep** the shape: the index holds metadata, and the files stay in Git |
| [Glama](https://glama.ai) | "Every MCP server, in one registry… every server scanned, scored, and testable in your browser." | Completeness plus scores | **No** to completeness; **adapt** visible quality signals as a quality bar |
| [Smithery](https://smithery.ai) | "Connect agents to thousands of tools and services. Auth, credentials, and sessions handled for you." | A hosted connection service | **No**: Loushing hosts nothing |
| [shadcn/ui registry](https://ui.shadcn.com) | "This is not a component library. It is how you build your component library." | Code you own and change, delivered by a command | **Keep**: installed items are plain files the person owns and may edit |
| [Raycast Store](https://www.raycast.com/store) | "Connect your tools, and take your daily workflow to the next level." | One-click extensions, all reviewed | **Adapt** the rule "bring something that doesn't exist yet" to stop duplicates |
| [VS Code Marketplace](https://marketplace.visualstudio.com/vscode) | (No single promise; the store for VS Code extensions) | Breadth, plus verified publishers, scanning and signing | **Adapt**: show trust facts, not badges Loushing cannot back |
| [Obsidian plugins](https://github.com/obsidianmd/obsidian-releases) | (No single promise; the official community plugin list) | A small pointer list; files live in each author's releases | **Keep** the pointer pattern for kits |
| [Homebrew](https://brew.sh) | (Tagline: a package manager) | Checksummed, pinned installs; per-item trust | **Keep**: hashes and pinning on every install |
| [Hugging Face Hub](https://huggingface.co/models) | (No single promise; a hub of models with cards) | A Markdown card with YAML metadata for every item | **Keep**: the item card is the same idea |
| [npm](https://docs.npmjs.com/searching-for-and-choosing-packages-to-download) | "No subjective ranking criteria are applied…" | Named sort orders, honest provenance | **Keep**: no hidden ranking; describe trust honestly |

## Jobs to review

Which of Loushing's [jobs](../spec/product-spec.md#2-scenarios-and-jobs-to-be-done)
each benchmark does well (●), partly (◐) or not at all (○). Read across a row to see
who does a job well; read down a column to see a benchmark's focus.

**AI skill, plugin and server catalogs:**

| Job | skills.sh | awesome-copilot | Claude marketplaces | Claude.ai directory | Cursor Marketplace | MCP Registry | Glama |
| --- | --- | --- | --- | --- | --- | --- | --- |
| J1 Find by describing the task | ◐ | ● | ○ | ◐ | ◐ | ◐ | ● |
| J2 Understand before installing | ◐ | ◐ | ○ | ◐ | ◐ | ○ | ◐ |
| J3 One step into my agent | ● | ● | ● | ● | ● | ◐ | ◐ |
| J4 Judge whether it is safe | ◐ | ◐ | ○ | ● | ● | ◐ | ● |
| J5 Understand a multi-part system | ○ | ◐ | ◐ | ○ | ◐ | ○ | ○ |
| J6 Find what works together | ◐ | ● | ● | ◐ | ● | ○ | ○ |
| J8 Update safely | ● | ◐ | ◐ | ● | ● | ◐ | ○ |
| J11, J12 Agents find and install | ◐ | ● | ◐ | ○ | ○ | ● | ◐ |
| J13 Author publishes quickly | ● | ◐ | ● | ◐ | ○ | ● | ◐ |

**Mature catalogs outside AI:**

| Job | shadcn | VS Code Marketplace | Obsidian | Homebrew | Hugging Face |
| --- | --- | --- | --- | --- | --- |
| J1 Find by describing the task | ◐ | ● | ◐ | ◐ | ● |
| J2 Understand before installing | ● | ● | ◐ | ◐ | ● |
| J3 One step into my agent | ● | ● | ● | ● | ◐ |
| J4 Judge whether it is safe | ○ | ● | ◐ | ● | ◐ |
| J5 Understand a multi-part system | ○ | ◐ | ○ | ○ | ○ |
| J6 Find what works together | ● | ● | ○ | ● | ○ |
| J8 Update safely | ◐ | ● | ● | ● | ◐ |
| J11, J12 Agents find and install | ● | ◐ | ◐ | ● | ● |
| J13 Author publishes quickly | ● | ◐ | ◐ | ◐ | ● |

**What the matrix shows:**

- **Install (J3) is solved almost everywhere.** It is the entry fee, not a
  differentiator.
- **Understanding before installing (J2)** is done well only by catalogs whose items
  have rich pages: shadcn's previews, VS Code's README pages and Hugging Face's model
  cards. The AI skill directories mostly show the raw `SKILL.md`.
- **Understanding a multi-part system (J5) is done by no one.** Plugins list their
  contents but do not explain the method, the setup or how the parts hand off.
- **Safety (J4)** is strong only where someone pays for review or scanning, or where
  installs are checksummed. Loushing can do the checksums and an honest author review.
- **Agents (J11, J12)** are served by an index feed (awesome-copilot's `llms.txt`, the
  MCP Registry's API, Homebrew's JSON API) or a CLI with machine output (shadcn).

## The benchmarks

### Agent skill and plugin catalogs

**Agent Skills standard** ([specification](https://agentskills.io/specification)).

- **What it is:** an open format, first developed by Anthropic, now governed in its
  own organization and adopted by Claude, Copilot, Codex, Cursor and others.
- **How it works:** a skill is a folder with `SKILL.md`, whose frontmatter has a `name`
  (lowercase, hyphenated, matching the folder) and a `description` (what it does and
  when to use it, up to 1,024 characters). Optional fields are `license`,
  `compatibility`, `metadata` and an experimental `allowed-tools`. Optional folders are
  `scripts/`, `references/` and `assets/`.
- **Progressive disclosure:** agents load only the name and description at start, the
  body when the skill is activated, and other files when needed.
- **Gaps:** it defines no taxonomy, no versioning and almost no trust model.

**anthropics/skills and Claude Code marketplaces.**

- **anthropics/skills** holds 19 example skills, bundled into installable plugins by
  `.claude-plugin/marketplace.json`. Licenses differ per skill.
- **A Claude Code marketplace** is any repository with that file. Each plugin has a
  `plugin.json` that can carry skills, agents, commands, hooks and MCP servers.
- **Distribution has three levels:** send a folder; host your own marketplace, which
  does not auto-update; or list in Anthropic's reviewed directory, which needs a paid
  plan.
- **Strengths:** one manifest file turns any repository into a store.
- **Gaps:** no central list of marketplaces, and trust rests on the repository's
  reputation.

**Claude.ai skills directory.**

- **Organization:** skills, connectors and plugins in one in-app directory. Skill types
  are Anthropic's, custom, organization-provisioned and partner skills.
- **Trust:** uploaded third-party skills are scanned with a result of pass, warn or
  fail, and the documentation says "a pass result… isn't a guarantee that a skill is
  safe in every respect".
- **Gaps:** it is closed, with no public index.

**skills.sh and `npx skills`** (Vercel Labs).

- **Discovery:** a leaderboard ranked by anonymous install counts from the CLI, with
  topics, packs, an "official" tier for verified organizations, and an audits page.
- **The CLI** installs any repository's skills into more than 75 agents. Its commands
  are `add`, `find`, `list`, `use`, `check`, `update`, `remove` and `init`, with
  `--global`, `--agent`, `--skill`, `--yes` and `--copy`, and a `skills-lock.json`.
- **Strengths:** the agent-folder table is a hard problem solved well, and publishing
  is just hosting a repository.
- **Gaps:**
  - Popularity can be skewed by forks and look-alike names.
  - The audits page was nearly empty.
  - There is no public index API.
  - The CLI sends telemetry unless it is turned off.

**awesome-copilot** (GitHub).

- **Scale:** at the time of research it held 222 agents, 192 instructions, 441 skills,
  183 plugins and 52 extensions, with a searchable website and a learning hub.
- **For agents:** a machine-readable `llms.txt` lists every item.
- **Native install:** it is a default plugin marketplace in Copilot CLI and VS Code
  (`copilot plugin install <name>@awesome-copilot`).
- **Contributions** come by pull request with validation scripts. A published "what we
  don't accept" policy rejects content with no "meaningful uplift" over what models
  already do.
- **Gaps:** quality is hard to hold at that scale, there is no usage ranking, and the
  taxonomy is specific to Copilot.

**OpenAI.**

- **Skills:** Codex reads skills from `.agents/skills/` between the working folder and
  the repository root, and from `~/.agents/skills/`.
- **Context budget:** by default the skill list uses at most 2% of the model's context,
  so long descriptions cost every task.
- **Plugins:** the `openai/skills` repository is deprecated in favor of plugins in a
  directory shared by ChatGPT and Codex.
- **Gaps:** there is no public website or index for that directory, and its
  submission process is undocumented.

**Cursor.**

- **cursor.directory** is a community site of rules and MCP guides organized by
  technology, copy-and-paste only. Cursor's documentation treats it as third-party.
- **Cursor's own Marketplace** reviews every plugin and every update by hand, and
  lists only open-source plugins.
- **Agent Plugins:** Cursor co-founded the Agent Plugins open standard (version 1.0.0),
  steered by maintainers from Amazon, Cursor, Microsoft, OpenAI and Vercel. Its
  `plugin.json` is also the schema awesome-copilot's plugins follow.

### MCP server registries

| Registry | How it keeps its promise | Worth noting |
| --- | --- | --- |
| **Official MCP Registry** | Metadata only, never files; namespaces proved by GitHub sign-in or DNS; each published version is immutable; open read API | The pointer-and-metadata model Loushing uses for kits |
| **Glama** | Scans, a letter-grade scorecard (license, quality, maintenance), an in-browser inspector, hosting | Visible quality signals on every card; scoring method not published |
| **Smithery** | Hosted connections with managed sign-in; a "verified" badge and usage counts | Changed its model in 2026; a reminder that hosted services are fragile |
| **PulseMCP** | Hand-enriched data for partners; new submissions paused | Curation does not scale without a plan |
| **mcp.so** | Several named leaderboards (demand, rising, quality checks), skill install counts from skills.sh | Tells people to review sources themselves |

### Mature catalogs outside AI

| Catalog | How it keeps its promise | Take for Loushing |
| --- | --- | --- |
| **shadcn/ui registry** | Any repository becomes a registry by adding `registry.json`; typed items with `registryDependencies`; `add`, `view`, `search`, `diff`, `--dry-run` and `docs --json` | Typed relations; preview before install; files you own |
| **Raycast Store** | Every extension is reviewed through one repository; new extensions must add something missing, and duplicates are merged | A no-duplicates rule for adding items |
| **VS Code Marketplace** | Fixed categories; verified publishers; scans of every version; signed packages; a block list | Fixed type and area vocabularies; honest trust facts |
| **Obsidian plugins** | A small JSON list of pointers to authors' repositories; one review at listing, then updates come from tagged releases | The kit pointer pattern, pinned to tags |
| **Homebrew** | Checksummed, immutable sources; per-item trust for third-party taps; a free JSON API matching the CLI | Hashes; one index for the CLI and the site |
| **Hugging Face Hub** | A README with YAML frontmatter as each model's card; task facets; pull requests to fix cards; gated access | The item card; job-area facets |
| **npm** | Named sort orders instead of a hidden ranking; provenance described as "a verifiable link" to source, not a safety guarantee; trusted publishing | Publish the CLI this way; describe trust honestly |

## Vocabulary across ecosystems

| Term | Used by | Meaning there |
| --- | --- | --- |
| **Skill** | Agent Skills, Anthropic, OpenAI, Copilot, skills.sh, awesome-copilot | One `SKILL.md` folder with optional scripts and resources. Settled everywhere |
| **Plugin** | Claude Code, Copilot CLI, Cursor, OpenAI, Agent Plugins standard | An installable bundle of skills, agents, commands, hooks and MCP servers for an agent host |
| **Marketplace** | Claude Code, Copilot CLI, Cursor | A list of plugins and where to get each |
| **Pack** | skills.sh | A lighter, curated bundle of related skills |
| **Collection** | Earlier awesome-copilot (now folded into plugins) | A themed group around a use case |
| **Extension** | VS Code, Raycast | One installable unit in an app |
| **Agent** | Claude Code, Copilot, awesome-copilot | A configured role or persona, distinct from the skills it uses |
| **Registry** | MCP, shadcn, npm | The index, or the manifest that describes it |
| **Formula, tap** | Homebrew | One installable unit; a third-party repository of them |
| **Kit, harness** | Not used as a type in any source studied | Introducing either is new vocabulary |

**For Loushing:** use **skill** exactly as the ecosystem does. For bigger systems,
[kit](../spec/content-model.md#what-to-call-things) is new but plain, and avoids
confusion with the packaging term plugin. For curated combinations,
[stack](../spec/content-model.md#item-types) is unclaimed, as is "collection". Both
are working defaults for your decision ([O1, O2](../spec/product-spec.md#10-decisions)).

## Patterns to adopt

| # | Pattern | Seen in | Where Loushing uses it |
| --- | --- | --- | --- |
| 1 | Markdown with YAML frontmatter as each item's card | Hugging Face, Agent Skills | [The item card](../spec/content-model.md#the-item-card) |
| 2 | The repository is the registry; a pointer list for items that live elsewhere | shadcn, Obsidian, MCP Registry | [Pointers](../spec/repository-organization.md#pointers-to-external-items) |
| 3 | Progressive disclosure: summary first, detail on demand | Agent Skills, OpenAI | [Item pages](../spec/item-pages.md#reading-order); short descriptions |
| 4 | A machine-readable feed beside the website | awesome-copilot, Homebrew, MCP Registry | [Agent access](../spec/agent-access.md) |
| 5 | Named, explainable ordering; no hidden ranking | npm | Search ranks by match only ([U1](../spec/product-spec.md#3-what-a-person-can-do)) |
| 6 | Trust described honestly: what a check proves and what it doesn't | npm, Claude.ai | [Security](../spec/distribution.md#security) |
| 7 | Trust per item: effects declared and shown before install | Homebrew taps, Agent Skills `allowed-tools` | [Effects](../spec/content-model.md#card-fields) |
| 8 | No duplicates: a new item must add something missing | Raycast, awesome-copilot | The [quality bar](../spec/item-pages.md#quality-bar-for-every-page) |
| 9 | Typed relations between items | shadcn `registryDependencies` | [Relationships](../spec/content-model.md#relationships) |
| 10 | Review once, then updates from tagged releases | Obsidian | Kit pointers pinned to tags |
| 11 | Preview and dry run before anything is written | shadcn | `--dry-run` and the plan in every install |
| 12 | Checksums and pinned sources | Homebrew | Hashes and commits in the [lockfile](../spec/distribution.md#the-lockfile) |

## Anti-patterns to avoid

| Anti-pattern | Seen in | Loushing's guard |
| --- | --- | --- |
| Ranking only by install counts, which forks and look-alikes can skew | skills.sh | No popularity ranking ([O11](../spec/product-spec.md#10-decisions)) |
| A trust feature that cannot be staffed, such as a nearly empty audits page | skills.sh, PulseMCP | Show only facts the build can produce |
| No statement of what an installed item can touch | VS Code, Obsidian (named gaps in their own docs) | Declared effects |
| Several overlapping item formats for the same thing | VS Code prompt files versus skills | One portable unit (the skill); new types only with a real need ([O3](../spec/product-spec.md#10-decisions)) |
| The list of record split across many unconnected places | Claude Code marketplaces | One catalog of record; other routes generated from it |

## Gaps no one fills

These are where Loushing can be better than every catalog studied, rather than equal to
them:

1. **Plain-language understanding before install** (J2): a page that says what an
   item does, when to use it, when not to, and what it changes, written for a person,
   not the agent.
2. **Systems, not just bundles** (J5): a kit page that explains the method, the parts,
   the setup and how it fits with other kits.
3. **Relations with reasons** (J6): "works well with, because…", and stacks with an
   order and handoffs.
4. **Effects shown before install** (J4): scripts, network use, files written outside
   the folder, credentials.
5. **Project setup across agents in one step** (J3, J5): installing a kit's skills for
   several agents *and* its project files, which plugins do not cover.
6. **A personal, curated catalog** (A1): one author's working set, maintained and used
   daily, rather than a community library or a leaderboard. Whether people want this
   is the riskiest product question ([A1](../spec/product-spec.md#9-assumptions-and-risks)).

## Not verified

- The Agent Skills specification's version number, and the list on its client showcase
  page.
- How skills.sh decides which repositories to list.
- OpenAI's submission and review process for its plugin directory.
- Who runs cursor.directory and mcp.so.
- Glama's scoring method.
- `gh skills install`, reported in awesome-copilot's README as needing GitHub CLI
  2.90.0 or later. GitHub CLI's manual page for it could not be found.
- Live npm package pages and its registry API, which could not be fetched from the
  research environment. The npm statements come from npm's documentation.
- Directories named in early searches (claude-plugins.dev, skillsdirectory.ai,
  SkillsMP) could not be found.
