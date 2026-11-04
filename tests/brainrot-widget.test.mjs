import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const script = await readFile(new URL("../plugins/codex/widget.js", import.meta.url), "utf8");

function control() {
  return {
    disabled: true,
    addEventListener(type, callback) { this[type] = callback; },
  };
}

test("three local clips rotate at 60 seconds and Off releases media", async () => {
  const picker = control();
  const next = control();
  const off = control();
  const status = {};
  const window = control();
  const messages = [];
  window.parent = { postMessage: message => messages.push(message) };
  const videos = Array.from({ length: 3 }, () => ({
    async play() {},
    pause() { this.paused = true; },
    removeAttribute(name) { delete this[name]; },
    load() {},
  }));
  const selectors = { input: picker, "#next": next, "#off": off, "[role=status]": status };
  const revoked = [];
  let tick;
  runInNewContext(script, {
    window,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    document: {
      querySelector: selector => selectors[selector],
      querySelectorAll: () => videos,
    },
    URL: {
      createObjectURL: file => "blob:" + file,
      revokeObjectURL: url => revoked.push(url),
    },
    setInterval(callback, delay) {
      assert.equal(delay, 60_000);
      tick = callback;
      return 1;
    },
    clearInterval() { tick = undefined; },
  });
  assert.equal(messages[0].method, "ui/initialize");
  window.message({
    source: window.parent,
    data: { jsonrpc: "2.0", id: 1, result: { protocolVersion: "2026-01-26" } },
  });
  assert.equal(messages[1].method, "ui/notifications/initialized");
  picker.files = ["a", "b"];
  picker.change();
  assert.equal(tick, undefined);
  picker.files = ["a", "b", "c", "d"];
  picker.change();
  const sources = () => videos.map(video => video.src);
  assert.deepEqual(sources(), ["blob:a", "blob:b", "blob:c"]);
  assert.ok(videos.every(video => video.muted));
  tick();
  assert.deepEqual(sources(), ["blob:b", "blob:c", "blob:d"]);
  next.click();
  assert.deepEqual(sources(), ["blob:c", "blob:d", "blob:a"]);
  off.click();
  assert.equal(tick, undefined);
  assert.ok(videos.every(video => video.paused && !video.src));
  assert.deepEqual(revoked, ["blob:a", "blob:b", "blob:c", "blob:d"]);
});
