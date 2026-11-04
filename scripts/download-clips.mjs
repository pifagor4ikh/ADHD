import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const limit = 32 * 1024 * 1024;
const formats = { "video/mp4": "mp4", "video/webm": "webm" };

function https(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Use a public HTTPS URL without credentials or custom port");
  }
  return url;
}

function validate(asset, allowedHosts) {
  const url = https(asset.download);
  if (!allowedHosts.includes(url.hostname)) throw new Error("Download host is not approved");
  for (const field of ["source", "license"]) https(asset[field]);
  for (const field of ["creator", "category", "permission"]) {
    if (typeof asset[field] !== "string" || !asset[field].trim()) throw new Error("Missing " + field);
  }
  if (asset.sha256 !== undefined ? !/^[a-f0-9]{64}$/.test(asset.sha256) : !/^[a-f0-9]{40}$/.test(asset.sha1)) {
    throw new Error("Expected SHA-256 or provider SHA-1 is required");
  }
  if (!Object.hasOwn(formats, asset.mime)) throw new Error("Expected MP4 or WebM");
  return url;
}

async function cached(path, hash, algorithm) {
  const info = await stat(path).catch(error => {
    if (error.code !== "ENOENT") throw error;
  });
  if (!info?.isFile() || info.size > limit) return false;
  const digest = createHash(algorithm);
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest("hex") === hash;
}

export function verifyVideo(path, format) {
  const probe = spawnSync("ffprobe", [
    "-v", "error", "-protocol_whitelist", "file", "-show_entries",
    "format=format_name,duration:stream=codec_type", "-of", "json", path,
  ], { encoding: "utf8", timeout: 15_000, windowsHide: true });
  if (probe.error || probe.status !== 0) throw new Error("FFprobe could not validate video");
  const { format: metadata, streams } = JSON.parse(probe.stdout);
  const duration = Number(metadata?.duration);
  if (!metadata?.format_name?.split(",").includes(format) ||
      !Number.isFinite(duration) || duration <= 0 || duration > 120 ||
      !streams?.some(stream => stream.codec_type === "video")) {
    throw new Error("Expected a video in the declared container, up to 120 seconds");
  }
  const decode = spawnSync("ffmpeg", [
    "-nostdin", "-v", "error", "-xerror", "-protocol_whitelist", "file",
    "-i", path, "-map", "0:v:0", "-an", "-f", "null", "-",
  ], { stdio: "ignore", timeout: 45_000, windowsHide: true });
  if (decode.error || decode.status !== 0) throw new Error("FFmpeg could not decode video");
  return duration;
}

export async function downloadAsset(asset, allowedHosts, cache, request = fetch, headers = {}) {
  const url = validate(asset, allowedHosts);
  const format = formats[asset.mime];
  await mkdir(cache, { recursive: true });
  const algorithm = asset.sha256 ? "sha256" : "sha1";
  const hash = asset.sha256 ?? asset.sha1;
  const target = join(cache, hash + "." + format);
  if (await cached(target, hash, algorithm)) return target;

  const staged = join(cache, randomUUID() + ".partial");
  try {
    const signal = AbortSignal.timeout(30_000);
    const response = await request(url, { redirect: "error", signal, headers });
    const mime = response.headers.get("content-type")?.split(";")[0]?.trim();
    if (response.status !== 200 || !response.body || mime !== asset.mime ||
        Number(response.headers.get("content-length")) > limit) {
      await response.body?.cancel();
      throw new Error("Source did not return a complete video of the expected type and size");
    }
    const digest = createHash(algorithm);
    let bytes = 0;
    const measure = new Transform({
      transform(chunk, encoding, callback) {
        bytes += chunk.length;
        if (bytes > limit) return callback(new Error("Video exceeds 32 MiB"));
        digest.update(chunk);
        callback(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(response.body), measure, createWriteStream(staged, { flags: "wx" }), { signal });
    if (digest.digest("hex") !== hash) throw new Error("Video checksum mismatch");
    verifyVideo(staged, format);
    await rename(staged, target);
    return target;
  } finally {
    await rm(staged, { force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) throw new Error("Usage: node scripts/download-clips.mjs <approved-catalog.json>");
    const { allowedHosts, assets } = JSON.parse(await readFile(process.argv[2], "utf8"));
    if (!Array.isArray(allowedHosts) || !Array.isArray(assets) || !assets.length) {
      throw new Error("Catalog requires allowedHosts and a nonempty assets array");
    }
    for (const asset of assets) validate(asset, allowedHosts);
    const cache = fileURLToPath(new URL("../.TMP/brainrot/clips/", import.meta.url));
    for (const asset of assets) console.log(await downloadAsset(asset, allowedHosts, cache));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
