# Codex Desktop: проверка совместимости

> Исторический отчёт. Текущая цель — два встроенных плагина. Для актуальных решений и этапов см. [архитектуру](../ARCHITECTURE.md).

Актуальная проверка Windows-хоста по #14: [Codex Phase 0](codex-phase0-issue14.md). Версия пакета `26.1027.6604.0`; результат — BLOCKED для runtime-допуска, встроенное видео не подтверждено. Предложение внешнего окна ниже историческое: текущая архитектура требует отдельного согласования такого fallback.

Дата проверки: 2026-11-04. Использована официальная OpenAI documentation. Это исследование документации, не отчёт об установленном и работающем расширении.

## Совместимость и ограничения

| Возможность | Подтверждено документацией | Вывод для Brainrot |
| --- | --- | --- |
| Windows desktop | Native PowerShell, плагины и skills поддерживаются | Windows — допустимая исходная платформа |
| UI из MCP | UI resources и MCP Apps bridge | Возможен встроенный интерфейс, но нужна проверка именно Codex |
| Панель рядом с чатом | OpenAI MCP Extensions документируют conversation panels | Приоритетный технический эксперимент, не объявлять отсутствие API |
| События активности | Локальные lifecycle hooks | Возможна автоматизация без запросов к модели |
| Public plugin directory | Пакеты с lifecycle hooks не допускаются | Автоматический режим распространять ручной установкой |
| Skills | Repo `.agents/skills`, plugin `skills/` | Поддерживаемые точки обнаружения без глобальной установки |

Windows desktop работает нативно и также допускает WSL2. Конфигурация, кэш аутентификации и история WSL CLI не разделяются автоматически с Windows приложением. Поддержка Windows сама по себе не доказывает, что sandbox разрешает запуск companion GUI или доставку IPC; это проверяется в Phase 4. Источник: [Windows desktop](https://learn.chatgpt.com/docs/windows/windows-app).

## Встроенный UI: важная развилка

MCP Apps привязывает UI resource к инструменту через `_meta.ui.resourceUri`; HTML запускается в изолированном iframe и общается с host через `postMessage`. CSP ограничивает загрузку ресурсов. Документация описывает отображение вместе с разговором, но не гарантирует доступ iframe к произвольному `file://`, непрерывное воспроизведение после переключения чата или работу autoplay. Эти свойства нельзя приписывать API без проверки. Источник: [Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui).

OpenAI MCP Extensions отдельно документируют **conversation panels** и sidebar apps. Metadata `openai/ui` с `entrypoints: [{type: "thread"}]` объявляет вход в боковую панель разговора; `type: "global"` — глобальный sidebar app. Страница описывает поверхности ChatGPT; это не достаточное доказательство одинаковой поддержки во всех режимах Codex и сборках. Официальные примеры: Bits & Bolts, Canva и Figma. Источник: [Plugin Extensions](https://developers.openai.com/plugins/build/extensions).

**Архитектурный вывод, а не факт API:** сначала короткий capability spike на реальном Codex Desktop: панель с тремя локальными muted video, доставка медиа, переключение чатов, длительное воспроизведение и контроль без model turn. Если тест успешен — встроенный adapter с MCP оправдан приоритетом пользователя. Если нет — единый локальный companion window. Не смешивать существование официального panel API с гарантией его пригодности под Brainrot.

## Hooks: события и модель состояния

Командный hook получает JSON в stdin: `session_id`, `cwd`, `hook_event_name`; turn events добавляют `turn_id`. `UserPromptSubmit` подходит для начала активности; `Stop`, `Interrupt`, `SessionEnd` — для остановки/очистки. `PermissionRequest` может обозначать ожидание пользователя. `SessionStart` — начало сессии, а не обязательно работа агента. Subagents используют parent `session_id`, поэтому нельзя паузить весь UI по любому `SubagentStop`.

Hooks обнаруживаются в `.codex/hooks.json`, inline config и enabled plugins. Неполитические hooks требуют review/trust текущего определения. Поддерживается `commandWindows`. Exit 0 без вывода означает успешное наблюдение; не возвращать `additionalContext`, `systemMessage`, `decision: block` или сообщения в модель ради управления видео. Stop hook, продолжающий агента, прямо нарушил бы нулевой дополнительный расход токенов.

Cloud orchestration не поддерживает локальные command/plugin hooks даже при локальном выполнении отдельных tools. Формат transcript нестабилен; не использовать его как основной event API. Источник для этого раздела: [Hooks](https://learn.chatgpt.com/docs/hooks).

**Проектное решение:** короткий non-blocking adapter нормализует только IDs, источник и событие; prompt/transcript/tool contents не сохраняются. Companion владеет состоянием нескольких сессий, ручная пауза имеет приоритет. Потерянные события, закрытие приложения и повторы требуют идемпотентности и восстановления; точные правила согласовать перед Phase 4. Пока hooks не проверены в текущем desktop runtime, автоматический режим помечается experimental; ручное управление остаётся рабочим fallback.

## Packaging и обнаружение skills

Portable пакет имеет root `plugin.json`; OpenAI-specific настройки лежат в `extensions.com.openai`. Поддерживается совместимость через `.codex-plugin/plugin.json`; это альтернативные источники OpenAI settings, а не сливаемые overlays. Portable skills обнаруживаются в root `skills/`, compatibility manifest может ссылаться на `./skills/`. Пути ресурсов разрешаются от plugin root и не выходят наружу.

Lifecycle hooks допускаются для вручную установленных desktop plugins, требуют доверия и исключают такой пакет из public directory. Установка в web не доставляет исполняемые скрипты на Windows. Для проекта допустимо готовить отдельные distributable adapters, сохраняя единую кодовую базу. Источник: [Package your plugin](https://developers.openai.com/plugins/build/plugins).

Repository skills следует размещать в `.agents/skills/<name>/SKILL.md`; Codex сканирует от CWD вверх до корня репозитория. Обязательны YAML `name` и `description`. Metadata видна для обнаружения, тело и ресурсы загружаются по необходимости. Поддерживаются symlink folders, но Windows deployment должен учитывать права на symlinks; воспроизводимое копирование при packaging проще. Факт наличия файлов не равен проверке появления skill в UI. Источник: [Build skills](https://learn.chatgpt.com/docs/build-skills).

## Почему SDK не заменяет plugin API

Codex SDK управляет собственными локальными агентами и threads из Node.js; предназначен для интеграции Codex в приложение разработчика. Это не API добавления произвольного окна в существующий desktop shell. Источник: [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk).

App Server предоставляет историю, approvals и streamed agent events для собственных клиентов. Запуск нового app-server создаёт другой integration endpoint; документация не обещает подключение к приватному процессу уже открытого desktop приложения. Не использовать внутренние sockets, базы или недокументированные порты. Источник: [Codex App Server](https://learn.chatgpt.com/docs/app-server).

## Что остаётся проверить на реальной установке

- Версию Windows desktop и доступность MCP conversation panel именно в Codex.
- Установку локального пакета и доверие hooks через доступный desktop flow.
- Доставку начала, завершения, interruption, ожидания разрешения, параллельных chats.
- Разрешения sandbox для вызова helper/IPC без обхода trust.
- Три потока, mute, autoplay, local media, CSP, длительную жизнь панели.
- Отсутствие дополнительных model turns при playback и всех controls.

Ни один из этих runtime пунктов в Phase 0 не заявляется пройденным.
