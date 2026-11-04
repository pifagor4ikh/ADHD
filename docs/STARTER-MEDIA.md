# Разрешённые ролики для первой настройки (#7)

Проверено 2026-11-04. [Стартовый каталог](starter-clips.json) отделён от экспериментальной satisfying-подборки: в нём только три оригинала pressure washing с завершённой проверкой лицензий Commons. Новые видео в Git не добавлены. Каталог принимает существующий загрузчик:

```powershell
node scripts/download-clips.mjs docs/starter-clips.json
```

Нужны FFprobe и FFmpeg в PATH для новой загрузки. Проверенный кеш используется без сети. Для локального выбора уже имеющихся файлов см. `repositoryFile` в каталоге и [атрибуцию рядом с файлами](../media/starter/README.md). При распространении копий сохранять этот каталог и атрибуцию вместе с медиа.

| Категория | Решение |
| --- | --- |
| Pressure washing | Три одобренных файла ниже; это выбранная альтернатива из требования «carpet cleaning / pressure washing». |
| Carpet cleaning | Проверенного файла нет; импорт разрешённой локальной записи. Мойку тротуара не обозначать мойкой ковра. |
| Soap cutting | Проверенного файла нет; импорт собственной/разрешённой записи. Песок и глина не заменяют мыло. |
| Subway Surfers | Проверенного файла с правом доставки нет; импорт записи, на которую у пользователя есть необходимые права. |
| Minecraft parkour (опционально) | Проверенного файла нет; импорт своей разрешённой записи с учётом карты, музыки и других сторонних материалов. |

Повторный поиск существующим `find-clips.mjs` по `subway surfers`, `soap cutting`, `carpet cleaning`, `minecraft parkour` дал 0/3 для каждой категории. Это результат ограниченного поиска Commons на указанную дату, а не утверждение об отсутствии таких видео в интернете. Каталоги результатов сохранены в `.TMP/issue-7/search`, сводка — `.TMP/issue-7/search-results.json`.

## Происхождение и права каждого файла

| Файл | Автор и исходный материал | Лицензия и проверка Commons |
| --- | --- | --- |
| `pressure-washing-stone.webm` | Pondguru, монтаж Veikk0.ma; [страница файла](https://commons.wikimedia.org/wiki/File:K%C3%A4rcher_K3.550_pressure_washing_using_a_Dirtblaster_wand_attachment.webm), [исходная публикация](https://www.youtube.com/watch?v=UQ2Oe1rCj1I) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); Satdeep Gill, 2023-08-22. |
| `pressure-washing-driveway.webm` | Decorative Concrete Kingdom; [страница файла](https://commons.wikimedia.org/wiki/File:Pressure_washing_concrete_driveway.webm), [исходная публикация](https://www.flickr.com/photos/decorativeconcrete/6308121144/) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/); Explicit, 2017-11-24. |
| `pressure-washer-slow-motion.webm` | andycivil, монтаж Veikk0.ma; [страница файла](https://commons.wikimedia.org/wiki/File:Pressure_washer_rotary_attachment_in_slow_motion.webm), [исходная публикация](https://www.youtube.com/watch?v=2K4shURxA28) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); Satdeep Gill, 2023-08-22. |

CC BY разрешает копирование, распространение и переработку при сохранении атрибуции, ссылки на лицензию и указании изменений. Проект использует неизменённые оригиналы Commons; монтаж авторов загрузки указан отдельно. Точные SHA-256, SHA-1, размер, длительность, атрибуция, URL и дата проверки находятся в каталоге. MIT проекта не заменяет лицензии медиа.

Способ доставки — прямой HTTPS original с `upload.wikimedia.org`, полученный со страницы Commons/API, без cookies, аккаунта и перенаправлений. Основание: [Commons разрешает скачивание и повторное использование при соблюдении лицензии файла](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia). Автоматические запросы должны соблюдать [User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy); поиск уже передаёт имя проекта и ссылку на репозиторий. Права на файлы не означают разрешение скачивать оригинальные публикации через YouTube/TikTok или сторонние сервисы.

[Условия SYBO](https://sybogames.com/terms-of-service/) не приняты как разрешение поставлять чужие игровые записи. Для собственной записи Minecraft учитывать [официальные usage guidelines](https://www.minecraft.net/en-us/usage-guidelines). Ссылки для просмотра из прежнего исследования не входят в одобренный каталог. Ролик с песком с незавершённой проверкой лицензии также исключён из этого каталога.

## Граница задачи

Для недоступных категорий предусмотрен существующий выбор локальных файлов в виджете: выбрать минимум три разрешённых MP4/WebM, затем использовать Next/Off. Файлы остаются локальными. Работоспособность виджета именно в desktop-хостах остаётся **UNVERIFIED**.

Задача #7 закрывает отбор источников и решение об импорте при отсутствии разрешённой автозагрузки. Автоматический запуск первой загрузки из плагина, офлайн-восстановление каталога и UX импорта относятся к #8. Полное автоматическое покрытие трёх целевых категорий не достигнуто; Phase 3 целиком остаётся открытой.

## Выполненные проверки

2026-11-04, Windows x64, Node 24.22.1:

- Все три URL вернули HTTP 200, `video/webm` и точный размер из каталога. SHA-1/SHA-256 локальных оригиналов совпали с каталогом.
- FFprobe и полное декодирование видеопотока FFmpeg с `-xerror` прошли для всех трёх файлов: stone — 109.848 с, VP9 1280×720 с аудио; driveway — 23.023 с, VP8 320×240 с аудио; slow motion — 91.726 с, VP9 1280×720 без аудио. Видео остаются оригиналами; mute задаёт проигрыватель.
- Просмотрены кадры на третьей секунде каждого файла: мойка камня, мойка бетона, работа роторной насадки. Это выборочная проверка содержания, не полный визуальный просмотр.
- `downloadAsset` действительно скачал driveway в пустой кеш, проверил SHA-256/контейнер/декодирование и затем повторно вернул файл с запрещённым сетью тестовым транспортом. CLI `node scripts/download-clips.mjs docs/starter-clips.json` успешно использовал локальный кеш всех трёх оригиналов.
- `node scripts/tasks.mjs typecheck`, `node scripts/tasks.mjs build`, `node --test tests/*.test.mjs` (15 тестов), `python -B scripts/sync_skills.py --check`, `python -B -m unittest discover -s tests -v` (4 теста) прошли. Тест каталога проверяет реальные файлы из Git и запускается в `Windows checks` вместе с тестом загрузчика.

Для локальной проверки использована [Gyan FFmpeg 9.0.2 essentials](https://github.com/GyanD/codexffmpeg/releases/tag/9.0.2), ZIP `ffmpeg-9.0.2-essentials_build.zip`, SHA-256 `60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba` (сверен перед распаковкой). [Сборка GPLv3, исходники указаны поставщиком](https://www.gyan.dev/ffmpeg/builds/). Архив, бинарники и лицензия остались в `.TMP/issue-7`; в продукт и Git не включены. JSON-отчёт — `.TMP/issue-7/validation.json`, снимки страниц лицензий — `rights-*.html`, кадры — `frame-*.png`. Эти проверки не подтверждают работу desktop-хостов или готовность установщика.
