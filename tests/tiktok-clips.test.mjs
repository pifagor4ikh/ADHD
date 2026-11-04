import assert from "node:assert/strict";
import test from "node:test";
import { inspectPost, parsePost } from "../scripts/tiktok-clips.mjs";

const url = "https://www.tiktok.com/@example/video/7565690271728504075";

test("checks the requested ID and only accepts the TikWM media origin", async () => {
  assert.throws(() => parsePost(url.replace("www.tiktok.com", "example.org")), /full public/);
  assert.equal(parsePost(url + "?tracking=1").url, url);
  const mock = (play, id = "7565690271728504075") => async (endpoint, options) => {
    assert.equal(endpoint.origin, "https://www.tikwm.com");
    assert.equal(endpoint.searchParams.get("url"), url);
    assert.equal(options.redirect, "error");
    return Response.json({ code: 0, data: { id, play, duration: 173 } });
  };
  const valid = await inspectPost(url, mock("/video/media/play/example.mp4"));
  assert.equal(valid.duration, 173);
  assert.equal(valid.download, "https://www.tikwm.com/video/media/play/example.mp4");
  assert.equal((await inspectPost(url, mock("https://example.org/video/media/play/a"))).download, undefined);
  const cdn = "https://v16m.tiktokcdn-us.com/abcd/1234/video/tos/example";
  assert.equal((await inspectPost(url, mock(cdn))).download, cdn);
  await assert.rejects(inspectPost(url, mock("", "different")), /requested post/);
});
