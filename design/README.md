# design/

The Loushing product's design source: tokens, view specs and the Chopper character.
It is product design data, not documentation. The rules that govern it are in the
Slate host:

- [Design system](../docs/design/design-system.md): tiers, components, enforcement.
- [Visual first](../docs/design/visual-first.md): when to show and when to tell.
- [Chopper](../docs/design/chopper.md): the character, his rules and how his images
  are made.
- [Tokens](../docs/design/tokens.md): generated from `tokens/`; do not edit by hand.

Components and layouts will live in the site code (`site/`) when stage 1 starts. They
read the tokens; they never hold raw values.

## Layout

| Path | What it holds | Edited by |
| --- | --- | --- |
| `tokens/resolver.json` | The DTCG resolver: one base set and three contexts (light, dark, contrast-more) | Rarely; adding a context |
| `tokens/tokens.json` | Primitives, semantic roles, scales and component tokens | A person, through a reviewed change |
| `tokens/tokens.{light,dark,contrast-more}.json` | Context overrides of semantic roles | A person, through a reviewed change |
| `tokens/checks.json` | The contrast pairs that must pass in every context | Whoever adds a role or pair |
| `tokens/dist/` | Generated CSS (ignored by Git) | The build only |
| `views/view.schema.json` | The view spec format: layouts, regions and the visual-first block types | Whoever adds a block type |
| `views/*.view.json` | Each screen as data | Whoever changes a screen |
| `chopper/reference/character-sheet.png` | The canonical character sheet; every generation uses it | Never, except by the owner |
| `chopper/reference/cast-<id>.png` | One sheet per supporting cast member, approved by the owner before any scene uses it | The `chopper` skill, with the owner's approval |
| `chopper/scenes.schema.json` | The format of the scene library | Rarely |
| `chopper/scenes.json` | Presence rules, the drawing standard, zones, props, cast, scenes with one render per size, set pieces and stories | The `chopper` skill and reviews |
| `chopper/source/` | Approved transparent PNG masters, one per render: `<id>.<size>.png` with `<id>.<size>.prompt.txt` | The `chopper` skill, after QA and measuring |
| `chopper/drafts/` | Draft generations (ignored by Git) | The `chopper` skill |

## Commands

From the repository root; nothing to install.

```powershell
# Check every contrast pair in every context
node .\agentic-craft\tools\check-tokens.mjs --src design\tokens --checks design\tokens\checks.json

# Build the CSS custom properties and the token reference page
node .\agentic-craft\tools\build-tokens.mjs --src design\tokens --css design\tokens\dist\tokens.css --md docs\design\tokens.md

# Fail if the committed token reference page is stale
node .\agentic-craft\tools\build-tokens.mjs --src design\tokens --css design\tokens\dist\tokens.css --md docs\design\tokens.md --check
```

When the site exists, its styles are also checked with
`node .\agentic-craft\tools\lint-styles.mjs site\src` (no raw values, no primitives in
components) and its copy with `lint-copy.mjs`.

## Chopper images

Chopper images are generated with the owner's user-level `gpt-image-2-5` skill and
always with `chopper/reference/character-sheet.png` as the first reference. Use the
project's `chopper` skill (`.github/skills/chopper/SKILL.md`); it holds the prompt
template, the drawing standard, the workflow, measuring, the QA checklist and the file
conventions. Each scene is drawn separately for each size it is shown at, and every
master is reduced by the same factor, so all images share one line width. Generation
costs money, so it runs only after the owner confirms.
