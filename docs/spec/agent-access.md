# Agent access

AI agents are first-class users of Loushing ([P6](product-spec.md#1-the-customer-promise)).
This page specifies what an agent can read and run: a published JSON index, a
Markdown and JSON version of every page, an `llms.txt` entry point, CLI commands with
JSON output and exit codes, and a small finder skill. Every one of them is generated
from the same cards as the website, so an agent and a person always see the same data.

> **TL;DR.**
> - **Read:** `catalog.json` lists every item with its install plan. Every page has a
>   `.json` and a `.md` twin, and `llms.txt` points agents to them. All are static
>   files with stable URLs.
> - **Act:** every CLI command takes `--json` and `--yes`. Exit code 0 means done, 1
>   means failed, and 2 means a person must decide. The JSON says why.
> - **Consent:** the CLI never approves effects on its own. An agent passes `--yes`
>   only after its person agreed to the plan the CLI printed.
> - **Discover mid-task:** an optional `loushing` finder skill teaches an agent when
>   and how to search the catalog.
> - **Later:** an MCP server, only if the CLI and the files prove insufficient
>   ([O16](#decisions-on-this-page)).

## What an agent can use

| Surface | URL or command | Use it to | Stage |
| --- | --- | --- | --- |
| Catalog index | `/catalog.json` | Search or list everything without the CLI | 4 (built in 1) |
| Item data | `/items/<id>.json` | Read one item's card, files, hashes and install plan | 4 |
| Item page as Markdown | `/items/<id>.md` | Read the plain-language page as an agent would read a document | 4 |
| Entry point | `/llms.txt` | Learn what the site is and where the machine-readable files are | 4 |
| CLI | `npx loushing find`, `info`, `add`, `list`, `outdated`, `update`, `remove`, `install`, `check` with `--json` | Search, plan, install and manage, with consent signals | 2 (find in 4) |
| Finder skill | `npx loushing add loushing` | Prompt the agent to look in the catalog when a task has no skill | 4 |

The website's own page for these is the **For agents** view in the
[product spec](product-spec.md#5-views).

## The catalog index

`catalog.json` is built on every catalog release and is the only source the CLI and
site read. Its fields follow the [card fields](content-model.md#card-fields).

```json
{
  "schema": "https://<site>/schema/catalog-1.json",
  "catalogVersion": "2026.10.22",
  "generated": "2026-10-22T10:00:00Z",
  "items": [
    {
      "id": "example-skill",
      "type": "skill",
      "title": "Example skill",
      "summary": "One sentence on what it does.",
      "useWhen": ["A phrase describing the task"],
      "notFor": ["A phrase describing what to use instead"],
      "area": "documentation",
      "tags": ["markdown"],
      "agents": { "tested": ["copilot-vscode", "claude-code"], "expected": ["codex"] },
      "status": "stable",
      "version": "1.2.0",
      "effects": [],
      "source": { "repo": "prabinpebam/loushing", "path": "skills/example-skill", "commit": "<sha>" },
      "url": "https://<site>/items/example-skill",
      "data": "https://<site>/items/example-skill.json"
    }
  ],
  "aliases": { "old-id": "example-skill" },
  "removed": { "retired-id": { "date": "2026-10-01", "reason": "…", "instead": "example-skill" } }
}
```

**Rules:**

- The schema is versioned. A breaking change publishes a new schema URL, and the old
  one is served for at least six months.
- `aliases` and `removed` keep old IDs resolvable ([identity](content-model.md#identity-versions-and-lifecycle)).
- The index holds summaries only. Per-item files hold file lists, hashes and full
  install plans, so the index stays within the
  [size target](product-spec.md#7-performance-and-waits).

## Per-item files

| File | Contents |
| --- | --- |
| `/items/<id>.json` | The full card; the file list with sizes and SHA-256 hashes; the install plan per agent and scope (destination folders, or the kit's installer command); effects; relations with reasons; versions and change lines |
| `/items/<id>.md` | The page body in Markdown, with a short front matter of the card's key fields. It is written for an agent to read, with no navigation or decoration |

## llms.txt

`/llms.txt` follows the [llms.txt proposal](https://llmstxt.org/): a title, a one-line
summary, then sections of links. It stays short and points to the files above rather
than repeating them.

```markdown
# Loushing

> A curated catalog of AI-agent skills, kits and stacks by Prabin Pebam, with plain-language pages and one-command installs.

Use `npx loushing find "<task>" --json` to search, and `npx loushing add <id>` to install, after your user agrees to the plan it prints.

## Catalog

- [catalog.json](https://<site>/catalog.json): every item with summary, agents, effects and links
- [Get started](https://<site>/get-started.md): what skills, kits and stacks are

## Kits

- [Slate](https://<site>/items/slate.md): …
```

The kits and stacks are listed by name; skills are reached through `catalog.json`,
because the list will grow.

## CLI for agents

Every command works without prompts when it has what it needs, and stops with exit
code 2 when only a person can decide.

| Flag | Meaning |
| --- | --- |
| `--json` | Print one JSON object on standard output; human messages go to standard error |
| `--yes` | Approve the plan the command prints. Agents pass it only after their person agreed |
| `--dry-run` | Show the plan and change nothing |
| `--agent <id>` | Install for this agent (repeatable); see [install targets](distribution.md#install-targets) |
| `--scope project\|personal` | Where to install; the default is `project` |

### Exit codes

| Code | Meaning | The JSON's `status` | Examples |
| --- | --- | --- | --- |
| 0 | Done, or nothing to do | `ok` | Installed; already up to date; dry run printed |
| 1 | Failed | `error` | Network failure; hash mismatch; installer error; unknown ID |
| 2 | A person must decide | `needs-decision` | Effects to approve without `--yes`; a changed file would be replaced; the agent could not be detected |

When the code is 2, `decisions` lists each choice with its options and the flag that
expresses it, so an agent can ask its person a clear question and rerun the command.

```json
{
  "status": "needs-decision",
  "item": "example-skill",
  "plan": { "writes": [".agents/skills/example-skill/SKILL.md"], "effects": ["runs-scripts"] },
  "decisions": [
    { "id": "approve-effects", "question": "This skill runs scripts in scripts/. Install it?", "flag": "--yes" }
  ]
}
```

## The finder skill

`loushing` is a small skill in the catalog itself. Its description tells the agent to
use it when a task might be served by an existing skill or kit. Its instructions:

1. Run `npx loushing find "<the task in a few words>" --json`.
2. If an item fits, tell the person what it is, why it fits and its effects, with its
   page link.
3. Install only after the person agrees, with `--yes`, and tell them to start a new
   session when the agent needs one.
4. Never install a kit or stack, or approve effects, without an explicit yes.

It is optional. The CLI and the files work without it.

## Decisions on this page

| # | Question | Recommendation | Decided |
| --- | --- | --- | --- |
| O16 | An MCP server for the catalog | Not in the first stages. The CLI and static files work in every agent with a terminal. Revisit if agents without a terminal need it | Working default: later |
| O17 | Search for agents | The same keyword index as the site, run by the CLI. No hosted search API | Working default: CLI search |
