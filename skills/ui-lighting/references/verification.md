# Verifying a port

Prove the host gets the same result as the reference, in three layers: the unit check
on your copies, a side-by-side browser review against the demo, and, for a change to
scrolling or compositing, a frame-by-frame flicker check. Report what you ran, what
passed and what you couldn't check.

## 1. The unit check

```bash
LIGHTING_ENGINE=src/lighting/lighting.mjs \
LIGHTING_RENDERER=src/lighting/light-renderer.js \
LIGHTING_CSS=src/lighting/lighting.css \
LIGHTING_PANEL=src/lighting/lighting-panel.js \
node --test path/to/ui-lighting/scripts/check-lighting.mjs
```

```powershell
$env:LIGHTING_ENGINE = 'src\lighting\lighting.mjs'
$env:LIGHTING_RENDERER = 'src\lighting\light-renderer.js'
$env:LIGHTING_CSS = 'src\lighting\lighting.css'
$env:LIGHTING_PANEL = 'src\lighting\lighting-panel.js'
node --test path\to\ui-lighting\scripts\check-lighting.mjs
```

Node 20 or later, no installs. Paths are relative to the current folder; without the
variables it checks the kit's own assets. Expect **29 passing** (28 and one skipped
without a panel module). It takes a few seconds, because it ray-traces a reference.

What it proves:

- projection: `L = h / tan(a)`, the lateral penumbra, the compass, the limits at
  contact, for a point light, at the zenith and at the horizon;
- the source's share of light against its exact projected solid angle;
- ray entry into rounded boxes, and into cut corners, against an independent march;
- the attached point-light prism, and the umbra and fade against the source size;
- shapes that scale with height, and stacked surfaces;
- overlapping shadows that never darken;
- agreement with a brute-force ray trace, within 0.03, over four lights;
- sky occlusion against quadrature, and global illumination that keeps contact dark
  and lit ground clean;
- off-frame objects that are separate, vary within their ranges, enter and leave clear
  of the view, and always keep at least one shadow in view;
- bounce: the form factor against a brute-force integral, nothing behind a wall, the
  inverse-square fall-off, walls lit by `cos(a) n · l`, shaded walls bouncing nothing,
  a red wall bouncing only red;
- the defaults, rims, motion policy, settings validation and upgrades;
- the panel's markup: every setting, labels for every input, unique ids, an honest
  no-script state;
- the CSS contract: rims only where colours are the author's, a layer with no stacking
  context, the darken group, the dodge glow, the cut-corner property, hiding for
  contrast and print, and the host tokens it reads;
- the renderer contract: its only import is the engine, one pass writes shadow and
  glow, each frame shades only with its own casters.

If it fails on your copies, you changed a file the kit says not to change. Restore it.

## 2. The browser review

Serve over HTTP (modules don't load from `file://`) and bind to loopback:

```bash
python -m http.server 8090 --bind 127.0.0.1 --directory path/to/ui-lighting/assets
# open http://127.0.0.1:8090/demo.html beside the host
```

Go through every row, in light and dark mode, and at a desktop and a phone width.

| Check | Expect |
| --- | --- |
| Turn Long shadows on | Long, soft shadows fall to the south-east from every raised surface. The page colour is unchanged where there's no shadow. No console errors |
| Turn it off | The host looks exactly as before: its own shadows and borders return |
| Change theme while on | Lighting stays on; shadows turn a deep cool tint in light mode and near-black in dark mode |
| Reload, and visit another page | The setting and every slider persist |
| Look at a card's foot | The shadow is attached at the contact edge and darkest there; it never floats apart |
| Two cards' shadows overlap | The overlap is no darker than either shadow |
| Edges | The top and left edges are lit warm, the bottom and right edges shaded cool, from the north-west |
| A folded corner | The shadow's upper edge starts at the fold, not at the uncut corner |
| A button on a card | It casts from the card's height onto the card |
| A coloured card | Its lit north and west walls throw a soft glow of its colour into the shade above and left of it, fading with distance |
| Dark mode bounce | Dark cards bounce almost nothing; light or coloured ones still do |
| Off-frame shadows | Within a minute, several wide soft bands drift across at different speeds, some each way; at least one is always in view |
| Fast scroll, then the very end of the page | Sticky surfaces and scroll boxes keep their shadows attached; nothing flickers |
| Lighting panel | Opens and closes (Escape returns focus, outside click closes), casts its own shadow, every control works and updates the page at once |
| Light source size 0° | Crisp shadows that never end |
| Source size 120° | Short umbra, shadows fade from their tips |
| Light elevation up | Shadows shorten |
| Global illumination 0 → 100 % | Shadows lighten away from their casters but stay dark at their feet |
| Bounced light 0 → 200 % | The coloured glow appears and strengthens; lit ground barely changes |
| Reduced motion (emulate) | Drift stops; the motion note says why |
| More contrast or forced colours (emulate) | The layer and rims disappear; the status says why |
| Keyboard only | The switch, disclosure and every control are reachable, labelled and visibly focused |

Compare the host with the demo at the same settings. Shadow length, softness, darkness
and tint should match surface for surface at the same elevation.

## 3. Numbers to compare

At the defaults (azimuth 315°, altitude 0°, source 9°), along the light, a long block's
shadow, from [model.md](model.md):

| Surface | Height | Full shadow ends | Half dark | Fades out |
| --- | --- | --- | --- | --- |
| Level 1 | 2 px | 27 px | 42 px | 139 px |
| Level 2 | 6 px | 82 px | 125 px | 416 px |
| Level 3 | 12 px | 164 px | 251 px | 833 px |
| Level 4 | 24 px | 328 px | 502 px | 1,666 px |

Shadow alpha beside a 12 px block at shadow intensity 33 %, global illumination 30 %:
0.32 at 1 px, 0.25 at 20 px, 0.23 at 60 px. Bounce from a white 12 px wall: 0.32 of
full light at 1 px, 0.10 at 12 px, 0.01 at 48 px.

To probe a number in the page, compare screenshots with lighting off and on: the ratio
of the two pixel values is the light left, `1 − alpha × (1 − ink)` per channel.

## 4. The flicker check

Use it after any change to scrolling, stacking, blending or the frame structure.

1. In a Chromium browser driven by Playwright or Puppeteer, open the page with lighting
   on at the defaults and let it settle.
2. Start a CDP screencast (`Page.startScreencast`, PNG, every frame) to record composited
   frames.
3. Scroll with the mouse wheel in steps (for example 20 steps of 120 px, 50 ms apart),
   with the pointer away from the cards, then wait 1 s.
4. For each scroll step, compare the **first** recorded frame after the step with the
   **settled** frame at the same scroll position (screenshot after 700 ms).
5. Pass: no differences beyond 1 px sub-pixel shifts of whole content, text included.
   Fail: patches of tens of thousands of pixels differing by tens of levels, usually
   card outlines inside the off-frame shadows; that means a frame was combined with a
   stale neighbour.

Also scroll to the very end quickly and measure, at many scroll positions, the offset
between a sticky surface and the visible edge of its shadow. The spread must be 0 px.

## 5. Performance

Record a performance trace with the off-frame shadows moving and while wheel scrolling.
Report frame times at the median and 95th percentile and any long tasks. The reference
held 4.2 ms frames with no long tasks on a fast desktop GPU; on slower hardware, check
that frames stay within the display's budget and the layer's update stays a small
share of it. `maxScale` is already 1. Don't edit the renderer to make it faster; mark
fewer surfaces, or fewer at high levels, instead.
