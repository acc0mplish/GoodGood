<div align="center">

<img src="resources/logo.svg" width="112" height="112" alt="GoodGood-Logo">

# GoodGood

**Ein schneller, moderner und informativer Task-Manager für Windows**

[한국어](README.md) · [English](README.en.md) · [Español](README.es.md) · **Deutsch** · [日本語](README.ja.md) · [Français](README.fr.md) · [Русский](README.ru.md)

[![Website und Live-Demo](https://img.shields.io/static/v1?label=%F0%9F%8C%90+Website+und+Live-Demo&message=goodgoodtask.com&color=2563eb&style=for-the-badge)](https://goodgoodtask.com/de/)

Die interaktive Oberfläche und die Funktionsübersicht können auf der [offiziellen Website](https://goodgoodtask.com/de/) direkt im Browser ausprobiert werden, ohne Installation.

[![Aktuelle Version](https://img.shields.io/github/v/release/acc0mplish/GoodGood?include_prereleases=&sort=semver&label=Aktuelle+Version&color=2f80ed)](https://github.com/acc0mplish/GoodGood/releases)
[![Downloads](https://img.shields.io/github/downloads/acc0mplish/GoodGood/total?label=Downloads&color=2ea44f)](https://github.com/acc0mplish/GoodGood/releases)
[![Plattform](https://img.shields.io/static/v1?label=Plattform&message=Windows+10+%2F+11+x64&color=0078D4)](#system-requirements)
[![Lizenz](https://img.shields.io/static/v1?label=Lizenz&message=Apache-2.0&color=A42E2B&logo=apache&logoColor=white)](LICENSE)

[Funktionen](#features) · [Download](#download) · [Aus dem Quellcode bauen](#build-from-source) · [Tastenkombinationen](#keyboard-shortcuts) · [Dokumentation](#documentation)

</div>

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/screenshot-en-dark.png">
  <img src="docs/images/screenshot-en-light.png" alt="Die Prozessseite von GoodGood mit alphabetisch sortierten Apps und deren Ressourcenverbrauch. Die Diagramme zeigen die letzte Minute der CPU-, Speicher-, Datenträger-, Netzwerk- und GPU-Auslastung.">
</picture>

<sub>Vorschau mit englischer Benutzeroberfläche.</sub>

<br>

GoodGood fragt die nativen Windows-APIs direkt über Rust ab. Die Oberfläche verwendet native Komponenten von GPUI Kit; die Diagramme bewegen sich flüssig mit der Bildwiederholrate des Displays. Namensgeber ist GoodGood Panoptes, der hundertäugige Riese aus der griechischen Mythologie.

<a id="star-history"></a>

## ⭐ GitHub-Sterne

Wenn GoodGood im Alltag hilfreich ist, unterstützt ein Stern auf GitHub das Projekt und macht es für weitere Interessierte sichtbar.

<a href="https://www.star-history.com/#acc0mplish/GoodGood&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=acc0mplish/GoodGood&type=Date&theme=dark">
    <img src="https://api.star-history.com/svg?repos=acc0mplish/GoodGood&type=Date" alt="Entwicklung der GitHub-Sterne von GoodGood">
  </picture>
</a>

<a id="features"></a>

## ✨ Funktionen

<table>
<tr>
<td width="50%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/features/processes-de-dark.svg"><img src="docs/images/features/processes-de-light.svg" width="390" alt="Die Seite Prozesse wechselt von der App-Ansicht zur Prozessstruktur; eine Suche nach code lässt Visual Studio Code und seine untergeordneten Prozesse übrig"></picture><br><b>Prozesse</b>: Ansicht nach App, als Prozessstruktur oder Liste; suchen, sortieren und ganze Strukturen beenden</td>
<td width="50%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/features/performance-de-dark.svg"><img src="docs/images/features/performance-de-light.svg" width="390" alt="Die Seite Leistung zeigt Auslastung, Geschwindigkeit, Temperatur und Leistung der CPU mit einem Diagramm je P- und E-Kern"></picture><br><b>Leistung</b>: CPU-Last je Kern, Takt, Temperatur und Leistungsaufnahme sowie Arbeitsspeicher, Datenträger, Netzwerk und GPU</td>
</tr>
<tr>
<td width="50%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/features/history-de-dark.svg"><img src="docs/images/features/history-de-light.svg" width="390" alt="Auf der Seite Verlauf werden zwei Zeitpunkte in den 7-Tage-Diagrammen angeklickt; darunter erscheinen jeweils die aktivsten Prozesse"></picture><br><b>Verlauf</b>: ein Klick auf einen Zeitpunkt der 7-Tage-Diagramme zeigt die damals aktivsten Prozesse</td>
<td width="50%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/features/files-de-dark.svg"><img src="docs/images/features/files-de-light.svg" width="390" alt="Nach dem Ziehen einer Tabelle auf das Fenster listet ein Dialog Excel und den Windows-Explorer als verwendende Prozesse auf; einer davon wird beendet"></picture><br><b>Dateisperren</b>: Datei oder Ordner auf das Fenster ziehen, um die verwendenden Prozesse aufzulisten</td>
</tr>
<tr>
<td width="50%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/features/rules-de-dark.svg"><img src="docs/images/features/rules-de-light.svg" width="390" alt="Per Rechtsklick auf HandBrake wird die Priorität auf Niedrig gesetzt und danach der Effizienzmodus aktiviert"></picture><br><b>Kontextmenü</b>: Priorität festlegen, Effizienzmodus aktivieren oder eine Regel für jeden Start hinzufügen</td>
<td width="50%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/features/ports-de-dark.svg"><img src="docs/images/features/ports-de-light.svg" width="390" alt="Eine Suche nach 8080 auf der Seite Verbindungen findet den Prozess, der den Port abhört, und den damit verbundenen Prozess; die Verbindung wird geschlossen"></picture><br><b>Verbindungen und Ports</b>: Verbindungen und ihre Prozesse nach Port finden und schließen</td>
</tr>
</table>

<table>
<tr>
<td width="50%" valign="top"><b>Dienste und Autostart-Apps</b><br>Dienste starten und beenden, den Starttyp ändern, Autostart-Apps aktivieren oder deaktivieren</td>
<td width="50%" valign="top"><b>Infobereich</b><br><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Esc</kbd> blendet das Fenster jederzeit ein oder aus; ausgeblendet mit geringem Ressourcenbedarf</td>
</tr>
<tr>
<td width="50%" valign="top"><b>Task-Manager ersetzen</b><br>Kann den <a href="docs/architecture/task-manager.md">Windows-Task-Manager ersetzen</a> und auf <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Esc</kbd> öffnen; führt neue Aufgaben aus und startet den Windows-Explorer neu</td>
<td width="50%" valign="top"><b>Oberfläche und Sprachen</b><br>Mica-Hintergrund, Akzentfarbe sowie helles oder dunkles Design folgen Windows; 8 Oberflächensprachen</td>
</tr>
<tr>
<td width="50%" valign="top"><b>Updates in der Anwendung</b><br>Stabile und Beta-Versionen, Download im Hintergrund, Änderungen in der Anwendung einsehbar</td>
<td width="50%" valign="top"><b>Berechtigungen</b><br>Alle Prozesse sind mit Standardrechten sichtbar; privilegierter Dienst und Administratorstart sind optional</td>
</tr>
</table>

<sub>Aufgrund der Platz- und Bildformatgrenzen einer README sind die obigen Demos vereinfachte Nachzeichnungen der GoodGood-Oberfläche mit Beispielprozessen und -daten. Sie dienen nur zur Orientierung; maßgeblich ist die Anwendung selbst.</sub>

<a id="download"></a>

## 📦 Download

Die aktuelle stabile Version und SHA-256-Prüfsummen stehen auf der [offiziellen Downloadseite](https://goodgoodtask.com/de/download/) bereit. Alle Versionen sind unter [GitHub Releases](https://github.com/acc0mplish/GoodGood/releases) verfügbar.

| Datei | Beschreibung |
|---|---|
| `GoodGood_<version>_x64-setup.exe` | **Installationsprogramm, empfohlen.** Installiert für alle Benutzer unter `Program Files`. Installation und Updates erfordern Administratorrechte. Unterstützt Updates innerhalb der Anwendung. |
| `GoodGood_<version>_x64.exe` | **Portable Version.** Direkt ausführbare Einzeldatei, die Einstellungen und Verlauf mit der installierten Version teilt. Automatische Updates werden nicht unterstützt. |
| `SHA256SUMS.txt` | SHA-256-Prüfsummen der veröffentlichten Dateien. |

[Richtlinie zur Codesignierung](#code-signing-policy) · [Datenschutzrichtlinie auf Englisch](PRIVACY.md#english)

<a id="system-requirements"></a>

## 💻 Systemanforderungen

- **Betriebssystem**: Windows 10 22H2, Build 19045, oder neuer, einschließlich Windows 11; nur x64.
- **Grafik**: Grafikgerät und Treiber mit Unterstützung für DirectX 11.

Geprüfte Windows-Versionen, Funktionsunterschiede und erforderliche Berechtigungen beschreibt die [Kompatibilitätsübersicht](docs/guide/hardware-data.md#시스템-호환-범위).

<a id="build-from-source"></a>

## 🔧 Aus dem Quellcode bauen

Voraussetzungen:

- Rust-Toolchain `stable-x86_64-pc-windows-msvc`, Version 1.100.0 oder neuer.
- Node.js 26.x ab 26.13.1 oder 24.x LTS ab 24.22.3 sowie bun 1.4.4.
- Visual Studio Build Tools mit der Workload „Desktopentwicklung mit C++“.

Im Stammverzeichnis des Repositorys mit PowerShell ausführen:

```powershell
.\start.bat           # Entwicklung: Rust- und Ressourcenänderungen lösen Neubau und Neustart aus; bei Fehlern läuft die bisherige Instanz weiter
.\start.bat build     # Release-Build: erzeugt target\release\goodgood.exe
```

Codeprüfungen, das Erstellen des Installationsprogramms und die Cache-Bereinigung erläutert die [Entwicklungsanleitung](docs/development/README.md).

<a id="keyboard-shortcuts"></a>

## 🔑 Tastenkombinationen

| Aktion | Tasten |
|---|---|
| Seite wechseln | <kbd>Ctrl</kbd>+<kbd>1</kbd> … <kbd>Ctrl</kbd>+<kbd>8</kbd> |
| Prozesse suchen | <kbd>Ctrl</kbd>+<kbd>F</kbd> |
| Aktualisierung vorübergehend anhalten | <kbd>Ctrl</kbd> gedrückt halten; zum Fortsetzen loslassen, auf den Seiten Prozesse und Leistung |
| Details öffnen | <kbd>Enter</kbd> |
| Task beenden | <kbd>Alt</kbd>+<kbd>E</kbd> oder <kbd>Delete</kbd>; <kbd>Shift</kbd>+<kbd>Delete</kbd> überspringt die Bestätigung |
| Fenster global ein- oder ausblenden | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Esc</kbd> |

Die vollständige Liste steht unter **Einstellungen → Tastenkombinationen → Tastenkombinationen anzeigen**. Weitere Bedienhinweise enthält die [Benutzeranleitung](docs/guide/README.md).

<a id="documentation"></a>

## 📚 Dokumentation

Die ausführliche Dokumentation ist auf Koreanisch verfasst. Die [Online-Dokumentation](https://goodgoodtask.com/docs/) bietet eine stabile und eine Entwicklungsausgabe.

| Dokument | Inhalt |
|---|---|
| [Benutzeranleitung](docs/guide/README.md) | Oberfläche und Bedienung, Infobereich und Tastenkombinationen, Einstellungen, Hardwaredaten und deren Grenzen |
| [Entwicklungsanleitung](docs/development/README.md) | Umgebung und Befehle, Builds und Caches, Leistungsreferenzen und Messverfahren |
| [Architektur](docs/architecture/README.md) | Systemschichten, Datenfluss, Technologien und Modulaufgaben |
| [Design](docs/design/README.md) | Gestaltungsprinzipien, Diagrammanimationen, Fenster und Materialien |
| [Bekannte Probleme](docs/known-issues.md) | Bekannte Einschränkungen der aktuellen Version |
| [Änderungsprotokoll](changelog/de-DE.md) | Detaillierte Änderungen jeder Version |

<a id="contributing"></a>

## 🤝 Mitwirken

Fehlermeldungen und Pull Requests sind willkommen. Sicherheitslücken werden vertraulich über die Seite für Sicherheitshinweise gemeldet.

<a id="roadmap"></a>

## 🧭 Roadmap

Abgeschlossene Meilensteine und die vollständige Planung stehen in der [Roadmap](docs/roadmap.md). Zu den laufenden und geplanten Arbeiten gehören:

- [ ] **Weitere Hardwaresensoren**: Unterstützung zusätzlicher Consumer-Hardware über den offiziellen PawnIO-Treiber; siehe [Hardwareabdeckung](docs/guide/hardware-data.md).
- [ ] **Erweiterte Tastenkombinationen**: linke und rechte Modifikatortasten unterscheiden sowie Kombinationen nur aus Modifikatoren oder aus zwei gewöhnlichen Tasten unterstützen.

<a id="code-signing-policy"></a>

## 🔐 Richtlinie zur Codesignierung

Die kostenlose Codesignierung wird von [SignPath.io](https://about.signpath.io/) bereitgestellt, das Zertifikat von der [SignPath Foundation](https://signpath.org/).

Free code signing provided by [SignPath.io](https://about.signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

Testsignierung ist integriert. Offizielle Veröffentlichungen werden derzeit ohne Windows-Authenticode-Signaturen ausgeliefert. Sobald die Produktionssignierung aktiviert ist, umfasst sie die GoodGood-Anwendung, Task-Manager-Hilfsprogramme sowie Deinstallations- und Installationsprogramme, die GitHub Actions aus dem Quellcode dieses Repositorys erstellt. Mitgelieferte Drittprogramme behalten ihre ursprünglichen Signaturen.

- **Datenschutzrichtlinie**: [English](PRIVACY.md#english) · [한국어](PRIVACY.md#한국어). Beschreibt standardmäßig aktivierte Updateprüfungen, Proxy-Ausweichrouten, PawnIO-Downloads bei Bedarf, freiwillige Rückmeldungen und die Datenverarbeitung durch Dritte.

Updates innerhalb der Anwendung verwenden einen separaten Minisign-Veröffentlichungsschlüssel zur Prüfung von Installationspaketen und Versionsnummern. Windows Authenticode identifiziert den Unterzeichner einer ausführbaren Datei.

<a id="acknowledgements"></a>

## 🙏 Danksagungen

GoodGood baut auf den folgenden Open-Source-Projekten auf:

| Projekt | Verwendung |
|---|---|
| [GPUI Kit](https://gpui-kit.com/) | Native Desktopkomponenten, Fenster, Tabellen und Diagramme |
| [windows-rs](https://github.com/microsoft/windows-rs) | Rust-Anbindungen an native Windows-APIs |
| [Biome](https://biomejs.dev/), [NSIS](https://nsis.sourceforge.io/) | Entwicklungsprüfungen und Windows-Paketierung |
| [serde](https://serde.rs/), [reqwest](https://github.com/seanmonstar/reqwest) und weitere Rust-Crates | Serialisierung, Netzwerkanfragen und weitere Grundlagen |
| [PawnIO](https://pawnio.eu/), [PawnIO.Modules](https://github.com/namazso/PawnIO.Modules) | Signierter Treiber und Erfassungsmodule für die optionalen Kernelsensoren |
| [ZenStates-Core](https://github.com/irusanov/ZenStates-Core), [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor), [GNR-SMU](https://github.com/Kyworn/gnr-smu) | Referenzen für CPU-Registerlayouts, etwa AMD-SMU-Tabellen |
| [Intel IGCL](https://github.com/intel/drivers.gpu.control-library), [AMD ADL](https://github.com/GPUOpen-LibrariesAndSDKs/display-library) | Schnittstellen für GPU-Telemetrie |

Alle Drittkomponenten und ihre Lizenzhinweise sind in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt) aufgeführt.

<!-- supporters:start · node scripts/supporters.mjs -->
<!-- supporters:end -->

<a id="license"></a>

## 📄 Lizenz

GoodGood ist freie Software unter der [Apache License 2.0](LICENSE).

<div align="center">
<br>
<sub>GoodGood · Task-Manager für Windows · © 2026 GoodGood contributors</sub>
</div>
