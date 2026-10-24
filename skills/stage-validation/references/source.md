# Source and adaptation

This is an independent, self-contained adaptation maintained in Loushing, not a
sync-generated upstream copy. It uses the target project's actual checks without
requiring a sibling skill, custom agent, harness checkout or installer.

## Pinned upstream

- Repository: [prabinpebam/agent-orchestration](https://github.com/prabinpebam/agent-orchestration).
- Revision: `2064b11be2b4b327dbb1527c75a23eecb11e2b17`.
- [Original stage-validation skill](https://github.com/prabinpebam/agent-orchestration/blob/2064b11be2b4b327dbb1527c75a23eecb11e2b17/skills/stage-validation/SKILL.md).
- [Work-plan template](https://github.com/prabinpebam/agent-orchestration/blob/2064b11be2b4b327dbb1527c75a23eecb11e2b17/templates/work-plan.md).
- [Progress-log template](https://github.com/prabinpebam/agent-orchestration/blob/2064b11be2b4b327dbb1527c75a23eecb11e2b17/templates/progress-log.md).
- [Handoff template](https://github.com/prabinpebam/agent-orchestration/blob/2064b11be2b4b327dbb1527c75a23eecb11e2b17/templates/handoff.md).

The canonical files were copied first. Changes add command discovery, workspace
record defaults, focused documentation checks, direct review/stall procedures
and permission-safe release guidance. The log no longer assumes project facts
or external storage. No runner is bundled. The card and provenance are Loushing additions.

## License

MIT, copyright (c) 2026 Prabin Pebam. The
[pinned upstream license](https://github.com/prabinpebam/agent-orchestration/blob/2064b11be2b4b327dbb1527c75a23eecb11e2b17/LICENSE)
is preserved verbatim in [LICENSE](../LICENSE). This adaptation remains MIT.
