# Claude Brainrot

Open-source проект для трёх локальных зацикленных видео рядом с работающим агентом Claude Code Desktop или Codex Desktop. Без звука по умолчанию и без дополнительных вызовов LLM при воспроизведении. Собственный код — MIT.

**Статус: завершена Phase 0, начата Phase 1 — минимальное локальное окно Electron (#3).** Видеодвижок, загрузчик и host-интеграции ещё не реализованы. Название не означает аффилиации с Anthropic или OpenAI.

- [Архитектура и выбранный стек](docs/ARCHITECTURE.md)
- [Roadmap с критериями готовности](ROADMAP.md)
- Исследования: [Claude](docs/research/claude.md), [Codex](docs/research/codex.md), [видео и лицензии](docs/research/media.md)
- [Development skills и команды проверки](docs/SKILLS.md)
- [Результаты Phase 0](docs/PHASE0-VALIDATION.md)
- [Правила проекта](AGENTS.md)

План: общий TypeScript playback core, Electron companion для Windows и отдельные host adapters. Встроенный UI имеет приоритет, но video capabilities нуждаются в реальной проверке. MCP добавляется только при подтверждённой необходимости встроенной панели.

Категории: Subway Surfers, soap cutting, carpet cleaning/pressure washing; Minecraft parkour optional. Полного разрешённого автоматического стартового набора пока нет. Для игровых видео предусмотрен импорт собственных записей. Медиа не включаются в Git.

## Установка и запуск на Windows

Минимум: Windows 10 22H2 x64, PowerShell 7, `tar` из Windows и Node.js **24.22.1** (`.node-version`) в PATH. Проверенное окружение и ограничения — в [отчёте](docs/PHASE1-BOOTSTRAP.md). Интернет нужен при первой установке зависимостей; API-ключи не нужны. Python 3.10+ требуется только для проверок skills.

Из корня репозитория:

```powershell
./scripts/setup.ps1
node scripts/tasks.mjs dev
```

Setup загружает npm 11.6.2 с проверкой SHA-512, выполняет `npm ci` из `package-lock.json` в `.TMP/deps` и устанавливает Electron 45.2.2. TypeScript 7.0.2 и остальные зависимости закреплены в lockfile. Системный npm не требуется. Исходники и lockfile остаются в Git; зависимости, кеши, временные файлы, сборка, fixtures и данные Electron — в `.TMP/`. Обычный `npm ci` в корне не использовать.

`dev` сначала компилирует приложение и открывает окно; после изменения исходников перезапустите команду. Это однократный запуск без hot reload. Закройте окно для выхода. Сборка пока представляет собой скомпилированные исходники, установщика нет.

## Проверки

```powershell
node scripts/tasks.mjs typecheck
node scripts/tasks.mjs build
node --test tests/runtime.test.mjs
node scripts/tasks.mjs smoke
```

Smoke запускает видимое окно Electron, проверяет загрузку UI, изоляцию renderer и пути данных, сохраняет скриншот/версии в `.TMP/brainrot`, затем закрывается. `build` нужен перед отдельным запуском unit-тестов. При наличии npm доступны эквиваленты `npm run dev`, `npm run build`, `npm run typecheck`, `npm test`, `npm run test:desktop`.

Проверки skills:

```powershell
python -B scripts/sync_skills.py --check
python -B -m unittest discover -s tests -v
```

Структура: `src/companion/` — окно и локальный HTML/CSS; `docs/` — исследования/решения; `skills/` — исходники навыков; `.agents/skills/` и `.claude/skills/` — discovery copies; `scripts/` и `tests/` — dev-инструменты; `.TMP/` — игнорируемые зависимости, кеши и результаты. Остальные runtime-модули появятся в следующих задачах.

GitHub Actions выполняет обязательную проверку `Windows checks` на PR и `main`: установка из lockfile, typecheck, build, unit-тесты, реальное окно Electron и проверки skills. `main` защищена: изменения через PR, успешный CI на актуальной базе, линейная история, закрытые обсуждения; force push и удаление запрещены, правила действуют для администраторов. Для текущего PR включается squash automerge после CI; обязательного одобрения ревью нет. Настройки защиты и automerge хранятся в GitHub, workflow — в `.github/workflows/ci.yml`.
