const picker = document.querySelector("input");
const videos = [...document.querySelectorAll("video")];
const next = document.querySelector("#next");
const off = document.querySelector("#off");
const status = document.querySelector("[role=status]");
let clips = [];
let start = 0;
let timer;

function advance() {
  videos.forEach((video, slot) => {
    video.muted = true;
    const source = clips[(start + slot) % clips.length];
    video.src = source;
    video.play().catch(() => {
      if (video.getAttribute("src") !== source) return;
      status.textContent = video.error
        ? "A video could not be decoded."
        : "Playback was blocked. Try Next to start manually.";
    });
  });
  start = (start + 1) % clips.length;
}

function stop() {
  clearInterval(timer);
  videos.forEach(video => {
    video.pause();
    video.removeAttribute("src");
    video.load();
  });
  clips.forEach(url => URL.revokeObjectURL(url));
  clips = [];
  start = 0;
  picker.value = "";
  next.disabled = off.disabled = true;
  status.textContent = "Choose local videos to start.";
}

picker.addEventListener("change", () => {
  const files = [...picker.files];
  if (files.length < videos.length) {
    status.textContent = "Choose at least three videos.";
    return;
  }
  stop();
  clips = files.map(file => URL.createObjectURL(file));
  next.disabled = off.disabled = false;
  status.textContent = "Switching every 60 seconds.";
  advance();
  timer = setInterval(advance, 60_000);
});

next.addEventListener("click", advance);
off.addEventListener("click", stop);
window.addEventListener("pagehide", stop);

// MCP Apps 2026-01-26. This widget never requests tools or sends media to the host.
if (window.parent !== window) {
  const host = window.parent;
  const send = message => host.postMessage({ jsonrpc: "2.0", ...message }, "*");
  const resize = new ResizeObserver(() => {
    send({
      method: "ui/notifications/size-changed",
      params: { height: document.documentElement.offsetHeight },
    });
  });
  window.addEventListener("message", event => {
    if (event.source !== host || event.data?.jsonrpc !== "2.0") return;
    const message = event.data;
    if (message.id === 1 && message.result?.protocolVersion === "2026-01-26") {
      send({ method: "ui/notifications/initialized" });
      resize.observe(document.documentElement);
    }
    if (message.method === "ui/resource-teardown") {
      stop();
      resize.disconnect();
      send({ id: message.id, result: {} });
    }
  });
  send({
    id: 1,
    method: "ui/initialize",
    params: {
      appInfo: { name: "brainrot", version: "0.1.0" },
      appCapabilities: {},
      protocolVersion: "2026-01-26",
    },
  });
}
