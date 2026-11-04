import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { buildLibrary } from "../scripts/find-clips.mjs";

test("discovers only approved files, deduplicates and generates a catalog", async t => {
  await mkdir(".TMP/tests", { recursive: true });
  const library = await mkdtemp(".TMP/tests/search-");
  t.after(() => rm(library, { recursive: true, force: true }));
  const bytes = Buffer.from("mock previously validated file");
  const sha1 = createHash("sha1").update(bytes).digest("hex");
  const file = "clips/" + sha1 + ".webm";
  await mkdir(join(library, "clips"));
  await writeFile(join(library, file), bytes);
  const info = {
    url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Clip.webm",
    descriptionurl: "https://commons.wikimedia.org/wiki/File:Clip.webm",
    sha1, mime: "video/webm", size: bytes.length,
    extmetadata: {
      Artist: { value: "<b>Creator</b>" },
      LicenseUrl: { value: "https://creativecommons.org/licenses/by/4.0/" },
    },
  };
  const request = async (url, options) => {
    assert.equal(url.hostname, "commons.wikimedia.org");
    assert.equal(options.redirect, "error");
    assert.match(options.headers["user-agent"], /ClaudeBrainrot/);
    assert.match(url.searchParams.get("gsrsearch"), /"soap cutting"|"cutting soap"/);
    return Response.json({ query: { pages: [
      { index: 1, imageinfo: [{ ...info, url: "https://untrusted.example/Clip.webm" }] },
      { index: 2, imageinfo: [{ ...info, extmetadata: { ...info.extmetadata, Restrictions: { value: "blocked" } } }] },
      { index: 3, imageinfo: [{ ...info, extmetadata: { Artist: { value: "Creator" } } }] },
      { index: 4, title: "File:Soap cutting.webm", imageinfo: [info] },
      { index: 5, title: "File:Soap cutting copy.webm", imageinfo: [info] },
      { index: 6, title: "File:Unrelated shower.webm", imageinfo: [{ ...info, sha1: "a".repeat(40) }] },
    ] } });
  };
  const result = await buildLibrary("Soap Cutting", 2, library, request);
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].file, file);
  assert.equal(result.assets[0].creator, "Creator");
  assert.equal(result.assets[0].sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.deepEqual(JSON.parse(await readFile(result.catalogPath, "utf8")).assets, result.assets);
  const empty = await buildLibrary("Minecraft parkour", 1, library, async () => Response.json({}));
  assert.deepEqual(empty.assets, []);
});
