---
name: iconography
description: "Use when choosing, sourcing, placing or reviewing icons in a UI, chart, diagram, document or slide. Keep one coherent library, record licenses and provenance, preserve accessible names and verify theme contrast without requiring Slate."
---

# Iconography

Use recognizable icons to support meaning, never to replace a necessary word.
This workflow stands alone; it ships no icon font, artwork, runtime or other skill.

## Select a source

Respect the project's existing licensed icon library. For a new set, these are
established options; select one family and variant per artifact:

| Source | Suitable context | License check |
| --- | --- | --- |
| [Fluent System Icons](https://github.com/microsoft/fluentui-system-icons) | Microsoft/Windows and product/system concepts | Verify the selected asset's MIT terms and retain its notice |
| [Material Symbols](https://fonts.google.com/icons) | General UI and navigation | Verify Apache-2.0 terms and retain applicable notices |
| [Font Awesome Free](https://fontawesome.com/license/free) | General-purpose concepts | Verify asset/version terms; Free SVG icons use CC BY 4.0 and need attribution |

Do not assume a library's name grants rights to every brand mark or Pro asset.
Fonts, code and artwork can have different licenses. Read the selected artifact's
actual terms; none of its notices are already supplied by this skill.

## Workflow

1. Name what the icon represents: action, state, content type, device, person or
   actual product. Decide whether it improves recognition compared with a word.
2. Resolve the exact symbol from the selected library by meaning, not silhouette.
   A product logo is only for that actual product, not a generic capability.
3. Reuse the project's local asset first. If an approved source must be retrieved,
   follow project network/package rules, never send private context and record its
   upstream URL, version, path and license. Avoid runtime CDN dependencies.
4. Copy official vector geometry without tracing or approximating it from memory.
   Do not mix libraries, regular/filled variants or stroke conventions accidentally.
5. Keep aspect ratio and normalize optical size/alignment. Do not distort geometry
   to force it into a differently shaped box.
6. Reserve an icon box distinct from the label and connector envelopes. Align the
   complete icon/label group, not the icon alone.
7. Use `currentColor` or the host's semantic tokens for monochrome inline SVG.
   Preserve official brand colors only when the license and identity require it.
8. Record provenance adjacent to the asset or in the project's notices. Example:

   ```text
   meaning: Save
   library / family / variant:
   asset URL and pinned revision:
   local path:
   license and notice path:
   modifications:
   ```

9. Provide visible attribution when required, including a license link and changes
   where applicable. Do not claim CC BY or Apache obligations are satisfied merely
   by a source URL or by this skill's presence.

## Accessibility and quality

- Decorative icon next to visible text: hide it from assistive technology with
  `aria-hidden="true"`. The label carries the meaning.
- Icon-only control: give the actual button/link an accessible action name and a
  visible tooltip where appropriate; do not rely on an SVG filename or tooltip alone.
- Informative standalone icon: give it an accessible name such as SVG `title` plus
  `role="img"`. A linked external image needs alt text on its host `img`.
- State is never color alone: use a word, shape or position as well.
- Meaningful icon geometry has at least 3:1 contrast on its immediate surface in
  each supported theme/state. Labels follow text contrast requirements.
- Never use emoji, generic dots or invented mini-symbols as substitutes for a clear
  library icon. If no suitable icon exists, use a word or omit it.
- In charts, icons identify categories or annotations; they do not encode quantity
  through icon size, and they never replace labeled axes.
- Inspect at actual display size, with keyboard/focus, zoom and fallback fonts.
  Keep the same concept/symbol pairing across the document or product.

See [source and differences](./references/source.md).
