// Changelog entries as scripts/release.mjs reads them (scripts/lib/release-notes.ts):
// entries in the format release.mjs writes and in hand-written ones.

import assert from "node:assert/strict";
import { test } from "node:test";
import { changelogEntries, outline, strayHeadings, untranslatedLines, withTranslation } from "../lib/release-notes.ts";

test("changelog entries split at their headings", () => {
  const changelog = [
    "# 변경 기록",
    "",
    "Intro with a [link](https://example.org).",
    "",
    "## [0.2.0](https://github.com/o/r/compare/v0.1.0...v0.2.0) - 2026-10-20",
    "",
    "### 수정",
    "",
    "- Fixed",
    "",
    "## 0.1.0 - 2026-10-16",
    "",
    "First.",
    "",
  ].join("\r\n");
  const entries = changelogEntries(changelog);
  assert.deepEqual(
    entries.map((e) => [e.version, e.date]),
    [
      ["0.2.0", "2026-10-20"],
      ["0.1.0", "2026-10-16"],
    ],
  );
  assert.equal(entries[0].notes, "### 수정\n\n- Fixed");
  assert.equal(entries[1].notes, "First.");
  assert.deepEqual(strayHeadings(changelog), []);
});

// scripts/release.mjs reads CHANGELOG.md with these functions and refuses stray
// headings before the tag is pushed.
test("a reworded entry heading is no entry and is reported", () => {
  const link = "## [0.2.0](https://github.com/o/r/compare/v0.1.0...v0.2.0)";
  const changelog = (heading: string) =>
    [
      "# 변경 기록",
      "",
      heading,
      "",
      "### 수정",
      "",
      "- Fixed",
      "",
      "## 0.1.0 - 2026-10-16",
      "",
      "First.",
    ].join("\n");
  const versions = (heading: string) => changelogEntries(changelog(heading)).map((e) => e.version);
  // Spelled out: Biome writes escapes as the characters themselves.
  const nbsp = String.fromCodePoint(0xa0);
  const ideographicSpace = String.fromCodePoint(0x3000);

  for (const heading of [`${link} - 2026-10-20`, `${link} - 2026-10-20 \t`, "## 0.2.0 - 2026-10-20"]) {
    assert.deepEqual(versions(heading), ["0.2.0", "0.1.0"], heading);
    assert.deepEqual(strayHeadings(changelog(heading)), [], heading);
  }
  for (const heading of [
    `${link} - 2026-10-20（미리보기）`,
    `${link} - 2026/10/20`,
    `${link} – 2026-10-20`,
    `${link} - 2026-10-20${nbsp}`,
    `${link} - 2026-10-20${ideographicSpace}`,
    ` ${link} - 2026-10-20`,
  ]) {
    assert.deepEqual(versions(heading), ["0.1.0"], heading);
    assert.deepEqual(strayHeadings(changelog(heading)), [{ line: 3, text: heading }], heading);
  }
  // A heading of another version: release.mjs finds no entry for 0.2.0.
  assert.deepEqual(versions("## [v0.2.0](link) - 2026-10-20"), ["v0.2.0", "0.1.0"]);
});

test("a second-level heading inside an entry is reported", () => {
  const changelog = "## 0.2.0 - 2026-10-20\r\n\r\n## 하이라이트\r\n\r\n- One\r\n\r\n### 수정\r\n\r\n##\r\n";
  // Part of the entry, but no different from a reworded entry heading, so
  // release.mjs asks for `###`.
  assert.equal(changelogEntries(changelog)[0].notes, "## 하이라이트\n\n- One\n\n### 수정\n\n##");
  assert.deepEqual(strayHeadings(changelog), [
    { line: 3, text: "## 하이라이트" },
    { line: 9, text: "##" },
  ]);
  assert.deepEqual(strayHeadings("# 변경 기록\n### 수정\n##하이라이트\n    ## code"), []);
});

test("an entry takes the translation of the same version", () => {
  const ko = changelogEntries(
    [
      "# 변경 기록",
      "",
      "## [1.1.0](x) - 2026-10-21",
      "",
      "### 수정",
      "",
      "- 수정 사항 하나",
      "",
      "## 1.0.0 - 2026-10-01",
      "",
      "첫 버전입니다.",
    ].join("\n"),
  );
  const en = changelogEntries(
    ["# Changelog", "", "## [1.1.0](x) - 2026-10-21", "", "### Fixes", "", "- A fix"].join("\n"),
  );
  const english = "### Fixes\n\n- A fix";
  const [latest, first] = withTranslation(ko, "en-US", en);
  assert.deepEqual(latest.translations, { "en-US": english });
  assert.equal(first.translations, undefined);
});

test("a translation keeps the sections and items of its source", () => {
  const source = "머리말입니다.\n\n### 새 기능\n\n- **첫째**: 하나\n- 둘째\n  이어지는 줄\n\n### 수정\n\n* 셋째";
  const merged = "Intro.\n\n### Features\n\n- **A**: one, and B\n\n### Fixes\n\n* C";
  assert.deepEqual(outline(source), [0, 2, 1]);
  assert.deepEqual(outline(merged), [0, 1, 1]);
  assert.deepEqual(outline("- 소제목 없는 항목"), [1]);
});

test("untranslated lines are what is left of the Korean source", () => {
  const draft = "### Fixes\n\n- 프로세스 목록 표시 문제를 수정했습니다.";
  assert.deepEqual(untranslatedLines("en-US", draft), ["- 프로세스 목록 표시 문제를 수정했습니다."]);
  assert.deepEqual(untranslatedLines("de-DE", "- Behoben（Ｘ）"), ["- Behoben（Ｘ）"]);
  // Korean anchors of the documentation pages the entries link to.
  assert.deepEqual(untranslatedLines("fr-FR", "- [Guide](docs/guide/README.md#개요)"), []);
  // Han characters are the language itself in Japanese, Korean is not.
  assert.deepEqual(untranslatedLines("ja-JP", "- プロセス一覧の表示を修正しました。"), []);
  assert.deepEqual(untranslatedLines("ja-JP", draft), ["- 프로세스 목록 표시 문제를 수정했습니다."]);
  assert.deepEqual(untranslatedLines("en-US", "- 修正處理程序清單的顯示問題。"), ["- 修正處理程序清單的顯示問題。"]);
});
