# Source and adaptation

This is an independent, self-contained adaptation maintained in Loushing, not a
sync-generated upstream copy. All required references, starter data and scripts
are inside this skill. It does not require a harness checkout, installer,
project-facts section, sibling skill or reviewer agent.

## Pinned upstream

Repository: [prabinpebam/agentic-craft](https://github.com/prabinpebam/agentic-craft),
revision `299dbaeebfb1c8fc392ba919a85e5a6529bc6d60`.

The following source files were copied before adaptation:

- [skills/design-system/SKILL.md](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/skills/design-system/SKILL.md).
- [references/tokens.md](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/skills/design-system/references/tokens.md).
- [references/components.md](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/skills/design-system/references/components.md).
- [references/ui-from-data.md](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/skills/design-system/references/ui-from-data.md).
- [references/enforcement.md](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/skills/design-system/references/enforcement.md).
- [tools/build-tokens.mjs](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/tools/build-tokens.mjs).
- [tools/check-tokens.mjs](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/tools/check-tokens.mjs).
- [tools/lint-styles.mjs](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/tools/lint-styles.mjs).
- [templates/tokens/resolver.json](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/templates/tokens/resolver.json).
- [templates/tokens/tokens.json](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/templates/tokens/tokens.json).
- [templates/tokens/tokens.light.json](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/templates/tokens/tokens.light.json).
- [templates/tokens/tokens.dark.json](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/templates/tokens/tokens.dark.json).
- [templates/tokens/tokens.contrast-more.json](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/templates/tokens/tokens.contrast-more.json).
- [templates/tokens/checks.json](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/templates/tokens/checks.json).
- [templates/ui/view.schema.json](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/templates/ui/view.schema.json).
- [templates/ui/example.view.json](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/templates/ui/example.view.json).

## What changed

Local resource links, default host paths, standalone setup/check commands and
explicit tool limitations replace harness assumptions. Essential copy and wait
guidance is inline. Scripts retain upstream logic, with `--help` added and token
CLI entry guards changed to `fileURLToPath` so installed paths containing spaces
work correctly. Templates remain starter data, not an approved product design.
The catalog card and this file are Loushing additions.

## License

All copied sources are MIT, copyright (c) 2026 Prabin Pebam. The
[pinned upstream license](https://github.com/prabinpebam/agentic-craft/blob/299dbaeebfb1c8fc392ba919a85e5a6529bc6d60/LICENSE)
is preserved verbatim in [LICENSE](../LICENSE). This adaptation remains MIT.
