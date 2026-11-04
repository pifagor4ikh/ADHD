import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { downloadAsset } from "../scripts/download-clips.mjs";

const fixture = Buffer.from("fixture bytes");
const asset = {
  download: "https://media.example/clip.mp4",
  source: "https://creator.example/post",
  license: "https://creator.example/license",
  creator: "Example",
  category: "soap cutting",
  permission: "Direct automated download permitted by creator",
  mime: "video/mp4",
  sha256: createHash("sha256").update(fixture).digest("hex"),
};

test("rejects unapproved sources and invalid responses, then reuses matching offline cache", async t => {
  await mkdir(".TMP/tests", { recursive: true });
  const cache = await mkdtemp(".TMP/tests/clip-cache-");
  t.after(() => rm(cache, { recursive: true, force: true }));
  const neverFetch = () => assert.fail("Unexpected network request");
  await assert.rejects(downloadAsset(asset, [], cache, neverFetch), /not approved/);
  const run = request => downloadAsset(asset, ["media.example"], cache, request);
  await assert.rejects(run(async () => new Response("<html>error</html>")), /expected type/);
  await assert.rejects(run(async (url, options) => {
    assert.equal(options.redirect, "error");
    return new Response("wrong bytes", { headers: { "content-type": "video/mp4" } });
  }), /checksum mismatch/);
  assert.deepEqual(await readdir(cache), []);
  const target = join(cache, asset.sha256 + ".mp4");
  await writeFile(target, fixture);
  assert.equal(await run(neverFetch), target);
});
