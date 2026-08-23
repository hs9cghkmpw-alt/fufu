import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8'
})
  .split(/\r?\n/)
  .filter(Boolean);
const textFile =
  /(?:^|\/)(?:[^/]+\.(?:js|mjs|cjs|ts|tsx|json|html|css|md|sql|toml|ya?ml|env|example)|\.gitignore)$/i;
const patterns = [
  ['JWT', /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /gh[opsu]_[A-Za-z0-9_]{30,}/]
];
const findings = [];
for (const file of files.filter(
  (name) => textFile.test(name) && name !== 'scripts/scan-secrets.mjs'
)) {
  const content = readFileSync(file, 'utf8');
  for (const [name, regex] of patterns) if (regex.test(content)) findings.push(`${file}: ${name}`);
}
if (findings.length) throw new Error(`Potential secrets found:\n${findings.join('\n')}`);
console.log(`Secret scan passed (${files.length} files considered).`);
