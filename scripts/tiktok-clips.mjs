import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, join, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { verifyVideo } from "./download-clips.mjs";

const origin = "https://www.tikwm.com";
const maxInput = 128 * 1024 * 1024;
const library = fileURLToPath(new URL("../.TMP/brainrot/", import.meta.url));

export function parsePost(value) {
  const url = URL.parse(value);
  const match = url?.pathname.match(/^\/@([a-zA-Z0-9_.]+)\/video\/(\d{15,22})\/?$/);
  if (!match || url.origin !== "https://www.tiktok.com" || url.username || url.password) {
    throw new Error("Expected a full public TikTok post URL (www.tiktok.com/@author/video/id)");
  }
  return { url: url.origin + "/@" + match[1] + "/video/" + match[2], creator: match[1], id: match[2] };
}

export async function inspectPost(value, request = fetch) {
  const post = parsePost(value);
  const api = new URL("/api/", origin);
  api.searchParams.set("url", post.url);
  const response = await request(api, { redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("TikWM metadata request failed: HTTP " + response.status);
  const { code, data } = await response.json();
  if (code !== 0 || String(data?.id) !== post.id) throw new Error("TikWM did not return the requested post");
  const media = data.play && URL.parse(data.play, origin);
  const tikwmFile = media?.origin === origin && media.pathname.startsWith("/video/media/");
  const cdnFile = media?.origin === "https://v16m.tiktokcdn-us.com" &&
    /^\/[a-f0-9]+\/[a-f0-9]+\/video\/tos\//i.test(media.pathname);
  const download = (tikwmFile || cdnFile) && !media.username && !media.password ? media.href : undefined;
  return { ...post, title: data.title, duration: data.duration, download };
}

async function downloadPost(post, path) {
  if (!post.download) throw new Error("TikWM did not return a recognized download URL");
  const signal = AbortSignal.timeout(45_000);
  const response = await fetch(post.download, { redirect: "error", signal });
  const mime = response.headers.get("content-type")?.split(";")[0];
  if (response.status !== 200 || !response.body ||
      !["video/mp4", "application/octet-stream"].includes(mime) ||
      Number(response.headers.get("content-length")) > maxInput) {
    await response.body?.cancel();
    throw new Error("TikWM did not return a complete MP4 within the size limit");
  }
  let size = 0;
  const bounded = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      if (size > maxInput) return callback(new Error("Download exceeds 128 MiB"));
      callback(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(response.body), bounded, createWriteStream(path, { flags: "wx" }), { signal });
}

async function importClip(input, post, permission, work, start) {
  const path = resolve(input);
  const info = await stat(path);
  if (!info.isFile() || !info.size || info.size > maxInput || !/\.(mp4|webm|mov)$/i.test(path)) {
    throw new Error("Expected a local MP4, WebM or MOV up to 128 MiB");
  }
  const staged = join(work, "clip.mp4");
  const result = spawnSync("ffmpeg", [
    "-nostdin", "-v", "error", "-xerror", "-protocol_whitelist", "file",
    "-ss", String(start), "-i", path, "-t", "60", "-map", "0:v:0", "-an",
    "-vf", "scale=720:1280:force_original_aspect_ratio=decrease:force_divisible_by=2",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-fs", String(24 * 1024 * 1024), staged,
  ], { timeout: 90_000, stdio: "inherit", windowsHide: true });
  if (result.error || result.status !== 0) throw new Error("FFmpeg import failed");
  const duration = verifyVideo(staged, "mp4");
  const sha256 = createHash("sha256").update(await readFile(staged)).digest("hex");
  const file = "clips/" + sha256 + ".mp4";
  await mkdir(join(library, "clips"), { recursive: true });
  await rename(staged, join(library, file));
  const catalog = {
    source: post.url, creator: post.creator, category: "satisfying",
    title: post.title ?? basename(path), permission, duration, start, sha256, file,
  };
  const metadata = join(work, "catalog.json");
  await writeFile(metadata, JSON.stringify(catalog, null, 2) + "\n");
  await rename(metadata, join(library, "tiktok-" + post.id + "-" + sha256 + ".json"));
  return join(library, file);
}

async function main([mode, url, input, offset = "0"]) {
  const post = parsePost(url);
  if (mode === "inspect") {
    const { download, ...details } = await inspectPost(url);
    console.log(JSON.stringify({ ...details, tikwmVideoAvailable: Boolean(download) }, null, 2));
    return;
  }
  if (mode !== "import" && mode !== "download") throw new Error("Expected inspect, import or download");
  if (mode === "download" && input !== "--authorized") {
    throw new Error("Download requires --authorized: confirm the author and platform allow this method. Otherwise use Save video and import.");
  }
  const start = Number(offset);
  if (!Number.isFinite(start) || start < 0) throw new Error("Start offset must be a nonnegative number in seconds");
  const work = join(library, "import-" + randomUUID());
  await mkdir(work, { recursive: true });
  try {
    if (mode === "download") {
      const resolved = await inspectPost(url);
      const raw = join(work, "source.mp4");
      await downloadPost(resolved, raw);
      console.log(await importClip(raw, resolved, "User confirmed authorization for TikWM download", work, start));
    } else {
      if (!input) throw new Error("Expected the saved local video path");
      console.log(await importClip(input, post, "User supplied locally saved video", work, start));
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
