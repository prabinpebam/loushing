import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CliError } from './safety.mjs';

export const TARGETS = Object.freeze({
  copilot: { project: '.agents/skills', personal: '.copilot/skills' },
  'claude-code': { project: '.claude/skills', personal: '.claude/skills' },
  codex: { project: '.agents/skills', personal: '.agents/skills' },
  cursor: { project: '.agents/skills', personal: '.cursor/skills' },
  agents: { project: '.agents/skills', personal: '.agents/skills' },
});

export function destinations(agents, scope, root, name) {
  return [...new Set(agents.map((agent) => {
    if (!Object.hasOwn(TARGETS, agent)) throw new CliError(`Unknown agent: ${agent}. Choose ${Object.keys(TARGETS).join(', ')}.`);
    let folder = TARGETS[agent][scope];
    if (agent === 'copilot' && scope === 'project' && existsSync(join(root, '.github', 'skills'))) folder = '.github/skills';
    return `${folder}/${name}`;
  }))];
}

export function detectedAgents(root) {
  const found = [];
  for (const [agent, paths] of Object.entries({
    copilot: ['.github'], 'claude-code': ['.claude', 'CLAUDE.md'], agents: ['.agents', 'AGENTS.md'], cursor: ['.cursor'],
  })) if (paths.some((path) => existsSync(join(root, path)))) found.push(agent);
  return found;
}

export function allowedDestination(path, id, scope, agents) {
  return agents.some((agent) => {
    const target = TARGETS[agent]?.[scope];
    return path === `${target}/${id}` || (agent === 'copilot' && scope === 'project' && path === `.github/skills/${id}`);
  });
}
