# Source and adaptation

This is an independent, self-contained adaptation maintained in Loushing, not a
sync-generated upstream copy. It does not require a harness checkout, installer,
project-facts section, sibling skill or custom agent.

## Pinned upstream

- Repository: [prabinpebam/agent-orchestration](https://github.com/prabinpebam/agent-orchestration).
- Revision: `2064b11be2b4b327dbb1527c75a23eecb11e2b17`.
- [Original orchestrate skill](https://github.com/prabinpebam/agent-orchestration/blob/2064b11be2b4b327dbb1527c75a23eecb11e2b17/skills/orchestrate/SKILL.md).
- [Work-plan template](https://github.com/prabinpebam/agent-orchestration/blob/2064b11be2b4b327dbb1527c75a23eecb11e2b17/templates/work-plan.md).
- [Progress-log template](https://github.com/prabinpebam/agent-orchestration/blob/2064b11be2b4b327dbb1527c75a23eecb11e2b17/templates/progress-log.md).
- [Handoff template](https://github.com/prabinpebam/agent-orchestration/blob/2064b11be2b4b327dbb1527c75a23eecb11e2b17/templates/handoff.md).

The canonical files were copied first. The adaptation includes the complete
mode, validation, recording, review and handoff procedure instead of depending
on sibling skills. It supplies workspace-local record defaults and conservative
permissions. The log template no longer assumes a harness facts file or external
storage. The card and this provenance file are Loushing additions.

## License

MIT, copyright (c) 2026 Prabin Pebam. The
[pinned upstream license](https://github.com/prabinpebam/agent-orchestration/blob/2064b11be2b4b327dbb1527c75a23eecb11e2b17/LICENSE)
is preserved verbatim in [LICENSE](../LICENSE). This adaptation remains MIT.
