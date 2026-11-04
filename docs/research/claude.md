# Claude Code Desktop: проверка совместимости

> Исторический отчёт. Текущая цель — два встроенных плагина. Для актуальных решений и этапов см. [архитектуру](../ARCHITECTURE.md).

Дата исследования: **2026-11-04**. Объект — Code tab приложения Claude Desktop, локальная Windows-сессия. Это исследование документации, а не подтверждение работающей интеграции на установленном приложении.

## Что официально поддерживается

| Возможность | Подтверждённый контракт | Следствие для Brainrot |
| --- | --- | --- |
| Плагины | Пакет с `.claude-plugin/plugin.json`, skills, hooks и необязательными MCP-компонентами | MCP не обязателен для пакета |
| Встроенный UI | **Mods**: JS/TS hooks module, `ui.render`, `Pane`, элементы управления | Встроенную панель нельзя объявлять полностью недоступной |
| Видео внутри панели | В таблице элементов отсутствуют `Video`, `WebView`, HTML/iframe | Встроенный видеоплеер не подтверждён |
| События работы | Mods: `turn.start`, `turn.complete`; обычные hooks: `UserPromptSubmit`, `Stop`, `StopFailure`, `SessionEnd` | Можно спроектировать детерминированную передачу активности |
| Skills | Проектная `.claude/skills/<name>/SKILL.md`, личная `~/.claude/skills/`, пакетная `skills/` | Начальные навыки можно распространять вместе с репозиторием |
| Agent SDK | Запускает собственный agent runtime в приложении разработчика | Не является SDK подключения к существующему Desktop UI |

## Плагины и официальные примеры

[Plugins overview](https://code.claude.com/docs/en/plugins) описывает пакет компонентов, отдельно от IDE-расширений. Manifest находится в `.claude-plugin/plugin.json`; skills, hooks и MCP — разные возможности одного пакета. [Manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference) — источник полей и путей при реализации. В Phase 0 runtime manifest намеренно не означает готовую интеграцию.

[Mods overview](https://code.claude.com/docs/en/plugins/mods/overview) подтверждает моды для Code tab Desktop с bundled Claude Code **2.1.286+**; версию проверяют через `/status`. В Desktop WSL-сессиях плагины и mods недоступны. Существуют официальные примеры `token-weather`, `blast-radius`, `replay-theater` в [claude-code-playground](https://github.com/anthropics/claude-code-playground). Это примеры расширений, а не готовый видеоплагин. Администратор может ограничить mods. Установка и обновление самого CLI не доказывают обновление встроенного runtime Desktop.

## UI: почему отдельное окно пока обоснованно

[Mods reference: elements](https://code.claude.com/docs/en/plugins/mods/reference#elements) перечисляет Desktop `Box`, `Text`, `Button`, `Link`, `Code`, `Markdown`, `Input`, `Select`, `Svg`, `Client`. `Image` и `Raster` в этой таблице доступны только терминалу. Нельзя переносить DOM-возможности Chromium на этот API по аналогии.

[Draw in the interface](https://code.claude.com/docs/en/plugins/mods/interface) описывает `Client` как регион с отдельным модулем для анимации и pointer input, а не произвольную HTML-страницу. [Официальные TypeScript declarations](https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts) дополнительно описывают изолированное окружение без DOM/Node; `ClientElements` ограничен деревом элементов. Файл на GitHub отмечен версией 2.1.277 и EARLY ACCESS, поэтому при расхождении нужны типы из установленной версии через `/plugin-types`.

**Вывод проекта:** использовать общее companion-окно для настоящих локальных видео, а встроенную mod-панель рассматривать для кнопок/статуса. Это архитектурный вывод из проверенных контрактов, а не заявление, что видео никогда не появится в API. Перед Phase 3 повторно проверить типы установленного Desktop. Не заменять видео потоком SVG-кадров: это неподтверждённая и неэффективная подмена видеодекодера.

## Активность агента без LLM

[React to events](https://code.claude.com/docs/en/plugins/mods/events#follow-a-turn) документирует `turn.start`, `turn.step`, `turn.complete`; завершение содержит `isAborted`, события субагентов — `agentId`. Для выбора активности основного диалога отделять main от subagent; при параллельных сессиях хранить состояния по идентификатору, а не один глобальный флаг.

[Hooks reference](https://code.claude.com/docs/en/hooks) распространяет lifecycle events на Desktop. В запасном адаптере `UserPromptSubmit` — ранний сигнал, но ещё не доказательство начавшегося turn: другой hook может заблокировать отправку. `Stop` не должен принуждать агента продолжать. Использовать только command/HTTP или наблюдающие mod hooks; prompt/agent hooks способны делать модельные вызовы и не подходят для нулевой стоимости управления. При потере событий переходить в unknown/manual, не заявлять точное отслеживание.

## Windows и место выполнения

[Desktop application](https://code.claude.com/docs/en/desktop#environment-configuration) различает Local, Cloud, SSH и WSL: процесс hook работает там, где runtime, а не обязательно на Windows рядом с пользователем. Desktop на Windows не читает PowerShell profile при настройке PATH. Для hooks по возможности использовать exec form с настоящим `.exe` и массивом аргументов; `.cmd`/`.bat` требуют shell — см. [exec form](https://code.claude.com/docs/en/hooks#exec-form-and-shell-form). Конкретную команду подключения и IPC проверить в Phase 3, особенно пути с пробелами, Git Bash и отсутствие Node на пользовательской машине. Cloud/SSH не должны автоматически управлять локальным окном через открытый сетевой порт.

## Обнаружение skills и границы SDK

[Skills: locations](https://code.claude.com/docs/en/skills#choose-where-skills-load) подтверждает проектную `.claude/skills/` для локальных сессий и пакетную `skills/`. Синхронизация claude.ai/Cowork — другой механизм; наличие файла локально не доказывает доступность в cloud thread. Проверка установки: новый локальный Code session, меню `/`, затем явный вызов навыка. Статическая проверка frontmatter сама по себе не доказывает обнаружение интерфейсом.

[Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) даёт Python/TypeScript библиотеку для приложения, которое само запускает агент. Использование SDK означало бы создание нового coding client и возможные модельные расходы; для пассивного проигрывания рядом с уже работающим Desktop это избыточно.

## Что остаётся фактически проверить в Phase 3

- [ ] Версия Claude Desktop и bundled Claude Code; Local native Windows, не WSL.
- [ ] Установка собственного пакета поддерживаемым способом; видимость навыков.
- [ ] Реальная отрисовка control pane; повторная проверка доступных media elements.
- [ ] Начало, конец, отмена, ошибка, ожидание разрешения, две сессии и субагенты.
- [ ] Hook failure не мешает агенту; никакие ответы hook не добавляют контекст или новые turns.
- [ ] Companion-окно запускается/управляется без LLM, безопасно закрывается; окно хоста не модифицируется.

В Phase 0 ни один из этих runtime-пунктов не отмечается выполненным.
