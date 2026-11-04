import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { downloadAsset } from "../scripts/download-clips.mjs";

const catalog = JSON.parse(await readFile(new URL("../docs/starter-clips.json", import.meta.url), "utf8"));

test("approved starter bytes match their provenance and can be reused offline", async t => {
  await mkdir(".TMP/tests", { recursive: true });
  const cache = await mkdtemp(".TMP/tests/starter-");
  t.after(() => rm(cache, { recursive: true, force: true }));
  assert.ok(catalog.assets.length >= 3);
  const ids = new Set();
  for (const asset of catalog.assets) {
    assert.ok(!ids.has(asset.sha256), "Duplicate starter file");
    ids.add(asset.sha256);
    const source = new URL("../" + asset.repositoryFile, import.meta.url);
    const bytes = await readFile(source);
    assert.equal(bytes.length, asset.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
    assert.equal(createHash("sha1").update(bytes).digest("hex"), asset.sha1);
    assert.ok(asset.creator && asset.attribution && asset.changes && asset.permission);
    assert.ok(asset.licenseReview.reviewer && asset.licenseReview.date);
    assert.equal(new URL(asset.source).hostname, "commons.wikimedia.org");
    assert.match(asset.license, /^https:\/\/creativecommons.org\/licenses\/by\//);
    const cached = join(cache, asset.sha256 + ".webm");
    await copyFile(source, cached);
    assert.equal(await downloadAsset(asset, catalog.allowedHosts, cache, () => {
      assert.fail("Verified local starter must not access the network");
    }), cached);
  }
});

test("unavailable categories explicitly require import without substituted footage", () => {
  for (const name of ["subway surfers", "soap cutting", "carpet cleaning", "minecraft parkour"]) {
    const category = catalog.categories.find(item => item.category === name);
    assert.equal(category.status, "local-import");
    assert.deepEqual(category.assetIds, []);
    assert.ok(category.reason);
  }
  const approved = catalog.categories.find(item => item.category === "pressure washing");
  assert.equal(approved.status, "approved");
  assert.deepEqual(approved.assetIds, catalog.assets.map(asset => asset.sha256));
  assert.ok(catalog.assets.every(asset => asset.category === approved.category));
});
