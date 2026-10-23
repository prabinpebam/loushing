# Integrating with a host

The full contract between the kit and a web UI, recipes for common stacks, and fixes
for what goes wrong. [SKILL.md](../SKILL.md) gives the order of the steps; this page
gives the detail.

## The contract

| The host provides | Why |
| --- | --- |
| `html` with its own background colour | Browsers leave the root canvas out of blending; without it, `body`'s background becomes the canvas and the layer multiplies over nothing |
| `body` with its own background colour and `isolation: isolate` | The layer blends inside `body`'s group, over the page colour |
| `color-scheme` on `html` that follows the theme | The CSS uses `light-dark()` for the ink |
| `--layer-lighting`, `--lighting-dark-tint`, `--color-lighting-ink`, `--size-lighting-panel` | [host-tokens.css](../assets/host-tokens.css) |
| `data-elevation="0"`–`"4"` on surfaces | Which elements cast, how high they are, and which get rims |
| Optional `--light-cut-size`, `--light-cut-corner` on a surface | A cut or folded corner |
| A Long shadows switch and a Lighting panel beside the theme toggle | [controls.md](controls.md) |
| Overlays (sticky bars, menus, popovers, dialogs, toasts, the panel) above `--layer-lighting` | Shadows never cover them |

| The kit provides | Where |
| --- | --- |
| `data-lighting="on"` or `"off"` on `<html>` | Set by the adapter; style against it if you need to |
| `--data-light-*` properties on `<html>` | The user's settings as CSS; see [model.md](model.md#rims-the-exact-css) |
| Rims on `[data-elevation]` surfaces above 0 | [lighting.css](../assets/lighting.css), only while on and when colours are the author's |
| `[data-light-layer]` appended to `<body>` | The renderer; see [renderer.md](renderer.md) |

The kit never adds classes or styles to host elements other than the rims, `<html>`'s
attribute and properties, and the panel's `--data-light-panel-top`.

## Choosing elevations

Walk the host's surfaces and give each one level. Ask:

1. **Is it a surface?** It has its own opaque background and a rectangular (rounded)
   outline. Text, icons, images, illustrations, badges drawn as text, focus rings and
   dividers are not.
2. **Is it raised?** A card with a drop shadow, a primary button, a floating panel: yes.
   A sunken well, an input, a quiet button, a flat section: level 0, or no attribute.
3. **How much?** Match the host's elevation scale if it has one: small controls 1,
   cards 2, highlighted or important cards 3, floating panels 4. Keep levels few;
   most of the look comes from level 2 cards and a handful of level 3.
4. **Is it nested?** Heights add up the ancestors' levels, so a level 1 button on a
   level 3 card stands 14 px high. Don't raise children to compensate.

Don't mark a host's sticky header: it sits above the layer and would cast onto
content it covers. Mark the panels inside it if they float.

Elements matching the selector that are hidden, zero-sized or outside the page cast
nothing. Elements inside `[data-light-layer]` are ignored.

## Theme systems

The renderer re-reads its colours when `class`, `data-scheme`, `data-theme` or `style`
change on `<html>`, or when `prefers-color-scheme` changes.

| Host theme hook | What to do |
| --- | --- |
| `prefers-color-scheme` only | `html { color-scheme: light dark; }` and nothing else |
| A class on `<html>` (`.dark`, Tailwind's `darkMode: 'class'`) | Add `html.dark { color-scheme: dark; }` and `html:not(.dark) { color-scheme: light; }` |
| `data-theme` or `data-scheme` on `<html>` | Set `color-scheme` for each value |
| A class or attribute on `<body>` or an app root | Mirror it on `<html>` too (a class or `data-theme`), so the renderer sees the change and re-reads its colours |

If the host has no dark mode, the ink is simply the shadow tint.

## Stacking

Pick `--layer-lighting` from the host's existing `z-index` values:

- above everything that should be shaded, which is usually all page content (often
  `z-index: auto`, 0 or 1);
- below the sticky header, menus, popovers, tooltips, dialogs, toasts and the Lighting
  panel.

In the reference, page content is below 99, the layer is 99, and the sticky header is
100. Content with a `z-index` above the layer isn't shaded; that's expected.

The layer is appended to `<body>`. Anything that makes a stacking context between
`<body>` and the page content (a wrapper with `transform`, `filter`, `opacity < 1`,
`isolation` or a positive `z-index`) is shaded as one piece; that's fine. But if the
**page background** is painted on such a wrapper instead of `html` and `body`, the
layer still multiplies over it correctly only if the wrapper sits below
`--layer-lighting`.

## Recipes

### Static HTML or server-rendered pages

Load the CSS in `<head>`, put the switch and panel markup in the header (render
`lightingToggleMarkup()` and `lightingPanelMarkup()` at build time, or write the same
HTML by hand), and load one module:

```html
<link rel="stylesheet" href="/lighting/host-tokens.css">
<link rel="stylesheet" href="/lighting/lighting.css">
<link rel="stylesheet" href="/lighting/lighting-panel.css">
<script type="module">
  import { mountLighting } from '/lighting/lighting-host.js';
  mountLighting({ storageKey: 'my-site-lighting' });
</script>
```

The markup starts with the switch and fields disabled and a `<noscript>` note, so it's
honest without scripts. On multi-page sites, settings carry across pages through
`localStorage`.

### React (and Next.js, Remix)

Render the switch and panel as components with the same attributes, and mount once in
an effect on the client:

```jsx
import { useEffect } from 'react';
import { mountLighting } from './lighting/lighting-host.js';

export function LightingControls() {
  useEffect(() => {
    const lighting = mountLighting({ storageKey: 'my-app-lighting' });
    return () => lighting?.destroy();
  }, []);
  return <>{/* the switch and panel markup from lighting-panel.js, as JSX */}</>;
}
```

- Use `dangerouslySetInnerHTML` with the markup functions if porting the markup isn't
  worth it; the strings contain no user input.
- With server rendering, import the adapter only on the client (inside the effect, or
  with a dynamic import). The engine and markup functions are safe on the server.
- Mount it in a layout that persists across routes, so it isn't destroyed and remade on
  every navigation. The renderer notices route changes through its observers.
- React's `className` changes on `<html>` trigger a re-read; `data-elevation` props
  pass through as written.

### Vue, Svelte, Angular, Solid

Same pattern: render the markup in the header component, call `mountLighting()` in
`onMounted` / `onMount` / `ngAfterViewInit`, and `destroy()` on unmount.

### Tailwind and utility CSS

Write `data-elevation="2"` on the element; there's nothing to configure. Remove
`shadow-*` utilities from lit surfaces only if they use `!important`; otherwise the
lighting rule replaces them while it's on. Set the cut with an arbitrary property:
`[--light-cut-size:2rem]`.

### Design systems and component libraries

Give components an `elevation` prop that writes `data-elevation`, and map the levels
to the library's existing elevation scale. Keep the levels data, not styles: the rims
and shadows come from the kit. Put the four host tokens in the token source so they
generate with the others.

## Without the bundled adapter

If the host has its own state store or settings page, drive the engine and renderer
directly:

```js
import { LIGHT_DEFAULTS, LIGHT_LEVELS, lightingMotion, lightingProperties, validateLighting } from './lighting.mjs';
import { createLightRenderer } from './light-renderer.js';

let renderer;
export function applyLighting(value, { reducedMotion, contrast, hidden }) {
  const settings = validateLighting(value);               // throws on bad input
  for (const [name, v] of Object.entries(lightingProperties(settings))) document.documentElement.style.setProperty(name, v);
  document.documentElement.dataset.lighting = settings.enabled ? 'on' : 'off';
  if (settings.enabled && !renderer) renderer = createLightRenderer({ heights: [...LIGHT_LEVELS] });
  renderer?.update(settings, {
    visible: settings.enabled && !contrast,
    motion: lightingMotion(settings, { reducedMotion, hidden: hidden || contrast }),
  });
}
```

`contrast` is `(prefers-contrast: more)` or `(forced-colors: active)`. Re-apply when
any of these media queries or `document.hidden` change. Validate saved settings with
`validateLighting`, and upgrade older ones with `upgradeLighting(saved, version)`.

## Troubleshooting

| Symptom | Check | Fix |
| --- | --- | --- |
| Dark page goes white when lighting is on | Computed background of `html` and `body` | Give each its own; isolate `body` |
| No cast shadows at all | `renderer.supported`; console warnings; `[data-light-layer]` exists | WebGL2 missing, or lighting is off; or contrast preferences hide it |
| Shadows don't change with the theme | `color-scheme` on `html`; where the theme class lives | See theme systems |
| Shadows over the header or menus | Their `z-index` against `--layer-lighting` | Raise them or lower the layer |
| Rims missing on one component | Its `box-shadow` rule's specificity | Lower it or scope it to `[data-lighting='off']` |
| A shadow starts at the wrong corner of a folded card | `--light-cut-size` and `--light-cut-corner` on the element with `data-elevation` | Set them there, not on a child |
| A sticky surface's shadow lags | `typeof ScrollTimeline`; `stats.timelines` | Expected without scroll-driven animations; bottom-sticky isn't supported |
| A shadow is cut off at a box's edge | The surface is inside a scrolling or clipping box | Expected: shadows are clipped to the box they scroll in |
| A coloured card's bounce looks grey | The card's background is transparent or a gradient image | The albedo is `background-color`; set one |
| The panel opens under the layer | The panel's `z-index` | Above `--layer-lighting` |
