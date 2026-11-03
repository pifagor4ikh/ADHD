# Development skills

Доступные встроенные skills проверены: `openai-docs` используется для официальной документации Codex, `skill-creator` — для создания/проверки навыков. Готового специализированного workflow для Brainrot в доступном каталоге нет; сторонние skills не устанавливались.

Созданы:

| Skill | Назначение |
| --- | --- |
| `brainrot-integration-research` | Проверять реальные desktop API, различать surfaces и планировать native-video experiments |
| `brainrot-media-workflow` | Проверять права, acquisition/fallback и FFmpeg processing; не принимать перекодирование за лицензию |
| `brainrot-plugin-verification` | Проверять packaging, phase gates и отличать simulated tests от реальной desktop-интеграции |

Канонический код — `skills/<name>/SKILL.md` и `references/`. `python -B scripts/sync_skills.py` создаёт точные копии в `.agents/skills/` для Codex и `.claude/skills/` для локального Claude Code. Копии коммитятся, поэтому clone уже содержит поддерживаемые discovery paths. Не используются Windows symlinks и глобальные настройки. `--check` не меняет файлы и завершается кодом 1 при drift; неожиданные файлы сохраняются и требуют ручного разбора.

Это development skills для работы над проектом, не установленный runtime Brainrot plugin. Открыть корень репозитория в новой локальной сессии нужного desktop-приложения. В Claude вызвать `/brainrot-integration-research`, в Codex — `$brainrot-integration-research` либо выбрать навык в интерфейсе. Сам факт обнаружения текущими приложениями в Phase 0 не проверялся. Cloud sessions используют другой filesystem; локальная папка не делает их автоматически доступными там.

После изменения:

```powershell
python -B scripts/sync_skills.py
python -B scripts/sync_skills.py --check
python -B -m unittest discover -s tests -v
```

Для frontmatter дополнительно использован bundled `skill-creator/scripts/quick_validate.py` текущей среды (требует PyYAML); это не runtime dependency репозитория. Скрипт синхронизации и тесты используют только Python standard library. Поведенческие проверки навыков и ограничения записаны в [PHASE0-VALIDATION.md](PHASE0-VALIDATION.md).
