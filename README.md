# Loushing

A workspace for planning a skills and resources library that is easy for humans and AI
agents to browse, discover, and use.

**Status:** harness setup only. "Loushing" is the working name taken from this
workspace; product naming, organization, UX, UI, and implementation remain undecided.

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
| Future application code | Separate from the docs host and the harnesses; location and technology to be decided |

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
stay in each harness's `templates/` folder until actual planning or work needs them;
no placeholder product specs, work plans, or design system have been created.

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
