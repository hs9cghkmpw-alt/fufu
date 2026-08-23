import { existsSync, readFileSync } from 'node:fs';

for (const file of ['dist/manifest.webmanifest', 'dist/sw.js']) {
  if (!existsSync(file)) throw new Error(`${file} was not generated`);
}
const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
if (manifest.display !== 'standalone' || !manifest.icons?.length) {
  throw new Error('PWA manifest is incomplete');
}
console.log('PWA manifest and Service Worker were generated.');
