import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const distDir = 'dist';
const files = await readdir(distDir, { recursive: true });
const htmlFiles = files.filter((file) => file.toLowerCase().endsWith('.html'));
const jsFiles = files.filter((file) => file.toLowerCase().endsWith('.js'));
const cssFiles = files.filter((file) => file.toLowerCase().endsWith('.css'));

if (htmlFiles.length !== 1) {
  throw new Error(`Expected exactly one HTML file in /dist, found ${htmlFiles.length}.`);
}

if (jsFiles.length > 0 || cssFiles.length > 0) {
  throw new Error(
    `Expected no separate JS/CSS files in /dist, found js=${jsFiles.length}, css=${cssFiles.length}.`,
  );
}

const html = await readFile(join(distDir, htmlFiles[0]), 'utf8');

if (/<script[^>]+src=/.test(html) || /<link[^>]+stylesheet/.test(html)) {
  throw new Error('Expected bundled HTML without external script or stylesheet references.');
}

console.log(`singlefile ok: ${join(distDir, htmlFiles[0])}`);
