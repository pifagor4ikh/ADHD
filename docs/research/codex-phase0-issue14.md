# Codex Windows — исследование #14

Дата: 2026-11-04. Объём: [issue #14](https://github.com/pifagor4ikh/CLAUDE-BRAINROT/issues/14), Phase 0. **Результат: BLOCKED для допуска к Phase 1.** Исследование завершено с блокером проверки; пригодность встроенного проигрывателя не подтверждена. Это не доказательство отсутствия поддержки видео у Codex.

## Установленная среда

| Проверка | Наблюдение |
| --- | --- |
| `Get-AppxPackage *Codex*` | `OpenAI.Codex`, версия пакета `26.1027.6604.0`; не версия CLI или из окна About. |
| `Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'` | `DisplayVersion=24H2`, `CurrentBuild=26100`, `UBR=9711`. Прежнее указание 25H2 / 26200 в срезе Phase 0 не подтверждено. |
| `cua.getState()` | Запущенное окно ChatGPT, app ID `OpenAI.Codex_2p2nqsd0c76g0!App`. Провайдер `Codex MCP Apps`, `type=mcpapps`, `tabs=[]`. Это наличие провайдера автоматизации, а не успешный рендер приложения. |
| Инструменты текущего чата | `show_brainrot` отсутствует; вызвать его через подключённый плагин не удалось. Это не инвентаризация установок других чатов. |
| Контракт `cua` | Можно привязать существующую MCP App вкладку; `createBrowserTab()` не создаёт MCP App. Обычный browser tab не заменяет проверку MCP UI. |

## Официальный контракт

Страницы открыты и проверены 2026-11-04:

- [Plugin Extensions](https://developers.openai.com/plugins/build/extensions): conversation panel объявляется через `_meta["openai/ui"].entrypoints` с `type: "thread"`. Страница описывает ChatGPT; гарантии трёх областей вокруг чата Codex нет.
- [Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui): iframe, мост MCP Apps, `text/html;profile=mcp-app`, привязка через `_meta.ui.resourceUri`. CSP задаётся через `connectDomains`, `resourceDomains`, `frameDomains`; вложенные iframe по умолчанию запрещены. Эти allowlist не доказывают разрешение `file://`, `blob:` или autoplay в установленном Codex.
- [Package your plugin](https://developers.openai.com/plugins/build/plugins#install-a-local-plugin-manually): локальный marketplace, перезапуск Desktop и установка через Plugins Directory. Marketplace CLI помогает подготовить каталог; не заменяет desktop-тест установки и UI.
- [Submit desktop-only plugins](https://developers.openai.com/plugins/deploy/desktop-only): stdio — desktop-only доставка; публичная подача local MCP ограничена одобренными партнёрами. Это ограничение распространения, а не запрет локального эксперимента.

**Решение по поверхности:** кандидат — одна встроенная MCP Apps карточка/панель с тремя видео. Независимые слоты слева, справа и снизу от чата не подтверждены. Прототип размещает два вертикальных и одно горизонтальное видео внутри карточки; это отличается от размещения вокруг чата. Выбор поверхности отложен до реального desktop-эксперимента. MCP нужен только для доставки встроенного ресурса.

Ближайший подготовленный вызов: упомянуть установленный `brainrot-codex` в локальном чате и попросить вызвать `show_brainrot`; нужен начальный модельный turn. `/brainrot` и прямой вход в conversation panel не проверены. Сервер прототипа объявляет UI resource, но не `openai/ui` thread entrypoint. Карточка не считается доказательством отдельной панели.

## Локальное медиа и проверки прототипа

`plugins/codex/widget.html` и `widget.js` используют file picker, `URL.createObjectURL(File)` и три `<video muted loop playsinline>`. Файлы не отправляются MCP-серверу; Next, Off и интервал исполняются в виджете. Это свойства исходников. Произвольный доступ к кешу по пути, Blob URL, декодер и autoplay хоста остаются **UNVERIFIED**. Явная CSP metadata в текущем ресурсе отсутствует; эффективная политика хоста не наблюдалась. Добавлять домены наугад или ослаблять sandbox оснований нет.

| Команда | Результат и граница проверки |
| --- | --- |
| `./scripts/stage-codex-plugin.ps1 -Smoke` | Не завершилась: `npm.cmd` отсутствует в исходном PATH. Пакет скопирован в `.TMP/codex-plugin`; установка выполнена командой ниже. |
| `node .TMP/tooling/package/bin/npm-cli.js ci --prefix .TMP/codex-plugin --cache .TMP/npm-cache --ignore-scripts --no-audit --no-fund` | Установлены 99 закреплённых пакетов. |
| `Copy-Item tests/codex-mcp-smoke.mjs .TMP/codex-plugin/codex-mcp-smoke.mjs`, затем `node .TMP/codex-plugin/codex-mcp-smoke.mjs` | `MCP stdio smoke passed`: реальный обмен stdio, вызов инструмента, чтение ресурса, MIME, три video и наличие инициализации. Desktop не участвовал. |
| `node --test tests/brainrot-widget.test.mjs` | 1/1: выбор, переключение, mute и Off с моками; без браузерного декодера и CSP хоста. |
| `python -B scripts/sync_skills.py --check` | Discovery copies актуальны. |
| `python -B -m unittest discover -s tests -v` | 4/4. |

Node `v24.22.1`, npm `11.6.2`. Для установки `TEMP` и `TMP` направлены в `E:\ADHD\.TMP\tmp`. Подготовленные файлы остаются в `.TMP`; конфигурация и файлы хоста не менялись.

## Блокер и эксперимент для его снятия

Установленный Windows Computer Use skill (`computer-use/26.1027.51404`, `docs/guidance.md`) запрещает автоматизацию ChatGPT Desktop UI. В чате нет подключённого инструмента Brainrot или открытой MCP App вкладки. Установка, первичный вызов и визуальная проверка поэтому не выполнены. Перезапуск хоста, приватные API и правки хоста не использовались. Это блокер доступного способа проверки, а не наблюдаемый отказ воспроизведения/CSP.

После установки через поддерживаемый desktop flow выполнить ручной эксперимент. [Подготовка пакета](../PLUGIN-PROTOTYPES.md#codex) уже существует; новые playback-функции не требуются.

1. Записать версию Desktop. Добавить `.TMP/codex-plugin` в локальный marketplace, перезапустить Desktop по официальной инструкции и установить пакет в Plugins Directory. В локальном чате упомянуть плагин и вызвать `show_brainrot`. Зафиксировать отдельно ответ инструмента и появление карточки; один текстовый ответ не считается успехом UI.
2. Проверить file picker и выбрать три собственных разрешённых коротких видео. Записать формат/кодек, размеры и SHA-256; файлы и обезличенные скриншоты хранить в `.TMP/issue-14/`. При недоступной карточке или picker записать точную ошибку и остановиться.
3. Подтвердить движение кадров у всех трёх видео одновременно, mute, повтор после конца коротких клипов и Next. Зафиксировать ошибки `play()`, декодера/CSP доступным интерфейсом. Отсутствие ошибки не доказывает доступ к `file://`.
4. Проверить размер одной панели, resize и фактическое положение относительно чата. Проверить смену чата и возврат, закрытие панели и Off: остановку видео и таймера, освобождение ресурсов. Убедиться, что controls и таймер не создают дополнительных модельных turns.
5. Сохранить отчёт с доказательствами. Только при реальном успехе отметить готовность поверхности в roadmap; при отказе сохранить блокер и точную воспроизводимую ошибку.

Раскладка, три локальных потока, mute/loop/autoplay, CSP и жизненный цикл в Desktop **не проверены**. Phase 0 для Codex остаётся заблокированной; [#15](https://github.com/pifagor4ikh/CLAUDE-BRAINROT/issues/15) не получает допуск к Phase 1. Внешнее окно требует отдельной команды пользователя. После отчёта работа по этапу останавливается.
