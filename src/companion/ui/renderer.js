import { PlaybackSlot, controlAll } from './playback.mjs';
const slots = document.querySelector('#slots');
const notice = document.querySelector('#notice');
const controllers = [];
const states = { empty: 'Импортируйте собственные видео.', loading: 'Загрузка…', playing: 'Воспроизводится',
  paused: 'Пауза', blocked: 'Не удалось начать воспроизведение. Нажмите «Продолжить».',
  error: 'Видео недоступно, повреждено или кодек не поддерживается. Выберите следующий или импортируйте другой файл.' };
function button(label, action, handler) {
  const element = document.createElement('button');
  element.textContent = label; element.dataset.action = action;
  element.addEventListener('click', handler); return element;
}
for (let index = 0; index < 3; index++) {
  const card = document.createElement('section');
  card.setAttribute('aria-label', `Слот ${index + 1}`);
  const title = document.createElement('h2');
  const video = document.createElement('video');
  video.preload = 'auto'; video.playsInline = true;
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const playlist = document.createElement('select');
  playlist.setAttribute('aria-label', `Плейлист слота ${index + 1}`);
  const controller = new PlaybackSlot(video, slot => {
    title.textContent = `Видео ${index + 1}: ${slot.item?.name ?? 'пусто'}`;
    status.textContent = states[slot.state];
    playlist.replaceChildren(...slot.items.map((item, i) => {
      const option = document.createElement('option');
      option.value = item.id; option.textContent = `${i + 1}. ${item.name}`; return option;
    }));
    playlist.value = slot.item?.id ?? ''; playlist.disabled = !slot.items.length;
  });
  playlist.addEventListener('change', () => controller.setPlaylist(controller.items, playlist.value));
  const controls = document.createElement('div'); controls.className = 'controls';
  controls.append(button('Пауза', 'pause', () => controller.pause()),
    button('Продолжить', 'resume', () => controller.resume()),
    button('Следующее', 'next', () => controller.next()),
    button('Перемешать', 'shuffle', () => controller.next(true)));
  const mute = button('Включить звук', 'mute', () => {
    video.muted = !video.muted; mute.textContent = video.muted ? 'Включить звук' : 'Выключить звук';
    mute.setAttribute('aria-pressed', String(!video.muted));
  });
  mute.setAttribute('aria-pressed', 'false');
  const importButton = button('Импортировать видео', 'import', async () => {
    importButton.disabled = true;
    try {
      const result = await window.brainrot.importVideos();
      if (result.canceled) return;
      notice.textContent = result.errors.join(' ');
      if (result.items.length) controller.setPlaylist([...controller.items, ...result.items], result.items[0].id);
    } catch { notice.textContent = 'Не удалось импортировать видео.'; }
    finally { importButton.disabled = false; }
  });
  controls.append(mute, importButton, button('Очистить', 'clear', () => controller.setPlaylist([])));
  card.append(title, video, status, playlist, controls); slots.append(card);
  controllers.push(controller); controller.notify();
}
for (const element of document.querySelectorAll('#global-controls button')) {
  element.addEventListener('click', () => controlAll(controllers, element.dataset.action));
}
