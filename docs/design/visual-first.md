# Visual first

How Loushing decides between showing and telling. If a visual makes a piece of
information faster to grasp, the UI shows it; if not, it tells it in as few words as
possible. This applies to the UI and its layout, never to content: what an item does,
its examples and its instructions stay text.

> **TL;DR.**
> - **The ladder:** for each piece of information, ask in order whether it is a
>   quantity, a set to scan, a sequence, a structure or a status grid. Use the visual
>   for the first yes ([the ladder](#the-ladder)); otherwise use short text.
> - **What stays text:** item content, headings, commands, code, safety statements and
>   every error message.
> - **The patterns:** 19 view blocks cover Loushing's information: number tiles,
>   bento tiles, chips, compatibility grids, file trees, kit anatomy, stack paths and
>   timelines ([catalog](#pattern-catalog)).
> - **Short words:** tile titles of 4 words, one line per tile, hero lines under 140
>   characters ([limits](#text-limits)).
> - **Every visual has a text equivalent,** uses tokens only, meets contrast in every
>   context and reflows at 320 px.
> - **Chopper** is the only character illustration, and he never carries information.
> - **Working with agents:** the project's `visual-first` skill applies this page; the
>   `chopper` skill covers his images and placement.

Related pages: [design system](design-system.md) · [Chopper](chopper.md) ·
[item pages](../spec/item-pages.md) · [product spec views](../spec/product-spec.md#5-views).

## The ladder

Ask in order and stop at the first yes.

<ol class="slate-steps">
  <li class="slate-step">
    <p class="slate-step__title">A quantity, comparison or trend?</p>
    <p>A number tile, a bar or a sparkline, with the number as text.</p>
  </li>
  <li class="slate-step">
    <p class="slate-step__title">A set of things to scan or pick from?</p>
    <p>Tiles or a grid: an icon or glyph, a title, at most one line.</p>
  </li>
  <li class="slate-step">
    <p class="slate-step__title">An order, sequence or history?</p>
    <p>Steps, a path or a timeline.</p>
  </li>
  <li class="slate-step">
    <p class="slate-step__title">A structure: parts, hierarchy, files, connections?</p>
    <p>A tree, an anatomy diagram or a flow.</p>
  </li>
  <li class="slate-step">
    <p class="slate-step__title">A status across several cases?</p>
    <p>A grid of states or chips, with a word in every cell.</p>
  </li>
  <li class="slate-step">
    <p class="slate-step__title">None of these?</p>
    <p>Tell it in plain, short text.</p>
  </li>
</ol>

A visual must earn its place. Use text when the visual would be decoration, would
need a legend longer than the text it replaces, or would push the page past its
[performance budget](../spec/product-spec.md#7-performance-and-waits).

## Visual or text

<div class="slate-card-grid" data-cols="2">
  <article class="slate-card">
    <h3 class="slate-card__title">Shown visually</h3>
    <p class="slate-card__body">Counts and freshness; job areas and item lists; which agents an item works with; its effects; the files it adds; a kit's parts; a stack's order and handoffs; releases; related items; install methods.</p>
  </article>
  <article class="slate-card">
    <h3 class="slate-card__title">Stays text</h3>
    <p class="slate-card__body">What an item does; use it when and not for; how it works; example prompts and their results; commands and code; licenses and safety statements; errors and empty states.</p>
  </article>
</div>

## Pattern catalog

Each pattern is a view block backed by one compound in the
[design system](design-system.md#tiers-and-components).

| Information | Block | Instead of |
| --- | --- | --- |
| Catalog size and freshness | `stat-strip`: number tiles | A sentence of counts |
| Job areas | `area-tiles`: large tiles with an icon and a count | A bulleted list |
| Items | `item-tiles`: bento on Home, tiles or a dense list in the Catalog | Rows of links |
| Featured stacks | `stack-tiles`: tiles showing the member icons in order | A list of names |
| Filters | `facet-bar`: chips with counts | A form |
| Agents supported | `compat-grid`: agents × tested, expected or not supported, with a word in each cell | A paragraph |
| Effects | `effects-chips`: icon and word per effect, before any command | Prose |
| Files added | `adds-tree`: a file tree with each file's role | Paths in a sentence |
| A kit's parts | `kit-anatomy`: grouped parts and the flow between them | Nested bullets |
| A stack's members | `stack-path`: an ordered path, each handoff labeled | A numbered paragraph |
| Releases | `release-timeline` | A changelog wall |
| Related items | `works-with`: small cards, each with its relation | A list of links |
| Getting it | `get-it-panel`: tabs per method, a copy button, the steps | Instructions in prose |

New information that fits none of these gets a new block type and compound through the
design system's [change steps](design-system.md#making-a-change), not a one-off.

## Per view

| View | Visual frame | Stays text |
| --- | --- | --- |
| Home | Search-first hero; stat strip; bento of job areas, featured stacks and kits; recently updated tiles | The one-line promise and "what is a skill" line |
| Catalog | Facet chips with counts; tiles or a dense list, switchable; match highlighting | Each item's one-line summary |
| Skill page | Header with type badge and agent chips; effects chips; compat grid; files tree; get-it tabs; works-with cards; release timeline | What it does, use it when, how it works, examples |
| Kit page | Kit anatomy diagram; parts as tiles by group; setup as steps; fits-with cards | The kit's explanation and each part's purpose |
| Stack page | Stack path with handoffs; members as cards; one command | Each member's role and the walkthrough |
| Get started | Steps with small diagrams of where agents look | The explanations |
| What's new | Release timeline with change chips (added, updated, moved, removed) | Change notes |
| Not found or Gone | Search box and alternative tiles | What happened and what to do |

### Home at a glance

A wireframe of the Home bento at wide widths. On phones it becomes one column in the
same order.

<div class="slate-card-grid" data-cols="3">
  <article class="slate-card">
    <p class="slate-card__kicker">Masthead</p>
    <p class="slate-card__body">Promise line and the search box, focused on load. Chopper may peek at the masthead's edge.</p>
  </article>
  <article class="slate-card">
    <p class="slate-card__kicker">Pulse</p>
    <p class="slate-card__body">Number tiles: skills, kits, stacks, updated this month.</p>
  </article>
  <article class="slate-card">
    <p class="slate-card__kicker">Job areas</p>
    <p class="slate-card__body">Large tiles with an icon and a count; the first tile spans two columns.</p>
  </article>
  <article class="slate-card">
    <p class="slate-card__kicker">Work well together</p>
    <p class="slate-card__body">Stack tiles showing their members' icons in order.</p>
  </article>
  <article class="slate-card">
    <p class="slate-card__kicker">Kits</p>
    <p class="slate-card__body">Slate, agentic-craft and agent-orchestration as tall tiles with their part counts.</p>
  </article>
  <article class="slate-card">
    <p class="slate-card__kicker">Recently updated</p>
    <p class="slate-card__body">Six item tiles, then a link to What's new. Chopper may rest on the footer ledge below.</p>
  </article>
</div>

Polished wireframes and a clickable prototype come at the start of stage 1, for the
[A1 and A2 tests](../spec/product-spec.md#9-assumptions-and-risks).

## Text limits

| Element | Limit |
| --- | --- |
| Tile title | 4 words |
| Tile or card line | 1 line, at most 90 characters |
| Hero line | At most 140 characters |
| Section introduction | At most 2 sentences, or none |
| Labels and chips | 1 or 2 words |
| Empty state | What happened and what to do, in at most 2 short lines |

Nothing repeats what a visual already shows. Item content follows the
[item page quality bar](../spec/item-pages.md#quality-bar-for-every-page), not these
limits.

## Quality and accessibility

Every visual must:

- **Carry its meaning in text too:** numbers as text, a word in every chip and cell,
  never colour alone; charts and diagrams have a text summary or a table form.
- **Use tokens only:** semantic roles and the five chart series colours.
- **Meet contrast:** 4.5:1 for text and 3:1 for graphics and boundaries, in light,
  dark and more-contrast.
- **Reflow:** one column at 320 px and at 200% zoom; diagrams switch to their list
  form on narrow screens.
- **Be reachable:** a keyboard path through anything interactive, in reading order.
- **Come from data:** built from the view spec and the catalog index, never from
  numbers typed by hand.
- **Stay still** unless motion explains something, and respect reduced motion.

## Icons and illustrations

| Kind | Rule |
| --- | --- |
| Icons | One set, Material Symbols Rounded, at one weight and `size.icon`. Decorative icons are hidden from assistive technology; meaningful ones have a label ([O30](#decisions-on-this-page)). |
| Charts and diagrams | SVG generated from data with tokens, in the site's own code; no chart library ([O31](#decisions-on-this-page)). |
| Kit and item marks | A kit may bring its own mark; skills use their area's icon. No generated pictures for items. |
| Character | Chopper only. He is decoration placed by layouts in [zones](chopper.md#where-he-appears) and never carries information. |

## Decisions on this page

| # | Question | Recommendation | Decided |
| --- | --- | --- | --- |
| O30 | Icon set | Material Symbols Rounded: rounded shapes match the tiles and Chopper's softness; it is open source and can be subset | Working default |
| O31 | Charts and diagrams | Hand-built SVG components fed by data: few chart types are needed, and a library would cost more than the page budget allows | Working default |
