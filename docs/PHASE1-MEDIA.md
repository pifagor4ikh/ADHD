# Phase 1 — локальный импорт (#4)

Дата: 2026-11-04. Зависимость #3 закрыта; работа разрешена командой пользователя выполнить issue #4. Следующие issues не начаты.

## Поведение и доступ

Кнопка в каждом слоте открывает системный диалог выбора одного WebM/MP4. Отмена сохраняет прежнее видео. Библиотека работает в памяти до закрытия приложения; файлы не копируются и не публикуются. Разрешение даётся ровно выбранному файлу после `realpath`, а не всему каталогу. Renderer получает UUID v4, basename и URL `brainrot-media://library/<id>`. Main повторно проверяет canonical path, тип, размер и mtime. Удалённые/изменённые файлы перестают обслуживаться. Импорт не создаёт неизменяемую копию; процессы с правами пользователя не являются отдельной границей защиты ОС.

IPC проверяет sender WebContents, главный frame, точный URL UI, отсутствие аргументов и параллельного диалога. Preload предоставляет только `importVideos()` и неизменяемые диагностические флаги sandbox/context isolation. Нет прямого ipcRenderer, Node или чтения произвольных путей из renderer.

Protocol возвращает поток, byte ranges (206/416), HEAD, Content-Length/Content-Range и no-store. Неизвестные ID, дополнительные пути, query и traversal не обслуживаются. CSP разрешает видео только из media scheme; `bypassCSP`, fetch privilege и service workers не включены. Сетевые запросы renderer, сторонние file URLs, навигация, новые окна, webview и permissions запрещены.

Импорт проверяет расширение, сигнатуру, обычный файл и размер 16 байт–2 ГиБ. Декодирование выполняет Chromium: повреждённое видео или неподдерживаемый кодек показывает ошибку в своём слоте. Остальные видео продолжают работу. Положительно проверен WebM/VP9; MP4 проходит фильтр, но поддержка конкретного кодека, включая H.264, здесь не доказана. FFprobe/FFmpeg и нормализация остаются в Phase 2.

## Собственные ролики

После setup выполните `node scripts/tasks.mjs fixtures`, затем `node scripts/tasks.mjs dev`. Первая команда открывает Electron, создаёт три файла и закрывает окно. Импортируйте `.TMP/brainrot/fixtures/Ролик 1 own.webm`, `Ролик 2 own.webm`, `Ролик 3 own.webm`.

Исходник — `src/companion/media-smoke.ts`, MIT проекта. Canvas рисует зелёный/фиолетовый/оранжевый фон и один/два/три движущихся квадрата. Нет внешних изображений, шрифтов, аудио или скачиваний. Это синтетические fixtures, не категорийный набор Phase 2.

Chromium MediaRecorder создаёт WebM/VP9, 320×240, capture target 20 fps, около 2,4 секунды, без аудиодорожки. Воспроизводима процедура, но не точные байты: тайминги различаются. Рядом `provenance.json` с происхождением, версиями, размерами и SHA-256 конкретных файлов. Smoke также пересоздаёт fixtures. Медиа, provenance и evidence находятся только в игнорируемой `.TMP`.

## Проверки

Windows 11 x64, Electron 45.2.2 / Chromium 156.0.8078.80 / embedded Node 24.22.2:

- `node scripts/tasks.mjs typecheck`, `node scripts/tasks.mjs build` — успешно.
- `node --test tests/runtime.test.mjs` — 5 тестов: full/open/suffix Range, HEAD/416, ID, traversal, отсутствующие/изменённые файлы, сигнатуры, пробелы/Unicode и directory junction.
- `node scripts/tasks.mjs smoke` — реальное видимое окно, три импорта через preload IPC и кнопки UI, реальные кадры, muted, рост currentTime, seeking, проигрывание до ended. Range проверен через Electron `net.fetch` и настоящий protocol handler.
- Smoke: отмена, missing/unsupported import, decoder error повреждённого WebM, продолжение двух исправных видео и восстановление третьего; реальные sandbox/contextIsolation и отсутствие Node globals.
- `python -B scripts/sync_skills.py --check` — копии актуальны; `python -B -m unittest discover -s tests -v` — 4 теста успешно.
- `git diff --check` — успешно.

Evidence: `.TMP/brainrot/smoke.json`, `smoke.png`, `fixtures/provenance.json`; скриншот просмотрен. Один запуск рядом с dev-окном сообщил о занятом Chromium disk cache и завершился успешно; перед smoke следует закрывать dev-окно.

Smoke подставляет результат выбора на стороне main при явном флаге `--brainrot-smoke`; renderer использует настоящий IPC, protocol и decoder. Системный диалог отдельно проверен через Windows UI в обычном `dev` без подмены: кнопка импорта открыла native dialog, выбор `Ролик 1 own.webm` по полному пути с Unicode/пробелами загрузил реальные кадры и статус «Готово к просмотру». Повторный диалог отменён через Escape; имя, кадр и статус прежнего видео сохранились. Evidence: `.TMP/brainrot/native-import.png` и `native-import.json`. Первую попытку проверки пользователь прервал, но после команды продолжить сценарий успешно завершён.

Установщик, packaged codecs, host-интеграции, общий playback core, loop, shuffle и performance baseline за пределами #4.
