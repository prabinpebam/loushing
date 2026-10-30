#!/usr/bin/env node
// Explicit local-only manifest. It never changes catalog pins or claims a working tree is a release.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, portablePath, safePath, snapshot } from '../lib/safety.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export function developmentManifest(base = repo) {
  const kits = {};
  for (const id of ['agentic-craft', 'agent-orchestration', 'slate']) {
    const root = resolve(base, id);
    const paths = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean).sort();
    const files = paths.map((path) => {
      portablePath(path); snapshot(root, path);
      const bytes = readFileSync(safePath(root, path));
      return { path, size: bytes.length, sha256: hash(bytes) };
    });
    const writes = [{ path: `.kit-state/${id}.json`, kind: 'file' }];
    if (id === 'slate') {
      writes.push({ path: '.kits/slate', kind: 'tree' }, { path: 'docs', kind: 'tree' });
      for (const folder of ['.github', '.claude', '.agents']) writes.push({ path: `${folder}/skills/slate`, kind: 'tree' });
    } else {
      for (const folder of ['.github', '.copilot', '.claude', '.agents']) {
        for (const skill of readdirSync(safePath(root, 'skills'))) writes.push({ path: `${folder}/skills/${skill}`, kind: 'tree' });
        if (folder !== '.agents') for (const agent of readdirSync(safePath(root, 'agents'))) writes.push({ path: `${folder}/agents/${folder === '.claude' ? agent.replace('.agent.md', '.md') : agent}`, kind: 'file' });
      }
      writes.push({ path: 'AGENTS.md', kind: 'file' }, { path: 'CLAUDE.md', kind: 'file' });
      if (id === 'agent-orchestration') for (const folder of ['.github', '.copilot']) for (const name of ['orchestration-clock.mjs', 'orchestration-clock.json']) writes.push({ path: `${folder}/hooks/${name}`, kind: 'file' });
    }
    kits[id] = {
      root, commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      contract: {
        version: 1, command: ['node', id === 'slate' ? 'scripts/init-project.mjs' : 'tools/install.mjs'],
        logicalRootFlag: '--logical-root',
        project: id === 'slate' ? ['--repo', '{projectDir}', '--host', 'docs', '--project', 'Project Documentation'] : ['{projectDir}'],
        ...(id === 'slate' ? {} : { personal: ['--global'] }),
        agents: { copilot: 'copilot', 'claude-code': 'claude', codex: 'agents', cursor: 'agents', agents: 'agents' },
        files, writes, effects: id === 'agent-orchestration' ? ['writes-project-files', 'runs-hooks'] : ['writes-project-files'], network: false,
      },
    };
  }
  return { version: 1, mode: 'uncommitted-local', kits };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(developmentManifest(), null, 2));
