# Repository guidance

This workspace is in initial planning setup. Read the [brief](docs/brief.md) before
making product decisions. The workspace name is provisional.

## Keep documentation and product separate

- [docs/](docs/) is a Slate documentation host for plans, research, and specifications.
  It is not the future skills-browser application.
- [slate/](slate/), [agentic-craft/](agentic-craft/) and
  [agent-orchestration/](agent-orchestration/) are editable, pinned Git submodules
  connected to the owner's upstream repositories. Make reusable harness improvements
  in their canonical sources, following each repository's guidance. Keep
  product-specific meaning and policy here, not in the generic harnesses.
- Never patch generated [docs/shell/](docs/shell/) or the harness-installed copies in
  [.github/skills/](.github/skills/) and [.github/agents/](.github/agents/).
  Refresh the host from the relevant source after harness changes.
- Each harness has one role. Craft owns product reasoning: what is worth building and
  what success means. Orchestration owns execution: how work is run, checked, reviewed
  and handed over. Slate owns the documentation reader. Do not apply Craft's
  application design-system rules by rewriting Slate.
- Product architecture, taxonomy, UI, and implementation are not yet selected.
  Do not treat illustrative options or open questions as approved requirements.
- Do not import personal skills or work resources, or publish content, without an
  explicit source and scope from the user.

## Author documentation

Use the [Slate adapter](.github/skills/slate/SKILL.md) and follow the canonical
[Slate skill](slate/SKILL.md). The [working guide](docs/working-guide.md) describes
host ownership, source handling, navigation, and checks.

## Check and preview

No package installation is required. From the repository root:

```powershell
node .\slate\scripts\runtime-host.mjs check --repo . --host docs
python -m http.server 8080 --bind 127.0.0.1 --directory .\docs
```

Check affected manifest paths and links and preview changed pages over HTTP.
Keep preview servers bound to loopback. See the [README](README.md) for package-source
constraints if later work needs dependencies.

## Contribute to the harnesses

Each submodule has its own Git history and `origin`. See the
[working guide](docs/working-guide.md#edit-and-push-harness-changes) for branches,
validation, refresh commands, and committing the parent pin only after the harness
commit is available upstream. This setup does not authorize automatic commits,
pushes, merges, or deployment.

Installed Craft and Orchestration files are managed by their installers. Put
repository-specific settings in each harness's project facts below, not in the copied
skill or reviewer files.

<!-- agentic-craft:start -->
## Craft (agentic-craft harness)

This project uses the [agentic-craft](https://github.com/prabinpebam/agentic-craft) skills for product reasoning: what is worth building and what success means. Start with the `craft` skill; it routes to the rest: `ground` (promise → jobs → user-can → flows → UI), `assumptions`, `definition-of-done`, `design-system`, `ui-copy`, `perceived-performance`, `performance`. Agents: `grounding-critic`, `design-system-auditor`. These skills define product intent and success criteria; they don't prescribe how the work is carried out.

### Project facts

- **Product artifacts:** [docs/brief.md](docs/brief.md) is the seed brief, not an
  approved product spec. The product specification, its assumptions register and the
  Definitions of Done do not exist yet; author them in the Slate host when the owner
  supplies the planning inputs.
- **Design system:** product tokens, components, library, and glossary are not
  selected. Slate's existing theme and components belong only to documentation.
- **Performance:** no product benchmark, baseline, or budgets exist yet because there
  is no product implementation.
- **Refresh:** `node .\agentic-craft\tools\install.mjs . --for copilot`; tests:
  `node --test .\agentic-craft\test\harness.test.mjs`.
<!-- agentic-craft:end -->

<!-- agent-orchestration:start -->
## Orchestration (agent-orchestration harness)

This project uses the [agent-orchestration](https://github.com/prabinpebam/agent-orchestration) skills to carry out work. Start with the `orchestrate` skill: it picks the mode (show me the UX sooner, prove the risky assumption, make this production-ready; work with me or keep going unattended) and routes to `execution-modes`, `stage-validation`, `progress-review` and `coordinate`. Agent: `throughput-reviewer` (about every 30 minutes of running work). These skills decide how work is run, not what to build; product intent comes from the files named below when there are any.

### Project facts

- **Product intent:** none approved yet. [docs/brief.md](docs/brief.md) is the seed
  brief; until Craft's spec and Definitions of Done exist, each work plan states its
  own goal, done when, and limits.
- **Work plan:** none yet; keep one beside the work it plans, or in the agent's session
  storage for short tasks.
- **Commands by validation tier:** Slate host integrity:
  `node .\slate\scripts\runtime-host.mjs check --repo . --host docs`; harness tests:
  `node --test .\agentic-craft\test\harness.test.mjs` and
  `node --test .\agent-orchestration\test\harness.test.mjs`. Check affected
  documentation paths, links, and HTTP rendering. Product unit/type/E2E/build
  commands are not defined because there is no product implementation.
- **Progress log:** use the active agent's session storage outside the repository
  for long-running work; no machine-specific path is committed. Do not create a
  product progress log during initial setup.
- **Branches and merges:** use a task branch in the repository being changed.
  The parent repository's `origin` is the owner's public
  [prabinpebam/loushing](https://github.com/prabinpebam/loushing) on `main`, with no
  deployment configured. Harness origins are the owner's repositories; preserve the docs/product boundary and do not
  commit, push, merge, or deploy without an explicit request.
- **Reviews and escalation:** review about every 30 minutes of running work.
  Always escalate product decisions (naming, taxonomy, UX, technology), importing
  personal or work resources, and anything that publishes content.
- **Refresh:** `node .\agent-orchestration\tools\install.mjs . --for copilot`.
<!-- agent-orchestration:end -->