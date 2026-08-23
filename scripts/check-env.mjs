import { readFileSync } from 'node:fs';

const content = readFileSync('.env.example', 'utf8');
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
for (const name of required) {
  if (!new RegExp(`^${name}=.+$`, 'm').test(content)) throw new Error(`${name} is missing`);
}
const assignments = content
  .split(/\r?\n/)
  .filter((line) => line.trim() && !line.trimStart().startsWith('#'))
  .join('\n');
if (/^(?:[^=]*(?:service[_-]?role|secret[_-]?key)[^=]*)=/im.test(assignments)) {
  throw new Error('Forbidden secret key variable');
}
console.log('Environment contract is valid.');
