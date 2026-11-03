import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runtimePaths } = require('../.TMP/build/companion/paths.js');
test('runtime data stays inside the project .TMP, including roots with spaces', () => {
  const project = path.resolve('.TMP', 'checkout with spaces');
  const paths = runtimePaths(project);
  for (const directory of Object.values(paths)) {
    const relative = path.relative(path.join(project, '.TMP'), directory);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  }
  assert.equal(new Set(Object.values(paths)).size, Object.keys(paths).length);
});
