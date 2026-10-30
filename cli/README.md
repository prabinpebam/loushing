# Loushing CLI

> Local preview: install and manage pinned skills without dependencies. The npm
> package is **not published**. Kit/stack engineering is available for explicit local
> contract testing; current public kit pins still use their manual Git routes.

Requires Node.js 22 or later. Run from a disposable project first:

```powershell
node E:\path\to\loushing\cli\bin\loushing.mjs add ground --agent copilot --dry-run --json
node E:\path\to\loushing\cli\bin\loushing.mjs add ground --agent copilot
node E:\path\to\loushing\cli\bin\loushing.mjs list --json
node E:\path\to\loushing\cli\bin\loushing.mjs remove ground
```

The default catalog is `https://prabinpebam.github.io/loushing/catalog.json`.
Nothing is downloaded from npm by these commands.

## Commands

| Command | Result |
| --- | --- |
| `add <id…>` | Verify skills, contract kits or ordered stacks; repeat `--agent` |
| `find "<task>"` | The site's ranking, with up to 20 results and their install plans |
| `info <id>` | Card, hashes and published plans; `--agent` adds a resolved destination plan |
| `list` | This scope's recorded installs |
| `outdated` | Available versions and change lines, without writing |
| `update [id…]` | Update selected items, or every recorded item |
| `remove <id…>` | Remove only recorded files; never recursively delete a skill folder |
| `install` | Restore the lockfile's exact commits, hashes and destinations |
| `check [path]` | Existing catalog and publication checks at a repository root |

Every command accepts `--json` and `--yes`. JSON mode prints exactly one object to
stdout; progress goes to stderr. Exit codes: `0` / `ok`, `1` / `error`, `2` /
`needs-decision`. An agent passes `--yes` only after its person approves the plan.

## Destinations and consent

| Agent | Project | Personal (`--scope personal` or `--personal`) |
| --- | --- | --- |
| `copilot` | `.agents/skills/`; existing `.github/skills/` takes precedence | `~/.copilot/skills/` |
| `claude-code` | `.claude/skills/` | `~/.claude/skills/` |
| `codex` | `.agents/skills/` | `~/.agents/skills/` |
| `cursor` | `.agents/skills/` | `~/.cursor/skills/` |
| `agents` | `.agents/skills/` | `~/.agents/skills/` |

These are the distribution spec's working defaults, not claims of discovery
testing in every agent. `agents` means an agent that reads the open layout, not
every agent's individual personal folder.

- Without `--agent`, noninteractive installs exit 2, even with `--yes`. A terminal
  asks for a target and reports detected candidates.
- `--dry-run` prints destinations, effects, conflicts, backup names and lockfile
  location, without changing destination files. It does not download skill payloads;
  trusted kit planning uses the disposable cache described below.
- `--yes` approves declared effects, **not overwriting changed or unowned files**.
- `--conflict keep` skips each conflicting item, including its lock entry.
  `--conflict replace` saves the current bytes as `<file>.loushing-<old-version>`
  (or `untracked`) before replacement or removal. Existing backups are never
  overwritten. `--as <local-name>` installs one skill into a separate folder.
- The CLI never runs a skill's scripts. Start a new agent chat after an install.
- `remove --agent <id>` removes that target only; shared copies remain while
  another recorded agent uses them. With no `--agent`, it removes the whole item.
  `install` and `update` retain the locked targets; use `add` to add another target.

## Verification and recovery

All skill files are fetched at a full Git commit and checked for size and SHA-256
before any destination changes. Paths reject traversal, Windows device names,
alternate streams, case collisions, symlinks/junctions and existing hard links.
All files are staged inside the chosen scope. A synchronous transaction rechecks
planned files, rolls back failures, then updates the lockfile. A concurrent run is
refused. Cancellation during downloading leaves no destination files.

The project lockfile is `loushing.lock.json`; the personal lockfile is
`~/.loushing/lock.json`. Commit the project lockfile to restore the same set on
another machine. It contains the manifest as well as hashes, so `install` does not
need current catalog metadata. Treat changes to this file like source changes.
Kit records also contain ownership state and original file bytes for safe undo.
Review them for private project content before committing or sharing a lockfile.

An uncatchable process kill or machine failure can leave `.loushing-transaction`
and `.loushing-stage-*`. Do not delete these while any install is running. Preserve
the staging folder's `.old` files for recovery; automatic crash recovery is not
implemented. If rollback cannot finish, the error names the preserved folder.

## Offline and development use

`--catalog <file-or-URL>` selects an explicit catalog. HTTPS and local files are
accepted; HTTP is limited to loopback. `--source-root <checkout>` reads **committed
Git objects**, not that checkout's working files, and still checks every hash.
Use these together to try the committed review build without network access:

```powershell
# Run in an empty disposable project; substitute your repository path.
node E:\path\to\loushing\cli\bin\loushing.mjs add ground --agent copilot `
  --catalog E:\path\to\loushing\.agent-orchestration\review-bc83247\site\dist\catalog.json `
  --source-root E:\path\to\loushing --dry-run --json
```

`--version <semver>` and `--channel next` require an explicit entry in the catalog's
`versions` or `channels` map. They never guess a tag or fall back to `main`.
There are no registered catalog releases yet: the current build is explicitly
`development`. Once releases exist, stable and version selection use their
immutable manifests rather than a newer working-tree card.

Only the default public catalog uses the persistent 10-minute metadata cache at
`~/.cache/loushing/metadata-v1`. `--refresh` refetches and replaces the entries used
by that command; `--no-cache` bypasses reads and writes. Dry runs never read or write
that cache. Expired entries are not used on network failure. Invalid cache data or
filesystem failures report an error with the bypass flags. Local/alternate/private
sources and URLs carrying credentials or query parameters are never cached.

A local index may declare `visibility: private`. Use an explicit `--catalog` for
the intended source; discovery and previews do not write a lock. One catalog is
allowed per scope/lock: add, update, outdated and restore reject an explicit
different source once items exist. Private locks intentionally contain private
item metadata; do not commit them to public repositories. The public builder never
imports CLI sources and rejects non-public cards. Network private authentication,
accounts and credential storage remain undecided (O9), not silently configured.

## Finder and lifecycle

The optional `skills/loushing` instructions search via this CLI or static JSON,
preview effects and destinations, and require the actual user's explicit consent
before an install. They never treat `--yes` as permission to overwrite local edits.
`node cli\scripts\finder-trials.mjs` runs 10 labeled **synthetic** ranking/preview
tasks with a 7/10 threshold, without install commands. It does not prove behavior
in real agent products.

The builder and CLI share `catalog/lifecycle.json` alias/removal validation.
Removed items report their reason and alternative; moved skills keep their ID,
while locks restore their original source pins independently of current metadata.
`catalog/releases.json` owns explicit immutable versions and stable/next pointers.
The local release preparation command is documented in
[distribution](../docs/spec/distribution.md#lifecycle-and-release-preparation).
It refuses dirty or mismatched pinned bytes and does not publish or move channels.

Network access honors `HTTPS_PROXY`, `HTTP_PROXY` and `NO_PROXY` (also their lowercase
forms). Node's built-in HTTP/TLS transports provide this on Node 22 without
dependencies. TLS verification is never disabled. Errors name the destination host
without exposing proxy credentials. Redirects cannot escape the catalog origin or
the pinned raw GitHub host.

## Kits and stacks: local contract testing

The three canonical working copies implement contract version 1. **None of these
changes is an upstream release.** Existing catalog pins have no executable contract;
`add` returns their manual plans without running code. A future release must publish
the complete installer source manifest (path, size, SHA-256), exact commit, Node
entry point, agent mappings, scopes, effects and bounded write locations. The site
and CLI share validation; publication checks hashes against the pinned Git objects.

For testing these **uncommitted local sources only**, generate an explicit manifest:

```powershell
# From this repository; do not use the owner's project as the destination.
node cli\scripts\dev-kits.mjs > .agent-orchestration\dev-kits.json
New-Item -ItemType Directory .agent-orchestration\kit-demo, .agent-orchestration\kit-cache
Set-Location .agent-orchestration\kit-demo
node ..\..\cli\bin\loushing.mjs add plan-build-document --agent copilot `
  --catalog ..\..\site\dist\catalog.json --dev-kits ..\dev-kits.json `
  --kit-cache ..\kit-cache --dry-run --json
```

1. Review `sourcePlan`. No installer, including its dry run, has executed. Supply
   the returned `--trust-source <digest>` only after approving those exact sources
   for execution in a disposable planning copy. This is **trusted code, not a
   sandbox**. Hashes prove identity, not harmlessness. No network use is declared.
2. Rerun with that flag and `--dry-run --json`. The CLI verifies every source file,
   runs each kit's dry run and simulates the ordered installation in the cache.
   The destination is unchanged. The cache's per-run folder is removed afterward.
   If another program holds it open, the result keeps its real outcome and adds
   `cleanup` naming the folder to delete later.
3. Review the combined `plan`, including writes, deletes, effects, conflicts and
   lockfile. Rerun with `--trust-source <digest> --approve-plan <plan.digest> --yes`.
   **`--yes` alone never approves kit code or an unknown/changed target plan.**

Keep the same catalog, development manifest and cache flags for `install`,
`update`, `outdated` and `remove`. Development locks are explicitly marked
`uncommitted-local`, record source hashes separately from the real base commit,
and require that explicit opt-in again; they never pretend dirty bytes belong to
a release commit. Regenerate the development manifest after editing a source and
use `update`; restoring/removing an older development install still needs its exact
source bytes. Keep a source copy until that install is removed.

The canonical installers record original bytes and owned files under
`.kit-state/`. Updates preserve filled project facts, templates and hook settings.
Local edits block replacement/removal. For `add` and `update`, `--conflict keep`
skips a whole affected member. `remove` has no keep option: it returns
`needs-decision` with the edited files and leaves the kit and its lock entry in
place until those edits are restored or moved, so it never reports a removal that
did not happen. Removing a stack works the same way: if any member, kit or skill,
has local edits, nothing is removed, even with `--conflict keep`, and the result
names the edited files. Uninstall only touches files the kit recorded. Where a file also
holds owner text or another kit's marked section, it removes only this kit's
section. Kits do not accept forced replacement, namespacing or partial-agent removal.
Do not edit either ownership record to bypass a conflict.

Stacks plan members in order, skip compatible installs, save each success, and
stop on failure. Rerunning obtains a new plan for the remaining work. Stack removal
uses the recorded reverse order; shared marked sections are not recursively erased.
If every member is already compatible, exact plan approval records the stack without
executing any installer.
Individual skills in stacks use the existing skill transaction. Caught kit/lock
failures restore the affected member where its files still match the approved
result; concurrent edits instead require recovery and are preserved. An uncatchable
process kill still needs manual recovery; preserve state, lock and transaction files.

Slate installs a complete authoring copy under `.kits/slate/`, a docs host and
adapters for Copilot, Claude Code and the open layout. Personal scope remains
unsupported for Slate. Craft and Orchestration support personal scope; personal
clock hooks use the actual destination, never the planning-cache path.

**Release prerequisites:** authorized canonical commits and upstream publication;
updated parent submodule pins and external card pins; released contract metadata
and exact source hashes; build/CLI parity checks against those releases; the
separate npm identity, licensing, publication and agent-discovery approvals.

## Checks and package

```powershell
node --test "cli/test/*.test.mjs"
node cli\bin\loushing.mjs check --json
npm config get registry
npm pack --offline --ignore-scripts --pack-destination .agent-orchestration
```

The package allowlist includes the CLI and the exact existing site helpers it
shares; it excludes skills, documentation-host assets, tests and submodules. There
are no dependencies or install scripts. The package license remains `UNLICENSED`
pending the owner's choice, and a pre-publish guard blocks accidental publication.
Publishing, provenance, trusted publisher setup, actual agent discovery, managed
proxy package delivery, and the Node/OS CI matrix still need release evidence.
