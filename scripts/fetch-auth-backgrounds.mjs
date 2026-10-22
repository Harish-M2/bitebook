import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const images = [
  ['auth-welcome-dark.jpg', '1547592180-85f173990554'],
  ['auth-welcome-light.jpg', '1540189549336-e6e99c3679fe'],
  ['auth-forms-dark.jpg', '1414235077428-338989a2e8c0'],
  ['auth-forms-light.jpg', '1490645935967-10de6ba17061'],
  ['auth-confirmation-dark.jpg', '1517248135467-4c7edcad34c4'],
  ['auth-confirmation-light.jpg', '1498837167922-ddd27525d352'],
];
const destination = fileURLToPath(new URL('../assets/images/', import.meta.url));
await mkdir(destination, { recursive: true });

for (const [filename, photoId] of images) {
  const output = path.join(destination, filename);
  try {
    const existing = await readFile(output);
    assert.deepEqual(existing.subarray(0, 3), Buffer.from([0xff, 0xd8, 0xff]), `${filename} is not a JPEG`);
    console.log(`${filename}: kept existing verified image (${existing.byteLength} bytes)`);
    continue;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const url = `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1280&h=1920&q=80&fm=jpg`;
  const response = await fetch(url);
  assert.ok(response.ok, `${filename}: image server returned ${response.status}`);
  assert.match(response.headers.get('content-type') ?? '', /^image\/jpeg/i, `${filename}: expected JPEG`);
  const image = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(image.subarray(0, 3), Buffer.from([0xff, 0xd8, 0xff]), `${filename}: invalid JPEG signature`);
  await writeFile(output, image, { flag: 'wx' });
  console.log(`${filename}: downloaded and verified (${image.byteLength} bytes)`);
}