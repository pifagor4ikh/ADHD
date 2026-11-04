import { BrowserWindow, net } from 'electron';
import { writeFile, readFile, copyFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { MediaLibrary } from './media';

// Own geometric animation, no external assets, fonts, audio or downloads.
export async function generateFixtures(window: BrowserWindow, directory: string) {
  const files: string[] = [];
  const assets = [];
  for (let index = 0; index < 3; index++) {
    const bytes: number[] = await window.webContents.executeJavaScript(`(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
      const ctx = canvas.getContext('2d');
      const stream = canvas.captureStream(20);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 250000 });
      const chunks = []; recorder.ondataavailable = event => chunks.push(event.data);
      const stopped = new Promise(resolve => recorder.onstop = resolve);
      recorder.start();
      const start = performance.now();
      await new Promise(resolve => {
        const draw = () => {
          const elapsed = performance.now() - start;
          ctx.fillStyle = ['#21665a', '#644ca0', '#9a542b'][${index}]; ctx.fillRect(0, 0, 320, 240);
          ctx.fillStyle = '#ffffff';
          const x = 25 + (elapsed / 12) % 260;
          for (let n = 0; n <= ${index}; n++) ctx.fillRect(x, 35 + n * 60, 28, 28);
          if (elapsed < 2400) requestAnimationFrame(draw); else resolve();
        }; draw();
      });
      recorder.stop(); await stopped; stream.getTracks().forEach(track => track.stop());
      return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
    })()`);
    const filename = `Ролик ${index + 1} own.webm`;
    const file = path.join(directory, filename);
    const data = Buffer.from(bytes);
    await writeFile(file, data);
    files.push(file);
    assets.push({ filename, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'),
      origin: 'Generated locally by src/companion/media-smoke.ts: canvas geometric animation',
      license: 'MIT (project source); no third-party assets', codec: 'VP9', audio: false, width: 320, height: 240 });
  }
  await writeFile(path.join(directory, 'provenance.json'), JSON.stringify({ generatedAt: new Date().toISOString(),
    versions: process.versions, note: 'MediaRecorder output hashes vary per run; synthetic fixtures, not category footage.', assets }, null, 2));
  return files;
}

export async function mediaSmoke(window: BrowserWindow, library: MediaLibrary, directory: string,
  setSelection: (selection: string[] | undefined) => void) {
  const files = await generateFixtures(window, directory);
  const evaluate = (source: string) => window.webContents.executeJavaScript(source);
  const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };
  const waitFor = async (condition: string) => evaluate(`new Promise((resolve, reject) => {
    const start = Date.now(); const timer = setInterval(() => {
      if (${condition}) { clearInterval(timer); resolve(true); }
      else if (Date.now() - start > 8000) { clearInterval(timer); reject(new Error('Timeout: ' + ${JSON.stringify(condition)})); }
    }, 40);
  })`);
  for (let i = 0; i < 3; i++) {
    setSelection([files[i]]);
    await evaluate(`document.querySelectorAll('button')[${i}].click()`);
    await waitFor(`document.querySelectorAll('video')[${i}].readyState >= 2`);
  }
  await evaluate(`Promise.all([...document.querySelectorAll('video')].map(video => video.play()))`);
  await waitFor(`[...document.querySelectorAll('video')].every(video => video.currentTime > 0.3)`);
  await evaluate(`[...document.querySelectorAll('video')].forEach(video => video.pause())`);
  const metadata = await evaluate(`[...document.querySelectorAll('video')].map(v => ({src: v.src, width: v.videoWidth, height: v.videoHeight, muted: v.muted, time: v.currentTime}))`);
  assert(metadata.every((item: { width: number; muted: boolean }) => item.width === 320 && item.muted), 'Metadata/mute');
  const first = metadata[0].src;
  const response = await net.fetch(first, { headers: { range: 'bytes=5-19' } });
  assert(response.status === 206 && Buffer.from(await response.arrayBuffer()).equals((await readFile(files[0])).subarray(5, 20)), 'Range bytes');
  await evaluate(`document.querySelector('video').currentTime = 1.2`);
  await waitFor(`!document.querySelector('video').seeking && document.querySelector('video').currentTime >= 1.1`);
  setSelection(undefined);
  const canceled = await evaluate('window.brainrot.importVideos()');
  assert(canceled.canceled && canceled.items.length === 0, 'Cancel result');
  const corrupt = path.join(directory, 'corrupt.webm');
  await writeFile(corrupt, Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(128)]));
  setSelection([corrupt]);
  await evaluate(`document.querySelectorAll('button')[2].click()`);
  await waitFor(`document.querySelectorAll('video')[2].error !== null`);
  assert(await evaluate(`document.querySelectorAll('section p')[2].textContent.includes('повреждено')`), 'Visible decoder error');
  const unsupported = path.join(directory, 'unsupported.txt');
  await writeFile(unsupported, 'Not a video');
  setSelection([unsupported, path.join(directory, 'missing.webm')]);
  const bad = await evaluate('window.brainrot.importVideos()');
  assert(bad.errors.length === 2 && !bad.items.length, 'Unsupported/missing import');
  const missing = path.join(directory, 'removed.webm');
  await copyFile(files[0], missing);
  const removed = await library.register(missing);
  await unlink(missing);
  assert((await library.serve(new Request(removed.url))).status === 404, 'Removed registered file');
  assert((await library.serve(new Request('brainrot-media://library/%2e%2e%2fsecret'))).status === 404, 'Traversal');
  assert((await library.serve(new Request(first, { headers: { range: 'bytes=999999999-' } }))).status === 416, 'Invalid range');
  await evaluate(`Promise.all([...document.querySelectorAll('video')].slice(0, 2).map(v => { v.currentTime = 0; return v.play(); }))`);
  await waitFor(`[...document.querySelectorAll('video')].slice(0, 2).every(v => v.currentTime > 0.3 && !v.error)`);
  // Restore third slot for the screenshot, proving recovery after a decoder error.
  setSelection([files[2]]);
  await evaluate(`document.querySelectorAll('button')[2].click()`);
  await waitFor(`document.querySelectorAll('video')[2].readyState >= 2`);
  await evaluate(`document.querySelectorAll('video')[2].play()`);
  await waitFor(`document.querySelectorAll('video')[2].currentTime > 0.3`);
  await waitFor(`[...document.querySelectorAll('video')].every(v => v.ended && !v.error)`);
  await evaluate(`Promise.all([...document.querySelectorAll('video')].map(v => { v.currentTime = 0; return v.play(); }))`);
  await waitFor(`[...document.querySelectorAll('video')].every(v => v.currentTime > 0.3)`);
  return { metadata, range: true, seeking: true, canceled: true, corrupt: true, missing: true,
    unsupported: true, traversal: true, independentErrors: true, recovery: true, decodedToEnd: true };
}
