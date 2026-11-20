<div align="center">

<img src="resources/logo.svg" width="112" height="112" alt="Логотип GoodGood">

# GoodGood

**Быстрый, современный и информативный диспетчер задач для Windows**

[한국어](README.md) · [English](README.en.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [日本語](README.ja.md) · [Français](README.fr.md) · **Русский**

[![Сайт и демо](https://img.shields.io/static/v1?label=%F0%9F%8C%90+%D0%A1%D0%B0%D0%B9%D1%82+%D0%B8+%D0%B4%D0%B5%D0%BC%D0%BE&message=goodgoodtask.com&color=2563eb&style=for-the-badge)](https://goodgoodtask.com/ru/)

На [официальном сайте](https://goodgoodtask.com/ru/) можно опробовать интерактивный интерфейс и обзор функций прямо в браузере, без установки приложения.

[![Последняя версия](https://img.shields.io/github/v/release/acc0mplish/GoodGood?include_prereleases=&sort=semver&label=%D0%9F%D0%BE%D1%81%D0%BB%D0%B5%D0%B4%D0%BD%D1%8F%D1%8F+%D0%B2%D0%B5%D1%80%D1%81%D0%B8%D1%8F&color=2f80ed)](https://github.com/acc0mplish/GoodGood/releases)
[![Загрузки](https://img.shields.io/github/downloads/acc0mplish/GoodGood/total?label=%D0%97%D0%B0%D0%B3%D1%80%D1%83%D0%B7%D0%BA%D0%B8&color=2ea44f)](https://github.com/acc0mplish/GoodGood/releases)
[![Платформа](https://img.shields.io/static/v1?label=%D0%9F%D0%BB%D0%B0%D1%82%D1%84%D0%BE%D1%80%D0%BC%D0%B0&message=Windows+10+%2F+11+x64&color=0078D4)](#system-requirements)
[![Лицензия](https://img.shields.io/static/v1?label=%D0%9B%D0%B8%D1%86%D0%B5%D0%BD%D0%B7%D0%B8%D1%8F&message=Apache-2.0&color=A42E2B&logo=apache&logoColor=white)](LICENSE)

[Возможности](#features) · [Загрузка](#download) · [Сборка из исходников](#build-from-source) · [Сочетания клавиш](#keyboard-shortcuts) · [Документация](#documentation)

</div>

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/screenshot-en-dark.png">
  <img src="docs/images/screenshot-en-light.png" alt="Страница процессов GoodGood: приложения отсортированы по имени, рядом показано использование ресурсов. Графики отображают последнюю минуту работы CPU, памяти, диска, сети и GPU.">
</picture>

<sub>На снимках показан английский интерфейс.</sub>

<br>

GoodGood обращается к нативным API Windows напрямую из Rust. Интерфейс построен на нативных компонентах GPUI Kit, а графики плавно движутся с частотой обновления экрана. Название — это дважды произнесённое «good», то есть хороший.

<a id="star-history"></a>

## ⭐ Звёзды на GitHub

Если GoodGood полезен в повседневной работе, звезда на GitHub поможет поддержать проект и познакомить с ним других пользователей.

<a href="https://www.star-history.com/#acc0mplish/GoodGood&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=acc0mplish/GoodGood&type=Date&theme=dark">
    <img src="https://api.star-history.com/svg?repos=acc0mplish/GoodGood&type=Date" alt="Изменение числа звёзд GoodGood на GitHub">
  </picture>
</a>

<a id="features"></a>

## ✨ Возможности

<table>
<tr>
<td width="50%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/features/processes-ru-dark.svg"><img src="docs/images/features/processes-ru-light.svg" width="390" alt="Страница «Процессы» переключается с вида по приложениям на дерево процессов, затем поиск code оставляет Visual Studio Code и его дочерние процессы"></picture><br><b>Процессы</b>: по приложениям, деревом или списком; поиск, сортировка и завершение всего дерева</td>
<td width="50%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/features/performance-ru-dark.svg"><img src="docs/images/features/performance-ru-light.svg" width="390" alt="Страница «Производительность» показывает загрузку, частоту, температуру и мощность CPU и графики по каждому P- и E-ядру"></picture><br><b>Производительность</b>: нагрузка по ядрам, частота, температура и мощность CPU, а также память, диски, сеть и GPU</td>
</tr>
<tr>
<td width="50%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/features/history-ru-dark.svg"><img src="docs/images/features/history-ru-light.svg" width="390" alt="На графиках за 7 дней на странице «История» выбираются два момента, и ниже появляются самые загруженные процессы для каждого"></picture><br><b>История</b>: щелчок по любому моменту на графиках за 7 дней показывает самые загруженные процессы в то время</td>
<td width="50%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/features/files-ru-dark.svg"><img src="docs/images/features/files-ru-light.svg" width="390" alt="После перетаскивания таблицы в окно диалог показывает, что её используют Excel и Проводник, и один из процессов завершается"></picture><br><b>Занятые файлы</b>: перетащите файл или папку в окно, чтобы увидеть использующие их процессы</td>
</tr>
<tr>
<td width="50%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/features/rules-ru-dark.svg"><img src="docs/images/features/rules-ru-light.svg" width="390" alt="Щелчок правой кнопкой по HandBrake задаёт низкий приоритет, затем включает режим эффективности"></picture><br><b>Контекстное меню</b>: задать приоритет, включить режим эффективности или добавить правило для каждого запуска</td>
<td width="50%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/features/ports-ru-dark.svg"><img src="docs/images/features/ports-ru-light.svg" width="390" alt="Поиск 8080 на странице «Подключения» находит процесс, прослушивающий порт, и подключённый к нему процесс, после чего подключение закрывается"></picture><br><b>Подключения и порты</b>: поиск подключений и их процессов по порту и закрытие подключений</td>
</tr>
</table>

<table>
<tr>
<td width="50%" valign="top"><b>Службы и автозагрузка</b><br>Запуск и остановка служб, изменение типа запуска, включение и отключение автозагрузки</td>
<td width="50%" valign="top"><b>Область уведомлений</b><br><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Esc</kbd> показывает и скрывает окно; в скрытом состоянии расход ресурсов минимален</td>
</tr>
<tr>
<td width="50%" valign="top"><b>Замена Диспетчера задач</b><br>Можно <a href="docs/architecture/task-manager.md">заменить Диспетчер задач Windows</a> и открывать GoodGood по <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Esc</kbd>; запуск новых задач и перезапуск Проводника</td>
<td width="50%" valign="top"><b>Внешний вид и языки</b><br>Фон Mica, цвет акцента и светлая или тёмная тема по Windows; 7 языков интерфейса</td>
</tr>
<tr>
<td width="50%" valign="top"><b>Обновления в приложении</b><br>Стабильный и бета-каналы, загрузка в фоне, список изменений в приложении</td>
<td width="50%" valign="top"><b>Права</b><br>Все процессы видны с обычными правами; привилегированная служба и запуск от администратора необязательны</td>
</tr>
</table>

<sub>Из-за ограничений README по объёму и форматам изображений демонстрации выше — упрощённые перерисовки интерфейса GoodGood с примерными процессами и данными. Они приведены только для справки; ориентиром служит сама программа.</sub>

<a id="download"></a>

## 📦 Загрузка

Последняя стабильная версия и контрольные суммы SHA-256 доступны на [официальной странице загрузки](https://goodgoodtask.com/ru/download/). Все версии находятся в [GitHub Releases](https://github.com/acc0mplish/GoodGood/releases).

| Файл | Описание |
|---|---|
| `GoodGood_<version>_x64-setup.exe` | **Установщик, рекомендуется.** Устанавливает программу для всех пользователей в `Program Files`. Установка и обновления требуют разрешения администратора. Поддерживает обновления из приложения. |
| `GoodGood_<version>_x64.exe` | **Портативная версия.** Отдельный исполняемый файл с общими настройками и историей для портативной и установленной версий. Автоматическое обновление не поддерживается. |
| `SHA256SUMS.txt` | Контрольные суммы SHA-256 файлов выпуска. |

[Политика подписи кода](#code-signing-policy) · [Политика конфиденциальности на английском](PRIVACY.md#english)

<a id="system-requirements"></a>

## 💻 Системные требования

- **Операционная система**: Windows 10 22H2, сборка 19045, или новее, включая Windows 11; только x64.
- **Графика**: графическое устройство и драйвер с поддержкой DirectX 11.

Проверенные версии Windows, различия функций и требования к правам описаны в [документации по совместимости](docs/guide/hardware-data.md#시스템-호환-범위).

<a id="build-from-source"></a>

## 🔧 Сборка из исходников

Необходимы:

- Набор инструментов Rust `stable-x86_64-pc-windows-msvc`, версия 1.100.0 или новее.
- Node.js 26.x начиная с 26.13.1 либо 24.x LTS начиная с 24.22.3, а также bun 1.4.4.
- Visual Studio Build Tools с рабочей нагрузкой «Разработка классических приложений на C++».

Выполнить в PowerShell из корня репозитория:

```powershell
.\start.bat           # Разработка: изменения Rust и ресурсов вызывают пересборку и перезапуск; при ошибке текущий экземпляр продолжает работать
.\start.bat build     # Сборка для распространения: создаёт target\release\goodgood.exe
```

Проверки кода, создание установщика и очистка кэшей описаны в [руководстве разработчика](docs/development/README.md).

<a id="keyboard-shortcuts"></a>

## 🔑 Сочетания клавиш

| Действие | Клавиши |
|---|---|
| Переключить страницу | <kbd>Ctrl</kbd>+<kbd>1</kbd> … <kbd>Ctrl</kbd>+<kbd>9</kbd> |
| Найти процесс | <kbd>Ctrl</kbd>+<kbd>F</kbd> |
| Временно приостановить обновление | Удерживать <kbd>Ctrl</kbd>, отпустить для продолжения; страницы «Процессы» и «Производительность» |
| Открыть подробности | <kbd>Enter</kbd> |
| Снять задачу | <kbd>Alt</kbd>+<kbd>E</kbd> или <kbd>Delete</kbd>; <kbd>Shift</kbd>+<kbd>Delete</kbd> пропускает подтверждение |
| Показать или скрыть окно глобально | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Esc</kbd> |

Полный список доступен в разделе **Параметры → Сочетания клавиш → Показать сочетания клавиш**. Дополнительные сведения есть в [руководстве пользователя](docs/guide/README.md).

<a id="documentation"></a>

## 📚 Документация

Подробная документация написана на корейском языке. [Онлайн-документация](https://goodgoodtask.com/docs/) содержит материалы для стабильной версии и версии в разработке.

| Документ | Содержание |
|---|---|
| [Руководство пользователя](docs/guide/README.md) | Интерфейс и действия, область уведомлений и сочетания клавиш, параметры, источники и ограничения данных оборудования |
| [Обзор возможностей](docs/guide/features.md) | Процессы и управление задачами, производительность и оборудование, история, службы и автозагрузка, подключения и порты, используемые файлы, область уведомлений и мониторы, разметка, права |
| [Руководство разработчика](docs/development/README.md) | Среда и команды, сборка и кэши, базовые показатели и измерение производительности |
| [Архитектура](docs/architecture/README.md) | Слои системы, потоки данных, технологии и ответственность модулей |
| [Дизайн](docs/design/README.md) | Принципы дизайна, анимации графиков, внешний вид и материалы окон |
| [Известные проблемы](docs/known-issues.md) | Ограничения текущей версии |
| [История изменений](changelog/ru-RU.md) | Подробные изменения каждого выпуска |

<a id="contributing"></a>

## 🤝 Участие в разработке

Сообщения о проблемах и запросы на включение изменений приветствуются. Об уязвимостях следует сообщать приватно через страницу рекомендаций по безопасности.

<a id="roadmap"></a>

## 🧭 Планы развития

Выполненные этапы и полный план перечислены в [дорожной карте](docs/roadmap.md). Текущие и запланированные направления:

- [ ] **Больше аппаратных датчиков**: расширение поддержки потребительского оборудования через официальный драйвер PawnIO; см. [поддерживаемое оборудование](docs/guide/hardware-data.md).
- [ ] **Расширенные сочетания клавиш**: различать левые и правые модификаторы и поддерживать комбинации только из модификаторов либо из двух обычных клавиш.

<a id="code-signing-policy"></a>

## 🔐 Политика подписи кода

Бесплатную услугу подписи кода предоставляет [SignPath.io](https://about.signpath.io/), сертификат — [SignPath Foundation](https://signpath.org/).

Free code signing provided by [SignPath.io](https://about.signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

Тестовая подпись уже интегрирована. Официальные выпуски пока распространяются без подписей Windows Authenticode. После включения подписи для официальных выпусков она будет охватывать приложение GoodGood, вспомогательные программы Диспетчера задач, деинсталлятор и установщик, собранные GitHub Actions из исходников этого репозитория. Включённые сторонние программы сохранят исходные подписи.

- **Политика конфиденциальности**: [English](PRIVACY.md#english) · [한국어](PRIVACY.md#한국어). Описывает включённую по умолчанию проверку обновлений, резервные прокси, загрузку PawnIO по необходимости, добровольную обратную связь и обработку данных третьими лицами.

Обновления из приложения используют отдельный ключ выпуска Minisign для проверки установщиков и номеров версий. Windows Authenticode определяет подписанта исполняемого файла.

<a id="acknowledgements"></a>

## 🙏 Благодарности

GoodGood использует следующие проекты с открытым исходным кодом:

| Проект | Назначение |
|---|---|
| [GPUI Kit](https://gpui-kit.com/) | Нативные компоненты интерфейса, окна, таблицы и графики |
| [windows-rs](https://github.com/microsoft/windows-rs) | Привязки Rust к нативным API Windows |
| [Biome](https://biomejs.dev/), [NSIS](https://nsis.sourceforge.io/) | Проверки при разработке и создание пакетов Windows |
| [serde](https://serde.rs/), [reqwest](https://github.com/seanmonstar/reqwest) и другие crates Rust | Сериализация, сетевые запросы и базовые функции |
| [PawnIO](https://pawnio.eu/), [PawnIO.Modules](https://github.com/namazso/PawnIO.Modules) | Подписанный драйвер и модули сбора данных для необязательных датчиков ядра |
| [ZenStates-Core](https://github.com/irusanov/ZenStates-Core), [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor), [GNR-SMU](https://github.com/Kyworn/gnr-smu) | Справочные структуры регистров CPU, включая таблицы AMD SMU |
| [Intel IGCL](https://github.com/intel/drivers.gpu.control-library), [AMD ADL](https://github.com/GPUOpen-LibrariesAndSDKs/display-library) | Интерфейсы телеметрии GPU |

Полный перечень сторонних компонентов и их лицензий приведён в [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).

<!-- supporters:start · node scripts/supporters.mjs -->
<!-- supporters:end -->

<a id="license"></a>

## 📄 Лицензия

GoodGood — свободное программное обеспечение под лицензией [Apache License 2.0](LICENSE).

<div align="center">
<br>
<sub>GoodGood · Диспетчер задач для Windows · © 2026 GoodGood contributors</sub>
</div>
