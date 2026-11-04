const slots = document.querySelector('#slots');
const notice = document.querySelector('#notice');
for (let index = 0; index < 3; index++) {
  const card = document.createElement('section');
  const title = document.createElement('h2');
  title.textContent = `Видео ${index + 1}`;
  const video = document.createElement('video');
  video.controls = true;
  video.muted = true;
  video.preload = 'metadata';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = 'Выберите собственный локальный ролик.';
  const button = document.createElement('button');
  button.textContent = 'Импортировать видео';
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const result = await window.brainrot.importVideos();
      if (result.canceled) return;
      notice.textContent = result.errors.join(' ');
      if (result.items[0]) {
        title.textContent = result.items[0].name;
        status.textContent = 'Загрузка…';
        video.src = result.items[0].url;
      }
    } catch { status.textContent = 'Не удалось импортировать видео.'; }
    finally { button.disabled = false; }
  });
  video.addEventListener('loadedmetadata', () => { status.textContent = 'Готово к просмотру'; });
  video.addEventListener('error', () => { status.textContent = 'Видео недоступно, повреждено или кодек не поддерживается. Импортируйте другой файл.'; });
  card.append(title, video, status, button);
  slots.append(card);
}
