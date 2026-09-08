import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { unzipSync } from 'fflate';

const root = resolve(import.meta.dirname, '..');
const pointer = JSON.parse(await readFile(resolve(root, 'reference-data.json'), 'utf8'));
const stampPath = resolve(root, '.cache/reference-data/bootstrap.json');
const requiredFiles = [
  'src/data/generated/timezones.json',
  'src/data/generated/countries.json',
  'src/data/generated/time-zone-rules.json',
  'public/data/generated/cities-index.json',
  'public/data/generated/countries.geo.json',
];

try {
  const stamp = JSON.parse(await readFile(stampPath, 'utf8'));
  await Promise.all(requiredFiles.map((path) => readFile(resolve(root, path))));
  if (stamp.sha256 === pointer.sha256) {
    console.log(`Reference data ${pointer.releaseTag} is already available.`);
    process.exit(0);
  }
} catch {
  // Missing or stale generated data is restored from the checksummed release asset below.
}

const assetUrl = `https://github.com/DevSecNinja/worldtime/releases/download/${
  pointer.releaseTag
}/${pointer.assetName}`;
const response = await fetch(assetUrl);
if (!response.ok) throw new Error(`Reference-data download failed with ${response.status}.`);
const archive = new Uint8Array(await response.arrayBuffer());
const hash = createHash('sha256').update(archive).digest('hex');
if (hash !== pointer.sha256) throw new Error('Reference-data archive checksum mismatch.');

const files = unzipSync(archive);
await rm(resolve(root, 'src/data/generated'), { recursive: true, force: true });
await rm(resolve(root, 'public/data/generated'), { recursive: true, force: true });
for (const [path, content] of Object.entries(files)) {
  if (path === 'reference-data-stamp.json') continue;
  if (
    path.includes('..')
    || (!path.startsWith('src/data/generated/') && !path.startsWith('public/data/generated/'))
  ) {
    throw new Error(`Unexpected path in reference-data archive: ${path}`);
  }
  const destination = resolve(root, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content);
}
await mkdir(dirname(stampPath), { recursive: true });
await writeFile(stampPath, `${JSON.stringify({ sha256: pointer.sha256 })}\n`, 'utf8');
console.log(`Restored reference data ${pointer.releaseTag}.`);
