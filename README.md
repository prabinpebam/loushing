# Loushing

The AI skills and kits I use in my own work, kept in one place, with a plain-language
page for each and the steps to set it up. It's a personal collection, not a
marketplace: these work for me, and if one looks useful to you, take it.

**Status:** stage 1, "A catalog you can read", is built in [site/](site/) and lists the
first kits, one stack, UI lighting, the optional Loushing finder and
[19 independent versions of the kits' skills](skills/README.md#standalone-skills-from-the-kits).
Local work for stages 2 to 5 is built but not released; the
[Definitions of Done](docs/spec/definition-of-done.md#5-status-of-the-original-pending-work)
say what each remaining row is waiting on. The finder's folder, `skills/loushing`,
must be committed before a root production build passes.
"Loushing" is the working
name. The plan and spec live in the Slate documentation in [docs/](docs/).

## Try the local CLI

The dependency-free [CLI preview](cli/README.md) can install, list, restore, update
and remove pinned skills. **It is not published to npm.** From this repository:

```powershell
node cli\bin\loushing.mjs find "ground a product" --json
node cli\bin\loushing.mjs add ground --agent copilot --dry-run --json
node --test "cli/test/*.test.mjs"
```

Run real installs from a disposable project first. `--yes` approves effects, not
overwriting local edits. Public kit pins keep their existing Git setup routes.
Safe kit/stack engineering can be tried with the explicit
[local development contract](cli/README.md#kits-and-stacks-local-contract-testing);
canonical releases and new pins are still required.

## Preview the site

Prerequisites: Git and Node.js 24. Nothing to install.

```powershell
node site\scripts\dev.mjs          # http://127.0.0.1:4180, rebuilds and reloads on every change
node site\scripts\build.mjs        # build once into site\dist
node --test "site/test/*.test.mjs" # all site tests
```

The build reads the catalog ([catalog/](catalog/), [skills/](skills/),
[external/](external/), [stacks/](stacks/)) and the design source ([design/](design/)),
checks every item, including the publication check for secrets and internal hosts,
and writes static pages plus `catalog.json`, `search-index.json`, `llms.txt` and a
feed. A catalog with any problem is never built. See the product spec's
[as built](docs/spec/product-spec.md#11-as-built) section for the choices made.

## Open the planning documentation

Prerequisites: Git, Node.js 22 or newer, and Python 3 for the static preview command.
No dependency installation or build is needed.

From this repository root in PowerShell:

```powershell
# Required after cloning without --recurse-submodules.
git submodule update --init --recursive

node .\slate\scripts\runtime-host.mjs check --repo . --host docs
python -m http.server 8080 --bind 127.0.0.1 --directory .\docs
```

Open **http://127.0.0.1:8080/**. Stop the preview with `Ctrl+C`.
Use HTTP, not `file://`, because the reader fetches its manifest and pages.
The preview serves only the documentation directory, not the repository.

## Workspace boundaries

| Location | Purpose |
| --- | --- |
| [docs/](docs/) | Project-owned brief, future plans and specifications, and documentation configuration |
| [slate/](slate/) | Editable Git submodule for your documentation harness |
| [agentic-craft/](agentic-craft/) | Editable Git submodule for product reasoning: grounded specs, assumptions, success criteria, and product-quality practices |
| [agent-orchestration/](agent-orchestration/) | Editable Git submodule for execution control: modes, stage validation, progress reviews, logs, and handoffs |
| [.github/skills/slate/SKILL.md](.github/skills/slate/SKILL.md) | Agent discovery adapter pointing to the canonical Slate skill |
| [.github/skills/](.github/skills/), [.github/agents/](.github/agents/) | Craft's and Orchestration's installed skill and reviewer copies; refresh from their sources, do not edit these copies |
| [AGENTS.md](AGENTS.md) | Repository-specific guidance and harness project facts for AI agents |
| [site/](site/) | The catalog site: a dependency-free static generator, its components, styles and tests |
| [catalog/](catalog/), [skills/](skills/), [external/](external/), [stacks/](stacks/) | The catalog: taxonomy, skills kept here, pointers to kits in their own repositories, and stacks |
| [design/](design/) | The product's design source: tokens, view specs, and Chopper's character sheet and scenes |

Start with the [documentation overview](docs/overview.md), [initial brief](docs/brief.md),
and [working guide](docs/working-guide.md). The reader's search searches these planning
documents; it is not a skills catalog.

## How the harnesses work together

Each harness works on its own; none requires another to be installed.

| Harness | Decides | Hands on |
| --- | --- | --- |
| agentic-craft | What is worth building and what success means | Spec, assumptions and risks, Definitions of Done, with stable IDs (P1, U1, A1, PD1) |
| agent-orchestration | How the work is carried out, checked, and adapted | Work plan, mode and bounds, evidence, progress log, handoffs |
| Slate | How documents are authored and read | Browsable pages of either harness's artifacts, when useful |

Orchestration reads Craft's artifacts when they exist and otherwise states a short goal,
done when, and limits of its own. Evidence and refuted assumptions flow back into the
spec. The [overview](docs/overview.md#three-editable-harnesses) has the full handoff.

## Edit and contribute to your harnesses

All three harness folders are normal Git working repositories, not read-only package
snapshots. Each has its own history, branches, and push destination:

| Folder | `origin` | Update branch |
| --- | --- | --- |
| [slate/](slate/) | [prabinpebam/slate](https://github.com/prabinpebam/slate) | `main` |
| [agentic-craft/](agentic-craft/) | [prabinpebam/agentic-craft](https://github.com/prabinpebam/agentic-craft) | `main` |
| [agent-orchestration/](agent-orchestration/) | [prabinpebam/agent-orchestration](https://github.com/prabinpebam/agent-orchestration) | `main` |

Edit the canonical sources in those folders, validate and commit in the relevant
harness repository, then push its branch to its own `origin`. The parent repository,
[prabinpebam/loushing](https://github.com/prabinpebam/loushing), pins the exact
harness commits; it does not contain their source history.

```powershell
# Clone with every harness at its pinned commit.
git clone --recurse-submodules https://github.com/prabinpebam/loushing.git

# Or, in an existing clone: check out the pinned commits.
git submodule update --init --recursive
git submodule status

# Deliberately adopt a harness's latest main (commit or preserve local work first).
git submodule update --remote agent-orchestration
```

The [working guide](docs/working-guide.md#edit-and-push-harness-changes) covers
contribution branches, detached HEADs after cloning, updates, and the two-level
commit workflow. Nothing automatically commits, pushes, merges, or deploys.

## Refresh this workspace after harness changes

```powershell
# After changing Slate runtime sources.
node .\slate\scripts\runtime-host.mjs sync --repo . --host docs
node .\slate\scripts\runtime-host.mjs check --repo . --host docs

# After changing Craft's or Orchestration's skills, reviewers, or installers.
node .\agentic-craft\tools\install.mjs . --for copilot
node .\agent-orchestration\tools\install.mjs . --for copilot

# Their dependency-free harness tests.
node --test .\agentic-craft\test\harness.test.mjs
node --test .\agent-orchestration\test\harness.test.mjs
```

Both installers are workspace-local, leave the Slate adapter in place, and preserve
their own project facts and each other's sections in [AGENTS.md](AGENTS.md). Neither
deletes files removed upstream; review the installed copies when updating. Templates
stay in each harness's `templates/` folder; the project's own spec and design system
are in [docs/spec/](docs/spec/), [docs/design/](docs/design/) and [design/](design/).

After pushing a harness change, commit its updated submodule pin and affected
generated/installed files in the parent repository when ready.
Never hand-edit [docs/shell/](docs/shell/); branding and content live outside it.
The host-owned reader entry is not overwritten by runtime sync; review upstream entry
changes explicitly when upgrading.

No npm or Python packages are required for this setup. If later work needs packages,
use the approved sources: `https://packagefeedproxy.microsoft.io/npm/` for public npm
packages and `https://packagefeedproxy.microsoft.io/pypi/simple/` for public Python
packages. Verify the effective configuration in the process doing the installation,
preserve authorized private feeds, and do not fall back to public registries.
