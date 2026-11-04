import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, writeFile, readFile, unlink, utimes, symlink } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { runtimePaths } = require('../.TMP/build/companion/paths.js');
const { MediaLibrary } = require('../.TMP/build/companion/media.js');

async function mediaFixture() {
  const parent = path.resolve('.TMP', 'unit-media');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, 'test-'));
  const file = path.join(directory, 'Свой ролик with spaces.webm');
  const bytes = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from(Array.from({ length: 128 }, (_, i) => i))]);
  await writeFile(file, bytes);
  return { file, bytes, directory, library: new MediaLibrary() };
}

test('import grants only opaque IDs for selected files, never filesystem paths', async () => {
  const { library, file, directory } = await mediaFixture();
  assert.deepEqual(await library.importFiles(undefined), { canceled: true, items: [], errors: [] });
  const result = await library.importFiles([file, path.join(directory, 'missing.webm'), directory]);
  assert.equal(result.items.length, 1);
  assert.equal(result.errors.length, 2);
  const [item] = result.items;
  assert.deepEqual(Object.keys(item), ['id', 'name', 'url']);
  assert.equal(item.name, path.basename(file));
  assert.ok(!JSON.stringify(result).includes(directory));
  assert.equal((await library.serve(new Request(item.url))).status, 200);
  for (const url of ['brainrot-media://library/../../secret', 'brainrot-media://library/%2e%2e%5csecret',
    `${item.url}?path=${encodeURIComponent(file)}`, `${item.url}/extra`, 'brainrot-media://evil/' + item.id,
    'brainrot-media://library/00000000-0000-4000-8000-000000000000']) {
    assert.equal((await library.serve(new Request(url))).status, 404, url);
  }
  assert.equal((await library.serve(new Request(item.url, { method: 'POST' }))).status, 405);
});

test('streaming delivers exact full, partial, open and suffix ranges with HEAD and 416', async () => {
  const { library, file, bytes } = await mediaFixture();
  const item = await library.register(file);
  for (const [range, start, end] of [[undefined, 0, bytes.length], ['bytes=5-19', 5, 20],
    ['bytes=12-', 12, bytes.length], ['bytes=-7', bytes.length - 7, bytes.length], ['bytes=0-99999', 0, bytes.length]]) {
    const response = await library.serve(new Request(item.url, { headers: range ? { range } : {} }));
    assert.equal(response.status, range ? 206 : 200);
    assert.equal(response.headers.get('accept-ranges'), 'bytes');
    assert.equal(response.headers.get('content-type'), 'video/webm');
    assert.equal(Number(response.headers.get('content-length')), end - start);
    if (range) assert.equal(response.headers.get('content-range'), `bytes ${start}-${end - 1}/${bytes.length}`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(start, end));
  }
  const head = await library.serve(new Request(item.url, { method: 'HEAD', headers: { range: 'bytes=0-9' } }));
  assert.equal(head.status, 206);
  assert.equal(head.body, null);
  assert.equal(head.headers.get('content-length'), '10');
  for (const range of ['bytes=99999-', 'bytes=20-10', 'bytes=-0', 'bytes=-', 'bytes=0-2,5-6', 'items=1-2', 'bytes=9007199254740993-']) {
    const response = await library.serve(new Request(item.url, { headers: { range } }));
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('content-range'), `bytes */${bytes.length}`);
  }
});

test('missing, changed, unsupported and corrupt headers fail without invalidating other IDs', async () => {
  const { library, file, bytes, directory } = await mediaFixture();
  const good = await library.register(file);
  const another = path.join(directory, 'another.webm');
  await writeFile(another, bytes);
  const removed = await library.register(another);
  await unlink(another);
  assert.equal((await library.serve(new Request(removed.url))).status, 404);
  await writeFile(another, bytes);
  const changed = await library.register(another);
  await utimes(another, new Date(0), new Date(0));
  assert.equal((await library.serve(new Request(changed.url))).status, 410);
  for (const name of ['fake.webm', 'fake.mp4', 'page.html']) {
    const bad = path.join(directory, name);
    await writeFile(bad, '<html>Not media</html>');
    assert.equal((await library.importFiles([bad])).errors.length, 1);
  }
  assert.deepEqual(Buffer.from(await (await library.serve(new Request(good.url))).arrayBuffer()), await readFile(file));
});

test('a selected file through a directory junction grants only its canonical file', async () => {
  const { library, file, directory } = await mediaFixture();
  const link = path.join(directory, 'selected-link');
  await symlink(path.dirname(file), link, 'junction');
  const item = await library.register(path.join(link, path.basename(file)));
  assert.equal((await library.serve(new Request(item.url))).status, 200);
  assert.equal((await library.serve(new Request(item.url + '/other.webm'))).status, 404);
});
test('runtime data stays inside the project .TMP, including roots with spaces', () => {
  const project = path.resolve('.TMP', 'checkout with spaces');
  const paths = runtimePaths(project);
  for (const directory of Object.values(paths)) {
    const relative = path.relative(path.join(project, '.TMP'), directory);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  }
  assert.equal(new Set(Object.values(paths)).size, Object.keys(paths).length);
});
