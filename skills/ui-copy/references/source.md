# Source and adaptation

This is an independent, self-contained adaptation maintained in Loushing, not a
sync-generated upstream copy. Its glossary and linter are bundled locally;
other skills, agents, a harness checkout and installer are not required.

## Pinned upstream

- Repository: [prabinpebam/agentic-craft](https://github.com/prabinpebam/agentic-craft).
- Revision: `299dbaeebfb1c8fc392ba919a85e5a6529bc6d60`.
- [Original ui-copy skill](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/skills/ui-copy/SKILL.md).
- [Glossary template](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/templates/copy-glossary.md).
- [Copy linter](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/tools/lint-copy.mjs).

These files were copied first. The skill adds default artifact paths, a
standalone wait summary, local commands, explicit JSON input format and honest
linter limitations. The script adds `--help`; its linting logic is unchanged.
The card and this file are Loushing additions.

## License

MIT, copyright (c) 2026 Prabin Pebam. The
[pinned upstream license](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/LICENSE)
is preserved verbatim in [LICENSE](../LICENSE). This adaptation remains MIT.
