// Host-independent controller; the supplied media element performs playback.
export class PlaybackSlot {
  constructor(video, changed = () => {}, random = Math.random) {
    Object.assign(this, { video, changed, random, items: [], index: -1, wantsPlay: true, revision: 0, state: 'empty' });
    video.muted = true;
    video.loop = true;
    for (const event of ['playing', 'pause', 'waiting', 'error']) {
      video.addEventListener(event, () => {
        if (!this.item) return;
        if (video.error) this.state = 'error';
        else if (!this.wantsPlay) { if (!video.paused) video.pause(); this.state = 'paused'; }
        else if (event === 'playing') this.state = 'playing';
        else if (event === 'waiting') this.state = 'loading';
        this.notify();
      });
    }
  }
  get item() { return this.items[this.index]; }
  notify() { this.changed(this); }
  setPlaylist(items, selectedId = this.item?.id) {
    const previous = this.item;
    this.items = [...new Map(items.map(item => [item.id, { ...item }])).values()];
    this.index = this.items.findIndex(item => item.id === selectedId);
    if (this.index < 0 && this.items.length) this.index = 0;
    if (!this.item || previous?.id !== this.item.id || previous?.url !== this.item.url) this.load();
    else this.notify();
  }
  load() {
    ++this.revision;
    this.video.pause();
    this.video.loop = true;
    if (!this.item) {
      this.video.removeAttribute('src'); this.video.load(); this.state = 'empty';
    } else {
      this.video.src = this.item.url;
      this.state = this.wantsPlay ? 'loading' : 'paused';
      if (this.wantsPlay) this.play();
    }
    this.notify();
  }
  async play() {
    const revision = this.revision;
    try {
      await this.video.play();
      if (revision !== this.revision) return;
      if (!this.wantsPlay) this.video.pause();
    } catch {
      if (revision !== this.revision || !this.wantsPlay) return;
      this.state = this.video.error ? 'error' : 'blocked'; this.notify();
    }
  }
  pause() {
    ++this.revision;
    this.wantsPlay = false; this.video.pause();
    if (this.item && this.state !== 'error') this.state = 'paused';
    this.notify();
  }
  resume() {
    ++this.revision;
    this.wantsPlay = true;
    if (this.item) {
      if (this.state === 'error') this.load();
      else { this.state = 'loading'; this.play(); }
    }
    this.notify();
  }
  next(shuffle = false) {
    if (!this.items.length) return;
    const step = shuffle && this.items.length > 1 ? 1 + Math.floor(this.random() * (this.items.length - 1)) : 1;
    this.index = (this.index + step) % this.items.length;
    this.load();
  }
}
export function controlAll(slots, action) {
  for (const slot of slots) {
    if (action === 'shuffle') slot.next(true);
    else slot[action]();
  }
}
