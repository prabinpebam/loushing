# Item pages

> **TL;DR.** Every skill, kit and stack has one page that answers, in order: *what is
> it, should I use it, how do I get it, what will it change, and how does it work?*
> The source code is available on the page, but it is never the first thing a person
> has to read. Everything on the page comes from the item card and the item's own
> files, so the page can never disagree with what gets installed.

These pages serve [U3, U4, U5, U6 and U7](product-spec.md#3-what-a-person-can-do)
and keep promises [P2 and P4](product-spec.md#1-the-customer-promise). The fields
come from the [item card](content-model.md#the-item-card).

## Reading order

A person arriving from a search or a shared link should be able to decide within a
minute ([PD2](definition-of-done.md#1-project-definition-of-done)). So the page
answers questions in the order people ask them, and the
[benchmarks](../research/benchmarks.md#patterns-to-adopt) confirm that the best
directories put the install action in the first screen:

| Order | Question | Section | Source |
| --- | --- | --- | --- |
| 1 | What is it? | Header: title, type, summary, status | Card |
| 2 | How do I get it? | **Get it** panel | Card, index, chosen agent |
| 3 | Should I use it? | What it does · Use it when · Not for | Card body, `useWhen`, `notFor` |
| 4 | What will it look like in use? | Try it | Card `examples` |
| 5 | What will it change? | What it adds to your project · Trust panel | File list, `effects`, `requires` |
| 6 | How does it work? | How it works | Card body; for kits, parts and handoffs |
| 7 | What goes with it? | Works well with | `related` |
| 8 | Can I see the code? | Source | The item's files at the pinned version |
| 9 | What changed? | Changes | Versions and changelog |

## Skill page

### Header

- Type badge (**Skill**), title and the one-sentence summary.
- Status (experimental, beta, stable, deprecated) with a plain explanation on hover or
  focus ("Beta: works, may still change").
- Version, last updated, job area and tags, each a link to a filtered list.
- Agent compatibility: one chip per agent, marked **tested** or **expected**, linking
  to what that means. Unsupported agents are not shown as chips; the Get it panel says
  so when one is chosen.

### Get it panel

The primary action, visible without scrolling on a laptop screen and reached
immediately after the header on a phone.

- **Agent picker:** remembers the person's last choice on this device. The command and
  the "adds" line below change with it.
- **Scope:** *This project* (default) or *All my projects*.
- **Methods**, as tabs:
  - **Command:** `npx loushing add <id>` with the agent and scope flags it needs, and a
    copy button. Below it: "Adds `.github/skills/<id>/` to this project," using the
    real path for the chosen agent.
  - **Ask your agent:** a sentence to paste into the agent's chat that tells it to
    install the item with the command above. For agents that can run commands.
  - **Git:** the clone command and which folder to copy where, for people who do not
    want the CLI.
  - **Download:** a ZIP of exactly the folder at this version, with its SHA-256.
- **Before you copy:** if the item declares effects, they appear here as short lines
  ("Includes scripts your agent can run"), each linking to the trust panel.

### Body sections

1. **What it does:** the card body's first section.
2. **Use it when / Not for:** the `useWhen` and `notFor` lists. `notFor` lines link to
   the alternative when one exists.
3. **Try it:** each example prompt in a copyable block, and below it what should
   happen ("The agent creates `docs/spec.md` with sections 1-11 and asks for the
   customer promise").
4. **What it adds to your project:** a file tree of exactly what is copied, each file
   with a one-line role (instructions, reference, script, template). Script files are
   marked **runs code** and link to their source.
5. **How it works:** the card body's section, plus a diagram when it has one.
6. **Works well with:** related items as small cards, each with its relation ("Hands
   off to") and the one-line reason.
7. **Trust panel:** requirements (runtimes, tools, accounts); effects; license and
   origin; the pinned commit and content hash; and "What Loushing checked" (format,
   publication check, size), with the date.
8. **Source:** a read-only browser for the item's files at the pinned version.
   `SKILL.md` opens first, shown rendered with a toggle to raw text. Code files have
   syntax highlighting and line numbers. A link opens the same files on GitHub.
9. **Changes:** the versions, newest first, each with its date and changelog lines.
10. **For agents:** links to this item's JSON and Markdown in the
    [agent-readable index](agent-access.md), and the CLI command that returns the same
    data.
11. **Report a problem:** opens a pre-filled GitHub issue naming the item and version.

## Kit page

Everything on the skill page, plus what makes a kit a system:

| Section | Contents |
| --- | --- |
| **What's inside** | The parts, grouped as skills, agents, templates and tools, each with its one-line purpose. Each part links to a short part page. |
| **How it works** | A diagram of the parts and the order they come into play, from the kit's card. For example, agentic-craft: the `craft` skill routes to `ground`, `assumptions`, `definition-of-done` and the rest. |
| **Setup** | What the kit's installer does, step by step: the files it copies, any section it adds to `AGENTS.md` or `CLAUDE.md`, and the project facts the person fills in afterwards. The command in the Get it panel runs this installer. |
| **Fits with other kits** | The handoff with related kits, such as craft's IDs being used by orchestration. Links to any stack that includes the kit. |
| **Releases** | The kit's release tags, the one the catalog pins, and a labeled preview channel when it exists. |
| **Its own documentation** | A link to the kit's README or site. The Loushing page summarizes; the kit's documentation stays the full reference. |

**Part pages** are short: a "Part of *kit*" banner with a link back, what the part
does, its source, and "Get the kit to use this." A part page has a Get it panel only
when the kit marks that part as usable alone.

## Stack page

| Section | Contents |
| --- | --- |
| **Header** | Type badge (**Stack**), the outcome it serves ("Plan, build and document a product with agents") |
| **Get it** | One command that sets up every member, in order, after showing the full plan |
| **Members, in order** | Each item as a card with its role in the stack and a link to its page |
| **How they hand off** | A diagram and table: what each member produces and which member uses it |
| **After setup** | What the project looks like, the facts to fill in, and the first prompt to try |
| **Try it** | A short walkthrough using the stack end to end |

## Every state

| State | What the page shows |
| --- | --- |
| **Experimental** | A banner: "Experimental: may change or be removed. Pin a version if you depend on it." |
| **Deprecated** | A banner naming the replacement and why. The Get it panel moves below the banner and offers the replacement first. |
| **Moved** | Its page stays at the same address. A note says where it now lives; installing still works through the pointer. |
| **Removed** | The address still answers, with "This item was removed on *date*" and the reason and alternatives. Never a bare 404. |
| **Chosen agent not supported** | The Get it panel says which agents it supports and offers the Git or download method with manual steps. |
| **Has scripts or needs credentials** | The effects lines in Get it and the trust panel, before any command is copied. |
| **No examples yet** | "Try it" is replaced by "No examples yet," and the item cannot be marked stable. |
| **Source file too large or binary** | Its name, size and hash, with a download link instead of a preview. |
| **Index unavailable** | Item pages are static and still load; only search and filters say they are unavailable and offer a retry. |

## Quality bar for every page

- **Plain language:** the summary and "What it does" make sense to someone who has
  never used an agent skill. Kit-specific terms link to their glossary entry.
- **Complete by definition:** light and dark themes, keyboard and screen reader use,
  phone widths, and every state above, as part of the first version.
- **Copy:** buttons say what they do ("Copy command" → "Copied"). Every failure says
  what happened and what to do next. Words follow the [glossary](product-spec.md#8-copy).
- **Speed:** item pages are pre-built static pages with no wait to read. See the
  [performance targets](product-spec.md#7-performance-and-waits).
