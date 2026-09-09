import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifestPath = resolve(root, 'data/upstream/manifest.json');
const cachePath = resolve(root, '.cache/reference-data/cities500.zip');
const markerPath = resolve(root, '.cache/reference-data/update.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const source = manifest.sources.find(({ name }) => name === 'GeoNames Gazetteer');
if (!source?.archive?.url || !source.archive.sha256) {
  throw new Error('GeoNames archive metadata is missing from the upstream manifest.');
}

const report = async (changed, date = '') => {
  await writeFile(markerPath, `${JSON.stringify({ changed, date })}\n`, 'utf8');
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `changed=${changed}\ndate=${date}\n`,
      'utf8',
    );
  }
};

await mkdir(dirname(cachePath), { recursive: true });
const conditionalHeaders = {};
if (source.etag) conditionalHeaders['If-None-Match'] = source.etag;
if (source.lastModified) conditionalHeaders['If-Modified-Since'] = source.lastModified;

const head = await fetch(source.archive.url, {
  method: 'HEAD',
  headers: conditionalHeaders,
});
const unchanged = head.status === 304
  || (source.etag && head.headers.get('etag') === source.etag);
if (unchanged) {
  await report(false);
  console.log('GeoNames cities500 is unchanged; no archive download needed.');
  process.exit(0);
}
if (!head.ok) throw new Error(`GeoNames metadata request failed with ${head.status}.`);

const response = await fetch(source.archive.url);
if (!response.ok) throw new Error(`GeoNames archive request failed with ${response.status}.`);
const archive = Buffer.from(await response.arrayBuffer());
const hash = createHash('sha256').update(archive).digest('hex');
if (hash === source.archive.sha256) {
  await report(false);
  console.log('GeoNames returned the same archive content; no files changed.');
  process.exit(0);
}

const date = new Date().toISOString().slice(0, 10);
await writeFile(cachePath, archive);
source.archive.sha256 = hash;
source.version = `cities500 snapshot ${date}`;
source.retrievedAt = date;
source.etag = response.headers.get('etag') ?? head.headers.get('etag') ?? '';
source.lastModified = response.headers.get('last-modified')
  ?? head.headers.get('last-modified')
  ?? '';
source.usage = 'Cities with population over 500 or administrative seats';
manifest.retrievedAt = date;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await report(true, date);
console.log(`Downloaded GeoNames cities500 snapshot ${date}.`);
