# Skills

Skills that live in Loushing, one flat folder each:

```text
skills/<id>/
├─ SKILL.md      The agent's file (Agent Skills format); its name equals <id>
├─ about.md      The item card: catalog fields plus the plain-language page
├─ scripts/      Optional helpers the agent can run
├─ references/   Optional documents loaded on demand
└─ assets/       Optional templates, images and data
```

Only skills the owner explicitly chooses are added, and each one passes the
publication check first (no secrets, internal names, customer or personal data, and a
license). Nothing is imported in bulk. See
[repository organization](../docs/spec/repository-organization.md#adding-items).

Run `node site/scripts/build.mjs --check` after adding one: it names each problem
and how to fix it.
