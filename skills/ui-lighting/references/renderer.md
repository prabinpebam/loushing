# How the renderer draws

[light-renderer.js](../assets/light-renderer.js) draws every cast shadow and every
bounce for the page in one WebGL2 context. Read this before you change anything about
scrolling, stacking or blending on the host, or when a shadow misbehaves.

```text
host settings, saving, controls          (lighting-host.js, or your own)
                ↓
engine: validation, geometry, wedges,     (lighting.mjs, pure, no DOM)
reference shadow, bounce, rims, motion
                ↓
one WebGL2 layer over marked surfaces  +  rim CSS on those surfaces
(light-renderer.js)                        (lighting.css)
```

## API

```js
import { createLightRenderer } from './light-renderer.js';

const renderer = createLightRenderer({
  selector: '[data-elevation]',      // which elements cast
  heights: [0, 2, 6, 12, 24],        // px for data-elevation 0–4 (LIGHT_LEVELS)
  ink: 'var(--light-shadow-ink)',    // any CSS colour; resolved through a probe element
  maxScale: 1,                       // device pixels per CSS pixel, at most
});
renderer.supported;                  // false without WebGL2 or if the shader fails
renderer.update(settings, { visible, motion });
renderer.stats;                      // { casters, draws, layers, frames, timelines }
renderer.destroy();
```

`mountLighting` creates the renderer the first time lighting is turned on, and calls
`update` whenever settings or preferences change. `visible` is false when lighting is
off or more contrast or forced colours are on. `motion` comes from `lightingMotion`.

## What it builds

It appends one container to `<body>`:

```text
[data-light-layer]                     absolute, clipped, no stacking context
  [data-light-shadows]                 z-index: --layer-lighting; multiply over the page
    [data-light-frame="page"]          darken; one per scroll frame
      div › div … › canvas             nested once per scroll container it follows
    [data-light-frame="fixed"]         position: fixed; the view's casters
    [data-light-offframe="posts|gobo"] isolate; darken (posts) or multiply (gobo)
      canvas                           position: fixed; the view's copy for the page
      [data-light-clip="page|fixed"]   one per frame, nested like the frame's divs
        div › … › span                 marker: where the frame's floors sit
        div (clip-path) › div … › canvas   one per floor height, fixed to the view
    [data-light-offframe="add"]        isolate; plus-lighter; same copies, gobo only
  [data-light-glow="page"]             z-index: --layer-lighting; colour-dodge over the page
  [data-light-glow="fixed"]
  canvas (the WebGL surface, hidden)
```

The container must create **no stacking context**: no `z-index`, `opacity`,
`transform`, `filter`, `contain` or `mix-blend-mode` on it. Then the shadow group and
the glow frames blend with the page itself, and a fixed frame can escape the clip.
[lighting.css](../assets/lighting.css) is the only stylesheet that styles it.

## Scroll frames: shadows move with their surfaces

The browser moves sticky surfaces and scrolled boxes on its compositor, ahead of page
scripts. A shadow drawn on the page would lag them in a fast scroll and at the scroll
limit, and detach from the surface. So surfaces are grouped by the frame they move in:

- **the page**: everything that scrolls with the document;
- **the view**: fixed surfaces and the off-frame objects;
- **each sticky surface or scrolling box**: up to 8 groups in all; extra ones fall
  back to their root group.

Each group has its own canvas inside nested `div`s, and each `div` follows one scroll
container through a scroll-driven animation (`ScrollTimeline`), on the compositor too.
A sticky offset is `clamp(s − start, 0, room)` at scroll `s`, measured once per layout
with the surface briefly laid out where it would sit unstuck. A scrolling box's frame
translates by its scroll position. Only **top**-sticky surfaces are followed. A
sticky surface's room to travel is taken from its parent's content box.

Without `ScrollTimeline`, sticky and scrolled surfaces fall back to the page group and
can lag again during fast scrolls. Everything else still works.

## Compositing: the union of shadows, with no flicker

Group `k` draws only the light its own surfaces leave on the ground, `1 − α_k m` per
channel, where `α_k` is their shadow and `m` is one minus the ink. Every group's
surfaces still set the height each pixel stands at, so a card in the page group is
ground for the sticky panel's shadow.

Inside the blend group the canvases are combined with `darken` (the lowest light per
channel), and the group multiplies over the page. For one light, the darkest frame is
the union of the shadows, so shadows from different frames never darken where they
overlap. Because the browser combines them on every frame, a group that scrolls on the
compositor never meets a neighbour drawn for the old position.

> An earlier design divided each frame by the frames before it. That tied the
> view-fixed off-frame shadows to the page's, so every scroll step showed one frame
> of shadow from the old position, flickering most where shadows and bounce met.
> Never reintroduce cross-frame division or a frame that depends on another frame's
> pixels.

Off-frame shadows, from the moving posts or a gobo, are drawn once per change for the
bare page, in view pixels, into the off-frame set: one view-fixed copy for the page
and, per frame, one copy per raised floor height, clipped to that floor's surfaces and
slid sideways by its height (`offFrameStep`), so they keep their size and blur. The
copies paint normally inside the isolated set, each over the floor beneath; only the
set blends with the frames. Posts darken over the frames, like another frame.

A gobo and a surface block **the same source**, so overlapping shadows must not
darken each other. Where the surfaces leave light `F` and the gobo blocks a share
`g`, the page gets `F (1 − g) + g G`, where `G = 1 − intensity × (1 − GI) × (1 − ink)`
is the gobo's full shadow. With a surface blocking `a` that is `1 − k (a + g − a g)`:
in the surface's full shadow the gobo changes nothing, and a fading penumbra merges
into the pattern with no seam. CSS has no blend that does this in one layer, so it is
two sets with the same copies: the gobo set multiplies `1 − g`, and the add set
(`plus-lighter`) adds `g G`. Taking the darker of the two leaves a hard seam;
multiplying the gobo's own light darkens the pattern inside shadows. Where the
browser lacks `plus-lighter`, the add set stays hidden and the gobo set multiplies
`1 − g (1 − G)`. In an umbra with sky hidden (`F < G`) the union is slightly lighter
than the umbra, by at most `g × intensity × GI` at full occlusion.

## Bounce from the same pass

Each surface's walls are lit on the CPU (`litWalls`): only walls whose bounce can
reach the view, kept until something moves. The fragment shader adds their bounce to
the frame's light factor `r = U + B` and writes three render targets at once
(`drawBuffers([COLOR_ATTACHMENT0, COLOR_ATTACHMENT1, COLOR_ATTACHMENT2])`):

- the shadow canvas takes `min(r, 1)`, darkened with the others and multiplied;
- the glow canvas takes `1 − 1 / max(r, 1)` and is colour-dodged over the page after
  every shadow. Colour dodge divides the page by `1 − s`, so it brightens the page by
  `max(r, 1)`; black leaves it unchanged;
- the gobo canvas takes `1 − g` and, in the off-frame pass, the glow target takes
  `g G` for the add set (that pass has no bounce).

Where the page colour times `r` would exceed white, the factor is scaled down evenly
across its channels, so the hue is kept.

## Colours it reads

- The **ink** through a hidden probe element, so `light-dark()` and custom properties
  resolve.
- Each surface's **background colour** as its albedo; a transparent one takes the
  page's. The page's colour is `body`'s, else `html`'s.
- Each surface's **corner radius** (`border-top-left-radius`), and
  `--light-cut-size` and `--light-cut-corner`.

It re-reads them when `class`, `data-scheme`, `data-theme` or `style` change on
`<html>`, or when `prefers-color-scheme` changes. If the host's theme switch changes
something else (for example an attribute on `body`), mirror the theme on `<html>`
as a class or `data-theme`; `update` alone doesn't re-read colours.

## When it redraws

- On scroll, resize, layout changes (a `MutationObserver` and a `ResizeObserver` on
  `<body>`), pointer, focus and transition events, and theme changes, for
  600 ms after each change, so transitions settle. A lost WebGL context is restored
  and redrawn. The layer's own writes never count as changes: a rebuild drops the
  records of its sticky measurements once it has finished, and records on detached
  nodes are ignored, so the layer never rebuilds itself every frame (which would
  restart every sticky and scroll frame's animations).
- Every 33 ms while the off-frame objects move. The page group doesn't redraw while
  only they move.
- Idle pages don't redraw.

The page canvas covers the view plus a quarter of its height above and below, snapped
to 64 px, and moves when the view nears its edge. Canvases use at most `maxScale`
device pixels per CSS pixel (1 by default; the light is soft, so more costs time for
no visible gain).

## Limits

| Limit | Value |
| --- | --- |
| Casters drawn | 128, nearest first; blocks too far to shade the view are skipped |
| Scroll frames | 8 groups including the page and the view |
| Source wedges | 32 (`SKY_BINS`), sampled at a jittered angle per pixel |
| Wall strips | about 24 px each, up to 6 per wall; rounded corners as 3 facets |
| Settle time | 600 ms after a change |
| Motion redraw | every 33 ms |

## Known approximations

- Casters are rounded rectangles from each element's box and radius, with an optional
  straight cut at one corner, extruded straight up. Masks, glyphs and other shapes
  aren't modelled.
- Shadows shade page content, text included, below `--layer-lighting`, but not the
  sticky header, menus or the panel above it. Shadows lower the contrast of text they
  fall on; the more-contrast preference removes the layer.
- Where shadows from different frames overlap, the darker frame's light is taken:
  exact where one shadow covers what the other hides of the source, a little light
  where two penumbras hide different parts. Within a frame the union is exact.
- Sky occlusion takes the single block that hides the most and is exact for a long
  wall, approximate near corners.
- Bounce is one bounce, from walls onto the ground, unblocked on its way; it reaches
  only the ground of its own frame. It's computed in linear light and applied to the
  sRGB page colour, as the shadows are.
- Off-frame objects are far away, so global illumination fades their shadows almost
  evenly, by `1 − g`. Changing the source size or the window size rescales their
  schedule, so they can jump while a slider moves.
- 32 wedges with jitter leave faint grain in wide penumbras.
- Only top-sticky surfaces; no bottom, left or right sticky, and no right-to-left
  horizontal scrolling.
- Saved lighting applies when the module loads, not before first paint.
- Certified only in Chromium-based browsers on desktop. Safari and Firefox lack
  `ScrollTimeline` in some versions; mobile GPUs aren't measured.

## Performance in the reference

With the off-frame shadows moving (RTX 4090, 240 Hz, one device pixel per CSS pixel),
frames held at 4.2 ms with no long tasks, and the layer's work took 1.1–2.1 ms per
update. Fast wheel scrolling gave 4.3 ms at the 95th percentile. Measure your own host;
these numbers are a reference, not a promise.
