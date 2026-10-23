# The lighting model

The physics the engine ([lighting.mjs](../assets/lighting.mjs)) implements and the
shader mirrors. Every equation here is checked by
[check-lighting.mjs](../scripts/check-lighting.mjs), most against a brute-force ray
tracer or a numerical integral. The tables are what a correct build produces at the
default settings, so use them to judge a result.

Units: CSS pixels on the page, degrees for angles. Heights come from
`LIGHT_LEVELS` = `[0, 2, 6, 12, 24]` px for elevation levels 0–4.

## The light and the projection

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

## A long shadow is an extruded block, not a floating layer

A normal UI shadow treats the raised surface as a thin sheet floating at height `h`:
it casts one copy of itself, offset by `L(h)`. A long shadow treats the surface as a
solid block that stays joined to the ground. Every height from 0 to `h` casts, so
the shadow is the union of the footprint projected from each height. It is attached
at contact and reaches `L(h)` at the far end. With a point light that union is a
crisp prism with diagonal walls at the corners; a single offset copy would float
apart from the surface, which is wrong.

## One layer for one light

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

## A cut corner changes the block

A card with a folded corner (a dog-ear) is a block with that corner cut
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

## Umbra and penumbra: how a long shadow fades

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

## Global illumination: lighter away from the blocks

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

## Bounced light: walls light the ground beside them

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

## Shadows from beyond the frame and lit edges

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

**Lifted edges under a shadow** are deliberately not physical. A raised surface's
edge keeps its light wherever any shadow falls on it (another surface's, the moving
objects' or a gobo's), so it reads as a light edge highlight against the shade. The
lift is whole on the outer pixel and fades out by 3 px in, and since it only cancels
the shadow, it fades along the edge exactly as the shadow does: there is no hard end.
It works the same in light and dark mode. The theme decides: `--light-edge-lift` is
`#000`, and its alpha is the lift's strength. A host that leaves it unset, or sets it
to `transparent` (in one theme or both, for example with `light-dark()`), keeps
physical edges, where a shadow dims the edge.

**The shadow's colour** comes from multiplying the page by the light left in the
shadow, which is how light works: what a surface shows is its colour times the light
on it, so a multiply keeps every surface's hue. Colour burn is not a shadow: it leaves
white untouched (no shadow at all on a white card), turns a dark page black, and
swings the hue of dark colours. The tint is the colour of the light in a full shadow.
It is mixed with full light **as light**, in linear values, at the depth the ink's
sRGB mix gives: in a shadow of depth `d`, the light is
`(1 − d (1 − ink_linear)) × Y / luminance(1 − d (1 − ink_linear))`, encoded back to
sRGB, where `Y` is the luminance of `1 − d (1 − ink)` taken in sRGB values. Mixing the
sRGB numbers instead would give white a cast several times too strong, and
cancel pale colours: a pale coral badge would lose about 60% of its colour and swing
55° toward mauve. Mixed as light, it keeps about 70% and shifts about 10°, against
80% and no shift in a neutral shadow of the same depth. The edge rims keep the ink as
a CSS colour.

## Rims: the exact CSS

`lightingProperties(settings)` returns custom properties the host sets on `<html>`:

| Property | Value |
| --- | --- |
| `--data-light-highlight-tint` | the highlight tint |
| `--data-light-shadow-tint` | the shadow tint |
| `--data-light-highlight` | highlight intensity, as a percentage |
| `--data-light-intensity` | shadow intensity, as a percentage |
| `--data-light-rim` | `inset X Y 0 var(--light-highlight), inset -X -Y 0 var(--light-edge-shadow)` |

with `X = −sin(azimuth)` px and `Y = cos(azimuth)` px, rounded to three decimals. A
light from the north (`0°`) gives `inset 0px 1px 0 …, inset 0px -1px 0 …`: the top
edge is lit and the bottom edge shaded. From the north-west (`315°`) it is
`0.707px 0.707px`. [lighting.css](../assets/lighting.css) turns these into:

```text
--light-highlight   = highlight tint at highlight intensity over transparent
--light-shadow-ink  = light mode: the shadow tint
                      dark mode:  the shadow tint mixed at --lighting-dark-tint into --color-lighting-ink
--light-edge-shadow = the ink at shadow intensity over transparent
```

The shadow layer uses the same ink, so cast shadows and shaded edges agree; it mixes
the ink as light (see "The shadow's colour" above).

## Motion

The off-frame objects move only when every opt-in is on: lighting, off-frame shadows
and animation (`lightingMotion`). They pause while the page is hidden, while the
person prefers reduced motion, and while more contrast or forced colours hide the
layer. Speed scales every object's own speed; at 5× the objects cross at 24–60 px a
second. A gobo sways under the same conditions, its clock scaled by speed / 5. Their
positions are a pure function of time, the view size and the light
(`offFrameCasters`), so motion is deterministic and testable.
