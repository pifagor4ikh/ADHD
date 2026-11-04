import { open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

export type MediaItem = { id: string; name: string; url: string };
export type ImportResult = { canceled: boolean; items: MediaItem[]; errors: string[] };
const idPattern = '[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}';

// A capability grants one selected file, never its parent directory.
export class MediaLibrary {
  private files = new Map<string, { path: string; size: number; mtime: number; mime: string }>();

  async register(selectedPath: string): Promise<MediaItem> {
    const canonical = await realpath(selectedPath);
    const file = await open(canonical, 'r');
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size < 16 || stat.size > 2 * 1024 ** 3) throw new Error('invalid size');
      const bytes = Buffer.alloc(16);
      await file.read(bytes, 0, bytes.length, 0);
      const ext = path.extname(canonical).toLowerCase();
      const mime = ext === '.webm' && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
        ? 'video/webm' : ext === '.mp4' && bytes.toString('ascii', 4, 8) === 'ftyp' ? 'video/mp4' : undefined;
      if (!mime) throw new Error('unsupported header');
      const id = randomUUID();
      this.files.set(id, { path: canonical, size: stat.size, mtime: stat.mtimeMs, mime });
      return { id, name: path.basename(canonical), url: `brainrot-media://library/${id}` };
    } finally { await file.close(); }
  }

  async importFiles(selected: string[] | undefined): Promise<ImportResult> {
    const result: ImportResult = { canceled: !selected, items: [], errors: [] };
    for (const file of selected ?? []) {
      try { result.items.push(await this.register(file)); }
      catch { result.errors.push(`${path.basename(file)}: файл недоступен, повреждён или формат не поддерживается (WebM/MP4, до 2 ГиБ).`); }
    }
    return result;
  }

  async serve(request: Request): Promise<Response> {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405 });
    // Match the complete URL: do not decode paths or resolve renderer input against disk.
    const match = new RegExp(`^brainrot-media://library/(${idPattern})$`).exec(request.url);
    const entry = match && this.files.get(match[1]);
    if (!entry) return new Response(null, { status: 404 });
    let file;
    try {
      if (await realpath(entry.path) !== entry.path) return new Response(null, { status: 404 });
      file = await open(entry.path, 'r');
      const stat = await file.stat();
      if (!stat.isFile() || stat.size !== entry.size || stat.mtimeMs !== entry.mtime) {
        await file.close();
        return new Response(null, { status: 410 });
      }
      const headers = new Headers({ 'Content-Type': entry.mime, 'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      let start = 0, end = stat.size - 1;
      const range = request.headers.get('range');
      if (range) {
        const parts = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!parts || (!parts[1] && !parts[2])) start = -1;
        else if (!parts[1]) start = Math.max(0, stat.size - Number(parts[2]));
        else { start = Number(parts[1]); if (parts[2]) end = Math.min(end, Number(parts[2])); }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || (!parts?.[1] && parts?.[2] === '0')) {
          await file.close();
          return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
        }
        headers.set('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      }
      headers.set('Content-Length', String(end - start + 1));
      if (request.method === 'HEAD') { await file.close(); return new Response(null, { status: range ? 206 : 200, headers }); }
      const stream = file.createReadStream({ start, end, autoClose: true });
      return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status: range ? 206 : 200, headers });
    } catch { await file?.close().catch(() => {}); return new Response(null, { status: 404 }); }
  }
}
