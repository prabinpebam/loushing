---
name: ui-copy
description: Use when writing or reviewing words a person reads in a product, including labels, buttons, errors, empty states, statuses and accessible names. Provides voice, rules by element, a glossary template and a dependency-free mechanical copy linter.
---

# UI copy

Words are interface. They follow written rules, use one glossary, and are checked like code.

## Start and output

Read the interface and existing glossary, string catalog and copy rules. Reuse their
locations; otherwise start `docs\design\copy-glossary.md` from the bundled
[glossary](templates/copy-glossary.md). Review actual user tasks and rendered
context, not isolated strings alone. Record findings as location, existing words,
replacement, reason and any behavior the copy promises but cannot verify.
No other skill, harness or project facts file is needed.

## Voice

- **Plain, direct, warm.** Say what's true in the fewest words a person needs. Write for someone who doesn't know the system's internals.
- **The person's words, not the system's.** Never a path, an ID, a stack trace, a status code, or a developer term before the person has chosen to see one ("Save to remote" belongs in an advanced screen, not the first run).
- **Confident and honest.** No hedging, no hype, no apologising in a loop, never a promise the product can't keep.
- **Second person for the person, first person never for the product** (unless it's a person speaking, like a site owner's welcome).

## Rules by element

| Element | Rules | Good | Not |
|---|---|---|---|
| **Button, menu item** | A verb first; 3 words or fewer; says the outcome | Save changes · Publish page · Turn on | OK · Submit · Yes · Click here |
| **Field label** | A noun phrase; what goes in it; no colon | Your email address | Enter email: |
| **Hint** | One short sentence: format, why, or what happens | I'll reply to this address. | Please enter a valid email address in the field above. |
| **Placeholder** | An example, never the label or instructions | ada@example.com | Email |
| **Prompt / call to action** | A verb plus an object | Open the Workshop | Workshop |
| **Heading** | Sentence case; names the content, not the action | Contact and visitor counts | Configure Your Services! |
| **Status** | Present tense for now, past for done; with when | Saving… · Saved just now | Processing request |
| **Error** | What happened, then how to fix it; keep their input | That link isn't on a service the site can show. Paste a link from Tally or Google Forms. | Invalid input. Error 422 |
| **Empty state** | What will be here, and the one action to start | No pages yet. Start a page | Nothing found |
| **Confirmation** | Name the thing and the consequence; the button repeats the verb | Delete "Spring trip"? It can't be undone. [Delete page] | Are you sure? [OK] |
| **Wait** | Name the work, with the count | Preparing 118 pictures… | Loading… |
| **Toast / notification** | One fact, then one optional action | Page published. View it | Success! |
| **Accessible name** | The same words as the visible label; an icon-only control names its action | aria-label="Close the menu" | aria-label="X" |

## Universal rules

- **Sentence case** everywhere (titles, buttons, tabs, menus), except proper nouns.
- **No "OK", "Submit", "click here", "please", "simply", "just", "oops".** Never blame the person ("You entered an invalid…").
- **Numbers as numerals;** units with a space; dates the reader's way; counts singular and plural correctly ("1 page", "2 pages").
- **Curly quotes and apostrophes** in visible copy; an ellipsis character for ongoing work ("Saving…").
- **No emoji or text symbols as icons**; icons always have a text twin (a label, a tooltip, an accessible name).
- **One term per concept,** from the glossary. If two words name one thing, pick one; if one word names two things, split them.
- **Every cue has a text twin:** a sound, a colour, an animation or a position also has words (a label, a live-region announcement).
- **Touch and keyboard:** don't name a key on a touch device; don't say "click" at all ("choose", "press", "select" by context, or just the verb).
- **Don't spell out controls inline** on a busy surface; put them in a help popover or a help page.

## Patterns

- **Errors:** [what happened]. [How to fix it, as an action]. Keep what they typed. Name the field; focus the first one in error. For a system failure: say it isn't their fault, what still works, and when to try again.
- **Waits:** [Verb]ing [object] [count]… → [Object] [past participle] [when]. Acknowledge actions within 100 ms. For 100 ms–1 s, delay extra status until 300 ms; at 1–10 s name the work while preserving the old view and input; over 10 s show meaningful progress and allow leaving or cancellation. Announce completion, not every progress tick. "Saved" means storage succeeded.
- **Choices with tiers:** each option says what you get and what it asks of you, in one line each; the recommended option first and marked.
- **Steps a person must take outside the product:** numbered, each one action, the link on the step, and what to bring back.
- **Destructive actions:** the button names the action ("Delete page"), not "Yes"; say whether it can be undone.

## The glossary

Every project keeps a glossary (a table: term, meaning, use instead of). Product nouns are lower case unless proper names. Add to it whenever a new concept gets a name; review copy against it. Replace the bundled template's example terms and angle-bracket placeholders with the product's actual vocabulary.

## Making it enforceable

Put the mechanical rules in a test that reads the UI's strings (component sources, message catalogues, or rendered pages):

- banned words and phrases (`OK`, `Submit`, `click here`, `please`, `oops`);
- title case on buttons and headings (more than one capitalised word that isn't a proper noun);
- button labels longer than three words, or not starting with a verb from an allowed list;
- straight quotes in visible copy; text symbols or emoji used as icons;
- glossary violations (a "use instead of" term found);
- icon-only controls without an accessible name.

Review the rest by hand with the checklist.

### Bundled check

The [copy linter](tools/lint-copy.mjs) needs Node.js 20 or later, without packages.
Set `$skill` to this installed skill folder's absolute path. From the target
project's root run either command, using real source paths:

```powershell
node "$skill\tools\lint-copy.mjs" src\components --glossary docs\design\copy-glossary.md
node "$skill\tools\lint-copy.mjs" ui\strings.json --glossary docs\design\copy-glossary.md
node "$skill\tools\lint-copy.mjs" --help
```

For explicit string input, JSON is an object such as
`{"button:save":"Save changes","status:saved":"Saved a moment ago"}`.
Use `kind:id` keys; kinds include button, label, heading, error, status, hint and any.
The glossary file must exist: verify it before running (the reference linter
otherwise silently omits glossary checks). If CI needs its own copy, copy
`tools\lint-copy.mjs` and `LICENSE` into the project.

The linter is heuristic: it reads literal markup or that JSON shape, not all
framework expressions, localization or runtime strings. It does not check missing
accessible names, every banned word, or error recovery behavior, and may flag proper
nouns. Review findings in context; use the checklist and the project's tests for
the rest. An English-language linter is not proof of translation quality.

## Review checklist

- [ ] Each label says what happens or what goes there; buttons are verbs, ≤ 3 words
- [ ] Sentence case; glossary terms; no banned words
- [ ] Errors say what happened and how to fix it, and keep input
- [ ] Waits name the work; statuses say when
- [ ] Empty states offer the first action
- [ ] No developer words before the person has chosen advanced views
- [ ] Every icon, colour, sound or motion has a text twin; accessible names match labels
- [ ] Read aloud: it sounds like a helpful person, not a system

Finish with revised strings, glossary updates, check results and the unverified
behavioral promises. The optional `perceived-performance` skill adds wait design
depth. See [source and license](references/source.md).
