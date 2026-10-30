# Distribution and install

How an item gets from the catalog into a person's agent. A person can always clone or
download. One command, `npx loushing add <id>`, does it for every major agent. The
same repository also works with the tools people already have: `npx skills` and the
plugin marketplaces built into Copilot CLI and Claude Code. Every route installs the
same files at the same pinned version.

> **TL;DR.**
> - **Four routes, one source:** Git or a ZIP download (always); `npx loushing`
>   (recommended); compatible tools, `npx skills` and plugin marketplaces (free,
>   because the layout follows the open standards); the kit's own installer (kits
>   only).
> - **Where files go:** at project scope, `.agents/skills/` serves Copilot, Codex,
>   Cursor, Gemini CLI and most other agents, and Claude Code needs `.claude/skills/`.
>   Personal scope differs per agent. The CLI keeps this in one table, and the A3
>   spike confirms it.
> - **Safe by default:** installs are pinned to a commit and checked against SHA-256
>   hashes, files are staged then moved into place, nothing is overwritten without a
>   choice, and the CLI never runs an item's scripts. A kit's installer runs only after
>   the person confirms its plan.
> - **Kits** follow a small [install contract](#kits) (non-interactive, dry run, JSON,
>   uninstall). The three current kits each need small changes to meet it.
> - **npm:** publish only `loushing`, from CI with trusted publishing and provenance,
>   with no dependencies. The name `agent-orchestration` is already taken on npm.

Related: [product spec](product-spec.md) · [content model](content-model.md) ·
[repository organization](repository-organization.md) ·
[agent access](agent-access.md) · [benchmarks](../research/benchmarks.md).

## Local implementation status

The commands above describe the intended published route. **`loushing` is not
published to npm.** A dependency-free local preview now lives in `cli/`; run
`node cli\bin\loushing.mjs --help` from the repository. Existing Git, Download and
Ask-your-agent routes remain available.

| Implemented locally | Not yet proved or released |
| --- | --- |
| Skill add, list, remove, lockfile restore, outdated and update; all five target IDs at both scopes | Actual discovery in every supported agent on Windows and macOS |
| Pinned GitHub bytes, size and SHA-256 checks, staging and rollback, safe paths and exact file ownership | Recovery after an uncatchable process kill or machine failure |
| Dry run with no writes, explicit noninteractive agents, effects approval, independent conflict choices and backups | npm publication, provenance, trusted publisher/account setup and registry delivery on a managed device |
| Find using the site's search index, info with published and resolved plans, finder instructions and synthetic regression tasks | Real two-agent finder/consent trials |
| Canonical kit contracts, verified-source execution, ordered stacks, per-member records, restore/update and exact uninstall in disposable local tests | Authorized canonical releases, new external pins and released contract/source manifests; current public kits remain manual |
| JSON output and exit codes 0/1/2; dependency-free Node 22-compatible APIs and a proposed Node/OS CI matrix | Executed Node 22/24 and macOS/Linux matrix evidence; this local run uses Windows and Node 26 |

`--yes` approves effects, never replacement of changed or unowned files.
`--conflict keep` skips the conflicting item; `--conflict replace` keeps the
replaced bytes in a versioned backup. For kits, `keep` applies to `add` and
`update` only: `remove` with local edits returns `needs-decision` and leaves the kit
installed; removing a stack stops the same way before any change when any member,
kit or skill, has local edits. Uninstall removes only the kit's recorded files and its own marked
section. `--as <local-name>` offers a separate folder.
Backups themselves are never overwritten. The lockfile also records source
manifests and destination ownership, so restoration needs no current item metadata.

The preview accepts `--catalog <file-or-URL>` and `--source-root <local-checkout>`
for offline verification. The latter reads pinned Git objects, not working files.
It honors proxy environment variables through Node's built-in HTTP/TLS transports,
rather than `fetch`, so the same dependency-free transport works on Node 22.
The default public catalog's metadata persists for 10 minutes in
`~/.cache/loushing/metadata-v1`; `--refresh` bypasses old metadata and `--no-cache`
disables reads and writes. Dry runs bypass persistent storage entirely. Local files,
alternate sources and private catalogs are never persistently cached; URLs cannot
carry credentials or query parameters. Cache failures are explicit, not an excuse
to use stale metadata. This is cache-correctness evidence, not an install-speed claim.

Historical versions and `next` require explicit immutable release entries. With no
registered releases the build says `catalogVersion: "development"`, and the What's
new timeline and feed list each item's history from Git. Git dates and a changed
`main` are not releases; release entries join that history once they exist.

The package uses a root allowlist for `cli/` plus the existing catalog/search
helpers it shares with the site. No skills, submodules or documentation-host
assets are bundled. There are no dependencies or install scripts. A publish guard
and `UNLICENSED` metadata keep release approval and the package's license choice
explicit; neither is permission to publish.

### Lifecycle and release preparation

| Source | Meaning | Guard |
| --- | --- | --- |
| `catalog/lifecycle.json` | Aliases and removals, with dates, reasons and optional current alternatives | No cycles, ID reuse, invalid IDs or dangling alternatives; shared by site and CLI |
| `external/<id>.yaml` with `type: skill` | A moved skill, with `source.path`, card and pinned ref in its external repository | Same ID and `SKILL.md` name; regular Git blobs, hashes, effects and publication checks |
| `catalog/releases.json` | Explicit release versions, manifest SHA-256 values and stable/next selections | Empty until actual authorized releases exist; no branch-based inference |
| `catalog/releases/<version>/` | Immutable index, item JSON/Markdown, search index and manifest | Manifest and every artifact hash verified before the public build |

`node site\scripts\release.mjs <local-release-config.json>` prepares an immutable
**local** artifact. Its config supplies `root`, a new `out` directory, SemVer
`version`, UTC `date`, explicit `changes` (`id`, `kind`, `line`), and `sourceRoots`
mapping external repository URLs to local checkouts when verifying skill or
contract payloads. It rejects dirty catalog sources and any size/hash mismatch
against the actual pinned Git blobs; output is staged and never overwrites a
version. An existing item version cannot acquire a different pin.
An unrelated parent-repository commit retains a local item's recorded pin when
Git proves its whole source folder is unchanged; changed content requires a version bump.

Change kinds are `added`, `updated`, `pinned` or `removed`; a removal must name an
authoritative tombstone. Stacks without an item SemVer can follow a recorded
channel without inventing a version number.

The command neither publishes nor advances a channel. Registration, commits,
publishing and channel promotion require separate authorization. After reviewing
an authorized artifact, the release owner places it in the version folder and
records the returned version/manifest digest in the registry, explicitly choosing
stable or next. Channels only name recorded versions; stable cannot select a
prerelease. CLI default selection uses a recorded stable pointer rather than a
newer development card; `--version` and `--channel next` never guess a ref.

### Explicit local private sources

Working default for the bounded fixture implementation: pass
`--catalog <local-file>` explicitly; an index may declare `visibility: private`.
Discovery and dry runs create no lock. A requested installation records that one
source and its exact manifests; existing installs cannot be mixed with another
catalog through add, update, outdated or restore. There is **one source per
scope/lock**, not a multi-source account system. Treat private lockfiles as private:
they intentionally contain item identities, source paths and manifests.

Public cards or pointers marked `visibility: private` fail the public build.
Explicit local sources are not searched or imported by that build. Disposable
fixtures cover source separation, unchanged public output, moves and restoration
from both the original and new pins. O9 remains undecided for authenticated network
access, account identity and credential storage. No such architecture or personal
or work content has been added.

## Routes

| Route | Command or action | Who it is for | What it gives | Stage |
| --- | --- | --- | --- | --- |
| **Download** | The page's Download button: a ZIP of the item at its version, with its SHA-256 | Anyone; locked-down machines without Node.js | Files plus the destination to copy them to | 1 |
| **Git** | `git clone https://github.com/prabinpebam/loushing`, then copy `skills/<id>/`; for kits, clone the kit's repository and run its installer | Developers; people who want to read or change everything | The full source and history | 1 |
| **`npx loushing`** | `npx loushing add <id>` | Everyone with Node.js 22 or later; agents | Pinned, verified, recorded, updatable and removable installs for skills, kits and stacks | 2 (kits and stacks in 3) |
| **`npx skills`** | `npx skills add prabinpebam/loushing --skill <id>` | People who already use Vercel's skills CLI | Skills only; no kits, effects or Loushing lockfile | Works from stage 1, because of the layout |
| **Plugin marketplace** | `copilot plugin marketplace add prabinpebam/loushing`, or `/plugin marketplace add prabinpebam/loushing` in Claude Code | People who manage everything through their agent's plugins | Skills and kit parts as plugins; no project setup | Later ([O12](product-spec.md#10-decisions)) |

`npx loushing` is the recommended route on every page because it is the only one that
covers kits and stacks, declares effects, protects local edits and can update and
remove. The other routes are there so nobody is locked in, and an item page shows each
one in its Get it panel ([item pages](item-pages.md#get-it-panel)).

**Why the compatible routes are nearly free:**

- `npx skills` finds skills in a repository's `skills/<name>/SKILL.md` folders, which is
  [Loushing's layout](repository-organization.md#target-layout)
  ([CLI reference](https://github.com/vercel-labs/skills/blob/main/docs/commands.md)).
- Copilot CLI recognizes a repository as a plugin marketplace from
  `.github/plugin/marketplace.json`, and also reads `.claude-plugin/marketplace.json`,
  which is the file Claude Code uses
  ([GitHub Docs](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace)).
  One generated `.claude-plugin/marketplace.json` can serve both.
- A plugin installs a kit's skills and agents but not its project setup (`AGENTS.md`
  sections, templates, a documentation host). A kit page that offers the plugin route
  must say so.

## Install targets

Agents discover skills in fixed folders. The table holds what the vendors' own
documentation says today. The [A3 spike](definition-of-done.md#stage-1-a-catalog-you-can-read)
confirms each row on Windows and macOS, and the CLI keeps the table in one file so it
can change without touching any item ([A11](product-spec.md#9-assumptions-and-risks)).

| Agent | `--agent` | Project scope | Personal scope | Source |
| --- | --- | --- | --- | --- |
| GitHub Copilot in VS Code | `copilot` | `.github/skills/`, `.agents/skills/` or `.claude/skills/` | `~/.copilot/skills/`, `~/.agents/skills/` or `~/.claude/skills/` | [VS Code docs](https://code.visualstudio.com/docs/copilot/customization/agent-skills) |
| GitHub Copilot CLI | `copilot` | Same as VS Code | `~/.copilot/skills/` | VS Code docs say Copilot CLI shares the format; folders to confirm in the spike |
| Claude Code | `claude-code` | `.claude/skills/` | `~/.claude/skills/` | [skills CLI agent table](https://github.com/vercel-labs/skills/blob/main/docs/agents.md) |
| OpenAI Codex | `codex` | `.agents/skills/`, from the working folder up to the repository root | `~/.agents/skills/` | [OpenAI docs](https://developers.openai.com/codex/skills) |
| Cursor | `cursor` | `.agents/skills/` | `~/.cursor/skills/` | [skills CLI agent table](https://github.com/vercel-labs/skills/blob/main/docs/agents.md) |
| Others that read the open layout (Gemini CLI, OpenCode, Cline…) | `agents` | `.agents/skills/` | Per agent | [skills CLI agent table](https://github.com/vercel-labs/skills/blob/main/docs/agents.md) |

**Default destinations:**

| Scope | Default | Why |
| --- | --- | --- |
| This project | `.agents/skills/<id>/` for every chosen agent except Claude Code; `.claude/skills/<id>/` when Claude Code is chosen | One copy serves most agents; Claude Code is the main agent that does not read `.agents/skills/` |
| All my projects | Each chosen agent's personal folder | No shared personal folder is read by every agent |

When a project already keeps skills in `.github/skills/`, as projects set up for
Copilot often do, the CLI installs there instead and says so. Two open questions for
the spike: whether an agent that reads several folders shows a skill twice when it
exists in two of them, and whether Copilot CLI reads `.agents/skills/`.

**Copies, not links.** Each destination gets a real copy. Symbolic links need extra
permissions on Windows and confuse people who edit the file. The lockfile, not a link,
keeps copies in step.

## The CLI

`loushing` is one npm package with no runtime dependencies, run with `npx`.

| Command | Does | Notes |
| --- | --- | --- |
| `add <id…>` | Install skills, kits or stacks | Shows the plan; asks only when there are effects, conflicts or a kit installer |
| `find "<task>"` | Search the catalog | Same ranking as the site; prints ID, summary, agents and effects |
| `info <id>` | Show an item's card, files, effects and install plan | The page's facts, in the terminal |
| `list` | Show installed items, per agent and scope | Read from the lockfile |
| `outdated` | Show installed items with newer versions, with change lines | Never changes anything |
| `update [id…]` | Update to the latest version on the item's channel | Keeps changed files unless told otherwise |
| `remove <id…>` | Remove exactly what was installed | Asks about changed files; runs a kit's uninstall |
| `install` | Restore everything in `loushing.lock.json` | For new clones and machines; `--personal` restores the personal list |
| `check [path]` | Validate items before publishing | The author's command; the same checks run in CI |

**Common flags:** `--agent <id>` (repeatable), `--scope project|personal`, `--yes`,
`--dry-run`, `--json`, `--version <v>` (an older release), `--channel next`. The
output and exit codes for agents are in [agent access](agent-access.md#cli-for-agents).

**Agent detection:** without `--agent`, the CLI looks for each agent's project folders
and instruction files (`.github/`, `.claude/` or `CLAUDE.md`, `.agents/`, `.cursor/`,
`AGENTS.md`). It proposes what it found and asks once. With no answer possible, such
as in CI, it stops with exit code 2.

### How an install works

1. **Resolve.** Fetch `catalog.json`, cached for 10 minutes, and the item's
   `items/<id>.json`. Follow aliases. Stop on a removed ID with its reason.
2. **Plan.** List each destination, file and effect, and anything that already exists.
3. **Confirm**, when there are effects, conflicts or a kit installer, unless `--yes`.
4. **Download.**
   - A skill: each file from GitHub at the pinned commit, into a temporary folder.
   - A kit: a shallow `git clone` of its pinned tag into the CLI's cache. Kits need Git.
5. **Verify.** The SHA-256 of every skill file must match the item's JSON. For a kit,
   the commit must match the pointer. Any mismatch stops the install and writes
   nothing.
6. **Write.** Move the files into place, or run the kit's installer through the
   [contract](#kits).
7. **Record.** Update `loushing.lock.json`.
8. **Report.** Say what changed, where, and the next step, usually "start a new chat".

### The lockfile

`loushing.lock.json` sits at the project root and is meant to be committed. Personal
installs are recorded in `~/.loushing/lock.json`.

```json
{
  "lockVersion": 1,
  "catalog": "https://<site>/catalog.json",
  "items": {
    "example-skill": {
      "type": "skill",
      "version": "1.2.0",
      "commit": "<sha>",
      "agents": ["copilot", "claude-code"],
      "files": {
        ".agents/skills/example-skill/SKILL.md": "sha256-…",
        ".claude/skills/example-skill/SKILL.md": "sha256-…"
      }
    },
    "agentic-craft": { "type": "kit", "version": "1.4.0", "ref": "v1.4.0", "commit": "<sha>", "agents": ["copilot"] }
  }
}
```

**What the lockfile makes possible:**

- `update` can tell which files the person changed, because their hash differs from
  the recorded one. Changed files are kept unless the person chooses otherwise, and
  the replaced version is saved as `<file>.loushing-<version>`.
- `remove` deletes exactly the recorded files.
- `install` restores the same versions on another machine.

### Versions and channels

- Every item has a SemVer version in its card
  ([lifecycle](content-model.md#identity-versions-and-lifecycle)).
- The catalog index records, per item, the commit (skills) or tag (kits) for each
  published version.
- `add` installs the latest version on the **stable** channel. `--channel next`
  installs the version a pointer marks as `next`, when there is one.
- A catalog release (`catalog-YYYY.MM.DD`) is the unit that changes what `latest`
  means. Merging to `main` does not change what people get until the release is built.

### Networks, proxies and Windows

- The CLI uses Node.js's built-in `fetch` and honors `HTTPS_PROXY`, `HTTP_PROXY` and
  `NO_PROXY`. It reads no other configuration.
- It downloads only from GitHub (`raw.githubusercontent.com`, `github.com`) and the
  catalog site. Every message that reports a network failure names the host and offers
  the Download route ([A10](product-spec.md#9-assumptions-and-risks)).
- `npx` itself downloads through the person's npm registry, including corporate
  package proxies, so `loushing` must be installable through them. Stage 2 checks this
  on a managed device.
- All paths are joined with the platform's separator, and long Windows paths are
  tested. The commands on item pages work in PowerShell, Command Prompt and POSIX
  shells.

## Kits

A kit keeps its own installer. Loushing runs that installer for the person, but only
if the kit describes it with an **install contract** in its card (`install` field,
[card fields](content-model.md#card-fields)). Without a contract, the kit page shows
the kit's own setup steps and the CLI runs nothing.

```yaml
install:
  command: ["node", "tools/install.mjs"]
  project: ["{projectDir}"]
  personal: ["--global"]
  agents:
    flag: "--for"
    join: ","
    map: { copilot: copilot, claude-code: claude, codex: agents, cursor: agents }
  inputs:
    - { name: projectName, flag: "--project", ask: "Project name for the docs site" }
  dryRun: ["--dry-run"]
  json: ["--json"]
  uninstall: ["--uninstall"]
  requires: { node: ">=22" }
  next: "Fill in the Project facts section in AGENTS.md."
```

**What the contract requires of a kit's installer:**

| Requirement | Why |
| --- | --- |
| Runs with no prompts when given its arguments; any input is declared in `inputs` | The CLI and agents can drive it |
| `--dry-run` prints every file it would write or change, and changes nothing | The CLI shows a true plan before asking |
| `--json` prints the result as JSON: `status`, `written`, `changed`, `next` | The CLI records it and agents can read it |
| Running it twice gives the same result | Re-running `add` or `update` is safe |
| Keeps content the person filled in (such as project facts) | Updating never loses their work |
| `--uninstall` removes what it added, including its marked sections | `remove` can be exact |
| Exit codes: 0 done, 1 failed, 2 needs a decision | Same meaning as the [CLI's](agent-access.md#exit-codes) |
| Writes only inside the project, or the personal folders for `--global`, and declares any network use | Effects are known in advance |

**Where the kits stand today** (from their installers at the pinned commits):

| Kit | Has | Missing for the contract |
| --- | --- | --- |
| agentic-craft | `tools/install.mjs` with `--for copilot,claude,agents`, `--global`, `--templates`, `--dry-run`; keeps filled-in project facts | `--json`, `--uninstall`, exit code 2, an `about.md` card |
| agent-orchestration | The same installer shape and flags | The same as agentic-craft |
| Slate | `scripts/init-project.mjs` with `--repo`, `--host`, `--project`; writes a documentation host and a Copilot skill adapter | An agent choice (adapter for Claude Code and the open layout), `--dry-run`, `--json`, `--uninstall`, exit codes, an `about.md` card |
| ai-integration | `tools/install.mjs` with one `--target github`, `agents` or `claude` per run and `--dry-run`; prints its changes as JSON; refuses edited or unowned files; never changes `AGENTS.md` | Several agents in one run, `--global`, `--uninstall`, the contract's JSON fields and exit code 2, an `about.md` card |

The table describes **the published pins**. Stage 3 source changes, each with its
own contract tests, are committed on the `feat/install-contract` branch of the
agentic-craft, agent-orchestration and Slate repositories; ai-integration has none
yet. They are not merged or released. The public cards remain manual; no contract is
attached to an old pin.

### Version-1 automation and local testing

The executable declaration is `install.contract`, separate from the existing
manual-command metadata. It includes a full source file manifest (relative paths,
sizes and SHA-256), exact Node entry point, project/personal arguments, agent map,
effects, bounded file/tree write locations, `network: false`, and contract version 1.
The source is an exact Git commit, not a branch or mutable tag. The site validates
each listed file against that commit. Page plans and item JSON share the same
`automation.supported` result; absent contracts stay manual.

Consent has two boundaries because a dry run is also code:

| Step | Explicit choice | What may happen |
| --- | --- | --- |
| Read the source plan | None | Metadata only; no installer executes |
| Trust the exact sources | `--trust-source <digest>` | Verify all source hashes, then run installers in a disposable planning copy to form an ordered combined plan |
| Approve target changes | `--approve-plan <plan.digest> --yes` | Execute exactly that plan, verify results and record each successful member |

These installers are trusted code, **not sandboxed**. Hashes establish identity,
not safety. A changed source, destination, effect or plan requires renewed consent.
An explicit `--kit-cache` outside the destination holds verified sources and the
planning copy; per-run contents are cleaned up. Dry runs leave the destination
unchanged. No network use is declared by the canonical installers.

For testing uncommitted sources only, `node cli\scripts\dev-kits.mjs` generates an
explicit `--dev-kits` manifest. It records a working-source digest separately from
the true base commit, and marks locks `uncommitted-local`. It never overrides normal
published verification. See `cli/README.md`, “Kits and stacks: local contract testing”,
for a disposable-project example. Older development restores/removals require their
exact source bytes; preserve a copy until removal.

Canonical installers keep original bytes and file/directory ownership in
`.kit-state/`. Updates keep project facts, templates and owner-tuned hooks. Changed
managed files block updates/removal; `--conflict keep` skips that member. Kits have
no forced replacement or partial-agent removal. Slate installs a full source copy
under `.kits/slate/`; its personal scope remains unsupported. A caught lock-commit
failure rolls back the affected kit member unless another edit prevents safe
recovery; such edits are preserved and reported. Power-loss recovery is manual.

Release still requires authorized canonical commits/publication, parent and
external pin updates, exact released contract manifests, parity tests and the
separate npm release approvals. Local passing tests do not satisfy that boundary.

## Stacks

`add <stack>` installs each member in order:

1. Plan every member, with each kit's dry run, and show one combined plan.
2. One confirmation covers the whole plan.
3. Members already installed at a compatible version are skipped.
4. A failure stops the run. The lockfile records the members that succeeded, so
   running the same command again resumes.
5. The stack's After setup steps are printed at the end.

The local implementation also records stack membership and removes it in reverse
order. Individual skill members use the existing skill transaction. A resumed run
asks for a fresh plan covering the remaining members; it never reuses a stale
approval. A kit conflict stops planning before any target member changes.

## Security

What the routes protect against, and how. Pinning and provenance show where a file
came from. They do not prove the file is safe, and the pages say so plainly, as npm's
own provenance documentation does.

| Threat | Mitigation |
| --- | --- |
| A file changed in transit or on the server | SHA-256 per file, from the item's JSON, built in CI; a mismatch writes nothing |
| An update quietly changes what an item does | Installs are pinned to commits; `outdated` shows change lines before `update`; `latest` moves only with a catalog release |
| A compromised `loushing` npm package (account takeover, a token leak) | No dependencies; publishing only from GitHub Actions with trusted publishing (no long-lived token) and provenance; 2FA on the account; no install scripts |
| A skill's scripts doing harm | Effects are declared and shown before install; the CLI never runs a skill's scripts; the page shows every script; the author reviews every item |
| A kit installer doing more than it says | It runs only after its dry-run plan is confirmed; it is pinned to a tag; the contract limits where it may write |
| Instructions in a skill that steer an agent badly (prompt injection) | Every skill's full text is readable on its page; review before publishing; only the author publishes in v1 ([O14](product-spec.md#10-decisions)) |
| Secrets or private content published by mistake | The publication check in CI, plus GitHub secret scanning and push protection ([public and private](repository-organization.md#public-and-private)) |
| Look-alike packages (`loushing-cli`, `lousing`) | Every page shows the exact command; consider reserving the obvious misspellings |

**Why this matters:** in September 2025, the self-replicating Shai-Hulud worm spread
through hundreds of npm packages from taken-over maintainer accounts, using install
scripts. In response, npm moved publishing toward 2FA, short-lived tokens and trusted
publishing ([GitHub's account](https://github.blog/security/supply-chain-security/our-plan-for-a-more-secure-npm-supply-chain/)).
Skill directories now scan submissions, but they say a passing scan is no guarantee
([benchmarks](../research/benchmarks.md#patterns-to-adopt)).

## Publishing to npm

| Item | Plan |
| --- | --- |
| Name | `loushing` (free on 22 October 2026, through the npm proxy). Reserve `@prabinpebam` for anything else |
| Content | `package.json` with a `bin` entry (`loushing`), a `files` whitelist (`bin/`, `lib/`, `README.md`, `LICENSE`), `"type": "module"`, `engines: { "node": ">=22" }`, no `dependencies`, no install scripts |
| Publishing | A GitHub Actions workflow on a version tag, using [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OpenID Connect; needs npm 11.5.1 or later and Node.js 22.14 or later in CI), which also attaches provenance |
| Account | 2FA required for publishing and settings; no long-lived tokens |
| Versions | SemVer. Breaking CLI changes need a major version, and old catalog schemas stay readable ([schema rules](agent-access.md#the-catalog-index)) |
| Kits | Not published to npm ([O8](product-spec.md#10-decisions)). The CLI fetches them from GitHub at pinned tags. If a kit is published later, it is published under `@prabinpebam/`, because `agent-orchestration` is taken on npm |

**First publish needs your approval.** Stage 2 starts with a minimal `0.0.x` release to
test A10, and nothing is published before you approve it.

## Decisions on this page

| # | Question | Recommendation | Decided |
| --- | --- | --- | --- |
| O18 | Minimum Node.js | 22: Node.js 20 reached end of life in April 2026 | Working default: 22 |
| O19 | Copies or links | Copies, kept in step by the lockfile | Working default: copies |
| O20 | Project-scope folder | `.agents/skills/`, plus `.claude/skills/` for Claude Code; `.github/skills/` when a project already uses it | Working default, pending the A3 spike |
| O21 | Kit downloads | Git shallow clone of the pinned tag | Working default: Git required for kits |
