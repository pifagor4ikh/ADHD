# Claude Brainrot — roadmap

Правило выполнения: каждый этап — отдельная проверяемая итерация и логический коммит. После этапа показать результат и **остановиться до следующей команды**. Галочка означает выполненную проверку, а не обещание. Phase 1 начата с задачи #3; весь этап ещё не завершён.

## Phase 0 — Research & Architecture

Зависимости: требования проекта и актуальная официальная документация.

- [x] Исследовать Desktop Claude/Codex, Windows, SDK, встроенные панели и lifecycle events.
- [x] Отделить подтверждённые API от требующих проверки native-video сценариев.
- [x] Выбрать общий playback core + Electron companion + отдельные host adapters.
- [x] Проверить доступные skills: `openai-docs`, `skill-creator`; специализированных навыков Brainrot в доступном каталоге нет, создать собственные.
- [x] Создать 3 специализированных skills с references и поддерживаемыми project discovery paths.
- [x] Проверить frontmatter, воспроизводимую синхронизацию и негативные случаи; независимая проверка поведения навыков.
- [x] Записать источники, ограничения, структуру, критерии последующих этапов.
- [x] Зафиксировать отсутствие полного лицензированного стартового набора как gate Phase 2.

Готовность: документы и навыки проверены; реальные runtime-интеграции не выдаются за выполненные. Результаты: [архитектура](docs/ARCHITECTURE.md), [исследования](docs/research/claude.md), [skills](docs/SKILLS.md), [проверки](docs/PHASE0-VALIDATION.md).

## Phase 1 — Video Engine

Зависит от Phase 0 и отдельной команды пользователя. Перед реализацией прочитать `brainrot-plugin-verification` и `brainrot-media-workflow`.

- [x] Зафиксировать поддерживаемые версии Node/Electron/TypeScript и lockfile; настроить кеши/outputs в `.TMP` (задача #3, [проверки](docs/PHASE1-BOOTSTRAP.md)).
- [ ] Создать общий playback core, обычное Electron-окно и ограниченный preload/protocol. Окно (#3) и preload/protocol (#4) реализованы; общий playback core ещё не готов.
- [x] Подготовить три коротких собственных тестовых видео в `.TMP`, проверить их происхождение (#4, [отчёт](docs/PHASE1-MEDIA.md)).
- [x] Реализовать библиотеку выбранных файлов с непрозрачными ID; проверить Range/seeking, Unicode/пробелы, missing/unsupported/corrupt и traversal в реальном Electron (#4). Системный диалог импорта и отмена проверены через Windows UI, см. отчёт.
- [ ] Реализовать 3 независимых потока, muted по умолчанию, loop, pause/resume, next/shuffle и локальный import.
- [ ] Проверить missing/corrupt/unsupported video, отсутствие контента и независимость ошибок слотов.
- [ ] Проверить state transitions и реальное движение currentTime/loop на Windows, offline.
- [ ] Записать CPU/GPU/RAM baseline и ограничения проверенной машины; без host hooks/downloader.

Критерий: три видео действительно играют одновременно и управляются независимо без сети/LLM; проверенная сборка и отчёт. Не объявлять desktop plugin integration готовой.

## Phase 2 — Video Downloader

Зависит от Phase 1. Прочитать media skill; продолжать rights research, не подменять его наличием URL.

- [ ] Подобрать и одобрить источники: soap cutting, pressure washing, игровой слот с собственной записью/явными правами; Minecraft optional.
- [ ] Зафиксировать per-asset license/author/attribution, способы download/transform/distribution, URL, hash/size и mirrors.
- [ ] Решить текущую нехватку автоматического стартового набора; импорт разрешён для игр, но не закрывает требование автоматического наполнения остальных категорий.
- [ ] Реализовать bounded downloader, local cache, atomic promotion и retries; не добавлять MCP без необходимости.
- [ ] Проверить FFprobe + полное декодирование; нормализовать видео; документировать FFmpeg источник/хеш/лицензию.
- [ ] Обеспечить first-run автоматическую загрузку доступного разрешённого набора и честный fallback.
- [ ] Проверить offline/warm cache, недоступный источник, HTML вместо видео, corruption, oversized file и отказ обработки.

Критерий: воспроизводимая чистая настройка с разрешёнными файлами и проверенным fallback. Если нужные права/категории не найдены — статус этапа «не завершён», явное решение с пользователем; не отмечать фиктивное выполнение.

## Phase 3 — Claude Integration

Зависит от Phase 1/2 и реального Claude Desktop Local Windows. Прочитать integration и verification skills.

- [ ] Зафиксировать версию Desktop и bundled runtime; проверить ограничения WSL/администратора.
- [ ] Выполнить native UI spike на актуальных `/plugin-types`: video primitives, local content, три потока. Если невозможно, записать причину fallback.
- [ ] Подготовить поддерживаемый Claude package; проверить install/uninstall, skills discovery.
- [ ] Реализовать mod control pane и activity adapter либо подтверждённые command hooks.
- [ ] Проверить реальные start/complete/abort/error/permission wait, subagent и параллельные сессии.
- [ ] Проверить IPC, safe failure, отсутствие дополнительных модельных вызовов и изменения host-файлов.

Критерий: на реальной установке агент управляет видео; отчёт с версиями и скриншотами в `.TMP`, устойчивый manual fallback. Без установленного хоста этап остаётся непроверенным.

## Phase 4 — Codex Integration

Зависит от Phase 3 и реального Codex Desktop Windows; общий движок уже готов.

- [ ] Начать с MCP conversation-panel spike: Codex mode, local media/CSP, 3 videos, autoplay, смена чатов, долгоживущая панель, controls без turn.
- [ ] При успехе выбрать embedded adapter и документировать необходимый MCP transport; иначе обосновать companion.
- [ ] Подготовить manual desktop package, проверить supported install и review/trust hooks.
- [ ] Нормализовать реальные activity events, корректно обработать interrupt/waiting/session end и параллельные turn IDs.
- [ ] Проверить sandbox/IPC и no-model-call управление; cloud не считать local mode.
- [ ] Подтвердить переиспользование общего playback core, install/uninstall и manual fallback.

Критерий: фактическая проверка в Codex с точными версиями и честным итогом native panel experiment. Hooks package не публикуется в неподдерживаемый public directory.

## Phase 5 — UX & Configuration

Зависит от обоих адаптеров; прочитать verification skill.

- [ ] Минимальный UI: 3 видео, mute, видимые pause/resume/next/shuffle/import, источники и статус auto/manual.
- [ ] Настройки категорий/плейлистов, сохранение в project `.TMP`, приоритет ручной паузы.
- [ ] Drag/resize, восстановление размера/позиции, доступность клавиатурой.
- [ ] Проверить документированное следование выбранному host window на Windows: DPI, несколько мониторов, minimize/close и смена окна. Не называть ручную позицию автоматической привязкой.
- [ ] Автозапуск/автопауза при достоверных событиях; fallback при потере связи.
- [ ] Зафиксировать Windows support matrix; macOS/Linux отмечать только после фактических проверок.

Критерий: понятные controls и стабильная проверенная привязка либо явно описанное ограничение; ни одна настройка не создаёт фоновые LLM turns.

## Phase 6 — Release

Зависит от всех прошлых этапов, включая права на стартовый контент.

- [ ] E2E на чистой Windows, installer/uninstaller, пути с пробелами, offline и восстановление после сбоя.
- [ ] Поддерживаемая установка Claude/Codex, раздельные пакеты при разных manifest/API ограничениях.
- [ ] Доставка media отдельно от Git, notices/attribution и лицензии бинарников; source/license audit.
- [ ] Документация, troubleshooting, privacy, performance baseline и точная compatibility matrix.
- [ ] Проверить отсутствие secrets/cache/крупного media/ИИ-атрибуции в релизных метаданных.
- [ ] Подготовить version/tag/release assets и GitHub release notes; публикация только в разрешённой задаче.

Критерий: новый пользователь устанавливает и удаляет проект по инструкции, получает разрешённый контент, запускает три видео; все заявленные интеграции подтверждены, ограничения явно видны.

## Что нужно для старта Phase 1

Следующая команда пользователя; Node/npm и pinned dev dependencies; место в `.TMP` для dependency cache/builds/test fixtures; 3 тестовых видео собственной генерации/съёмки; Windows-машина для packaged playback. API-ключи, MCP и запущенный AI-агент не требуются. Реальные установленные хосты понадобятся в Phase 3/4.
