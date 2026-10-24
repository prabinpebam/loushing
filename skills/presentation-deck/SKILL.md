---
name: presentation-deck
description: "Use when planning and authoring presenter-led presentations, pitches, briefings or slide-style web pages. Builds a narrative spine, one claim per slide, visual evidence and complete speaker notes without requiring Slate or a presentation kit."
---

# Presentation deck

A deck shows the few points that matter while a presenter carries the depth. Create a
narrative, not a document chopped into slides. This workflow works alone in an existing
presentation tool or as a semantic HTML page. It does not require another skill.

## Establish the brief

Read the source, audience, duration, presentation medium and requested decision.
Use the existing project format unless the user chose another. If no format is set,
start with a Markdown outline and speaker notes, then author a static HTML deck when
a rendered deliverable is needed. Do not claim to produce PowerPoint from HTML.

## Narrative and notes

1. State what the audience knows now and what they should understand or decide next.
2. Write a one-line-per-slide spine: hook/stakes, evidence, tension, explanation,
   direction and close. These are possible beats, not a mandatory six-slide quota.
3. Give each slide one claim. Its title states the claim, not merely a topic.
4. Name the hinge between consecutive slides. If the next slide does not answer a
   question raised by the previous one, reorder or remove it.
5. Close with the actual request. For an upward review, invite feedback and guidance
   unless the presenter genuinely owns the decision and needs explicit sign-off.
6. Write notes per slide: opening words, evidence/context, caveats, transition and an
   optional timing cue. Keep sensitive notes out of a public audience artifact.

Use the [outline template](./assets/deck-outline.md) when there is no project format.

## Compose the visual argument

- Land 1-3 key points per slide. Move paragraphs and secondary detail into notes.
- Choose one dominant visual mechanism: comparison, path, hierarchy, relationship,
  timeline, annotated evidence, chart or a deliberate quote/text slide.
- Do not decorate a weak claim with a generic grid or arbitrary icon row.
- Reserve title, visual and notes areas before drawing. Align peers and maintain a
  clear reading order. Wide slides should use their width rather than a thin column.
- Use real data with units, dates and sources; distinguish a proposed future from
  observed results. Never invent a metric to make a slide persuasive.
- For charts, choose truthful scales, direct labels and a text/data equivalent.
- For diagrams, route connectors around label zones; ensure contained labels have
  visible padding and meaningful symbols come from one licensed icon source.
- Use the host's theme tokens and components. With no host, keep one shared local
  stylesheet and semantic HTML; avoid a dependency merely for visual polish.

## Plain HTML option

Create a complete document with a language, title, viewport, navigation and one `main`.
Use one H1 for the deck and a `section` with an H2 per slide. Give slides stable IDs
for direct links. Put notes in `details` with a `summary` such as "Speaker notes",
or in a separate private notes document if the audience must not receive them.

Every slide must work as static content. Navigation can be ordinary anchor links;
do not add script merely to simulate a slide player. If a player already exists,
use its supported controls rather than adding a competing navigation system.

## Review before delivery

1. Rehearse the spine aloud against the allotted time; cut slides before shrinking
   type or accelerating the speaker.
2. Inspect every slide in the real target format at presentation size and the
   smallest supported viewport. Check clipping, line lengths, contrast and reading
   order; ensure text remains text rather than a screenshot.
3. Verify data and sources, links, chart baselines and every slide's speaker notes.
4. Test keyboard navigation, focus, direct links, print/export and supported themes.
   Never use color alone. Honor reduced motion if the host animates.
5. Report the output path, format, checks and any unverified export/player behavior.

This version includes no Slate classes, runtime, minimap, renderer or animation
manifest. Motion is optional; the complete static deck must remain understandable.
See [source and differences](./references/source.md).
