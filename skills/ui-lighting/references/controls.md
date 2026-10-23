# Controls, settings and copy

The switch, the panel, the settings they change, how settings are saved, and the words
a person reads. [lighting-panel.js](../assets/lighting-panel.js) and
[lighting-host.js](../assets/lighting-host.js) implement all of it; port the markup to
your components if you have them, and keep every attribute, role, label and string
listed here.

## Where the controls go

- **Long shadows**: a switch beside the theme toggle, always visible. It turns the
  lighting on and off, independently of light or dark mode, and the choice persists.
- **Lighting**: a compact disclosure beside it that opens the settings panel. The panel
  is non-modal: it closes with Escape (focus returns to its summary) or a click
  outside, and a small screen can scroll it. Its surface is elevation 4, so it casts
  its own long shadow; it sits above `--layer-lighting`.

## Settings

All settings live in one object, validated by `validateLighting`. Unknown fields,
wrong types and out-of-range values throw. `LIGHT_CONTROLS` lists the sliders in panel
order with their labels, ranges, steps and units; build the panel from it.

| Key | Label | Type | Range, step | Default | Unit shown |
| --- | --- | --- | --- | --- | --- |
| `enabled` | Long shadows | switch | | `false` | |
| `azimuth` | Light direction | slider | 0–359, 1 | 315 | ° |
| `altitude` | Light elevation | slider | 0–85, 1 | 0 | ° |
| `sourceSize` | Light source size | slider | 0–120, 1 | 9 | ° |
| `globalIllumination` | Global illumination | slider | 0–100, 1 | 30 | % |
| `bounce` | Bounced light | slider | 0–200, 1 | 100 | % |
| `highlightIntensity` | Highlight intensity | slider | 0–100, 1 | 30 | % |
| `shadowIntensity` | Shadow intensity | slider | 0–100, 1 | 33 | % |
| `highlightTint` | Highlight tint | colour | `#rrggbb` | `#ffdfb3` | |
| `shadowTint` | Shadow tint | colour | `#rrggbb` | `#294573` | |
| `offFrame` | Off-frame shadows | switch | | `true` | |
| `animated` | Animate shadows | switch | | `true` | |
| `speed` | Motion speed | slider | 1–10, 1 | 5 | × |

Check the steps against `LIGHT_CONTROLS` in your copy; it is the source of truth.

Dependencies between controls:

- With Long shadows off, every field is disabled.
- **Animate shadows** is disabled when off-frame shadows are off or reduced motion is
  on. **Motion speed** is also disabled when animation is off.
- **Reset lighting** returns every setting to the defaults and keeps the switch as it
  is.

## Saving

- Settings are saved to `localStorage` under `${storageKey}.v3` (schema 3,
  `LIGHT_SCHEMA`), on every change.
- Older saved settings are upgraded once with `upgradeLighting(saved, version)`, then
  the old keys are removed. Schema 1 resets the source size and global illumination,
  whose meaning changed; schema 2 resets global illumination. New hosts start at
  schema 3 and need no upgrade, but keep the call so future schemas work.
- Saved data that can't be read uses the defaults and says so in the status line.
- If saving fails (private mode, storage full), lighting still works on the page and
  the status line says it couldn't be saved.

Change `storageKey` per product, so two products on one origin don't share settings.

## Accessibility and preferences

| Preference | Behaviour |
| --- | --- |
| `prefers-reduced-motion: reduce` | Off-frame shadows stay but don't move; the animation and speed controls are disabled; the motion note says why |
| `prefers-contrast: more` or `forced-colors: active` | The layer is hidden and rims are removed; the host's own borders and shadows return; the status says why |
| Print | The layer is hidden |
| Page hidden | Motion pauses |
| No JavaScript | The switch and fields stay disabled, and a `<noscript>` note explains |
| No WebGL2 | Rims still follow the light; the status says cast shadows are unavailable |

The markup's accessibility contract:

- the switches are `<button role="switch" aria-checked="…">` with visible text labels;
- every slider and colour input has a `<label for>`; sliders have an
  `<output for>` showing the value with its unit;
- the fields sit in a `<fieldset>` with a visually hidden legend, **Light and shadow**;
- the panel surface is a `<section aria-label="Lighting settings">`;
- the status line is `role="status"`, so changes are announced politely;
- every interactive control is at least 44 px high in
  [lighting-panel.css](../assets/lighting-panel.css), with a visible focus ring;
- ids are prefixed with `idPrefix`, so two panels on one page stay unique.

## Data attributes the adapter reads

| Attribute | On | Meaning |
| --- | --- | --- |
| `data-lighting-toggle` | the main switch | toggles `enabled` |
| `data-lighting-panel` | the `<details>` | the panel; closes on Escape and outside clicks |
| `data-lighting-sheet` | the panel surface | its top is measured into `--data-light-panel-top` so the panel fits below a wrapped header |
| `data-lighting-fields` | the `<fieldset>` | disabled while lighting is off |
| `data-light-setting="key"` | each input or switch | the setting it changes |
| `data-unit` | each slider | the unit shown after its value |
| `data-lighting-status` | the status line | |
| `data-lighting-motion` | the motion note | |
| `data-lighting-reset` | the reset button | |

## Copy

Use these strings as they are. They follow the ui-copy rules: sentence case, plain
words, what happened and what to do.

| Where | Text |
| --- | --- |
| Main switch | Long shadows |
| Disclosure | Lighting |
| Panel title and badge | Lighting · Preview |
| Panel hint | Direction names the light source. Lower light lengthens shadows, a bigger source softens and fades them, and global illumination lightens them away from what casts them. |
| Hidden legend | Light and shadow |
| Status, off | Turn on long shadows to adjust the light. |
| Status, on | Long shadows are on. Changes apply across the site. |
| Status, contrast | Lighting is hidden for your contrast preference. |
| Status, no WebGL2 | This browser can’t draw cast shadows, so only edges follow the light. |
| Status, bad saved data | Saved lighting could not be read. Defaults are in use; reset lighting to replace them. |
| Status, can't save | Lighting works for this page, but could not be saved in this browser. |
| Motion note | Off-frame motion is decorative. Glow is controlled separately. |
| Motion note, reduced motion | Motion is paused for your reduced-motion preference. |
| Reset | Reset lighting |
| No script | Lighting needs JavaScript. The page works without it. |

If the host is a single page rather than a site, change "across the site" to "across
the app" or similar, in the adapter and nowhere else.

## Styling the panel

[lighting-panel.css](../assets/lighting-panel.css) styles the `lp-*` classes and reads
`--lp-*` custom properties with `light-dark()` fallbacks. Override the properties to
match the host's tokens, or replace the classes with the host's own components. The
panel's width is `--size-lighting-panel`. The sheet keeps `data-elevation="4"`.
