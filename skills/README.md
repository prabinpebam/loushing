# Skills

Skills that live in Loushing, one flat folder each:

```text
skills/<id>/
├─ SKILL.md      The agent's file (Agent Skills format); its name equals <id>
├─ about.md      The item card: catalog fields plus the plain-language page
├─ scripts/      Optional helpers the agent can run
├─ references/   Optional documents loaded on demand
└─ assets/       Optional templates, images and data
```

Only skills the owner explicitly chooses are added, and each one passes the
publication check first (no secrets, internal names, customer or personal data, and
declared licensing). The owner requested the standalone kit adaptations listed below.
No personal or work skills are imported. See
[repository organization](../docs/spec/repository-organization.md#adding-items).

## Standalone skills from the kits

All 19 skills in the three pinned kits have an independent version here. Copy just
the selected skill folder into your agent's skills directory. No kit installer,
submodule, sibling skill or project-wide instruction section is needed.

These are independently maintained adaptations, not aliases or generated copies.
Each bundles its own procedure and needed resources, plus a pinned source note.
The kit versions remain unchanged. A standalone version's `about.md` declares
`derivedFrom: { kit: <kit-id>, skill: <canonical-skill-name> }`; the catalog checks
that identity against the pinned kit and links its part page to the standalone item.

| Kit | Source skill | Independent skill | What it does |
| --- | --- | --- | --- |
| agentic-craft | craft | [craft](craft/SKILL.md) | Chooses the product-reasoning practice a task needs |
| agentic-craft | ground | [ground](ground/SKILL.md) | Connects the customer promise to jobs, capabilities, flows and UI |
| agentic-craft | assumptions | [assumptions](assumptions/SKILL.md) | Ranks assumptions and designs cheap checks for the riskiest |
| agentic-craft | definition-of-done | [definition-of-done](definition-of-done/SKILL.md) | Defines observable success and the evidence that proves it |
| agentic-craft | design-system | [design-system](design-system/SKILL.md) | Builds token-based components and data-driven views |
| agentic-craft | ui-copy | [ui-copy](ui-copy/SKILL.md) | Writes consistent labels, errors, status and product language |
| agentic-craft | perceived-performance | [perceived-performance](perceived-performance/SKILL.md) | Gives waits honest feedback without losing input |
| agentic-craft | performance | [performance](performance/SKILL.md) | Measures performance against budgets and baselines |
| agent-orchestration | orchestrate | [orchestrate](orchestrate/SKILL.md) | Runs bounded work through plan, act, check and record |
| agent-orchestration | execution-modes | [execution-modes](execution-modes/SKILL.md) | Chooses what to produce first and how much attention it needs |
| agent-orchestration | coordinate | [coordinate](coordinate/SKILL.md) | Keeps resumable plans, evidence, delegation and handoffs |
| agent-orchestration | progress-review | [progress-review](progress-review/SKILL.md) | Detects stalled work and changes the approach |
| agent-orchestration | stage-validation | [stage-validation](stage-validation/SKILL.md) | Matches validation evidence to the change and stage |
| Slate | slate | [documentation-site](documentation-site/SKILL.md) | Authors navigable documentation in an existing host or plain HTML |
| Slate | presentation-deck | [presentation-deck](presentation-deck/SKILL.md) | Shapes a presenter-led narrative with visual evidence and notes |
| Slate | slate-presentation-motion | [presentation-motion](presentation-motion/SKILL.md) | Designs controlled proof states and interruptible slide motion |
| Slate | chart | [chart](chart/SKILL.md) | Produces truthful quantitative charts with accessible source data |
| Slate | iconography | [iconography](iconography/SKILL.md) | Chooses coherent, licensed and accessible icons |
| Slate | slate-svg-illustration | [svg-illustration](svg-illustration/SKILL.md) | Creates explanatory vectors with checked text fit and geometry |

The shorter standalone Slate names do not claim to include its runtime. In particular,
`documentation-site` avoids colliding with the `slate` kit's catalog id. The six Slate
adaptations use host-neutral workflows, not the kit's reader, Canvas, Semiotic renderer,
motion engine or validators. Their cards explain these differences. They retain
`NOASSERTION` because the source kit has no declared license; that is not a reuse
license. Craft and Orchestration adaptations retain their MIT notices.

Agent compatibility for the new standalone versions is **expected**, not tested in
every agent. Structural isolation and catalog checks are not evidence of agent-run
task quality. Inspect the card's prerequisites and limitations before copying.

Run `node site/scripts/build.mjs --check` after adding one: it names each problem
and how to fix it.
