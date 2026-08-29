import { access, cp, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deployDir = join(repoRoot, 'deploy');
const requiredFiles = ['appsscript.json', 'Code.js', join('dist', 'Index.html')];

async function copyIfPresent(source, destination) {
  try {
    await cp(join(repoRoot, source), destination, { recursive: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

for (const file of requiredFiles) {
  await access(join(repoRoot, file));
}

await rm(deployDir, { recursive: true, force: true });
await mkdir(deployDir, { recursive: true });

await cp(join(repoRoot, 'appsscript.json'), join(deployDir, 'appsscript.json'));
await cp(join(repoRoot, 'Code.js'), join(deployDir, 'Code.js'));
await cp(join(repoRoot, 'dist', 'Index.html'), join(deployDir, 'Index.html'));

await copyIfPresent('gas', join(deployDir, 'gas'));

const rootFiles = await readdir(repoRoot);
const gasFiles = rootFiles.filter((file) => file.endsWith('.gs'));

for (const file of gasFiles) {
  await cp(join(repoRoot, file), join(deployDir, file));
}

console.log('gas deploy ok: deploy/appsscript.json, deploy/Code.js, deploy/Index.html');
