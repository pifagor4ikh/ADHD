# Минимальные прототипы Brainrot

## Claude Code

Валидируемый [плагин Claude](../plugins/claude) содержит пользовательский skill `/brainrot:brainrot`. Он сообщает об ограничении и может потребовать один модельный turn. Для проверки пакета из корня репозитория:

```powershell
claude plugin validate ./plugins/claude
claude --plugin-dir ./plugins/claude
```

В проверенной [документации Mods](https://code.claude.com/docs/en/plugins/mods/reference) отсутствует подтверждённый видеопримитив. Встроенный проигрыватель Claude заблокирован. Вызов skill в Desktop — **UNVERIFIED**.

## Codex

Пакет использует [локальный MCP stdio](https://developers.openai.com/plugins/deploy/desktop-only) только для доставки [MCP Apps UI](https://developers.openai.com/plugins/build/chatgpt-ui). Файлы выбираются в виджете и воспроизводятся через локальные Blob URL. Они не передаются MCP-серверу. Виджет показывает два вертикальных слота и горизонтальный слот под ними внутри одной карточки. `Next` и `Off` работают в карточке, таймер переключает подборку каждые 60 секунд. При выборе ровно трёх файлов они циклически меняются местами.

```powershell
./scripts/stage-codex-plugin.ps1 -Smoke
node --test tests/brainrot-widget.test.mjs
```

Готовая папка для эксперимента с [локальным marketplace](https://developers.openai.com/plugins/build/plugins#build-your-own-curated-plugin-list) — `.TMP/codex-plugin`. Указать этот относительный путь из корня репозитория в записи marketplace, установить пакет из Plugins Directory, упомянуть плагин и попросить вызвать `show_brainrot` в локальном чате. Для начального вызова инструмента нужен модельный turn. Действия и таймер внутри виджета выполняются локально.

**UNVERIFIED в Codex Desktop** — установка пакета, рендер карточки, выбор файлов, политика Blob URL, декодирование, autoplay и жизненный цикл при смене чата. Smoke проверяет реальный обмен MCP через stdio. Unit-тест проверяет логику браузерного виджета с моками. Автозагрузка, кеш и релизная упаковка относятся к следующим этапам.
