import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { downloadAsset } from "./download-clips.mjs";

const headers = { "user-agent": "ClaudeBrainrot/0.1 (https://github.com/pifagor4ikh/CLAUDE-BRAINROT)" };
const mediaHost = "upload.wikimedia.org";
const queries = new Map([
  ["subway surfers", ["Subway Surfers"]],
  ["minecraft parkour", ["Minecraft parkour"]],
  ["soap cutting", ["soap cutting", "cutting soap"]],
  ["carpet cleaning", ["carpet cleaning", "rug cleaning"]],
  ["pressure washing", ["pressure washing", "pressure washer"]],
  ["satisfying", ["oddly satisfying", "kinetic sand"]],
]);

function textValue(metadata, key) {
  return typeof metadata[key]?.value === "string" ? metadata[key].value : "";
}

function candidate(page, category) {
  const info = page.imageinfo?.[0];
  if (!info || !["video/webm", "video/mp4"].includes(info.mime) ||
      !/^[a-f0-9]{40}$/.test(info.sha1) ||
      !Number.isInteger(info.size) || info.size <= 0 || info.size > 32 * 1024 * 1024) return;
  const metadata = info.extmetadata ?? {};
  const license = textValue(metadata, "LicenseUrl").replace(/^http:/, "https:");
  const creator = textValue(metadata, "Artist").replace(/<[^>]*>/g, "").trim();
  const restrictions = textValue(metadata, "Restrictions");
  if (!/^https:\/\/creativecommons\.org\/(?:licenses\/by(?:-sa)?\/(?:1\.0|2\.0|2\.5|3\.0|4\.0)|publicdomain\/zero\/1\.0)\/?$/.test(license) ||
      !creator || restrictions) return;
  const download = URL.parse(info.url);
  const source = URL.parse(info.descriptionurl);
  if (download?.origin !== "https://" + mediaHost || !download.pathname.startsWith("/wikipedia/commons/") ||
      source?.origin !== "https://commons.wikimedia.org") return;
  return {
    title: page.title,
    category,
    creator,
    license,
    source: source.href,
    download: download.href,
    permission: "Wikimedia Commons original under the file license",
    attribution: textValue(metadata, "Attribution").replace(/<[^>]*>/g, "").trim() || creator,
    mime: info.mime,
    sha1: info.sha1,
  };
}

export async function buildLibrary(category, count, library, request = fetch, report = console.error) {
  category = category.trim().toLowerCase();
  if (!/^[\p{L}\p{N}][\p{L}\p{N} -]{1,69}$/u.test(category)) throw new Error("Specify a category name");
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error("Count must be 1–10");
  const assets = [];
  const seen = new Set();
  for (const query of queries.get(category) ?? [category]) {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query", generator: "search", gsrnamespace: "6", gsrlimit: "20",
      gsrsearch: 'filetype:video "' + query + '"',
      prop: "imageinfo", iiprop: "url|size|mime|sha1|extmetadata",
      iiextmetadatafilter: "LicenseUrl|Artist|Attribution|Restrictions",
      format: "json", formatversion: "2",
    });
    const response = await request(url, { headers, redirect: "error", signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error("Wikimedia search failed (HTTP " + response.status + ")");
    const result = await response.json();
    if (result.error) throw new Error("Wikimedia search returned an API error");
    const pages = (result.query?.pages ?? []).sort((a, b) => a.index - b.index);
    for (const page of pages) {
      const title = (page.title ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ");
      if (!(" " + title + " ").includes(" " + query.toLowerCase() + " ")) continue;
      const asset = candidate(page, category);
      if (!asset || seen.has(asset.sha1)) continue;
      seen.add(asset.sha1);
      try {
        const path = await downloadAsset(asset, [mediaHost], join(library, "clips"), request, headers);
        const sha256 = createHash("sha256").update(await readFile(path)).digest("hex");
        assets.push({ ...asset, sha256, file: "clips/" + basename(path) });
      } catch (error) {
        report("Skipped " + asset.title + ": " + error.message);
      }
      if (assets.length === count) break;
    }
    if (assets.length === count) break;
  }
  const catalog = { category, requested: count, checkedAt: new Date().toISOString(), assets };
  await mkdir(library, { recursive: true });
  const id = createHash("sha256").update(category).digest("hex").slice(0, 16);
  const catalogPath = join(library, "catalog-" + id + ".json");
  const temporary = catalogPath + "." + randomUUID() + ".partial";
  try {
    await writeFile(temporary, JSON.stringify(catalog, null, 2) + "\n", { flag: "wx" });
    await rename(temporary, catalogPath);
  } finally {
    await rm(temporary, { force: true });
  }
  return { ...catalog, catalogPath };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [category, count = "3"] = process.argv.slice(2);
    if (!category) throw new Error('Usage: node scripts/find-clips.mjs "category" [count]');
    const library = fileURLToPath(new URL("../.TMP/brainrot/", import.meta.url));
    const result = await buildLibrary(category, Number(count), library);
    console.log("Found " + result.assets.length + "/" + result.requested + " for " + result.category);
    console.log("Catalog: " + result.catalogPath);
    for (const asset of result.assets) console.log(join(library, asset.file));
    if (!result.assets.length) process.exitCode = 2;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
