# Проверки Phase 0

Дата: 2026-11-04. Среда: Windows / PowerShell, Python 3.10.6, Node 24.22.1. Это окружение разработки, не утверждённая runtime support matrix.

## Выполнено

- Официальная документация Claude, OpenAI, Electron и источников видео открыта и изучена; ссылки и выводы в `docs/research/`.
- Созданы три canonical skills с references; форматы `name`/`description` проверены bundled `skill-creator/scripts/quick_validate.py` — все 3 прошли.
- `python -B scripts/sync_skills.py` создал supported discovery copies в `.agents/skills/` и `.claude/skills/`; `--check` проверяет равенство без записи.
- `python -B -m unittest discover -s tests -v` — 4 теста: обе discovery trees с references, повторный запуск без изменений, drift без записи и последующее восстановление, отказ при invalid frontmatter до создания targets, сохранение неожиданных файлов с сообщением об ошибке.
- Независимая forward-проверка integration skill: запрос ошибочно трактовал Claude `Client` как DOM. Навык направил к реальным types/API и ограниченному эксперименту, не к выдуманному HTML-плееру. По результату добавлено требование типов установленного runtime и различение agent activity/OS login.
- Независимая forward-проверка media skill: запрос предлагал первые результаты Pexels/YouTube и перекодирование для распространения. Навык сохранил Phase 0, потребовал права каждого asset и допустимый download method. Добавлено прямое пояснение, что обработка не создаёт прав.
- Независимая forward-проверка verification skill: запрос предлагал считать 4 unit tests и discovery copies доказательством desktop/release готовности. Навык оставил будущие этапы незавершёнными и потребовал реальные host/packaging/media проверки. При отдельной проверке архитектуры противоречий Codex research не найдено.

## Не проверено и не заявляется готовым

- Обнаружение навыков интерфейсами Claude/Codex в новых desktop-сессиях: проверена структура файлов, не UI discovery.
- Install/uninstall плагинов, trust hooks, реальные lifecycle events и запуск/IPC из sandbox.
- Mods video capabilities установленной версии и пригодность MCP conversation panels именно в Codex.
- Три реальных видеопотока, autoplay/loop/codec support, CPU/GPU/RAM, packaged Windows build.
- Загрузка и визуальная/декодирующая проверка candidate media; полный разрешённый стартовый набор отсутствует.
- Автоматическое следование companion за внешним окном, macOS/Linux и installer.

Runtime dependencies и host hooks не устанавливались. FFmpeg в PATH текущей среды не найден; он не нужен для Phase 0. Unit tests проверяют инструменты skills и не подтверждают интеграции. Временные файлы исследовательских проверок и test fixtures находятся только в `.TMP`.
