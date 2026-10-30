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
| [feed.xml](/feed.xml) | Follow items as they are added and updated |

## Install with consent

Show the person the plan before changing anything: what will be added, where, and
whether the item runs scripts, uses the network, writes outside its folder or needs
credentials. The `effects` field and the trust panel say which. Install only after
they agree.

Kits come with their own installer. When the plan offers a dry run, run it first and
show its output.

## Coming soon

A command-line tool with JSON output for agents: `npx loushing find "<task>" --json`,
`info`, `add`, `list`, `outdated` and `update`. It isn’t published yet.
