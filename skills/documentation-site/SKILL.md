---
name: documentation-site
description: "Use when turning notes, research, plans or Markdown into a navigable, visual-first static documentation site. Organize topics, preserve sources, choose accessible representations, build navigation and verify links without requiring Slate or another kit."
---

# Documentation site

Turn supplied material into a static site people can browse. This is an independent
authoring workflow, not the Slate reader or an installer. Use the project's existing
documentation system when present; otherwise produce ordinary semantic HTML files.
No other skill, package, framework or project-instructions section is required.

## Inputs and output

Read the supplied notes and the project's publishing and source-authority rules.
Identify the audience, what they need to find, the content root and the existing
preview/check commands. If no content root exists, propose `docs/`. Do not replace an
existing site or publish without authorization.

Output one page per topic, navigation between them, local visual assets when useful,
and a short report of sources, checks and unresolved questions. Keep content in the
format the existing reader supports. With no reader, create complete HTML documents,
not fragments that depend on an unavailable shell.

## Workflow

1. **Inventory the truth.** Distinguish supplied facts, cited observations, decisions,
   working assumptions and open questions. Keep source locations and dates. Never
   invent numbers, quotations or decisions to complete a layout.
2. **Map topics to pages.** Give every page a stable filename, a plain title and one
   audience question. Put shared context on one overview page and link to it.
   Sketch navigation and reading order before generating pages.
3. **Choose a representation per section.**

   | Content | Representation |
   | --- | --- |
   | Quantity or trend | A labeled chart plus the actual data table |
   | Comparison | A comparison table or aligned small multiples |
   | Sequence | Ordered steps or a flow with a text equivalent |
   | Hierarchy or relationships | A diagram with named entities and connections |
   | A few scannable entities | Labeled cards or a short list |
   | Explanation, policy or quotations | Text; never turn prose into a picture |

   Use a visual only when it explains more clearly than text. A simple diagram can
   be semantic HTML or a self-contained SVG; no charting kit is required.
4. **Write a page outline.** One H1, a short answer/TL;DR, H2 sections and links to
   next steps. Lead with the reader's answer rather than the source's chronology.
5. **Author with existing components.** Do not fork a reader runtime or edit generated
   files. If building plain HTML, use `header`, `nav`, `main`, `section`, `figure`,
   `table` and `footer`; provide language, title and viewport metadata. Keep styling
   in one local stylesheet, using the project's existing tokens when available.
6. **Connect navigation.** Every page is reachable from the overview. Indicate the
   current location, use descriptive link labels and keep relative asset links
   valid from each page. Update the existing manifest only if the host uses one.
7. **Preview and verify.** Use the project's existing check and preview command.
   With no server tooling, any already-installed static server will do; for example
   `python -m http.server 8080 --bind 127.0.0.1 --directory docs` if Python is
   available. Do not install dependencies merely to preview.
8. **Report honestly.** Name changed pages, checks, source gaps and anything not
   inspected. A link/parser check is not evidence that the page is visually clear.

## Quality gate

- All authored local links, assets, headings and navigation targets resolve.
- Quotations match their sources; changing a projection never changes source truth.
- The page works at 320 px, at 200% zoom and with the keyboard.
- Text has 4.5:1 contrast; essential diagram marks have 3:1. Test supported themes.
- Images have useful alt text or are explicitly decorative. Charts include units,
  source/date, a takeaway and an accessible data table.
- Information is not encoded only by color, animation or position.
- No remote font, script or image is required for an otherwise offline document.
- No executable snippets or untrusted HTML from source material run in the reader.
- Existing content, branding, runtime ownership and publication policy are preserved.

## Standalone boundary

This workflow does not include Slate's runtime, Canvas viewer, component catalog,
manifest schema or validators. Do not emit `slate-*` markup and claim it works without
those assets. It can author for another reader or plain HTML using the same principles.
See [source and differences](./references/source.md).
