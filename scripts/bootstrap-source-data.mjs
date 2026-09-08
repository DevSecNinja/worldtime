import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'data/upstream/manifest.json'), 'utf8'));
const source = manifest.sources.find(({ name }) => name === 'GeoNames Gazetteer');
if (!source?.archive?.url || !source.archive.sha256) {
  throw new Error('GeoNames archive metadata is missing from the upstream manifest.');
}

const cachePath = resolve(root, '.cache/reference-data/cities500.zip');
try {
  const cached = await readFile(cachePath);
  const hash = createHash('sha256').update(cached).digest('hex');
  if (hash === source.archive.sha256) {
    console.log(`GeoNames source ${source.version} is already cached.`);
    process.exit(0);
  }
} catch {
  // Missing source data is downloaded and verified below.
}

const response = await fetch(source.archive.url);
if (!response.ok) throw new Error(`GeoNames archive request failed with ${response.status}.`);
const archive = Buffer.from(await response.arrayBuffer());
const hash = createHash('sha256').update(archive).digest('hex');
if (hash !== source.archive.sha256) throw new Error('GeoNames source archive checksum mismatch.');
await mkdir(dirname(cachePath), { recursive: true });
await writeFile(cachePath, archive);
console.log(`Cached GeoNames source ${source.version}.`);
