import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
let failed = false;
for (const directory of ['src/sim', 'src/content'])
  for (const name of readdirSync(directory)) {
    if (!name.endsWith('.ts')) continue;
    const path = join(directory, name),
      source = readFileSync(path, 'utf8');
    const forbidden = [
      /from\s+['"][^'"]*(?:three|render|platform|main)['"]/,
      /\b(?:window|document|performance)\./,
      /Math\.random\s*\(/,
      /Date\.now\s*\(/,
    ];
    if (forbidden.some((rule) => rule.test(source))) {
      console.error(`Forbidden authoritative dependency/API: ${path}`);
      failed = true;
    }
  }
if (failed) process.exit(1);
console.log(
  'PASS: authoritative modules have no renderer, platform, wall-clock or ambient RNG dependencies.',
);
