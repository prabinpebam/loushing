# Initial brief

> Consolidate, organize, and document skills and additional resources so humans and
> AI agents can easily browse, discover, and use them.

## Source and status

This brief records the project owner's initial request on 22 October 2026.
It is a seed for planning, not an approved product specification.

## Confirmed intent

| Area | What the owner has asked for |
| --- | --- |
| Content | Skills used for work with AI, plus additional resources added later |
| Organization | Consolidation and an effective way to organize and document the collection |
| Audiences | Both human readers and AI agents |
| Experience | A strong UX and UI for browsing, discovery, and use |
| Planning | Document and specify the plan using [Slate](https://github.com/prabinpebam/slate) |
| Product boundary | The actual skills-browsing site uses completely separate code, not Slate |
| Immediate scope | Initial setup only; the owner will provide more detail before planning |

## Second input: 22 October 2026

The owner then asked for a detailed spec and plan, with no code:

| Area | What the owner has asked for |
| --- | --- |
| Skills | The owner's own skills as a browsable, discoverable list, added one or a few at a time; scalable; a skill can bring its own resources and scripts |
| Larger systems | Slate, agentic-craft and agent-orchestration listed with how they work and which skills and packages work well with them; a name for these, since they are more than skills |
| Detail pages | A simplified, plain-language page for each item, not only raw source |
| Getting items | An easy way to get each item: a complete npx strategy, with the GitHub repositories still available to clone |
| Organization | Skills organized inside Loushing, with bigger items allowed their own repositories |
| Research | Deep research and benchmarking of similar solutions, curating their customer promises and jobs to be done for review |
| Completeness | Extend anything missed into a coherent, complete plan |

The [product spec](spec/product-spec.md#scope-of-this-spec) maps each ask to its pages
and lists what was added.

## Third input: 22 October 2026

The owner then set the design direction and asked for it to be specified, with the
skills and setup needed to start implementing:

| Area | What the owner has asked for |
| --- | --- |
| Design discipline | A strict design system with tokens and components |
| Look | Modern and clean, visual first, visually engaging layouts |
| Character | Chopper, the owner's dog, who passed away about two months earlier, as a consistent hand-drawn character shown at random in the background doing dog things: never the centre of attention, safe to ignore, never disrupting use |
| Character images | Made with the owner's `gpt-image-2-5` skill, which produces true alpha transparency, always with the attached character sheet for consistency |
| Visual first | If there is a great visual way to represent something, use it; otherwise use short text. This applies to the UI and layout, not to content: text content stays text. Charts, tiles, blocks, timelines, grids, SVG illustrations and infographics are encouraged where they apply |

This is specified in the [design system](design/design-system.md),
[visual first](design/visual-first.md) and [Chopper](design/chopper.md) pages, with
the project's `chopper` and `visual-first` skills and the `design/` source folder.

## Fourth input: 22 October 2026

The owner then extended Chopper's direction:

| Area | What the owner has asked for |
| --- | --- |
| Props and toys | Allowed to complete a scene, but not too many. Examples: squeaky toys, a robot vacuum, a squirrel, pigeons on the balcony with Chopper barking at them, a delivery parcel box, sleeping on the couch, sniffing an indoor plant, chasing birds, "and build on similar lines" |
| Higher-order scenes | Separate images placed together, such as a squirrel at one side of the page and Chopper sniffing at the other |
| Narrative | A story can run through the whole site and within a page |
| Freshness | Because Chopper is unrelated to the content, every reload can show new images, keeping the site fresh |
| Image size | Each image is generated for the resolution it is shown at, supporting retina screens. Never scale a big image down; any small reduction is applied uniformly to every image, so line thickness and scale match everywhere |

This is specified on the [Chopper](design/chopper.md) page (his world and cast, set
pieces, stories, fresh on every visit, and drawn for its size), in
`design/chopper/scenes.json` and in the `chopper` skill.

## Still open

These were open after the first input. The spec now proposes an answer for each, as a
working default for the owner to confirm.

| Topic | Where the spec proposes an answer |
| --- | --- |
| Collection | Which skills to publish first is the owner's choice; the [publication check](spec/repository-organization.md#public-and-private) screens each one |
| Additional resources | Resources and scripts travel inside an item; other types wait for a real example ([O3](spec/product-spec.md#10-decisions)) |
| People and agents | [Scenarios and jobs](spec/product-spec.md#2-scenarios-and-jobs-to-be-done) |
| Organization | [Content model](spec/content-model.md) |
| Use | [Task flows](spec/product-spec.md#4-task-flows) |
| UX and UI | [Views](spec/product-spec.md#5-views), [item pages](spec/item-pages.md), and the [design system](design/design-system.md) with its visual direction as a working default |
| Ownership and access | [Public and private](spec/repository-organization.md#public-and-private); [licensing in the card](spec/content-model.md#card-fields) |
| Delivery | [Decisions O5-O8 and O13](spec/product-spec.md#10-decisions); [stages](spec/definition-of-done.md#2-stages) |

## Initial setup boundary

The setup provides a Slate reader, a discoverable agent authoring skill, and this small
documentation starting point. It does not import skills from the machine, create a
catalog, implement product features, select a product stack, or publish anything.

Future proposals and specifications should clearly distinguish owner-confirmed facts,
source-backed observations, assumptions, open questions, and accepted decisions.
