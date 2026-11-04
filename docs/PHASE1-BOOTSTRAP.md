# Phase 1 — bootstrap (#3)

> Исторический отчёт. Текущая цель — два встроенных плагина. Для актуальных решений и этапов см. [архитектуру](ARCHITECTURE.md).

Дата: 2026-11-04. Разрешение: явная команда пользователя выполнить issue #3; зависимость #2 закрыта. Объём ограничен каркасом проекта, Phase 1 целиком не завершена.

## Закреплённая среда

| Компонент | Версия / проверка |
| --- | --- |
| Development Node | 24.22.1 LTS, `.node-version`, проверяется setup |
| npm | 11.6.2, архив с фиксированным SHA-512 |
| Electron | 45.2.2, пакет из lockfile, Windows x64 архив с SHA-256 из закреплённого пакета |
| TypeScript | 7.0.2, Node16 module resolution, strict |
| Node types | 24.19.2 |
| Локальная машина | Windows 11 x64, build 26100; PowerShell 7.6.5 |
| Embedded runtime | Chromium 156.0.8078.80; Node 24.22.2 |

Electron package требует development Node >=22.12.0, TypeScript >=16.20.0; выбранный Node 24.22.1 удовлетворяет обоим требованиям. Проверка выполнена по registry metadata и реальной компиляции/запуску. Host Node и embedded Node не обязаны иметь одинаковый patch.

Официальные источники: [Node releases](https://nodejs.org/en/about/previous-releases), [Electron support policy](https://www.electronjs.org/docs/latest/tutorial/electron-timelines), [installation](https://www.electronjs.org/docs/latest/tutorial/installation), [app paths](https://www.electronjs.org/docs/latest/api/app), [security](https://www.electronjs.org/docs/latest/tutorial/security), [TypeScript package metadata](https://registry.npmjs.org/typescript/7.0.2), [Electron package metadata](https://registry.npmjs.org/electron/45.2.2).

## Реализовано

Обычное локальное окно с HTML/CSS без UI-фреймворка. Renderer sandboxed, context isolation включён, Node integration выключен. CSP запрещает скрипты и подключения; main запрещает новые окна, навигацию, permission requests и сетевые запросы renderer. Preload, host hooks, downloader медиа, MCP и модельные вызовы отсутствуют.

Все управляемые проектом артефакты находятся в `.TMP`: npm и dependency caches, зависимости, Electron binary archive, build, app/session data, crash dumps, logs, temp и fixtures. Пути задаются до `app.whenReady()`. Smoke проверяет реальные `app.getPath()` и отсутствие `process`/`require` в renderer; фиксирует видимость окна, содержимое, версии и скриншот. Это проверка окна и путей, а не системный аудит каждого файлового обращения Windows.

Загрузчик `@electron/get` завис на сетевом запросе в локальной среде. Setup использует PowerShell для официального release archive и проверяет его по `checksums.json` установленного locked пакета; не использует сторонние mirrors. При первой попытке screenshot снимался до появления display surface; исправлено ожиданием `ready-to-show` и двух кадров renderer. Повторный smoke прошёл, скриншот просмотрен.

## Проверки

- `./scripts/setup.ps1 -UpdateLock`, затем `./scripts/setup.ps1`: lockfile создан, установка прошла; npm и Electron archive integrity проверены.
- `node scripts/tasks.mjs typecheck`: успешно.
- `node scripts/tasks.mjs build`: успешно, outputs в `.TMP/build`.
- `node --test tests/runtime.test.mjs`: 1 тест пройден; изоляция runtime paths, включая пробелы в пути.
- `node scripts/tasks.mjs smoke`: реальное видимое окно Windows, renderer/path assertions и screenshot — успешно. Evidence: `.TMP/brainrot/smoke.json`, `.TMP/brainrot/smoke.png`.
- `python -B scripts/sync_skills.py --check`: копии актуальны.
- `python -B -m unittest discover -s tests -v`: 4 теста пройдены.
- `skill-creator/scripts/quick_validate.py skills/brainrot-plugin-verification`: skill валиден; workflow Electron добавлен в существующий навык и синхронизирован.
- Чистая копия tracked исходников в `.TMP/clean checkout`: отдельный `npm ci`, typecheck/build, unit-тест, реальное окно, skill sync и 4 Python-теста прошли. Для повторной установки использован предварительно проверенный Electron archive cache; загрузка с нуля независимо прошла в CI.
- [GitHub Actions run 41742750884](https://github.com/pifagor4ikh/CLAUDE-BRAINROT/actions/runs/41742750884): все шаги `Windows checks` прошли на чистом Windows runner, включая реальное окно и отсутствие изменений tracked файлов. [PR #24](https://github.com/pifagor4ikh/CLAUDE-BRAINROT/pull/24) автоматически слит, issue #3 закрыта.

## CI и границы

GitHub Actions `Windows checks` проверяет lockfile install, typecheck, build, unit-тест, реальное окно и skills; screenshot/версии/логи сохраняются как короткоживущий artifact. `main` защищена PR, обязательной проверкой на актуальной базе, линейной историей и закрытием обсуждений; запреты force push/удаления и проверки применяются к администраторам. Automerge включён в репозитории; для PR задачи #3 используется squash после CI, без обязательного reviewer approval.

Минимальная целевая платформа: Windows 10 22H2 x64 + PowerShell 7; фактически локально проверена только Windows 11 x64. Windows ARM, macOS/Linux, packaged installer, codecs, три видеопотока, offline playback, производительность и desktop-хосты не проверены и не входят в #3. После этой задачи работа останавливается до следующей команды.
