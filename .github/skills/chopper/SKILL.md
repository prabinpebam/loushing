---
name: chopper
description: Use when creating, reviewing or placing an image of Chopper, the hand-drawn dog who appears in small background cameos on the Loushing site, or when adding a scene, a prop, a supporting cast member, a set piece, a story, a cameo zone or the moment picker. Holds the character, style and scale locks, the prompt template, the per-size generation workflow with the owner's gpt-image-2-5 skill and the character sheet, measuring, the QA checklist, file conventions and the rules of presence.
---

# Chopper: the quiet companion in the margins

Chopper was the owner's dog. He appears on the Loushing site as a tribute: small,
hand-drawn, doing ordinary dog things at home in the margins. He is never the point
of a page, never speaks and never gets in the way. Treat every image and every
placement with that care.

The authority is [docs/design/chopper.md](../../../docs/design/chopper.md). This skill
is the working procedure; if they disagree, the page wins and this skill is fixed.
Everything else is data in [design/chopper/scenes.json](../../../design/chopper/scenes.json),
validated by `scenes.schema.json`: rules, the drawing standard, zones, props, cast,
scenes with one render per size, set pieces and story threads.

## Words used here

- **Scene:** one image idea (action, pose, mood, facing, props). `subject` set means a
  cast member is drawn instead of Chopper; `standalone: false` means it is only ever a
  set piece part.
- **Render:** one scene drawn for one size class (`sm`, `md`, `lg`, `strip`, `tall`). Each render is
  generated separately and has its own status: planned, draft, approved or retired.
- **Moment:** what appears in one place at one time: one scene, or one set piece.
- **Set piece:** two scenes placed at the left and right ends of the same zone, facing
  each other.
- **Strip:** one 3:1 image holding a whole scene, Chopper and a cast member or prop,
  shown on its own line in a section break or the footer from medium screens up. The
  scene lists its cast in `cast`. Prefer a strip over a set piece: one drawing keeps
  the two figures at one scale.
- **Tall:** one 1:2 image for the side gutter on very wide screens.
- **Thread (story):** ordered beats; each beat is a scene or a set piece; each thread
  has a daypart.

## Before you generate anything

1. **The image skill.** Generation uses the owner's user-level skill at
   `%USERPROFILE%\.copilot\skills\gpt-image-2-5\`. Read its `SKILL.md`. Do not copy
   it, its scripts or its endpoint into this repository. If it is missing, stop and
   say so.
2. **The key.** It lives in Windows Credential Manager. Never print, log or commit it.
   If the CLI reports a missing key or `401`, stop and ask the owner to run
   `set-key.ps1` in a visible terminal.
3. **Confirm the spend.** List the renders (scene and size), canvases, quality,
   counts, output paths and estimated cost, and wait for the owner's yes. About $0.10
   per approved render, about $0.15 per cast sheet.
4. **The references.** Every call passes
   `design/chopper/reference/character-sheet.png`. A cast part also passes its
   cast sheet (`design/chopper/reference/cast-sheet.png`, one sheet for the whole cast)
   as the second image. Never generate Chopper or the cast from text alone. While the
   cast sheet is a draft, scenes using it stay drafts.

## The drawing standard (read before every render)

From `drawing` in `scenes.json`. Every image shares one ink line, so each size class is
drawn for its size and every master is reduced by the same factor.

| Size | Frame (CSS px) | Head as shown | Master head (`head × 2 × k`) | Master line (`1.5 × 2 × k`) |
| --- | --- | --- | --- | --- |
| `sm` | 56 | 20 px | 50 px | 3.75 px |
| `md` | 96 | 34 px | 85 px | 3.75 px |
| `lg` | 160 | 56 px | 140 px | 3.75 px |
| `strip` | 160 high | 28 px | as `sm` | 3.75 px |
| `tall` | 400 high | 28 px | as `sm` | 3.75 px |

`k` is `drawing.masterFactor`. The pilot found the model draws every render at about
one scale (a line of about 5 px in the master), so the working default is k ≈ 1.67,
pending the owner's confirmation (O33). Head height
is measured from the top of the fringe to the chin, whatever the pose.

- Never reuse a render at another size, never upscale, and never resize one image on
  its own. The build trims every master to its alpha bounds and reduces it by exactly
  `1/k` (2x) and `1/(2k)` (1x).
- If a draft is off scale, redraw it with a stronger scale line. Never rescale to fit.
- The canvas comes from `drawing.canvases`. The model sizes a figure to its canvas or
  grid cell, so the canvas sets the scale:

  | Canvas | Size | Use | Scale found |
  | --- | --- | --- | --- |
  | `grid4x2` | 2048x1024 | 8 small cameos per call, one per cell | Matches the pilots (line 3.5 to 4.7 master px). The standard for `sm` |
  | `grid2x2` | 2048x1280 | 4 per call | About 1.5x larger (line 5 to 7); usable for `md` only |
  | `strip` | 2304x768 | One `strip` scene | On scale (line 4.7 to 5.0) |
  | `upright` | 768x1536 | One `tall` scene | On scale |
  | `wide`, `tall`, `square` | 1024x640, 640x1024, 816x816 | One cameo per call | On scale (the pilots) |

- The widest aspect the model accepts is **3:1**; it rejects 4:1. Both sides must be
  multiples of 16.

## Character lock (Chopper renders)

> Chopper, the small fluffy dog in the reference character sheet. Keep him exactly on
> model: a cream and ivory fluffy coat with warm beige shading; long, feathery, solid
> black floppy ears; a black saddle patch on his back (larger and mid-back on his right
> side, smaller and near the shoulder on his left side), exactly as on the sheet; round
> black bead eyes; a small black nose; a plumed tail curled over his back; a tufty
> fringe on his head; the same proportions as the sheet.

## Cast lock (cast renders and sheets)

> {cast description from scenes.json}, drawn as a supporting character in exactly the
> art style of Chopper's character sheet, matching the reference cast sheet. Never
> larger than Chopper. Gentle and cheeky, never threatening, hurt or caught.

## Style lock (every prompt)

> The same art style as the sheet: a loose, sketchy, hand-drawn ink line, slightly
> uneven, with flat soft fill and very light shading. Only the figure and the listed
> props, with the whole figure inside the frame and a clear margin. Isolated on a
> transparent background, no ground shadow, no backdrop, no frame, no border, no text,
> no letters, no labels, no logos.

## Scene line (from scenes.json)

> Scene: {action}. Pose: {pose}. Mood: {mood}, shown as on the sheet's {mood} face.
> Facing: {facing}. Props, at true scale to him, in the same ink style with muted
> colour, cut off cleanly at the frame edge if large: {each prop's description, or
> "none"}.

## Scale line (every render)

> Canvas {W}x{H} pixels. Draw the figure small and centred, with Chopper's head about
> {master head} px tall from fringe to chin and an ink line about 3.75 px wide. Leave
> the rest of the canvas fully transparent and empty.

For a cast part, write "at true scale to Chopper, whose head would be about {master
head} px tall". The full prompt is: the character lock (or the cast lock), the style
lock, the scene line, the scale line. Add one short correction line only when a draft
failed QA ("his ears must be solid black", "draw him smaller: head 50 px").

## Props rules

- Only props listed on the scene, at most `rules.maxPropsPerImage` (2), each from the
  `props` catalogue, using its description word for word so it looks the same in every
  scene. The coral ball is always the same coral ball.
- True scale to him. Household items (couch, balcony rail, plant) are cut off cleanly
  at the frame edge rather than shrunk.
- The sun patch is the only ground shape. No brands, logos, text or labels (the parcel
  box is plain), no screens, nothing unsafe for a dog (no chocolate, grapes, cables or
  open flames).

## Workflow for one render

Run from the repository root. `$ig` is the image CLI.

```powershell
$ig = "$env:USERPROFILE\.copilot\skills\gpt-image-2-5\scripts\imagegen.py"
$sheet = "design\chopper\reference\character-sheet.png"
New-Item -ItemType Directory -Force design\chopper\drafts, design\chopper\source | Out-Null
```

1. **Draft.** Four low-quality variations on the render's canvas. The sheet is the
   first image; then the cast sheet for a cast part; then up to two approved renders of
   the **same size class** as canon (never another class: their line scale differs).

   ```powershell
   python $ig edit -i $sheet [-i <cast sheet>] [-i design\chopper\source\<canon>.<size>.png] `
     -p "<prompt>" --size 1024x640 --quality low --n 4 --background transparent `
     --output-format png -o design\chopper\drafts\<id>.<size>.png
   ```

2. **Look.** View every draft. Pick the one that passes the most QA rows, scale first.
   If none is close, change the scene or scale line (not the locks) and draft again; at
   most two rounds, then report the failure.
3. **Final.** Re-run the chosen prompt at `--quality high --n 1` with the chosen draft
   as an extra reference, to `design\chopper\source\<id>.<size>.png`.
4. **Check alpha.** `python $ig alpha design\chopper\source\<id>.<size>.png` must report
   `has_alpha: true` with a large transparent fraction and some partial pixels at the
   edges. A fully opaque result has failed.
5. **Measure.** Trim to the alpha bounds, then measure the median ink line width and
   his head height in master pixels and divide by `2k` for CSS px. Line must be within
   `lineTolerance` (20%) of 1.5; head within `scaleTolerance` (10%) of the class. Use
   `tools/chopper` measure once it exists (stage 1); until then measure by hand at
   400% zoom (line at five points on the outline, take the median).
6. **QA.** Apply the checklist below on the light paper (`#fdfbf7`) and the dark
   background (`#1b1816`) with the cream halo, and beside an approved render of the
   same class.
7. **Record.** Save the exact prompt and options to
   `design\chopper\source\<id>.<size>.prompt.txt`. In `scenes.json`, set the render's
   `status: approved`, `canvas`, `source`, `prompt`, `measured: { lineCssPx, headCssPx }`
   and `canon: true` if it is a strong reference for later renders of that class.
8. **Clean up.** Leave drafts in `design/chopper/drafts/` (ignored by Git) or delete
   them; never commit them.

## Workflow for a grid (8 small cameos per call)

1. Choose 8 `sm` scenes. Write one prompt: the character lock and style lock once, then
   "A 4 by 2 grid of 8 separate drawings of Chopper on a 2048x1024 transparent canvas,
   one per cell, each centred in its cell with wide empty transparent gutters between
   cells; no grid lines, no borders", then one numbered scene line per cell (row by
   row, left to right). For a peeking scene, add that he is cut off cleanly by a
   straight horizontal line at the bottom of his cell.
2. Generate at `--size 2048x1024 --quality high --n 1`. A low-quality probe first is
   cheap insurance when trying a new grid shape.
3. Slice along the cells, trim each to its alpha bounds, and check no figure crosses a
   cell edge (an ink pixel on a cell border means it touched its neighbour: redraw).
4. Measure, QA and record each slice as its own render (`canvas: grid4x2`), with the
   shared prompt saved beside each master and its cell named in the prompt file.

The site build, not this skill, trims, reduces by `1/k` and writes the shipped WebP
files (1x and 2x) from the masters.

## The cast sheet (before any cast render)

The whole cast (`cast` in `scenes.json`) shares one sheet,
`design/chopper/reference/cast-sheet.png`, with its prompt beside it.

1. Prompt: each cast member's description, "drawn as supporting characters in exactly
   the art style of Chopper's character sheet, each shown from two or three angles, on
   a transparent background, no text", then the style lock. Pass Chopper's sheet as
   the style reference.
2. Generate on `1536x1024` at high quality to the path above.
3. Show it to the owner beside Chopper's sheet. Only on their approval set each cast
   member's `status: approved`. Redrawing it means redrawing the scenes drawn from it.

## Set pieces

- Generate both parts at the same size class, from the zone's size; the left part
  faces right and the right part faces left. Never mirror one to make the other.
- Draft each part on its own, then view the two finals side by side at shipped size
  with a gap between them: same line, same scale, a joke that reads across the gap.
- A shared part (such as `bark-left`) must pass for every set piece that uses it.

## QA checklist (every row must pass)

| Check | Pass |
| --- | --- |
| Ears | Solid black, long, feathery and floppy; neither is cream |
| Coat | Cream and ivory with beige shading; no other patches or colours |
| Saddle patch | Present, on the correct side for the facing, as on the sheet |
| Face | Round bead eyes, small black nose, the sheet's expression for the mood |
| Tail | Plumed, curled over the back |
| Proportions | Small, round, fluffy; not a puppy, not a different breed |
| Style | Sketchy ink line and flat soft fill, matching the sheet; no 3D, gradients or photo texture |
| Line width | Measured line within 20% of 1.5 CSS px, and visibly the same as an approved render of the same class |
| Scale | Measured head height within 10% of the class; props and cast at true scale to him |
| Props | Only the listed props, at most 2, matching their catalogue description; no text, labels, logos or screens |
| Cast | On model with its approved sheet; never larger than him; never caught, hurt or threatening |
| Isolation | No ground except a listed sun patch; no shadow, backdrop, frame or text |
| Alpha | `has_alpha: true`; clean edges on light and dark |
| Crop | The whole figure inside the frame, with margin, unless the pose is `peeking` or a large prop is cut at the edge |
| Tone | Gentle and ordinary; barking is bold, never scared; never sad, hurt, dressed up or in danger |

## Rules of presence (for anyone placing him)

- **Layouts own zones; views never place Chopper.** Zones, sizes and limits are in
  `scenes.json`. The picker `pickMoments(zones, library, visit, hour, seed)` is pure:
  it returns the moments for the page and the updated visit state.
- **Moments, not images.** At most `maxPerPage` (2) moments and `maxImagesPerPage` (3)
  images per page, `maxInViewport` (1) moment per screenful, `minGapViewports` (1.5)
  screens apart, none of the last `historySize` (8) while others fit.
- **Stories.** Continue the visit's thread (kept in `sessionStorage`) or start one,
  preferring the visitor's local daypart (morning 5-11, day 11-17, evening 17-21,
  night 21-5) about 3 times in 4, avoiding recent threads. Beats go top to bottom in
  order; a beat that can't be placed is skipped, never reordered. Fill leftover zones
  with standalone scenes. The hour is read in the browser and never stored or sent.
- **Fresh on every view.** The picker runs in the browser on every page view,
  including reloads, never at build time.
- **A zone needs a choice.** A zone shows nothing until it has at least
  `minCandidatesPerZone` (4) shown moments at its size. Review links bypass this.
  While renders are reviewed in place, `statusesShown` adds `draft` and the minimum
  drops to 1; restore both once enough renders are approved.
- **Set pieces fit or skip.** Both parts in the same zone and screenful, from `md`
  width, left part left; otherwise the set piece is not a candidate.
- **Natural size.** Width and height attributes are the 1x file's size, with a 1x/2x
  `srcset`. CSS never sets a cameo's width, height or scale; the zone only reserves
  height (`c.chopper.frame-*`, in px so text zoom never resizes him).
- **Never in the way.** Out of the content flow or in reserved space (no layout shift),
  never over text, controls or focus outlines, `pointer-events: none`, below every
  interactive layer (`layer.cameo`).
- **Invisible to assistive technology.** `alt=""` and `aria-hidden="true"`, never
  focusable, never announced. Hidden in print and in forced-colours mode.
- **Quiet motion only.** At most one gentle settle when a moment enters the viewport
  (both set piece parts together); none with `prefers-reduced-motion`. No looping.
- **Light.** Lazy-loaded after the page is idle, at most 30 KB per image and 90 KB per
  page; never the largest contentful paint. Without JavaScript he simply isn't there.
- **Never mirrored.** No `scaleX(-1)` or flipped images; the markings are asymmetric.
  Generate the facing you need.
- **Never in copy.** He has no speech bubbles and is never referenced in UI text,
  except the tribute line and the "Hide Chopper" setting.
- **Respect the setting.** "Hide Chopper" in the footer hides every cameo, and the
  choice is remembered on that device.
- **Review links.** `?chopper=<scene-or-set-piece-id>` forces one moment into the first
  eligible zone; `?chopper=story:<thread-id>` plays a thread from its start;
  `?chopper=off` hides him.

## Adding to the library

Scenes, props, cast, set pieces and threads are added as data, a few at a time, then
validated against `scenes.schema.json`. A new scene lists only zones whose poses allow
its pose, and one planned render per size those zones use. A new thread uses only
scenes or set pieces that exist, never a part-only scene as a beat. Retire, never
delete, so review links keep working.

## Never

- Generate without confirming the spend, or without the character sheet.
- Reuse, upscale or individually resize a render, or measure by eye alone.
- Use another character, a real dog photo, a brand, or anyone's art style by name.
- Commit drafts, keys or endpoints.
- Make him the subject of a page, a loading spinner, an error mascot that speaks, or
  the logo (the logo question is still open with the owner).
