# Phase 1 — независимый playback (#5)

2026-11-04. Зависимость #4 закрыта; работа разрешена пользователем. Следующие issues и весь этап Phase 1 не объявляются завершёнными.

## Поведение

`src/companion/ui/playback.mjs` — общий ES module без Electron, Claude/Codex, IPC, сети и LLM. `PlaybackSlot` получает media element, callback состояния и необязательный генератор случайных чисел. Три экземпляра подключены к трём HTMLVideoElement. `muted` и `loop` установлены до первого `play()`.

У каждого слота свой плейлист, выбор текущего ролика, pause/resume, next/shuffle, mute и очистка. Импорт нескольких файлов добавляет их и выбирает первый импортированный. Повторный импорт неизменённого файла сохраняет ID и не создаёт дубликат. Отмена или отсутствие успешно импортированных файлов сохраняет плейлист. Плейлисты действуют до закрытия окна.

Next циклически переходит к следующему файлу. Shuffle равновероятно выбирает любой другой элемент; при одном файле next/shuffle перезапускает его, при пустом ничего не делает. На паузе смена файла сохраняет паузу. Обновление плейлиста сохраняет текущий ID и позицию; если он удалён, выбирается первый оставшийся; пустой список очищает src. Выбор другого элемента в списке переключает только этот слот.

Global pause/resume/next/shuffle применяет соответствующую команду к каждому слоту. Resume всем явно снимает индивидуальные паузы. Пауза пустого слота сохраняется при последующем импорте. Звук меняется только кнопкой слота и сохраняется при смене файла.

Состояния: empty, loading, playing, paused, blocked (play отклонён), error (ошибка media element). Ошибка видна в своём слоте; автоматического перебора повреждённых файлов нет. Next/import позволяет выбрать другой файл; resume ошибочного файла пробует загрузить его снова. Старые ответы play после смены источника или команды pause/resume игнорируются. Нативные video controls заменены явными кнопками, чтобы состояние контроллера соответствовало командам UI.

## Проверки

Windows 11 x64, Electron 45.2.2, Chromium 156.0.8078.80, embedded Node 24.22.2:

- `node scripts/tasks.mjs typecheck` и `node scripts/tasks.mjs build` — успешно.
- `node --test tests/runtime.test.mjs` — 8 тестов успешно, включая state transitions, независимость слотов, empty/single/replacement, shuffle и поздний rejected play.
- `node scripts/tasks.mjs smoke` — реальное видимое окно: три автозапущенных muted/loop видео и currentTime, переход через конец с loop, кнопки pause/resume, next/shuffle на паузе, импорт плейлиста, отмена, empty/single, decoder error и восстановление. Сохранены проверки Range/seeking, missing/unsupported/traversal и sandbox.
- В smoke нет HTTP(S)-запросов renderer (`externalRequests: []`); запросы запрещены allowlist и CSP. Playback/core не содержит модельного клиента.
- `python -B scripts/sync_skills.py --check` — успешно; `python -B -m unittest discover -s tests -v` — 4 теста успешно.
- `git diff --check` — успешно.

Evidence: `.TMP/brainrot/smoke.json`, `smoke.png`, `fixtures/provenance.json`. Скриншот просмотрен. Это Windows source-build smoke, не установщик и не host integration. Выбор файлов в smoke подставлен на стороне main; native dialog одиночного импорта проверен в #4, новый multi-select через native UI отдельно не проверялся. Положительно проверен WebM/VP9; другие кодеки, performance baseline и длительный offline soak остаются отдельными проверками Phase 1. Стартового контента нет; пользователь импортирует собственные ролики.
