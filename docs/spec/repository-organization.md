# Repository organization

> **TL;DR.** Loushing is the **catalog of record**. Small skills live inside it, one
> flat folder each. Kits and grown-up skills live in their own repositories, and
> Loushing holds a short pointer pinned to a release. A single build turns everything
> into the website, the CLI's index and the agent-readable files. Nothing is written
> twice, and nothing private reaches the public repository.

## Target layout

```text
loushing/
├─ skills/                     Skills that live in Loushing (flat, one folder each)
│  └─ <id>/
│     ├─ SKILL.md              The agent's file (Agent Skills format)
│     ├─ about.md              The item card: catalog metadata + plain-language page
│     ├─ scripts/              Optional executable helpers
│     ├─ references/           Optional documents loaded on demand
│     └─ assets/               Optional templates, images, data
├─ external/                   Pointers to items that live in their own repositories
│  └─ <id>.yaml                Repository, pinned release, path, channel
├─ stacks/
│  └─ <id>.md                  Curated combinations: members, order, handoffs
├─ catalog/
│  ├─ taxonomy.yaml            Job areas, tags, agent list, effects vocabulary
│  └─ schema/                  JSON Schemas for cards, pointers and the index
├─ cli/                        The `loushing` npm package (the npx entry point)
├─ site/                       The browsing website (its own code; not Slate)
├─ tools/                      Catalog build and checks
├─ docs/                       Slate planning host (this documentation)
├─ slate/ agentic-craft/ agent-orchestration/
│                              Submodules: tooling for planning and building Loushing
└─ .github/workflows/          Check on pull request; build, release and deploy on main
```

Generated output (`catalog.json`, per-item JSON and Markdown, `llms.txt`, the built
site) is produced by the build and published. It is not committed, so it can never
drift from its source.

### Two different roles for the current harnesses

Slate, agentic-craft and agent-orchestration appear in two unrelated ways:

| Role | Where | Pinned by | Changes when |
| --- | --- | --- | --- |
| **Tooling for this workspace** | Submodules at the repository root | The parent repository's Git links | You adopt a new version for planning work |
| **Catalog items** that others install | `external/<id>.yaml` pointers | A release tag in each pointer | You publish a new kit release to the catalog |

Updating a submodule for planning never changes what other people install, and
publishing a kit release never changes this workspace.

## What lives where

| Lives inside Loushing (`skills/`) | Gets its own repository (`external/` pointer) |
| --- | --- |
| A single skill folder | Any [kit](content-model.md#skill-or-kit-the-rule) |
| Copy-to-install: no installer, build, runtime or dependencies | Has an installer, build, runtime, dependencies or tests |
| Released with the catalog; its version lives in its card | Needs its own releases, changelog or CI |
| Small: at most 5 MB and 50 files (working limit) | Larger, or needs Git LFS |
| Maintained alongside the catalog | Has its own issues, contributors or documentation site |

The size limits keep a fresh clone and the CLI's downloads fast. They are working
defaults to revisit with real skills (assumption [A9](product-spec.md#9-assumptions-and-risks)).

### When a skill gets its own repository

A skill moves out when it starts matching the right-hand column. Moving must not break
anyone who installed it:

1. Split the folder into a new repository with its history (for example
   `git subtree split`), and add a README, license and the card as `about.md`.
2. Add what made it grow (installer, tests, CI) and tag a first release.
3. In Loushing, replace `skills/<id>/` with `external/<id>.yaml` pointing to that
   release. The **ID stays the same**, so URLs, the CLI and existing installs keep
   working.
4. The next catalog release notes the move. `loushing update` follows the pointer;
   nothing changes for the person until a newer release exists.

## Pointers to external items

A pointer is the only file Loushing keeps for an item that lives elsewhere:

```yaml
# external/agentic-craft.yaml
id: agentic-craft
type: kit
source:
  repo: https://github.com/prabinpebam/agentic-craft
  ref: v0.2.0            # a release tag or full commit; never a branch
  card: about.md         # path to the card in that repository
channels:
  next: main             # optional: opt-in latest, shown as "preview"
```

- The build fetches the card at the pinned `ref`, validates it and records the commit
  SHA and a content hash in the index. If the card is missing, the pointer may carry
  one inline until the kit adds it.
- Bumping `ref` is a deliberate catalog change, reviewed like any other.
- The `next` channel lets you try a kit's latest work. It is never the default and is
  always labeled.

## Public and private

Loushing is a **public** repository. Many working skills are written for one employer,
team or account and must not be published. The boundary:

- **Only skills you explicitly choose are added.** Nothing is imported in bulk from a
  machine's skill folders (this repository's existing rule).
- **Every skill passes a publication check before merge:** no secrets or tokens, no
  internal host names or URLs, no customer or personal data, no employer-confidential
  names, and a license. Third-party content records where it came from and keeps its
  original license; content whose license does not allow redistribution is linked,
  never copied.
- **Private and work skills stay out of the public catalog.** A private catalog can
  use the same layout in a separate private repository, which the CLI reads with the
  person's own GitHub access (decision [O9](product-spec.md#10-decisions)). The public
  site never lists private items.

## Adding items

Adding a skill should take minutes, from one source ([U14](product-spec.md#3-what-a-person-can-do)).

1. Put the skill folder under `skills/<id>/`, or ask the agent to create it. The
   folder name equals the `name` in `SKILL.md`.
2. Ask the agent to draft `about.md` from `SKILL.md` and the scripts. It fills the card
   fields, writes the plain-language body and declares the effects it finds. Review
   and edit.
3. Run the check (`loushing check`, or the build's check script). It names each
   problem and how to fix it.
4. Preview the item page locally.
5. Open a pull request. CI runs the same checks plus the publication check. Merging
   to `main` releases the catalog and deploys the site.

Listing a new kit is the same, with a pointer instead of a folder. The kit's own
repository holds its card.

## Build and checks

One build produces every output from the cards, so the site, CLI and agents always
agree.

| Check | Fails when | Applies to |
| --- | --- | --- |
| Agent Skills format | `SKILL.md` frontmatter is missing or invalid; the name differs from the folder; the description is too long | Skills, kit parts |
| Card schema | A required field is missing or a value is outside the vocabulary | All items |
| Identity | Two items or aliases share an ID; a removed ID is reused | All items |
| Relations | A related item does not exist, or a relation has no reason | All items |
| Effects | Files contradict the declared effects (a `scripts/` folder without `runs-scripts`) | Skills, kits |
| Publication | A secret pattern, internal URL or missing license is found | Skills, pointers |
| Size | A skill exceeds the size or file-count limit | Skills |
| Pinning | A pointer's `ref` is a branch, or its card cannot be fetched at that ref | Pointers |
| Version | Files changed since the last release but the version did not | Skills |
| Links and pages | A built page has a broken link or an accessibility violation | Site |

**Releases.** Every merge to `main` that changes the catalog is a catalog release: a
dated tag (for example `catalog-2026.10.22`) and a changelog generated from the item
versions that changed. The website and index are deployed from that tag. The CLI
records which catalog release it installed from.

**Site and CLI code** live in this repository as `site/` and `cli/` (decision
[O5](product-spec.md#10-decisions)). They share the catalog schema and are built and
checked together. Neither depends on Slate, which serves only this planning
documentation.
