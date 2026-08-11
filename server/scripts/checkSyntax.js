import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const collectJavaScriptFiles = (directory) => readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectJavaScriptFiles(path) : [path];
  })
  .filter((path) => path.endsWith('.js'));

const sourceDirectory = fileURLToPath(new URL('../src', import.meta.url));

for (const file of collectJavaScriptFiles(sourceDirectory)) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('Backend syntax check passed.');
