# Claude Brainrot: архитектура Phase 0

Решение от 2026-11-04. Статус: реализованы окно/bootstrap (#3), локальная библиотека с непрозрачными ID, preload и streaming protocol (#4, [проверки и ограничения](PHASE1-MEDIA.md)). Общий playback core реализован как независимый ES module `src/companion/ui/playback.mjs` (#5, [поведение и проверки](PHASE1-PLAYBACK.md)); host adapters остаются планом. Требования: три независимых зацикленных локальных видео, mute по умолчанию, shuffle/pause/resume/next/import, Windows сначала, ноль дополнительных модельных вызовов при воспроизведении.

## Проверенная основа и границы

Подробные источники и ограничения: [Claude](research/claude.md), [Codex](research/codex.md), [медиа](research/media.md). Наличие SDK или CLI hooks не означает готовую интеграцию существующего desktop-приложения.

| Поверхность | Что найдено | Решение |
| --- | --- | --- |
| Claude Desktop, Code tab | Mods Pane и lifecycle events; нет документированного video/DOM элемента; Windows WSL исключён | Общий companion для видео; mod control pane при успешном реальном тесте |
| Codex Desktop | MCP UI / conversation panels в OpenAI docs, локальные hooks с review/trust | Перед интеграцией проверить панель, три потока и локальную доставку; при успехе использовать встроенный UI |
| Оба приложения | SDK запускают своих агентов | Не использовать SDK для слежения за существующими desktop-сессиями |

Приоритет встроенного UI сохраняется: Phase 3/4 начинаются с ограниченного эксперимента на установленном хосте. Если он успешен, встроенная поверхность переиспользует playback core. Отрицательный результат фиксируется вместе с версией хоста; companion является поддерживаемым fallback, а не доказательством отсутствия всех UI API.

## Технический стек

- TypeScript, HTML/CSS без UI-фреймворка: три `HTMLVideoElement`, простые кнопки, локальные шрифты. Playback controller — чистый ES module без зависимости от хоста, с переданным HTMLVideoElement.
- Electron: единый Chromium-декодер, собственное обычное окно, файловый импорт и ограниченный preload IPC. Цена выбора — размер пакета и потребление памяти; измерить в Phase 1. Tauri не выбран из-за вариативности системных WebView, а не из-за отсутствия video.
- Node.js 24.22.1 LTS, npm 11.6.2, Electron 45.2.2, TypeScript 7.0.2; версии и integrity закреплены в manifest/lockfile и bootstrap. Встроенный `node:test` для чистой логики, отдельный реальный Electron smoke для окна. [Проверки bootstrap](PHASE1-BOOTSTRAP.md); packaged проверки появятся позже.
- Python 3.10+ standard library только для текущих dev-инструментов skills; не требовать Python от конечного пользователя.
- FFprobe/FFmpeg в Phase 2 для проверки и нормализации, с зафиксированными источником/хешем/лицензией поставки. Не скачивать бинарники в Phase 0.

Обоснование Electron: [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window), [protocol](https://www.electronjs.org/docs/latest/api/protocol), [Security](https://www.electronjs.org/docs/latest/tutorial/security). Встроенное `parent` относится к окнам самого приложения и не прикрепляет окно к чужому Claude/Codex.

## Модули и потоки данных (план)

```text
Claude mod / command hook       Codex local command hook
            \                    /
             small activity adapter
                  | local IPC
                  v
        companion main: activity + media library
                  | narrow preload API
                  v
        playback core -> 3 local video elements

Codex embedded UI (only after validated spike)
        -> shared playback core
        -> approved media delivery (CSP/transport tested)
```

Companion — один запускаемый GUI-процесс с обычными дочерними процессами Electron. Отдельный always-on daemon и MCP для локального проигрывания не нужны. Детерминированный helper hooks доставляет события процессу GUI через локальный IPC и быстро завершает работу; сбой доставки не блокирует кодирование. На Windows предпочтительны named pipes; переносимый транспорт выделяется за интерфейсом. Проверить ACL/принадлежность пользователю, schema/size limits, пути с пробелами и sandbox в фазе соответствующего хоста. Не открывать listener в LAN.

MCP добавляется только если реальный Codex native-panel experiment подтвердит необходимость и работоспособность. Упаковка server/UI, media CSP и доставка локальных файлов тогда получают отдельный ADR; MCP не будет ходить к модели или становиться обязательным для companion.

## Модель активности (проектный контракт)

Нормализованное событие содержит `host`, `sessionId`, необязательный `turnId`, `event`, `observedAt`, уникальный `eventId`. Допустимые состояния: `active`, `idle`, `waiting`, `unknown`; события: start/complete/interrupted/end/waiting. Это внутренний контракт Brainrot, а не выдуманный API хоста. Адаптеры переводят только реально доступные события; не передают prompt, transcript или tool payload.

Хранить активность отдельно по сессии/turn; повторы идемпотентны, позднее завершение старого turn не выключает новый. В автоматическом режиме играть, пока есть подтверждённая активная выбранная сессия. Ручная пауза имеет приоритет, `resume` явно снимает её. При неизвестном состоянии не изображать точное слежение: пауза и видимый manual fallback. Завершённые сессии очищать, пропущенные events не восстанавливать парсингом приватных баз или process CPU.

Claude предпочтительно использует mod turn events; запасной command hook требует проверки. Codex использует локальные hooks после trust. Prompt-submit — ранний сигнал, его может заблокировать другой hook. Требуется тест отмены, ошибки, permission wait и нескольких чатов. Нельзя заставлять агента продолжать turn ради видео. Cloud/SSH/WSL охватываются только отдельной проверенной поддержкой, не локальным IPC «по умолчанию».

## Локальное видео и данные

В development и portable-режиме все кеши, настройки, логи, media и временные артефакты — в `<project>/.TMP/brainrot/`. Постоянные исходники, документация и скрипты остаются в Git. Для installed-режима пользователь выбирает writable project/data root; не писать в Program Files или автоматически в системный temp. До реализации установщика уточнить этот UX, сохранив правило `.TMP`.

Renderer получает непрозрачные media IDs вместо произвольных путей. Main проверяет approved roots и обслуживает только зарегистрированные файлы через custom protocol с streaming; проверить Range/seeking. Локальный UI, строгий CSP, sandbox, contextIsolation, no renderer Node, no `bypassCSP`; импорт не разрешает выполнение remote HTML. Нормализованный стартовый формат — WebM/VP9 без аудио, затем проверить MP4/H.264. Не обещать любой контейнер.

Каталог имеет отдельную per-asset provenance, точный SHA-256, размер, лицензию и разрешение способа доставки. Кеширование и fallback описаны в [media research](research/media.md). Ключи API не встраиваются в open-source приложение. Ни библиотека медиа, ни hook loop не обращаются к LLM. Установка навыка/первичная помощь агента может использовать обычный разговор; это не является частью playback runtime.

## Привязка окна и Windows

Первый проверяемый fallback: отдельная компактная панель рядом с выбранным хостом, ручное позиционирование, необязательный always-on-top. Это ещё не автоматическая привязка. В Phase 5 исследовать документированные Win32 window events/geometry для выбранного окна, DPI/мониторов/minimize; не внедрять код, не менять host-файлы и не применять `SetParent` как неподдерживаемую подмену встроенной панели. Если безопасное следование невозможно, явно оставить ручное размещение. macOS/Linux — интерфейс адаптера и отдельные тесты, без обещания готовой поддержки.

## Распространение и лицензия

План: один общий companion + отдельные поддерживаемые пакеты Claude/Codex. Codex hook-пакет требует manual desktop installation/trust и сейчас не подходит public plugin directory. В Phase 0 нет runtime manifests и установленных hooks: только discoverable development skills. Репозиторий публичный, собственный код — MIT; медиа и сторонние компоненты имеют отдельные условия. Имя Claude Brainrot не означает аффилиации с Anthropic/OpenAI.

## Обязательные проверки перед заявлениями о готовности

- Три одновременных реальных локальных видео, offline, mute/loop и независимое управление.
- Подтверждённая установка и события на реальных версиях обоих desktop-хостов.
- Codex panel spike и повторная проверка Claude media primitives.
- Три разрешённые категории для автозагрузки: сейчас комплект отсутствует; импорт собственной игровой записи предусмотрен требованиями.
- Подтверждение отсутствия дополнительных model calls при playback/controls и корректного сбоя hooks.
- Измерения Windows CPU/GPU/RAM, packaged codecs, DPI/multi-monitor; ожидаемые бюджеты утвердить по Phase 1 baseline.
