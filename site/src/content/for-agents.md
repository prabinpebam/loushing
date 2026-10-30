---
title: For agents
summary: The machine-readable files an agent can use to search the catalog and plan an install.
---

# For agents

Everything on this site is also available as plain files, so an agent can search my
collection and plan an install without reading the pages. These are the items I use
myself; nothing here is ranked or rated.

| File | Use it to |
| --- | --- |
| [catalog.json](/catalog.json) | List or search every item, with its summary, agents, effects and links |
| `/items/<id>.json` | Read one item: its card, files with sizes and SHA-256 hashes, and the install plan for every agent and scope |
| `/items/<id>.md` | Read one item’s page as plain Markdown |
| [llms.txt](/llms.txt) | Start here: what the site is and where the files are |
| [feed.xml](/feed.xml) | Follow registered catalog releases; empty before the first release |
| [Catalog schema](/schema/catalog-1.json) · [Item schema](/schema/item-1.json) · [Old-ID schema](/schema/lifecycle-1.json) | Validate index, item and alias/removal JSON |

## Install with consent

Show the person the plan before changing anything: what will be added, where, and
whether the item runs scripts, uses the network, writes outside its folder or needs
credentials. The `effects` field and the trust panel say which. Install only after
they agree.

Kits come with their own installer. Ask the person to trust its pinned source before
executing any code, including a dry run. Then show the resulting destination plan
and obtain consent to that plan. Source trust is not permission to change files.

## Local CLI and finder

The repository includes a dependency-free CLI with JSON output:
`node cli\bin\loushing.mjs find "<task>" --json`. It also supports `info`, `add`,
`list`, `outdated`, `update`, `remove`, `install` and `check`.
The npm package is not published; `npx loushing` is a planned route.

The optional `loushing` finder skill uses that CLI or these static files. It previews
effects and destinations and waits for the actual person’s explicit consent before
installation. Its synthetic regression tasks do not prove behavior in real agents.
Current public kit pins still use manual setup; their new installer contracts are
unreleased.
