import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

import { strToU8, zipSync } from 'fflate';

const root = resolve(import.meta.dirname, '..');
const packageFormatVersion = 2;
const manifest = JSON.parse(await readFile(resolve(root, 'data/upstream/manifest.json'), 'utf8'));
const provenance = JSON.parse(
  await readFile(resolve(root, 'src/data/generated/provenance.json'), 'utf8'),
);
const date = manifest.retrievedAt;
const citySource = manifest.sources.find(({ name }) => name === 'GeoNames Gazetteer');
if (!citySource?.archive?.sha256) {
  throw new Error('GeoNames archive metadata is missing from the upstream manifest.');
}
const sourceRevision = citySource.archive.sha256.slice(0, 12);
const releaseTag = `data-${date}-${sourceRevision}-v${packageFormatVersion}`;
const assetName = `worldtime-reference-data-${date}-${sourceRevision}-v${packageFormatVersion}.zip`;
const outputPath = resolve(root, '.cache/reference-data', assetName);
const files = {};

const addDirectory = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await addDirectory(path);
    else files[relative(root, path).replaceAll('\\', '/')] = new Uint8Array(await readFile(path));
  }
};

await addDirectory(resolve(root, 'src/data/generated'));
await addDirectory(resolve(root, 'public/data/generated'));
files['reference-data-stamp.json'] = strToU8(
  `${JSON.stringify({
    schemaVersion: packageFormatVersion,
    releaseTag,
    generatedAt: provenance.generatedAt,
    cityCount: provenance.counts.cities,
  })}\n`,
);

const archive = zipSync(files, {
  level: 9,
  mtime: new Date(2000, 0, 1),
});
const sha256 = createHash('sha256').update(archive).digest('hex');
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, archive);
await writeFile(
  resolve(root, 'reference-data.json'),
  `${JSON.stringify({
    schemaVersion: packageFormatVersion,
    releaseTag,
    assetName,
    sha256,
    generatedAt: provenance.generatedAt,
    cityCount: provenance.counts.cities,
  }, null, 2)}\n`,
  'utf8',
);
console.log(outputPath);
