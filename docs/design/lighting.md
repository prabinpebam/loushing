# Lighting system

> **Prototype, 23 October 2026.** A portable, opt-in lighting layer tested on
> Loushing. It changes neither theme selection nor glow. Every cast shadow comes
> from one shared calculation that works out, for each pixel, how much of an area
> light the raised surfaces hide together. So shadow length, blur, fade and overlaps
> follow one physical model: a distant light of a given angular size, surfaces
> that are blocks standing on the page, and sky hidden by nearby blocks. The
> approximations are listed below.

## What the owner asked for

<div class="slate-card-grid" data-cols="3">
  <article class="slate-card"><h3 class="slate-card__title">One light</h3><p class="slate-card__body">Choose direction, elevation, source size, global illumination, warm highlight and cool shadow tints, and their intensities.</p></article>
  <article class="slate-card"><h3 class="slate-card__title">Elevated surfaces</h3><p class="slate-card__body">Higher surfaces cast longer, softer, fading shadows. Their edges face the same light.</p></article>
  <article class="slate-card"><h3 class="slate-card__title">A living room</h3><p class="slate-card__body">Optional shadows from unseen objects drift across the whole view, each at its own speed and in its own direction, with separate motion and speed controls.</p></article>
</div>

The owner supplied a UI style-guide image with NW-to-SE light, broad soft shadows,
lit borders and selective glow. It is visual reference, not evidence that an
implementation uses a particular renderer. No reference pixels or external code
were copied. Glow remains separately controlled and is not enabled by lighting.

## Prior art: what already exists

| Prior art | Verified behaviour | What we reuse conceptually | What it does not establish |
| --- | --- | --- | --- |
| [Ambient CSS](https://ambientcss.com/) / [source](https://github.com/kikkupico/ambientcss) | Existing MIT-licensed lighting library; its README documents container light vectors, key/fill intensity and hue, elevation-scaled umbra/penumbra, edge highlights and surface gradients | The closest reusable precedent: shared lighting affecting many DOM surfaces | The exact requested source-size control, independent tint controls or moving off-frame scene were not verified; its raytrace-calibration claim has not been independently benchmarked here |
| [Material environment](https://m1.material.io/material-design/environment.html) | Elevation differences create shadows; directional key and soft ambient lights combine | A consistent scene and explicit surface heights | A complete configurable web room-lighting engine |
| [Fluent 2 elevation](https://fluent2.microsoft.design/elevation) | Key + ambient shadows; higher objects get softer shadows; documented equations generate the shadow ramp | Geometry-driven parameters rather than unrelated shadow presets | Exact light transport or animated off-frame occluders |
| [Tobias Ahlin: layered shadows](https://tobiasahlin.com/blog/layered-smooth-box-shadows/) | Multiple CSS shadows vary offsets, blur and alpha; decreasing alpha creates concentrated shadows with diffuse tails | A bounded fading CSS stack | Physical occlusion, surface geometry or a single exact blur equation |
| [Microsoft Reveal Focus](https://learn.microsoft.com/en-us/windows/uwp/ui-input/reveal-focus) | Light animates the border of the currently focused control | Evidence that light-reactive borders have prior art | Global directional sunlight; Reveal Focus is a separate focus effect, not this feature |
| [GPU Gems 3, chapter 8](https://developer.nvidia.com/gpugems/gpugems3/part-ii-light-and-shadows/chapter-8-summed-area-variance-shadow-maps), §8.6 | Soft-shadow techniques estimate penumbra from source width and blocker/receiver distance using similar triangles | Contact hardening and a mathematically defined penumbra | A Gaussian CSS blur being identical to a physical penumbra |

**Conclusion:** yes, this exists beyond isolated demos. **Ambient CSS is the closest
verified reusable precedent**, not merely an elevation-token scale. Its MIT license
and documented feature set were checked through the GitHub repository and README.
Before creating a standalone package, compare adapting it against retaining this
small prototype engine. We have not verified that it covers every requested control.

[Neumorphism.io](https://neumorphism.io/) is a related design generator, not evidence
of a live scene-lighting engine. The historically cited `shadows.brumm.af` currently
returns a domain-parking page, so it is not recommended as an active tool.
The renderer's per-direction skyline is the idea behind horizon mapping (Max, 1988)
and horizon-based ambient occlusion (Bavoil, Sainz and Dimitrov, 2008). Here it is
computed exactly from boxes instead of from a height map.
This is a bounded prior-art review, not a novelty claim or an exhaustive survey.
No external library was installed or its implementation copied.

## The geometry

The light is a distant source, like the sun or a bright sky window, seen at an
angular diameter `θ` (the **Light source size** control, in degrees; Blender's sun
lamp uses the same "angle" idea). It sits at `altitude` above the receiving plane
and at `azimuth` around it. A point at height `z` above the plane casts:

```text
central offset        L(z) = z / tan(altitude)
lateral penumbra      p(z) = 2 z tan(θ / 2) / sin(altitude)

dx = -sin(azimuth) × L
dy =  cos(azimuth) × L
```

Azimuth names the **source** clockwise from north: north `0°`, east `90°`, south
`180°`, west `270°`; NW `315°` casts toward SE. CSS y increases downward. Both
lengths grow linearly with height, so their ratio is fixed by the light alone:
`p / L = 2 tan(θ / 2) / cos(altitude)`. A point light (`θ = 0`) has no penumbra
at any height. A bigger source, or a lower one, blurs more. The lateral penumbra
is checked against rays traced from the edges of the source.

**Altitude `0°`** puts the light on the horizon, where `L` is infinite: a point light
there casts shadows that never end. A light with any size still has its upper half
above the horizon, and that half lights the ground far away, so its shadows are very
long but fade out at a finite distance.

Along the light direction the penumbra is longer and lopsided: rays from the top and
bottom of the source land at `z / tan(altitude ± θ/2)`, and the part of the source
below the horizon sends no light at all. That lopsided penumbra is the fade of a long
shadow, and the renderer draws it exactly (below).

### A long shadow is an extruded block, not a floating layer

A normal UI shadow treats the raised surface as a thin sheet floating at height `h`:
it casts one copy of itself, offset by `L(h)`. A long shadow treats the surface as a
solid block that stays joined to the ground. Every height from 0 to `h` casts, so
the shadow is the union of the footprint projected from each height. It is attached
at contact and reaches `L(h)` at the far end. With a point light that union is a
crisp prism with diagonal walls at the corners; a single offset copy would float
apart from the surface, which is wrong.

### One layer for one light

Shadows are not drawn surface by surface. One shared layer works out, for every
pixel, how much of the light all the raised surfaces hide together:

1. The source is a disc of angular diameter `θ` in the sky, clipped at the horizon.
   It is cut into 32 thin wedges by direction. Each wedge spans the elevations
   `e₁` to `e₂` that the disc covers in that direction.
2. A level surface receives light from elevation `e` in proportion to `sin e`, the
   cosine of incidence. So a wedge's share of the light is proportional to
   `sin² e₂ − sin² e₁`, and the whole disc gives `π sin²(θ/2) sin(altitude)` when it
   is clear of the horizon (a test, within 1 %).
3. From the pixel, each wedge looks along the ground toward the light. A block `Δz`
   taller than the pixel's own surface, reached after a ground distance `t`, hides
   every elevation up to `atan(Δz / t)`. The wedge's **skyline** is the highest of
   these over all blocks.
4. The shadow is the share of the source below the skyline:

   ```text
   s       = highest over blocks of  Δz² / (Δz² + t²)        (sin² of the skyline)
   blocked = Σ over wedges of clamp(s − sin² e₁, 0, sin² e₂ − sin² e₁) / total
   ```

   A point source is a single ray, so a pixel is either fully shadowed or lit.

Each wedge keeps the **highest** skyline, never a sum. Light a pixel can't see is
hidden once, whichever block hides it, so **shadows from the same light never get
darker where they overlap**, as outdoors. The tests check that two blocks together
are never darker than the shadow intensity, at least as dark as either alone, and no
darker than both added.

The pixel's own surface is the tallest block containing it, and only taller blocks
shade it. So a high card's shadow falls across lower cards and onto the page, and a
nested surface stands on its parent. Each pixel samples its wedges at a slightly
different angle, which turns the steps between wedges into fine grain.

### A cut corner changes the block

A card with a folded corner (Loushing's dog-ear) is a block with that corner cut
off, and the cut runs down the whole extrusion. So the shadow starts at the cut, not
at the corner the card would have had. With a cut of size `c` at a corner `K` whose
outward signs are `(sx, sy)`, a point `p` is inside the block when it is inside the
rounded box and

```text
h(p) = (sx (px − Kx) + sy (py − Ky) + c) / √2  ≤  0
```

Rays enter a cut block through the rounded box or through the cut line, whichever
keeps them inside both. From the north-west, a top-right cut runs along the light,
so the shadow's upper edge continues the cut. The folded flap lies on the card's
face and casts nothing of its own. A host marks the cut with `--light-cut-size` (a
registered length, so `2rem` works) and `--light-cut-corner` (`top-left`,
`top-right`, the default, `bottom-right` or `bottom-left`). A surface clipped by a
scrolling box loses its cut, since the cut corner may be out of view.

### Umbra and penumbra: how a long shadow fades

Near a block, it hides the whole source: the umbra, at full darkness. Further away
it hides only the lower part of the source, the penumbra, and less and less of it,
until the light is fully visible. So **the light's size sets the fade**. A point
light casts a crisp prism of length `L`. A larger source ends the umbra sooner and
fades out further away.

A long block's shadow along the light, at the defaults (altitude `0°`, `θ = 9°`). On
the horizon a point light's `L` is infinite, so the source's size alone ends the
shadow:

| Surface | Height | Point-light length `L` | Full shadow ends (95 %) | Half dark | Fades out (5 %) |
| --- | --- | --- | --- | --- | --- |
| Control | 2 px | never ends | 27 px | 42 px | 139 px |
| Card | 6 px | never ends | 82 px | 125 px | 416 px |
| Highlighted card | 12 px | never ends | 164 px | 251 px | 833 px |
| Panel | 24 px | never ends | 328 px | 502 px | 1,666 px |

Every distance scales with height, so higher surfaces cast the same shape, larger (a
test). At this altitude, the source's lower half is below the horizon. Only its
upper half lights the ground, so the shadow fades out at a finite distance.

The light changes the same 12 px block's shadow:

| Altitude | Source size `θ` | Full shadow ends | Half dark | Fades out |
| --- | --- | --- | --- | --- |
| 20° | 0° (point) | 33 px | 33 px | 33 px |
| 20° | 10° | 27 px | 33 px | 42 px |
| 20° | 30° | 19 px | 28 px | 66 px |
| 6° | 0° (point) | 114 px | 114 px | 114 px |
| 6° | 9° | 69 px | 97 px | 221 px |
| 6° | 40° | 27 px | 42 px | 138 px |
| 0° | 0° (point) | never | never | never |
| 0° | 4° | 370 px | 565 px | 1,875 px |
| 0° | 9° (default) | 164 px | 251 px | 833 px |
| 0° | 20° | 73 px | 112 px | 374 px |

A very large source near the horizon reaches high into the sky. Most of its light
then arrives steeply, so the whole shadow gets shorter as well as softer.

### Global illumination: lighter away from the blocks

Real shadows are not lit by the sun alone. Light bounced from the room and the sky
reaches them too, but a nearby block hides part of that sky as well. So **global
illumination lightens a shadow only where it is far from the blocks around it**. It
casts no shadow of its own, never shades lit ground and never fades a whole shadow
evenly.

For a point at distance `d` from a block `Δz` taller, whose footprint spans the angle
`ω` seen from the point (`π` for a long wall, or at contact):

```text
sky hidden   occ(d) = (ω / π) × (1 − d / √(d² + Δz²))
darkness     alpha  = I × blocked × (1 − g × (1 − min(1, occ)))
```

`occ` is the highest over the nearby taller blocks. It is the sky hidden as a share
of what a long wall hides at its foot, which is half of the cosine-weighted sky:
`½ (1 − d / √(d² + h²))`, checked against numerical quadrature. `I` is the shadow
intensity and `g` the global illumination from 0 to 1. So:

- at a block's foot `occ` is 1, and the shadow keeps its full darkness for any `g`;
- with `g = 0` a shadow fades only by its penumbra;
- with `g = 1` a shadow fades as the sky opens up, long before its penumbra ends;
- lit pixels have `blocked = 0`, so global illumination never darkens them.

| Shadow intensity 33 %, 12 px block, defaults | At 1 px | 20 px | 60 px | 120 px | 240 px |
| --- | --- | --- | --- | --- | --- |
| Global illumination 0 % | 0.33 | 0.33 | 0.33 | 0.33 | 0.18 |
| 30 % (default) | 0.32 | 0.25 | 0.23 | 0.23 | 0.12 |
| 60 % | 0.31 | 0.16 | 0.14 | 0.13 | 0.07 |
| 100 % | 0.30 | 0.05 | 0.01 | 0.00 | 0.00 |

### Shadows from beyond the frame and lit edges

**Off-frame shadows** come from tall objects beyond the edge of the view that faces
the light, fixed to the view. Each is a separate object, not part of a group:
32 objects, drawn once from a fixed seed, each with its own width (56–168 px),
speed (0.6–1.5 times the base, so 24–60 px a second at the default 5×), direction
(either way across the light) and path, which slants toward or away from the view
as its gap from the edge changes (40–420 px). Each enters from beyond one side,
sweeps its shadow across the whole view and leaves past the other side. It starts
and ends its pass where its shadow, widened by the source's spread over the depth of
the view, clears the view, so no shadow appears or vanishes in view. Their starts
are staggered so that each object begins its middle stretch before the previous
one ends it. A shadow is therefore always in view, and usually two to seven objects
are on their way, overlapping and passing each other. The objects go through the
same calculation as the surfaces, so where their shadows cross they don't darken
each other.

**Edges** stay CSS: a lit surface's own `box-shadow` becomes inset rims, warm on
the edges facing the light and cool on the far edges, with their own intensities.

## Promise, flows and observable success

**LP1:** a person can change the lighting without losing a readable, usable catalog.
It breaks if decoration hides content, intercepts input, overrides theme choice or
forces motion. This supports the design-system requirement for consistent surfaces;
it adds no new catalog content or publication scope.

**LJ1:** when judging the look of a UI, I want one coherent light so its depth and
edges agree. **LJ2:** when reading or sensitive to motion, I want to remove decoration
without changing my theme or my work.

| User can / acceptance row | Flow and branches | Evidence required |
| --- | --- | --- |
| LU1: choose lighting independently of theme (LJ1, LJ2) | Turn on Long shadows → change theme → lighting remains on → turn off restores original styling | Browser checks in light and dark, on/off, reload and another page |
| LU2: direct and shape the light (LJ1) | Open Lighting → adjust direction, elevation, source size, global illumination, tint and intensity → surfaces update | Projection, source-share, brute-force ray-trace, overlap and sky-occlusion quadrature unit tests; shader pixels compared with the reference; visible light/dark review |
| LU3: choose off-frame shadows and motion independently (LJ1, LJ2) | Enable off-frame → optionally animate → adjust speed; disable off-frame stops motion | Browser animation state and speed checks |
| LU4: retain control under accessibility preferences (LJ2) | Reduced motion freezes drift; more-contrast/forced colours suppress lighting; keyboard reaches and closes controls | Media emulation, small screen and keyboard checks |
| LU5: retain settings or get an honest failure (LJ1, LJ2) | Reload/visit another page retains settings; invalid saved data uses defaults and a visible warning; failed save says it is page-only | Persistence, corrupt-settings and denied-storage browser checks |
| LU6: apply lighting to another host (LJ1) | Mark elevated surfaces; supply host tokens and generated properties | Product-independent engine and CSS checks; extraction contract below |

## As built and extraction boundary

```text
host settings / persistence / controls
                ↓
pure engine: validation, geometry, source wedges, reference shadow, rim properties
                ↓
shared WebGL2 shadow layer over marked surfaces  +  rim CSS on those surfaces
```

- `site/src/lib/lighting.mjs`: no DOM, framework or Loushing imports. Exports
  settings and limits, validation, upgrades of older saved settings, projection,
  source wedges, ray entry into rounded boxes with an optional cut corner, sky
  occlusion, the reference shadow at a point (`shadowAt`, which the shader mirrors),
  the independent off-frame objects, rim properties and the motion policy.
- `site/src/client/light-renderer.js`: the portable layer; its only import is the
  engine. `createLightRenderer({ selector, heights, ink })` measures every visible
  element matching the selector (default `[data-elevation]`). Its height is
  `heights[level]` added to those of lit ancestors, its corner radius comes from
  CSS, and it's clipped to the scrolling boxes around it. The layer redraws only
  when the scene may have changed (scroll, resize, layout, pointer, focus,
  transitions, theme), for 600 ms after each change, or every 33 ms while off-frame
  shadows move. At most 128 casters are drawn, and blocks too far away to shade the
  view are skipped. The canvases use at most one device pixel per CSS pixel. Without
  WebGL2, edges still follow the light and the panel says cast shadows are
  unavailable.
- **Shadows move with their surfaces.** The browser moves sticky surfaces and
  scrolled boxes on its compositor, ahead of page scripts, so a shadow drawn on the
  page lags them during a fast scroll and at the scroll limit. So surfaces are
  grouped by the frames they move in: the page, the view (fixed surfaces and the
  off-frame objects), and each sticky surface or scrolling box, up to 8 groups. Each
  group has its own canvas inside nested frames, and each frame follows its sticky
  offset or scroll position through a scroll-driven animation, on the compositor
  too. A sticky offset is `clamp(s − start, 0, room)` at scroll `s`, measured once
  per layout with the surface briefly laid out where it would sit unstuck. One
  WebGL2 context draws every group.
- **Groups multiply to the exact union.** Group `k` draws the increment
  `(1 − α≤k) / (1 − α<k)`, where `α≤k` is the shadow of the groups up to `k` and
  `α<k` of those before it, all computed together on the same skyline. The canvases
  multiply over the page, so their product is the shadow of all the surfaces at
  once, and overlaps across groups never darken either. The page group comes first,
  so it doesn't redraw while the off-frame objects move.
- `site/src/styles/lighting.css`: no Loushing component selectors. Public contract:
  root `data-lighting="on"`, surface `data-elevation="0"…"4"`, the optional cut
  (`--light-cut-size`, `--light-cut-corner`) and the `[data-light-layer]` it styles:
  an absolute, clipped container with no stacking context, whose frames sit at
  `--layer-lighting` and multiply over the page. A lit surface's own `box-shadow`
  is replaced by its rims.
- `site/src/client/lighting.js`: the Loushing DOM and storage adapter. It creates the
  layer the first time lighting is on. Settings are saved under schema 3. Older saved
  settings keep everything except values whose meaning changed: schema 1 resets the
  source size and global illumination, and schema 2 resets global illumination. Only
  the open panel's top edge is measured, to fit below a wrapped header.
- `site/src/components/compounds/lighting.mjs`: settings disclosure assembled from
  sealed inputs and switches. The layout places it.
- Elevations: 0 flat/sunken, 1 primary controls, 2 raised cards, 3 highlighted cards
  and Get it panels, 4 lighting panel, at 2, 6, 12 and 24 px. Empty slots, text and
  Chopper are not casters.
- Host tokens supply the panel size (`--size-lighting-panel`), the layer level
  (`--layer-lighting`, 99: above page content, below the sticky header, menus and
  the panel) and the dark-mode ink (`--lighting-dark-tint`, `--color-lighting-ink`).
  User-chosen geometry and colours are data, exposed as `--data-light-*`.
- **The host must paint its page colour inside the blend group.** The layer
  multiplies over what is beneath it, but browsers leave the root canvas background
  out of `mix-blend-mode`. When only `body` has a background, that background
  becomes the root canvas's, and the layer multiplies over nothing: a dark page
  turns white. Loushing gives `html` its own background, so `body` keeps its own,
  and `body` isolates the blend group.
- Inset highlights and shading create directional borders without removing semantic
  borders or focus outlines. Glow is not inferred from elevation.
- More-contrast and forced-colour modes keep the host's normal shadows and borders
  and hide the layer. Printing hides the layer.

For another host, copy the engine, renderer and CSS, mark elevated surfaces, pass
the heights, provide the documented tokens, paint the page colour inside the blend
group, and adapt the controls and storage. This is a reusable source boundary,
**not yet a published package or a certified cross-browser library**.

### Known approximations and deferred work

- Casters are rounded rectangles from each element's box and corner radius, with an
  optional straight cut at one corner, extruded straight up. Masks, text glyphs and
  other shapes aren't modelled.
- The frames sit at `--layer-lighting`. They shade page content, including text, but
  not the sticky header, menus or the Lighting panel above it.
- Shadows darken the text they fall on. That is physically right but lowers
  contrast, more so in dark mode. The more-contrast preference removes the layer.
- Only top-sticky surfaces are followed; bottom, left and right sticky, and
  right-to-left horizontal scrolling, aren't modelled yet. A sticky surface's room
  to travel is taken from its parent's content box, which is right for Loushing's
  header and Get it panel but not for every containing block.
- Without scroll-driven animations (`ScrollTimeline`), sticky and scrolled surfaces
  fall back to the page group and can lag them again during fast scrolls.
- Where groups that move against each other overlap, such as the off-frame shadows
  over a sticky panel's shadow, the overlap can be slightly off for a frame or so
  while scrolling, until the groups redraw.
- Sky occlusion takes the single block that hides the most, not the union of
  several, and uses each block's angular width. It is exact for a long wall and
  approximate near corners.
- Off-frame objects are far away, so global illumination fades their shadows almost
  evenly, by `1 − g`. Their pattern is art-directed, not a scene. Changing the source
  size or the window size rescales their schedule, so objects can jump while a
  slider moves.
- Shadow length comes from surface height and altitude. With levels of 2–24 px,
  long shadows need a low light; taller levels are a design lever, not changed here.
- 32 wedges with per-pixel jitter leave faint grain in wide penumbras.
- Saved lighting applies when the enhancement module loads, not before first paint.
- No mobile GPU, Safari/Firefox matrix, field telemetry or performance baseline has
  been certified.
- Component stories and the generated design library remain the existing project
  follow-up; the portable-engine tests and real Loushing views exercise this preview.

## Working decisions

The owner was unavailable for the first defaults question. On 23 October 2026 the
owner set the default light and motion from the Lighting panel (LO3, LO6). The other
rows are reversible working defaults, **not owner-approved product decisions**.

| ID | Decision | Working default | Approval |
| --- | --- | --- | --- |
| LO1 | Initial appearance | Lighting off; independent of system/light/dark | Awaiting review |
| LO2 | Controls | Visible Long shadows switch beside theme; compact Lighting disclosure | Awaiting review |
| LO3 | Motion | Off-frame shadows on and animated, at 5×; separate objects with their own speeds and directions, at least one shadow always in view; reduced motion always wins | Owner set, 23 Oct 2026 |
| LO4 | Renderer | Dependency-free WebGL2 shadows that work out area-light visibility per pixel, one canvas per scroll frame; edges stay CSS | Awaiting visual review |
| LO5 | Extraction | Portable source boundary now; compare adapting Ambient CSS before choosing an independent package, name, API and license | Not decided |
| LO6 | Default light | From the north-west (315°), altitude 0°, source 9°, global illumination 30 %, highlight 30 %, shadow 33 %, warm and cool tints | Owner set, 23 Oct 2026 |

**Try it:** at the site preview, turn on **Long shadows**. Watch the off-frame
shadows for a minute: several drift across at different speeds, some each way, and
there's always at least one in view. Open an item page
and scroll fast, and to the very end: the Get it panel's shadow stays attached, and
its upper edge starts at the folded corner. Open **Lighting**. Set the source size
to 0° for shadows that never end, then raise it toward 120° to watch the umbra
shorten and the shadow fade from its tip. Raise the elevation to see the shadows
shorten. Where two cards' shadows cross, the overlap keeps the same darkness. Move
**Global illumination** from 0 % (shadows fade only by their penumbra) to 100 %
(shadows lighten away from the cards but stay dark at their feet). Rotate the
source and change theme. Turn the main switch off to compare with the existing
design.

## Prototype evidence

Checked locally on 23 October 2026:

- **64 site tests pass.** The 25 lighting tests cover:
  - the projection, including altitude 0°;
  - the source's share of light against its exact projected solid angle;
  - ray entry into rounded boxes, and into cut corners against an independent
    point-in-shape march at all four corners;
  - the attached point-light prism, and the umbra and fade against source size;
  - shapes that scale with height, and stacked surfaces;
  - overlaps that never darken;
  - agreement with a brute-force ray trace (within 0.03 over four lights);
  - sky occlusion against quadrature, and global illumination that keeps contact
    dark and lit ground clean;
  - the off-frame objects: separate, with sizes, speeds, directions and paths that
    vary within their ranges, each moving at its own speed every step, always
    outside the view and toward the light, entering and leaving clear of the view,
    several in flight together, and at least one shadow in view at every sampled
    moment (eight light directions at 1280 × 860; phone and wide views, low and
    raised light, point and area sources);
  - the owner's defaults, rims, motion, the panel, the schema 3 upgrades, the
    layer's CSS contract and independence from Loushing.

  The other tests cover component tiers, generated tokens, contrast pairs,
  publication checks and built-page links.
- **59 pages build**, style lint reports tokens only, token checks pass and the
  Slate runtime host check passes.
- **The cut corner is in the pixels.** Beside the Get it panel, points between where
  an uncut corner's shadow would begin and the cut line are lit (255 of 255), and
  points past the cut line are shadowed.
- **Shadows stay attached when scrolling.** On a 12,000 px item page, the Get it
  panel's frame stayed at the same offset from the panel (a spread of 0 px) at 37
  scroll positions, including the scroll limit where the panel stops sticking.
  Screenshots taken mid-way through fast wheel scrolls, and at the limit, show the
  shadow joined to the panel.
- **The off-frame objects run independently.** Sampled every second for 60 s at the
  defaults (1280 × 860), the view always held off-frame shadow (at least 8,600 of
  about 30,000 sampled points shaded), and a line across the light crossed one to
  four separate shadow bands that grew, merged and parted as objects passed.
- **Performance:** with the off-frame shadows moving (RTX 4090, 240 Hz, one device pixel
  per CSS pixel), frames held at 4.2 ms with no long tasks. Wheel scrolling the
  item page gave 4.3 ms at the 95th percentile and 16.6 ms at worst. Idle pages
  don't rebuild; a resize rebuilds once.
- **Light and dark** were checked on the catalog and an item page with no page
  errors.
- Earlier checks, made before the scroll frames, weren't repeated: the
  single-layer shader matched `shadowAt` over 265 screenshot points (0.004 on
  average, 0.023 at most), and settings, reload and cross-page persistence, keyboard
  sliders and Escape, motion speed, reduced motion, more contrast, forced colours,
  invalid saved settings, denied storage and a 320 × 740 screen all passed.

This is prototype evidence, not a cross-browser or production-performance
certification. The limitations above remain open for the next stage.
