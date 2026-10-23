---
name: ui-lighting
description: Adds a physically based lighting system to any web UI - one distant area light that casts long, attached shadows from raised surfaces treated as solid blocks, with umbra and penumbra that fade by the light's size, global illumination, coloured bounced light, lit and shaded edges, slowly moving shadows from objects beyond the view, and a Long shadows switch beside the theme toggle with a settings panel. Use when asked for long shadows, light direction, area-light or soft shadows, bounce light, glowing or lit borders, or a lighting toggle on a web page, design system or component library. Works in light and dark mode, with any framework or none, using WebGL2 and no dependencies.
---

# UI lighting

Give a web UI one light. Raised surfaces stand on the page as solid blocks, and a
distant light of a chosen size casts their shadows. The result reproduces Loushing's
**Long shadows** look exactly, because you copy the same engine, renderer and CSS, and
a check proves your copy behaves the same.

What a person gets:

- a **Long shadows** switch beside the theme toggle that turns the lighting on and off
  in light and dark mode, independently of the theme;
- long shadows that stay attached to their surfaces, are crisp at contact and grow
  softer and fainter with distance. How soft depends on the light's size: a point light
  casts a crisp shadow that never fades, a big light fades it quickly;
- overlapping shadows that never get darker, as outdoors;
- global illumination that lightens shadows away from what casts them, but never
  lightens a shadow evenly or casts one of its own;
- light bounced off the lit walls of surfaces, in their colour, onto the ground beside
  them, fading by the inverse-square law;
- edges that are lighter on the side facing the light and darker on the far side;
- shadows from tall objects beyond the view that drift across it, each on its own;
- a **Lighting** panel to change the direction, elevation, source size, global
  illumination, bounce, tints, intensities, off-frame shadows, motion and speed.

## The kit

| File | Role | Edit it? |
| --- | --- | --- |
| [assets/lighting.mjs](assets/lighting.mjs) | The engine: settings, validation, geometry, the reference shadow, bounce, off-frame objects, rims. No DOM and no imports | **Never.** Copy it unchanged |
| [assets/light-renderer.js](assets/light-renderer.js) | The WebGL2 layer that draws every shadow and bounce for the page. Its only import is `./lighting.mjs` | **Never**, except that import's path |
| [assets/lighting.css](assets/lighting.css) | Rims on lit surfaces, and the layer's blending | **Never.** Copy it unchanged |
| [assets/host-tokens.css](assets/host-tokens.css) | The four values the CSS needs from the host | Yes: map them to your tokens |
| [assets/lighting-host.js](assets/lighting-host.js) | Framework-free adapter: settings, saving, the switch, the panel, accessibility preferences | Yes, if your app has its own state or storage |
| [assets/lighting-panel.js](assets/lighting-panel.js) | HTML for the switch and the panel, built from the engine's control data | Yes: port it to your components, keeping its attributes |
| [assets/lighting-panel.css](assets/lighting-panel.css) | Styles for the switch and panel, themable through `--lp-*` properties | Yes: restyle with your tokens |
| [assets/demo.html](assets/demo.html) | A standalone page with every case: cards, a folded corner, a sticky panel, a scroll box | Use it as the reference to compare against |
| [scripts/check-lighting.mjs](scripts/check-lighting.mjs) | 29 checks: the physics against a brute-force ray tracer, and the CSS and renderer contracts | Run it on your copies |

References, read when the step calls for them:

- [references/model.md](references/model.md): the physics and every equation, with the
  numbers a correct build produces.
- [references/renderer.md](references/renderer.md): how the layer draws, composites and
  follows scrolling, and its limits.
- [references/integration.md](references/integration.md): the host contract in full,
  framework recipes and troubleshooting.
- [references/controls.md](references/controls.md): settings, defaults, saving, the
  panel's markup, copy and accessibility.
- [references/verification.md](references/verification.md): how to prove the result
  matches.

## Workflow

Do the steps in order. Each ends with something you can check.

### 1. Survey the host

Before copying anything, find and write down:

- **How the theme is set**: a class or attribute on `<html>`, `prefers-color-scheme`,
  or both. The renderer re-reads colours when `class`, `data-scheme`, `data-theme` or
  `style` change on `<html>`, or when the system scheme changes.
- **The page background** and where it's painted (`html`, `body`, or a wrapper).
- **The stacking order**: sticky headers, menus, popovers, toasts and dialogs, with
  their `z-index`. Shadows will sit above page content and below all of these.
- **The surfaces**: cards, tiles, panels, primary buttons, inputs, sunken wells. Note
  which are raised, which are flat or sunken, and which are nested in others.
- **Special shapes**: folded or cut corners, sticky surfaces, scrolling boxes.
- **Where the theme toggle is**, so the Long shadows switch can sit beside it.
- **How the app renders**: static HTML, server-rendered, or a client framework.

### 2. Copy the files

Copy the engine, renderer and CSS into one folder in the host, for example
`src/lighting/`, unchanged. Keep `lighting.mjs` beside `light-renderer.js`, or change
only the renderer's single import line to point at it. Copy the adapter, panel and
tokens too unless the host replaces them. The modules are plain ES modules; bundlers
take them as they are.

Check: `node --test scripts/check-lighting.mjs` with the variables pointing at your
copies passes (see step 9).

### 3. Supply the host tokens

[assets/host-tokens.css](assets/host-tokens.css) defines:

| Token | Value in the reference | Meaning |
| --- | --- | --- |
| `--layer-lighting` | `99` | The shadows' stacking level: above page content, below sticky bars, menus, popovers and the panel |
| `--lighting-dark-tint` | `0.12` | In dark mode, how much of the shadow tint goes into the ink |
| `--color-lighting-ink` | `light-dark(#1b1f23, #000000)` | The dark-mode ink the tint is mixed into |
| `--size-lighting-panel` | `23rem` | The panel's width |

Map them to the host's token system if it has one. Choose `--layer-lighting` from the
survey: higher than any content that should be shaded, lower than the sticky header
and every overlay.

### 4. Paint the page inside the blend group

The shadows multiply over the page. Browsers leave the root canvas out of blending,
so:

```css
html { background: <page colour>; color-scheme: light dark; }
html[data-theme='light'] { color-scheme: light; }   /* match the host's theme hook */
html[data-theme='dark'] { color-scheme: dark; }
body { background: <page colour>; isolation: isolate; margin: 0; }
```

- `html` needs **its own** background, so `body`'s isn't promoted to the canvas.
- `body` needs **its own** background and `isolation: isolate`.
- `color-scheme` must follow the theme, because the CSS uses `light-dark()`.

Skip any of these and a dark page turns white, or shadows vanish, when lighting is on.

### 5. Mark the surfaces

Put `data-elevation="0"` to `"4"` on each surface's outermost element. The renderer
takes heights from `LIGHT_LEVELS`, `[0, 2, 6, 12, 24]` px:

| Level | Height | Use it for | In the reference |
| --- | --- | --- | --- |
| 0 | 0 px | Flat or sunken surfaces. They cast nothing and get no rims | Sunken tiles and wells |
| 1 | 2 px | Primary buttons and small raised controls | Primary buttons |
| 2 | 6 px | Raised cards and tiles | Cards, stat tiles |
| 3 | 12 px | Highlighted cards and side panels | Accent cards, folded-corner cards, the sticky "Get it" panel |
| 4 | 24 px | Floating panels | The Lighting panel |

Rules:

- Only opaque, rectangular (rounded) surfaces cast. Never mark text, icons,
  illustrations, images, focus rings or empty slots.
- A surface's **background colour** is its albedo for bounce. A transparent surface
  reflects the page's colour.
- Nested surfaces stack: a level 1 button on a level 3 card stands 14 px above the page.
- Lighting replaces a lit surface's own `box-shadow` with its rims while it's on. The
  rule's specificity is (0,3,0); a host rule with higher specificity or `!important`
  wins and the rims won't show.
- Rims use the `data-elevation` attribute itself. The renderer's `selector` option
  changes which elements cast, but they still need `data-elevation` for their height.

### 6. Describe cut corners

A card with a folded or cut corner is a block with that corner cut away, all the way
down. Set, on the surface:

```css
.card--folded { --light-cut-size: 2rem; --light-cut-corner: top-right; }
```

`--light-cut-size` is a registered length, so `rem` works. The corner is `top-left`,
`top-right` (the default), `bottom-right` or `bottom-left`. The fold drawn on the face
casts nothing. Its underside should show the page colour, as in the demo.

### 7. Add the controls

Put the **Long shadows** switch and the **Lighting** panel beside the theme toggle.
Without a framework, insert the markup and mount:

```js
import { lightingPanelMarkup, lightingToggleMarkup } from './lighting/lighting-panel.js';
import { mountLighting } from './lighting/lighting-host.js';

themeToggle.insertAdjacentHTML('beforebegin', lightingToggleMarkup() + lightingPanelMarkup());
const lighting = mountLighting({ storageKey: 'my-app-lighting' });
```

With a framework, render the same markup as components (keep every `data-*`
attribute, role, label and `for`), and call `mountLighting()` once after it's in the
DOM. Call `lighting.destroy()` on unmount. Load `lighting-panel.css`, or style the
panel with the host's components. The panel surface carries `data-elevation="4"`, so
it casts its own shadow, and its z-index must be above `--layer-lighting`.

Details: [references/controls.md](references/controls.md) and
[references/integration.md](references/integration.md).

### 8. Keep the defaults

The defaults are the owner's chosen look. Don't change them unless asked:

| Setting | Default | Range |
| --- | --- | --- |
| Long shadows (`enabled`) | off | on, off |
| Light direction (`azimuth`) | 315° (from the north-west) | 0–359° |
| Light elevation (`altitude`) | 0° (on the horizon) | 0–85° |
| Light source size (`sourceSize`) | 9° | 0–120° |
| Global illumination | 30 % | 0–100 % |
| Bounced light (`bounce`) | 100 % | 0–200 % |
| Highlight intensity | 30 % | 0–100 % |
| Shadow intensity | 33 % | 0–100 % |
| Highlight tint | `#ffdfb3` (warm) | any `#rrggbb` |
| Shadow tint | `#294573` (cool) | any `#rrggbb` |
| Off-frame shadows (`offFrame`) | on | on, off |
| Animate shadows (`animated`) | on | on, off |
| Motion speed (`speed`) | 5× | 1–10× |

To start with lighting on, or with another look, pass
`mountLighting({ defaults: { enabled: true } })`; Loushing, the reference host,
starts on. Reset returns to these defaults and
keeps the switch where it is.

### 9. Verify

1. Run the check on your copies:

   ```bash
   LIGHTING_ENGINE=src/lighting/lighting.mjs \
   LIGHTING_RENDERER=src/lighting/light-renderer.js \
   LIGHTING_CSS=src/lighting/lighting.css \
   LIGHTING_PANEL=src/lighting/lighting-panel.js \
   node --test path/to/ui-lighting/scripts/check-lighting.mjs
   ```

   In PowerShell, set each with `$env:LIGHTING_ENGINE='src\lighting\lighting.mjs'`.
   All 29 checks must pass (28 if there's no panel module).
2. Serve the host over HTTP. Modules don't load from `file://`.
3. Open [assets/demo.html](assets/demo.html), served the same way, beside the host and
   compare. Go through the browser checklist in
   [references/verification.md](references/verification.md): on and off, light and
   dark, attached shadows, no darker overlaps, folded corners, fast scrolling to the
   end, the panel, reduced motion and more contrast, no console errors.

Report what you checked and what you couldn't.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| The page turns white, or shadows don't show, when lighting is on | Only `body` has a background, or `body` isn't isolated | Step 4 |
| Colours don't change with the theme, or `light-dark()` picks the wrong side | `color-scheme` doesn't follow the theme | Set `color-scheme` per theme on `html` |
| Shadows cover the sticky header or a menu | `--layer-lighting` is above them | Lower it, or raise the overlays |
| Some content isn't shaded | It has a `z-index` above `--layer-lighting` | Expected; lower its `z-index` if it should be shaded |
| A card has no rims | A more specific `box-shadow` rule wins | Remove that rule while `[data-lighting='on']` |
| A shadow lags its sticky surface or scroll box when scrolling fast | The browser lacks scroll-driven animations | Expected in that browser; see the renderer reference |
| Shadows look the same in dark mode as in light | The ink tokens are missing | Step 3 |
| Only edges change, and the panel says cast shadows are unavailable | No WebGL2 | Expected fallback |
| A shadow is detached or floats | A surface is a thin sheet in your model | Don't add CSS drop shadows; the engine extrudes blocks |
| Shadows look darker where they overlap | The host multiplies extra shadows or edited the engine | Restore the kit files; remove other drop shadows |

## Rules

- Copy the engine, renderer and CSS unchanged. They are the look; the check proves it.
- Never put cast shadows in CSS `box-shadow` or `filter`. The layer draws them.
- Lighting is decoration. It never intercepts input (`pointer-events: none`), never
  changes the theme, and is hidden for more contrast, forced colours and print.
  Reduced motion pauses the drift.
- Glow is separate: the kit never makes anything glow because it's raised.
- Words a person reads follow the copy in [references/controls.md](references/controls.md).
