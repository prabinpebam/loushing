/** Data-only release contract shared by publication and the CLI. No source is executed here. */
const pathOK = (p) => typeof p === 'string' && p.length <= 1024 && p.split('/').every((s) => s && !['.', '..', '.git'].includes(s.toLowerCase())
  && !/[\\<>:"|?*\x00-\x1f]|[. ]$/.test(s) && !/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(s));
const reserved = (p) => /^(?:loushing\.lock\.json(?:\/|$)|\.loushing(?:\/|$)|\.loushing-(?:transaction|stage-))/i.test(p);
export function contractProblem(c) {
  if (!c || c.version !== 1) return 'No released version-1 installer contract; use the manual Git plan.';
  if (!Array.isArray(c.command) || c.command.length !== 2 || c.command[0] !== 'node' || !pathOK(c.command[1])) return 'The contract must name one relative Node entry point.';
  if (!Array.isArray(c.files) || !c.files.length || c.files.length > 2000) return 'The contract needs its complete source manifest.';
  const paths = new Set();
  let total = 0;
  for (const f of c.files) {
    if (!f || !pathOK(f.path) || !/^[a-f0-9]{64}$/.test(f.sha256 ?? '') || !Number.isSafeInteger(f.size) || f.size < 0 || f.size > 20 * 1024 * 1024
      || paths.has(f.path.toLowerCase())) return 'Invalid or duplicate contract source file.';
    paths.add(f.path.toLowerCase()); total += f.size;
  }
  if (total > 80 * 1024 * 1024 || !c.files.some((f) => f.path === c.command[1])) return 'The source exceeds its budget or omits its entry point.';
  for (const p of paths) {
    const parts = p.split('/');
    while (parts.length > 1) { parts.pop(); if (paths.has(parts.join('/'))) return 'A source file is also a folder.'; }
  }
  if (!Array.isArray(c.project) || c.project.filter((v) => v === '{projectDir}').length !== 1
    || c.project.some((v) => typeof v !== 'string' || /[\x00-\x1f]/.test(v))) return 'The contract needs one projectDir argument.';
  if (c.personal !== undefined && JSON.stringify(c.personal) !== '["--global"]') return 'Personal setup must explicitly use --global.';
  if (c.logicalRootFlag !== undefined && c.logicalRootFlag !== '--logical-root') return 'Invalid logical root flag.';
  if (!c.agents || typeof c.agents !== 'object' || Array.isArray(c.agents) || !Object.keys(c.agents).length || Object.entries(c.agents).some(([k, v]) => !['copilot', 'claude-code', 'codex', 'cursor', 'agents'].includes(k) || !['copilot', 'claude', 'agents'].includes(v))) return 'Invalid agent mapping.';
  if (!Array.isArray(c.effects) || c.effects.some((e) => !/^[a-z][a-z0-9-]*$/.test(e))) return 'The contract needs declared effects.';
  if (!Array.isArray(c.writes) || !c.writes.length || c.writes.some((w) => !w || !pathOK(w.path) || !['file', 'tree'].includes(w.kind))) return 'The contract needs bounded write locations.';
  if (c.writes.some((w) => reserved(w.path))) return 'An installer cannot own repository internals or distributor transaction files.';
  if (c.network !== false) return 'Version 1 installers must not use the network.';
  return null;
}
export const permits = (contract, path) => pathOK(path) && !reserved(path) && contract.writes.some((w) => w.kind === 'file' ? path === w.path : path.startsWith(`${w.path}/`));
export const automation = (item) => {
  const reason = contractProblem(item.install?.contract);
  return { supported: !reason, ...(reason ? { reason } : { contractVersion: 1 }) };
};
