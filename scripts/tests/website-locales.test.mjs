import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { languages, localized, languageOfPath, notesLanguage, offeredLanguage, offers, preferredLanguage } from "../../website/src/lib/languages.ts";
import { translateValue } from "../../website/src/lib/translate.ts";
import { labelTables, translateHtml } from "../../website/scripts/translate-html.mjs";
import { prepareReplicaCatalogs } from "../../website/scripts/locales.mjs";
import { textErrors } from "../lib/locale-validation.mjs";

test("website routes round-trip and missing release notes fall back to a source language", () => {
  // The source language serves the root path and is the only one with notes of its own.
  const source = languages[0].id;
  assert.equal(notesLanguage(source), source);
  for (const { id, name } of languages) {
    assert.equal(languageOfPath(localized(id, "/download/")), id);
    assert.ok(name.length > 2 && !/^[A-Z]{2,3}$/.test(name));
    assert.equal(notesLanguage(id), id === source ? source : "en");
  }
  assert.equal(languageOfPath("/docs/dev/"), source);
});
test("the demo's system choice follows the first supported browser language", () => {
  assert.equal(preferredLanguage(["it-IT", "de-AT", "en-US"]), "de");
  assert.equal(preferredLanguage(["ko-KR"]), "ko");
  // Any Korean tag names the same language; the region adds nothing.
  assert.equal(preferredLanguage(["ko-CN"]), "ko");
  assert.equal(preferredLanguage(["ja-JP"]), "ja");
  assert.equal(preferredLanguage(["pt-BR"]), "en");
});
test("a page offers the visitor's language until one is chosen or the offer is closed", () => {
  assert.equal(offeredLanguage("ja", null, null, ["en-US", "de-DE"]), "en");
  assert.equal(offeredLanguage("de", null, null, ["de-DE", "en-US"]), null);
  assert.equal(offeredLanguage("ru", null, null, []), null);
  // A choice outranks the browser; an unknown stored value does not count as one.
  assert.equal(offeredLanguage("en", "ja", null, ["en-US"]), "ja");
  assert.equal(offeredLanguage("ja", "ja", null, ["en-US"]), null);
  assert.equal(offeredLanguage("en", "xx", null, ["de-DE"]), "de");
  // A closed offer is not made again; another language still is.
  assert.equal(offeredLanguage("ja", null, "en", ["en-US"]), null);
  assert.equal(offeredLanguage("ja", "fr", "en", ["en-US"]), "fr");
  for (const { id } of languages) assert.ok(Object.values(offers[id]).every(text => text.trim()), id);
});
test("every localized HTML route keeps its CSP-hashed bytes at the edge", async () => {
  const headers = (await readFile(new URL("../../website/public/_headers", import.meta.url), "utf8")).replaceAll("\r", "");
  const rules = headers.split(/\n(?=\S)/);
  // The source language serves the root path; the others sit under their own.
  const source = languages[0].id;
  for (const { id } of languages) {
    const path = id === source ? "/" : `/${id}/*`;
    const rule = rules.find(block => block.startsWith(path + "\n"));
    assert.ok(rule?.includes("no-transform"), `${path}: missing HTML cache policy`);
  }
});
test("page copy translates nested values and formatter results without changing links", () => {
  const source = { label: "Ready", rows: ["Ready", "/en/download/"], show: value => `Count: ${value}` };
  const translated = translateValue({ Ready: "준비됨", "Count: {number}": "개수: {number}" }, source);
  assert.equal(translated.label, "준비됨");
  assert.deepEqual(translated.rows, ["준비됨", "/en/download/"]);
  assert.equal(translated.show(21), "개수: 21");
  assert.equal(source.label, "Ready");
});
test("policy translations retain URLs and literal code while escaping translated HTML", () => {
  const html = '<p>Read <a href="/docs/?mode=1">the guide</a> and <code>--hidden</code>.</p>';
  const translated = translateHtml(html, { "the guide": "안내서", "Read {link0} and {code0}.": "<script> {code0} 및 {link0}", "--hidden": "must stay literal" });
  assert.ok(translated.includes('href="/docs/?mode=1"'));
  assert.ok(translated.includes("<code>--hidden</code>"));
  assert.ok(translated.includes("&lt;script&gt;"));
  assert.ok(!translated.includes("must stay literal"));
  assert.throws(() => translateHtml(html, { "the guide": "안내서", "Read {link0} and {code0}.": "{link0}" }), /placeholders/);
});
test("narrow policy tables retain the translated column labels", () => {
  const result = labelTables('<table><thead><tr><th>기능</th><th>제어 방법</th></tr></thead><tbody><tr><td>업데이트</td><td><a href="/docs/">설명</a></td></tr></tbody></table>');
  assert.ok(result.includes('data-label="기능"'));
  assert.ok(result.includes('data-label="제어 방법"'));
  assert.ok(result.includes('<a href="/docs/">설명</a>'));
});
test("all site catalogs have matching keys, placeholders and protected identifiers", async () => {
  let expected;
  const source = languages[0].id;
  for (const { id } of languages.filter(item => ![source, "en"].includes(item.id))) {
    const catalog = JSON.parse(await readFile(new URL(`../../website/src/locales/${id}.json`, import.meta.url), "utf8"));
    expected ??= Object.keys(catalog).sort();
    assert.deepEqual(Object.keys(catalog).sort(), expected, id);
    const holes = value => [...new Set([...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]))].sort();
    for (const [source, value] of Object.entries(catalog)) {
      assert.deepEqual(holes(value), holes(source), `${id}: ${source}`);
      assert.deepEqual(textErrors(source, value), [], `${id}: ${source}`);
    }
  }
});
test("demo dictionaries cover each language without untranslated fallbacks", async () => {
  const result = await prepareReplicaCatalogs();
  assert.deepEqual(result.missing, []);
  const base = result.dictionaries.en;
  const source = languages[0].id;
  for (const { id } of languages.filter(item => item.id !== source)) {
    assert.deepEqual(Object.keys(result.dictionaries[id].exact).sort(), Object.keys(base.exact).sort());
    assert.deepEqual(result.dictionaries[id].patterns.map(row => row[0]), base.patterns.map(row => row[0]));
  }
});
