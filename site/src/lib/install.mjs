/**
 * Install plans: what "Get it" shows for one item, one agent and one scope.
 * Pure and data-only, so the build, the item JSON and the CLI (later) agree.
 * See docs/spec/distribution.md (targets, the kits contract) and item-pages.md (Get it).
 * @tier 0
 */
import { automation } from './kit-contract.mjs';
import { url } from './urls.mjs';

/** Where single skills go, per CLI agent value (distribution.md, "Targets"). */
export const SKILL_TARGETS = {
  copilot: { project: '.github/skills', personal: '~/.copilot/skills' },
  'claude-code': { project: '.claude/skills', personal: '~/.claude/skills' },
  codex: { project: '.agents/skills', personal: '~/.agents/skills' },
  cursor: { project: '.agents/skills', personal: '~/.agents/skills' },
  agents: { project: '.agents/skills', personal: '~/.agents/skills' },
};

export const SCOPES = ['project', 'personal'];

const quote = (a) => (/[\s"'$`]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const shortSha = (sha) => String(sha ?? '').slice(0, 7);

function repoPath(repo) {
  const m = /github\.com[/:]([^/]+\/[^/.]+)/.exec(repo ?? '');
  return m ? m[1] : null;
}

/** A checked item archive when prepared; legacy callers retain the pinned Git URL. */
export function downloadUrl(item) {
  if (item.archive) return item.archive.url ? url(item.archive.url) : null;
  const path = repoPath(item.source?.repo);
  const commit = item.source?.commit;
  return path && commit ? `https://github.com/${path}/archive/${commit}.zip` : null;
}

/** The CLI line (not published yet; shown as "coming soon"). */
export function commandLine(item, agentInstall, scope) {
  return `npx loushing add ${item.id} --agent ${agentInstall}${scope === 'personal' ? ' --scope personal' : ''}`;
}

/**
 * One plan.
 * @param {object} item a loaded card (skill, kit or stack)
 * @param {{ agent: {id:string, install:string, title:string}, scope: 'project'|'personal', byId?: Map }} ctx
 * @returns {{ supported: boolean, reason?: string, scope: string, git: string[], ask: string, command: string, download: string|null, adds: {path:string, role:string}[], next?: string, dryRun: boolean, steps?: object[] }}
 */
export function plan(item, { agent, scope, byId = new Map() }) {
  if (item.type === 'stack') return stackPlan(item, { agent, scope, byId });
  if (item.install) return kitPlan(item, { agent, scope });
  return skillPlan(item, { agent, scope });
}

function unsupported(scope, reason) {
  return { supported: false, reason, scope, git: [], ask: '', command: '', download: null, adds: [], dryRun: false };
}

function kitPlan(item, { agent, scope }) {
  const c = item.install;
  const scopes = c.scopes ?? ['project'];
  if (!scopes.includes(scope)) return unsupported(scope, `${item.title} installs into one project at a time; it has no setup for all your projects.`);
  if (c.agents?.supported && !c.agents.supported.includes(agent.id)) {
    return unsupported(scope, `${item.title} supports ${c.agents.supported.length === 1 ? 'one agent' : 'only some agents'} so far. ${agent.title} isn’t one of them.`);
  }
  const dir = item.id;
  const fill = (a) => a.replace('{projectDir}', '.');
  const args = (scope === 'personal' ? c.personal ?? [] : (c.project ?? []).map(fill)).slice();
  for (const input of c.inputs ?? []) args.push(input.flag, input.example ?? `<${input.name}>`);
  const target = c.agents?.map ? c.agents.map[agent.id] : null;
  if (c.agents?.flag && target) args.push(c.agents.flag, target);
  const [runner, script] = c.command;
  const run = [runner, `${dir}/${script}`, ...args].map(quote).join(' ');
  const git = [
    `git clone ${item.source.repo}.git ${dir}`,
    `git -C ${dir} checkout ${item.source.commit}`,
    run,
  ];
  const dry = c.dryRun ? ` ${c.dryRun.join(' ')}` : '';
  const ask = c.dryRun
    ? `Get ${item.title} from ${item.source.repo} at commit ${shortSha(item.source.commit)}. Clone it, run \`${run}${dry}\`, show me what it will add, and run it without ${c.dryRun.join(' ')} only after I agree.`
    : `Get ${item.title} from ${item.source.repo} at commit ${shortSha(item.source.commit)}. Read what \`${run}\` adds, tell me first, and run it only after I agree.`;
  return {
    supported: true,
    automation: automation(item),
    scope,
    git,
    ask,
    command: commandLine(item, agent.install, scope),
    download: downloadUrl(item),
    downloadSteps: [`Extract the ZIP beside your project files; it contains the ${dir}/ folder.`, `Review the files, then run: ${run}`],
    adds: kitAdds(item, target, scope),
    next: c.next,
    dryRun: Boolean(c.dryRun),
    inputs: c.inputs ?? [],
  };
}

/** What a kit adds: Slate lists it; craft-style kits are computed from parts and targets. */
export function kitAdds(item, target, scope) {
  const c = item.install;
  if (c.adds) return c.adds.map((a) => ({ path: a.path, role: a.role }));
  const t = c.targets?.[target];
  if (!t) return [];
  const personal = scope === 'personal';
  const skillsDir = personal ? t.personalSkills : t.skills;
  const agentsDir = personal ? t.personalAgents : t.agents;
  const out = [];
  for (const p of item.parts ?? []) {
    if (p.kind === 'skill' && skillsDir) out.push({ path: `${skillsDir}/${p.name}/`, role: `The ${p.name} skill` });
    if (p.kind === 'agent' && agentsDir && t.agentFile) out.push({ path: `${agentsDir}/${t.agentFile.replace('{name}', p.name)}`, role: `The ${p.name} agent` });
  }
  if (!personal) for (const s of c.sections ?? []) out.push({ path: s.file, role: s.role });
  return out;
}

function skillPlan(item, { agent, scope }) {
  const t = SKILL_TARGETS[agent.install];
  if (!t) return unsupported(scope, `No folder is known for ${agent.title} yet.`);
  const dest = `${t[scope]}/${item.id}/`;
  const src = item.source?.path ?? `skills/${item.id}`;
  return {
    supported: true,
    scope,
    git: [
      `git clone ${item.source.repo}.git loushing`,
      `git -C loushing checkout ${item.source.commit}`,
      `cp -r loushing/${src} ${dest}`,
    ],
    ask: `Copy the ${item.id} skill from ${item.source.repo} (folder ${src}, commit ${shortSha(item.source.commit)}) to ${dest}. Show me the files first and copy them only after I agree.`,
    command: commandLine(item, agent.install, scope),
    download: downloadUrl(item),
    downloadSteps: [`Extract the ZIP; it contains the ${item.id}/ folder.`, `Create ${t[scope]}/ if needed, then copy the entire ${item.id}/ folder into it.`, 'Start a new agent session and ask it to use the skill.'],
    adds: [{ path: dest, role: `The ${item.id} skill (${(item.files ?? []).length} files)` }],
    dryRun: false,
  };
}

function stackPlan(item, { agent, scope, byId }) {
  const steps = (item.members ?? []).map((m) => {
    const member = byId.get(m.id);
    return member ? { id: m.id, title: member.title, role: m.role, plan: plan(member, { agent, scope, byId }) } : null;
  }).filter(Boolean);
  const blocked = steps.filter((s) => !s.plan.supported);
  const ok = steps.filter((s) => s.plan.supported);
  return {
    supported: ok.length > 0,
    automation: { supported: steps.length > 0 && steps.every((s) => s.plan.automation?.supported !== false), reason: 'Stack automation requires a released contract for every kit member.' },
    partial: blocked.length > 0 && ok.length > 0,
    reason: blocked.length ? blocked.map((s) => s.plan.reason).join(' ') : undefined,
    scope,
    git: ok.flatMap((s) => [`# ${s.title}`, ...s.plan.git]),
    ask: `Set up the ${item.title} stack: ${ok.map((s) => s.title).join(', then ')}. For each one, show me the plan first and continue only after I agree.`,
    command: commandLine(item, agent.install, scope),
    download: null,
    adds: ok.flatMap((s) => s.plan.adds),
    dryRun: ok.every((s) => s.plan.dryRun),
    steps,
  };
}

/** Every agent and scope, keyed `${agentId}:${scope}`. */
export function allPlans(item, agents, byId) {
  const out = {};
  for (const agent of agents) for (const scope of SCOPES) out[`${agent.id}:${scope}`] = plan(item, { agent, scope, byId });
  return out;
}
