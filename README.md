# Claude Brainrot

Open-source проект для трёх локальных зацикленных видео рядом с работающим агентом Claude Code Desktop или Codex Desktop. Без звука по умолчанию и без дополнительных вызовов LLM при воспроизведении. Собственный код — MIT.

**Статус: завершена исследовательская Phase 0; приложения, загрузчика и рабочих интеграций пока нет.** Phase 1 начинается только по отдельной команде. Название не означает аффилиации с Anthropic или OpenAI.

- [Архитектура и выбранный стек](docs/ARCHITECTURE.md)
- [Roadmap с критериями готовности](ROADMAP.md)
- Исследования: [Claude](docs/research/claude.md), [Codex](docs/research/codex.md), [видео и лицензии](docs/research/media.md)
- [Development skills и команды проверки](docs/SKILLS.md)
- [Результаты Phase 0](docs/PHASE0-VALIDATION.md)
- [Правила проекта](AGENTS.md)

План: общий TypeScript playback core, Electron companion для Windows и отдельные host adapters. Встроенный UI имеет приоритет, но video capabilities нуждаются в реальной проверке. MCP добавляется только при подтверждённой необходимости встроенной панели.

Категории: Subway Surfers, soap cutting, carpet cleaning/pressure washing; Minecraft parkour optional. Полного разрешённого автоматического стартового набора пока нет. Для игровых видео предусмотрен импорт собственных записей. Медиа не включаются в Git.

Текущие проверки (Python 3.10+, из корня проекта):

```powershell
python -B scripts/sync_skills.py --check
python -B -m unittest discover -s tests -v
```

Структура Phase 0: `docs/` — исследования/решения; `skills/` — исходники навыков; `.agents/skills/` и `.claude/skills/` — discovery copies; `scripts/` и `tests/` — dev-инструменты; `.TMP/` — игнорируемые кеши и результаты. Планируемые runtime-модули: `src/playback/`, `src/companion/`, `src/media/`, `src/adapters/`, `plugins/`; они ещё не созданы.
