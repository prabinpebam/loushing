/** Explicit pinned package roots, not exclusions or publication-check exemptions. */
export const safeArchivePath = (path) => typeof path === 'string' && !/[\\:<>"|?*\x00-\x1f]/.test(path)
  && path.split('/').every((p) => p && p !== '.' && p !== '..' && !/[. ]$/.test(p)
    && !/^(?:\.git|\.env(?:\..*)?|node_modules|con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p));

export function packageFilesProblem(paths) {
  if (!Array.isArray(paths) || !paths.length) return 'packageFiles must be a nonempty array of file paths or directory paths ending in /';
  const seen = new Set();
  for (const path of paths) {
    if (typeof path !== 'string' || !safeArchivePath(path.endsWith('/') ? path.slice(0, -1) : path)) return 'packageFiles contains an unsafe path; use exact repository-relative files or directories, not globs';
    const identity = path.normalize('NFC').toLowerCase();
    if (seen.has(identity)) return 'packageFiles contains duplicate paths';
    seen.add(identity);
  }
  return null;
}

/** Validate metadata before reading blobs; every selected file is still scanned later. */
export function selectPackageFiles(entries, paths) {
  let selected = entries;
  if (paths !== undefined) {
    const problem = packageFilesProblem(paths);
    if (problem) throw new Error(problem);
    const seen = new Set();
    selected = [];
    for (const path of paths) {
      const matches = entries.filter((entry) => path.endsWith('/') ? entry.path.startsWith(path) : entry.path === path);
      if (!matches.length) throw new Error('A packageFiles path is missing or empty at the pinned commit');
      for (const entry of matches) {
        if (seen.has(entry.path)) throw new Error('packageFiles paths overlap');
        seen.add(entry.path);
        selected.push(entry);
      }
    }
  }
  if (!selected.length) throw new Error('The pinned item has no files');
  const identities = new Set();
  let bytes = 0;
  for (const file of selected) {
    if (!safeArchivePath(file.path) || file.type !== 'blob' || !['100644', '100755'].includes(file.mode)) throw new Error('The pinned item contains an unsafe path, link or nested repository');
    const identity = file.path.normalize('NFC').toLowerCase();
    if (identities.has(identity)) throw new Error('The pinned item contains colliding paths');
    identities.add(identity);
    if (!Number.isSafeInteger(file.size) || file.size < 0) throw new Error('The pinned item has an invalid file size');
    bytes += file.size;
  }
  if (selected.length > 10000 || bytes > 64 * 1024 * 1024) throw new Error('The pinned package exceeds the download budget (10000 files or 64 MiB)');
  return selected;
}
