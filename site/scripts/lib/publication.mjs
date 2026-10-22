/**
 * The publication check: what must never reach the public catalog. Pure; the loader runs
 * it over every skill file, pointer and card. See docs/spec/repository-organization.md
 * (public and private; build and checks).
 *
 * A finding names the rule, the line and a short, masked excerpt, so the report itself
 * never republishes the secret.
 */

const RULES = [
  { id: 'private-key', what: 'a private key', re: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/ },
  { id: 'github-token', what: 'a GitHub token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/ },
  { id: 'aws-key', what: 'an AWS access key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { id: 'slack-token', what: 'a Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { id: 'api-key', what: 'an API key', re: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}/ },
  { id: 'azure-key', what: 'an Azure storage key or signature', re: /\b(?:AccountKey|SharedAccessKey)=[A-Za-z0-9+/]{20,}={0,2}|[?&]sig=[A-Za-z0-9%+/]{20,}/ },
  { id: 'jwt', what: 'a signed token (JWT)', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { id: 'assigned-secret', what: 'a secret assigned in the text', re: /\b(?:api[_-]?key|secret|client[_-]?secret|access[_-]?token|auth[_-]?token|password|passwd)\b["']?\s*[:=]\s*["']?([A-Za-z0-9_\-+/=]{16,})/i, value: 1 },
  { id: 'internal-host', what: 'an internal host or URL', re: /\b(?:[a-z0-9-]+\.)+(?:corp|internal|intranet|lan)\b|\b[a-z0-9-]+\.local\b|\b(?:[a-z0-9-]+\.)*(?:sharepoint\.com|visualstudio\.com)\b|\bdev\.azure\.com\/[\w-]+/i },
  { id: 'private-ip', what: 'a private network address', re: /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/ },
];

const FIX = {
  'internal-host': 'Remove the internal address or replace it with a public one, such as example.com.',
  'private-ip': 'Remove the address or use a documentation range, such as 192.0.2.1.',
};

/** A value that looks like a real secret: long, and mixing letters with digits. */
const secretLike = (v) => /[A-Za-z]/.test(v) && /\d/.test(v) && !/^(?:x+|\*+|<.*>)$/i.test(v);

const mask = (s) => (s.length <= 8 ? '…' : `${s.slice(0, 4)}…${s.slice(-2)}`);

/** @returns {{ rule: string, what: string, line: number, excerpt: string, fix: string }[]} */
export function scanText(text) {
  const findings = [];
  const lines = String(text ?? '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const rule of RULES) {
      const m = rule.re.exec(lines[i]);
      if (!m) continue;
      if (rule.value && !secretLike(m[rule.value])) continue;
      const hit = m[rule.value ?? 0];
      findings.push({
        rule: rule.id,
        what: rule.what,
        line: i + 1,
        excerpt: rule.id === 'internal-host' ? hit : mask(hit),
        fix: FIX[rule.id] ?? 'Remove it, revoke it if it was real, and read it from the environment at run time instead.',
      });
    }
  }
  return findings;
}

export const PUBLICATION_RULES = RULES.map((r) => r.id);
