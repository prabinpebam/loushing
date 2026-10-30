import { chmodSync, mkdirSync, readFileSync, renameSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { CliError, hash, safePath, sameSnapshot, snapshot, stat } from './safety.mjs';

/** All downloads and decisions precede this short, synchronous, rollback-able commit. */
export function transact(root, operations, { signal, beforeWrite, lockHeld = false } = {}) {
  signal?.throwIfAborted();
  safePath(root);
  if (!stat(root)?.isDirectory()) throw new CliError('The project folder does not exist. Create it before installing.');
  const mutex = safePath(root, '.loushing-transaction');
  try { if (!lockHeld) mkdirSync(mutex); } catch (error) {
    if (error.code === 'EEXIST') throw new CliError('Another install may be running. Do not remove .loushing-transaction until it has stopped.');
    throw error;
  }
  const stage = safePath(root, `.loushing-stage-${randomUUID()}`);
  const created = [];
  const applied = [];
  let rollbackFailed = false;
  const ensure = (folder) => {
    if (stat(folder)) return;
    ensure(dirname(folder));
    mkdirSync(folder);
    created.push(folder);
  };
  try {
    mkdirSync(stage);
    for (let index = 0; index < operations.length; index++) {
      const operation = operations[index];
      if (!sameSnapshot(snapshot(root, operation.path), operation.before)) throw new CliError(`Changed during planning: ${operation.path}. Run the command again.`);
      if (operation.bytes !== null) writeFileSync(join(stage, `${index}.new`), operation.bytes, { flag: 'wx' });
    }
    for (let index = 0; index < operations.length; index++) {
      signal?.throwIfAborted();
      const operation = operations[index];
      beforeWrite?.(operation, index);
      signal?.throwIfAborted();
      const target = safePath(root, operation.path);
      if (!sameSnapshot(snapshot(root, operation.path), operation.before)) throw new CliError(`Changed during install: ${operation.path}. The install was rolled back.`);
      ensure(dirname(target));
      const original = join(stage, `${index}.old`);
      if (operation.before) renameSync(target, original);
      const record = { target, original, path: operation.path, hash: operation.bytes === null ? null : hash(operation.bytes), hadOriginal: !!operation.before, written: false };
      applied.push(record);
      if (operation.bytes !== null) {
        renameSync(join(stage, `${index}.new`), target);
        record.written = true;
        if (operation.before) chmodSync(target, operation.before.mode);
      }
    }
    signal?.throwIfAborted();
  } catch (error) {
    const failures = [];
    for (const record of applied.reverse()) {
      try {
        safePath(root, relative(root, record.target).replaceAll('\\', '/'));
        if (record.written) {
          if (snapshot(root, record.path)?.hash !== record.hash) throw new CliError('A file changed during rollback; preserving it.');
          rmSync(record.target);
        }
        if (record.hadOriginal) renameSync(record.original, record.target);
      } catch (failure) { failures.push(failure); }
    }
    for (const folder of created.reverse()) {
      try { rmdirSync(folder); } catch { /* Do not remove a folder another process filled. */ }
    }
    if (failures.length) {
      rollbackFailed = true;
      throw new CliError(`Rollback could not finish. Original files are preserved in ${stage}; do not delete it.`);
    }
    throw error;
  } finally {
    if (!rollbackFailed) rmSync(stage, { recursive: true, force: true });
    if (!lockHeld) rmSync(mutex, { recursive: true, force: true });
  }
}

export function backupOperation(root, path, version) {
  const backup = `${path}.loushing-${version}`;
  if (stat(safePath(root, backup))) throw new CliError(`Backup already exists: ${backup}. Move it before replacing this file.`);
  return { path: backup, bytes: readFileSync(safePath(root, path)), before: null };
}
