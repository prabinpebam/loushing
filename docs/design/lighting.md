# Lighting system

> **Prototype, 23 October 2026.** A portable, opt-in lighting layer tested on
> Loushing. It changes neither theme selection nor glow. Every cast shadow comes
> from one shared calculation that works out, for each pixel, how much of an area
> light the raised surfaces hide together. So shadow length, blur, fade and overlaps
> follow one physical model: a distant light of a given angular size, surfaces
> that are blocks standing on the page, sky hidden by nearby blocks, and light
> bounced by lit walls. The approximations are listed below.

## What the owner asked for

<div class="slate-card-grid" data-cols="3">
  <article class="slate-card"><h3 class="slate-card__title">One light</h3><p class="slate-card__body">Choose direction, elevation, source size, global illumination, warm highlight and cool shadow tints, and their intensities.</p></article>
  <article class="slate-card"><h3 class="slate-card__title">Elevated surfaces</h3><p class="slate-card__body">Higher surfaces cast longer, softer, fading shadows. Their edges face the same light, and their lit walls bounce their own colour onto the ground beside them.</p></article>
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

### Bounced light: walls light the ground beside them

A raised block's walls are lit too. A wall facing the light reflects it diffusely,
in the colour of its surface, onto the ground beside it, as a path tracer's first
bounce would. A white card throws a soft white glow; a peach card throws a peach
one. Bounce never casts a shadow.

**How much light a wall gets.** For a wall with outward normal `n` and a light
from azimuth `l` at altitude `a`:

```text
wall light   E = cos(a) × max(0, n · l) × V
```

`V` is the share of the source the wall still sees past other blocks, off-frame
objects included. It is weighted for an upright receiver (each elevation `e`
counts `cos² e`) and averaged at a quarter and three quarters of the way up the
wall. Each wall is split into strips about 24 px long (up to 6), each with its own
`E`, so a wall half in another block's shadow bounces only from its lit half. A wall
facing away from the light, or fully in shadow, gets `E = 0` and bounces nothing.
Rounded corners become three facets each, and a cut corner adds its diagonal wall.

**How much reaches the ground.** A diffuse wall strip with albedo `ρ` (its
background colour in linear RGB; a see-through surface takes the page's) adds, at a
point on the ground:

```text
bounce       B = b × ρ × E × F
form factor  F = (G(lo) − G(hi)) / 2π
             G(h) = γ(h) × |c| / √(h² |b − a|² + c²)
```

`F` is the share of the wall's light that reaches the point: the inverse-square
law, with both cosines, integrated exactly over the strip by Lambert's polygon
formula. The strip stands on the ground segment from `a` to `b`, from `lo` to `hi`
above the point. `c` is the cross product of the offsets to `a` and `b`, and `γ(h)`
is the angle the strip's level edge at height `h` subtends. Only those two edges
count, because the vertical edges lie in planes through the point's normal. `F` is
0 behind the wall. For a long wall of height `h` at distance `d` it becomes
`½ (1 − d / √(d² + h²))`, which falls as `h² / 4d²` far away: the inverse-square
law. The tests check `F` against a brute-force integral of `cos θr cos θw / πr²`.
`b` is the **Bounced light** control, 0–200 %, default 100 %.

| White 12 px wall facing a light from 315°, altitude 0° | At 1 px | 6 px | 12 px | 24 px | 48 px |
| --- | --- | --- | --- | --- | --- |
| Bounce `B`, share of full light | 0.32 | 0.20 | 0.10 | 0.04 | 0.01 |

Bounce is dropped where it falls under half of one 8-bit level. A wall `h` tall
reaches `h √(b ρ / (4 / 512))`: about 11 times its height for white at 100 %.

**On screen.** Each frame's shadow canvas holds the light `U` that its own surfaces
leave on the ground. The bounce adds to it, so the page should be multiplied by
`U + B`, which can exceed 1. Each frame draws one factor, `r = U + B`. The shadow
canvas takes `min(r, 1)`; the frames' shadow canvases are darkened together and
multiplied over the page. A second canvas per frame takes `1 − 1 / max(r, 1)` and is
colour-dodged over the page after every shadow. Colour dodge divides the page by
`1 − s`, so it brightens the page by `max(r, 1)`, and black leaves it unchanged.
Where the page colour times `U + B` would exceed white, the factor is scaled down
evenly across its channels, so the hue is kept. So:

- on lit, near-white ground, white bounce is already at white and doesn't show; a
  coloured wall still tints it;
- bounce shows most in shadow, where `U` is low: a lit wall brightens the shadow at
  its foot;
- dark surfaces reflect little: in dark mode, dark cards bounce almost nothing,
  while light or coloured surfaces still do.

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

**A gobo** can cast the off-frame shadows instead (`gobo`; the kit ships `palm`).
It is an image held across the light's rays beyond the light-facing edge, like a stage
light's gobo or a tree between the sun and a wall: opaque, dark pixels block the light,
light or transparent ones let it through. Its shadow on the page is the image
stretched along the light by 1 / sin(altitude), capped at 3× (`GOBO_STRETCH`), with
its bottom 15 % beyond the edge (`root`) and its top reaching 80 % of the way across
the view (`reach`). Its size follows the view, not the light (`goboProjection`). The
source's size blurs it over a disc of radius `goboDistance × tan(sourceSize / 2)` px,
sampled with 16 taps from a mipmap level matched to the radius; a point light projects
it crisp. It sways: a smooth value-noise warp, strongest toward the image's free top
edge, in slow gusts, over a slower lean and drift. It never jumps.

The gobo and the surfaces block the same source, so where their shadows overlap they
must not darken each other. Where the surfaces leave light `F` and the gobo blocks a
share `g`, the page gets `F (1 − g) + g G`, with `G` the ink's light at depth `intensity × (1 − GI)`,
the gobo's full shadow. For a surface blocking `a` that is, in depth, `k (a + g − a g)`, the
union of the two: in a surface's full shadow the gobo changes nothing, and a fading
penumbra merges into the pattern with no seam. It is drawn as `1 − g` multiplied over
the darkened frames, then `g G` added. In an umbra with sky hidden the result is
slightly lighter than the umbra, by at most `g × intensity × GI`.

**On a raised surface** an off-frame shadow, from moving objects or a gobo, keeps its
size and blur and slides sideways, to the left or right of the light (`offFrameStep`):

```text
step, per px of height  = lift × sin(2 × azimuth) / 2, across the light
lift                    = how far, per px of height, a long wall's own shadow is
                          half dark (capped at 24, OFF_FRAME_LIFT)
```

At the defaults lift ≈ 21, so with the light from 315° the shadow shifts 10.5 px per
px of height: 63 px on a 6 px card and 125 px on a 12 px card. With the light along
either axis of the view (0°, 90°, 180°, 270°) it doesn't shift. This rule is stylized,
so that the step reads on the long bands. Strictly, a distant caster's shadow on a
raised surface moves toward the light by `lift` per px, which leaves the bands' edges,
running along the light, unbroken. The step is the part of that move's horizontal
component that runs across the light. Surfaces' shadows on other surfaces stay
physical.

**Edges** stay CSS: a lit surface's own `box-shadow` becomes inset rims, warm on
the edges facing the light and cool on the far edges, with their own intensities.
For looks, a raised surface's edge also stays lit where a shadow falls on it, fading
inward over 3 px and along the edge with the shadow, in both themes (LO8).

**Shadow colour** is a multiply, the physically right blend: what a surface shows is
its colour times the light on it, so its hue is kept. Colour burn would leave white
cards unshadowed and turn the dark page black. The tint is mixed with full light as
light, not as sRGB numbers, which cast several times too much tint and turned a pale
coral badge mauve-grey (LO9).

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
| LU2: direct and shape the light (LJ1) | Open Lighting → adjust direction, elevation, source size, global illumination, bounced light, tint and intensity → surfaces update | Projection, source-share, brute-force ray-trace, overlap, sky-occlusion quadrature and form-factor integration unit tests; shader pixels compared with the reference; visible light/dark review |
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
  bounced light (`wallFaces`, `litWalls`, `wallFormFactor`, `bounceAt`,
  `bounceReach`, `linearColour`), the independent off-frame objects, rim properties
  and the motion policy.
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
- **Groups combine on the compositor.** Group `k` draws only the light its own
  surfaces leave, `1 − α_k m` per channel, with every group's surfaces still setting
  the height each pixel stands at. Inside one blend group the canvases are combined
  with `darken`, the lowest light per channel, and the group multiplies over the
  page. For one light that is the union of the shadows, so overlaps across groups
  never darken. Because the browser combines them on every frame, a group that
  scrolls on the compositor never meets a neighbour drawn for the old scroll
  position. An earlier design divided each group by the groups before it, which
  tied the view-fixed off-frame shadows to the page's: every scroll step showed one
  frame of shadows from the old position, flickering most where shadows and bounce
  meet. The page group doesn't redraw while the off-frame objects move.
- **Bounce comes from the same pass.** Each surface's walls are lit on the CPU
  (`litWalls`), only for walls whose bounce can reach the view, and kept until
  something moves. The shader adds their bounce to the frame's factor and writes
  the shadow and glow canvases together, to two render targets. Glow frames sit
  after the shadow group in the layer, so bounce brightens what all the shadows
  have darkened.
- **The gobo blocks the same light as the surfaces.** The off-frame pass writes
  `1 − g` to a third render target and `g G` to the glow target. The gobo set
  (`[data-light-offframe="gobo"]`) multiplies the first over the darkened frames and
  the add set (`[data-light-offframe="add"]`, `plus-lighter`) adds the second, so the
  page gets the union of the two shadows, of depth `k (a + g − a g)`: never darker where
  they overlap, and with no seam where a penumbra fades into the pattern.
- `site/src/styles/lighting.css`: no Loushing component selectors. Public contract:
  root `data-lighting="on"`, surface `data-elevation="0"…"4"`, the optional cut
  (`--light-cut-size`, `--light-cut-corner`) and the `[data-light-layer]` it styles:
  an absolute, clipped container with no stacking context. Its shadow group
  (`[data-light-shadows]`) sits at `--layer-lighting` and multiplies over the page,
  with its shadow frames (`[data-light-frame]`) darkened together inside it; its
  glow frames (`[data-light-glow]`) colour-dodge over the page. The host's surface
  background colours are the walls' albedo. A lit surface's own `box-shadow`
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

**The ui-lighting skill kit** packages that boundary for any agent:
`skills/ui-lighting/` holds the engine, renderer
and CSS unchanged, a framework-free adapter and panel, the host tokens, a standalone
demo, references for the model, renderer, integration, controls and verification,
and a check script that runs the engine tests and the CSS and renderer contracts on a
host's copies. `site/test/ui-lighting-kit.test.mjs` fails when the kit's copies drift
from the site's sources, so change the site first and copy into the kit.

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
- Where shadows from different groups overlap, the darker group's light is taken.
  That is exact where one shadow covers what the other hides of the source, and a
  little light where two penumbras hide different parts of it; within a group the
  union is exact. A group's bounce is also capped by another group's shadow over it.
  Bounce on the page reflects walls shaded by the view-fixed off-frame objects, so
  it catches up one redraw after a scroll.
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
- Bounced light is one bounce, from walls onto the ground: it isn't blocked by other
  blocks on its way, isn't bounced again, and doesn't light other walls or surface
  tops. A wall's light uses the source's centre direction for `n · l`. Bounce
  reaches only the ground of the scroll frame its wall moves in, and only from the
  frames up to that one. The factor, computed in linear light, is applied to the
  sRGB page colour, as the shadows are.
- Saved lighting applies when the enhancement module loads, not before first paint.
- No mobile GPU, Safari/Firefox matrix, field telemetry or performance baseline has
  been certified.
- Component stories and the generated design library remain the existing project
  follow-up; the portable-engine tests and real Loushing views exercise this preview.

## Working decisions

The owner was unavailable for the first defaults question. On 23 October 2026 the
owner set the default light and motion from the Lighting panel (LO3, LO6), and asked
for long shadows to be on by default in Loushing (LO1). The other
rows are reversible working defaults, **not owner-approved product decisions**.

| ID | Decision | Working default | Approval |
| --- | --- | --- | --- |
| LO1 | Initial appearance | Long shadows on for a first visit, with moving objects casting the off-frame shadows; a saved choice wins; independent of system/light/dark. The portable engine and kit stay off until a host turns them on | Owner set, 23 Oct 2026 |
| LO2 | Controls | Visible Long shadows switch beside theme; compact Lighting disclosure | Awaiting review |
| LO3 | Motion | Off-frame shadows on and animated, at 5×; separate objects with their own speeds and directions, at least one shadow always in view; reduced motion always wins | Owner set, 23 Oct 2026 |
| LO4 | Renderer | Dependency-free WebGL2 shadows that work out area-light visibility per pixel, one canvas per scroll frame; edges stay CSS | Awaiting visual review |
| LO5 | Extraction | Portable source boundary, packaged as the ui-lighting skill kit in Loushing; compare adapting Ambient CSS before choosing an independent package, name, API and license | Not decided |
| LO6 | Default light | From the north-west (315°), altitude 0°, source 9°, global illumination 30 %, highlight 30 %, shadow 33 %, warm and cool tints | Owner set, 23 Oct 2026 |
| LO7 | Bounced light | On at 100 %, physically scaled; adjustable 0–200 % | Awaiting visual review |
| LO8 | Edges under shadow | In light and dark mode, a raised surface's edge stays lit where any shadow falls on it, solid for 1 px and fading by 3 px in, fading along the edge with the shadow (for looks, not physics). Set by the theme's `--light-edge-lift` | Owner set, 23 Oct 2026 (dark mode added the same day); fade width awaiting visual review |
| LO9 | Shadow colour | The page is multiplied by the light left in the shadow, with the tint mixed as light at the ink's depth. Keeps pale colours' hue; the cool cast on white is subtler than before | Owner asked, 23 Oct 2026; strength of the cool cast awaiting visual review |

**Try it:** open the site in a private window: **Long shadows** is already on. Watch the off-frame
shadows for a minute: several drift across at different speeds, some each way, and
there's always at least one in view. Open an item page
and scroll fast, and to the very end: the Get it panel's shadow stays attached, and
its upper edge starts at the folded corner. Open **Lighting**. Set the source size
to 0° for shadows that never end, then raise it toward 120° to watch the umbra
shorten and the shadow fade from its tip. Raise the elevation to see the shadows
shorten. Where two cards' shadows cross, the overlap keeps the same darkness. Move
**Global illumination** from 0 % (shadows fade only by their penumbra) to 100 %
(shadows lighten away from the cards but stay dark at their feet). On the home
page, scroll to the peach card under **How I combine them** and move **Bounced
light** from 0 % to 200 %: a warm glow rises off its lit north and west walls into
the shaded band above it, and the white kit cards brighten the shadow above them.
Rotate the source and change theme. Turn the main switch off to compare with the
existing design.

## Prototype evidence

Checked locally on 23 October 2026:

- **67 site tests pass.** The 28 lighting tests cover:
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
  - bounced light: the form factor against a brute-force integral and the long-wall
    closed form, nothing behind a wall, and falling with distance; the reach
    against the cut-off; walls facing the light lit by `cos(a) n · l`, and walls
    facing away, or shaded by a taller block or an off-frame object, bouncing
    nothing; rounded and cut corners as facets; a red wall bouncing only red,
    scaled by the control;
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
- **Bounce is in the pixels.** On the home page in light mode, at the defaults with
  motion paused, bounced light at 100 % changed up to 47 of 255 levels, all in the
  shaded band north of the peach card and the white kit cards: warm above the peach
  card, white above the kit cards, fading with distance. Lit ground beside the
  peach card took a slight peach tint. In dark mode at 100 %, nothing changed by
  more than 1 level, because the dark cards reflect little. The rounded corners
  are lit smoothly, with no square notch. With the off-frame objects moving, the
  layer's work took 1.1–2.1 ms per update (3.1 ms at worst), and frames held at
  4.2 ms with no long tasks.
- **No flicker while scrolling.** Composited frames were recorded during wheel
  scrolling with the pointer off the cards. Before the change, the first frame
  after nearly every scroll step on the home page differed from the settled frame
  in 60,000–75,000 pixels, by up to about 50 levels, in card outlines inside the
  off-frame shadows. With the off-frame shadows turned off there was no flash; with
  bounce at 0 or motion paused there still was. After it, every step on the home
  page and an item page matched its settled frame, except for 1 px sub-pixel shifts
  of whole content, text included. Holding still with the off-frame objects moving,
  no lighting pixel flickered back and forth.
- Earlier checks, made before the scroll frames, weren't repeated: the
  single-layer shader matched `shadowAt` over 265 screenshot points (0.004 on
  average, 0.023 at most), and settings, reload and cross-page persistence, keyboard
  sliders and Escape, motion speed, reduced motion, more contrast, forced colours,
  invalid saved settings, denied storage and a 320 × 740 screen all passed.

This is prototype evidence, not a cross-browser or production-performance
certification. The limitations above remain open for the next stage.
