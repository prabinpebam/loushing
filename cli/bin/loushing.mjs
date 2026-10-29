#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { HELP, run } from '../lib/cli.mjs';

const args = process.argv.slice(2);
const json = args.includes('--json');
const abort = new AbortController();
process.once('SIGINT', () => abort.abort());
process.once('SIGTERM', () => abort.abort());
const context = { signal: abort.signal, progress: (message) => process.stderr.write(`${message}\n`) };
let result = await run(args, context);

if (result.status === 'needs-decision' && process.stdin.isTTY && process.stderr.isTTY && !json) {
  const prompt = createInterface({ input: process.stdin, output: process.stderr });
  try {
    while (result.status === 'needs-decision' && result.decisions?.length) {
      const choice = result.decisions[0];
      const options = choice.options ?? (choice.value ? ['approve', 'cancel'] : null);
      process.stderr.write(`${JSON.stringify(result.plan ?? result.sourcePlan ?? {}, null, 2)}\n`);
      const answer = (await prompt.question(`${choice.question}${options ? ` [${options.join('/')}]` : ''}: `, { signal: abort.signal })).trim();
      if (!answer || options && !options.includes(answer) || answer === 'cancel') {
        result = { status: 'needs-decision', message: 'Cancelled. No files were changed.', decisions: result.decisions };
        break;
      }
      args.push(choice.flag);
      if (choice.flag !== '--yes') args.push(choice.value ?? answer);
      if (choice.also) args.push(choice.also);
      result = await run(args, context);
    }
  } catch {
    result = { status: 'needs-decision', message: 'Cancelled. No files were changed.' };
  } finally { prompt.close(); }
}

if (json) process.stdout.write(`${JSON.stringify(result)}\n`);
else if (result.help) process.stdout.write(HELP);
else if (result.version) process.stdout.write(`${result.version}\n`);
else {
  if (result.message) process.stdout.write(`${result.message}\n`);
  if (result.plan) process.stdout.write(`${JSON.stringify(result.plan, null, 2)}\n`);
  else if (result.sourcePlan) process.stdout.write(`${JSON.stringify(result.sourcePlan, null, 2)}\n`);
  if (result.manual) process.stdout.write(`${JSON.stringify(result.manual, null, 2)}\n`);
  if (result.item) process.stdout.write(`${JSON.stringify(result.item, null, 2)}\n`);
  if (result.results || result.items !== undefined) process.stdout.write(`${JSON.stringify(result.results ?? result.items, null, 2)}\n`);
  if (result.problems?.length) for (const problem of result.problems) process.stderr.write(`${problem.file}: ${problem.message}\nFix: ${problem.fix}\n`);
  if (result.decisions?.length) for (const choice of result.decisions) process.stderr.write(`${choice.question} Use ${choice.flag}${choice.value ? ` ${choice.value}` : choice.options ? ` (${choice.options.join(', ')})` : ' <value>'}${choice.also ? ` ${choice.also}` : ''}.\n`);
  if (result.next) process.stdout.write(`${result.next}\n`);
  if (result.cleanup) process.stderr.write(`${result.cleanup}\n`);
}
process.exitCode = { ok: 0, error: 1, 'needs-decision': 2 }[result.status] ?? 1;
