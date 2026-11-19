// Release helper: Conventional Commits lint, SemVer bump, changelog and the
// notes the release workflow publishes. Run `node scripts/release.mjs help`.

import { execFileSync } from "node:child_process";
import { createHash, createPublicKey, verify } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// The app's own changelog parser (plain TypeScript, run by Node's type
// stripping): the workflow publishes exactly the entries the app finds.
import { changelogEntries, outline, strayHeadings, untranslatedLines, withTranslation } from "./lib/release-notes.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const TYPES = ["feat", "fix", "perf", "refactor", "docs", "style", "test", "build", "ci", "chore", "revert"];
const MAX_HEADER = 100;
const HEADER =
  /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9][a-z0-9-]*(?:,[a-z0-9][a-z0-9-]*)*)\))?(?<bang>!)?: (?<subject>\S.*)$/;
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?$/;

/**
 * The changelog's languages (the source first), with their names and titles,
 * and the headings of each kind of section in every language. The app and the
 * website read the same file to tell the kinds apart.
 */
const CHANGELOG_CONF = JSON.parse(read("resources/changelog.json"));
const LANGUAGES = CHANGELOG_CONF.languages;
const SOURCE = LANGUAGES[0].locale;
const ENGLISH = "en-US";
/** The languages translated from the source, entry for entry. */
const TRANSLATIONS = LANGUAGES.slice(1).map((language) => language.locale);
/** One file per language, named after its locale as in `locales/`. */
const changelogFile = (locale) => `changelog/${locale}.md`;
const CHANGELOG = changelogFile(SOURCE);
const CHANGELOGS = LANGUAGES.map((language) => changelogFile(language.locale));

// Changelog sections in order, by commit type, with the kind of their heading
// in resources/changelog.json. Other types (refactor, docs, ci, ...) are
// internal and stay out of the release notes.
const SECTIONS = [
  ["breaking", "breaking"],
  ["feat", "feature"],
  ["fix", "fix"],
  ["perf", "performance"],
  ["revert", "revert"],
  ["known", "known"], // written by hand
  ["other", "other"], // commits that predate the convention
];
/** The heading `bun run release` writes for sections of `kind` in `locale`. */
const kindHeading = (kind, locale) => CHANGELOG_CONF.sections[kind][locale][0];

/** Changelog entries the update dialog can show: the release and the ones before it. */
const NOTES_RELEASES = 15;
/** The largest release notes the app accepts (MAX_NOTES_BYTES in src-gpui/src/updater.rs). */
const MAX_NOTES_BYTES = 512 * 1024;

/**
 * The line that links the editions, as at the top of the READMEs: `shown`
 * languages in bold, the others linked by `href`, in the order of
 * resources/changelog.json.
 */
function languageLine(locales, shown, href) {
  return LANGUAGES.filter((language) => locales.includes(language.locale))
    .map(({ locale, name }) => (shown.includes(locale) ? `**${name}**` : `[${name}](${href(locale)})`))
    .join(" · ");
}

/** The head of a changelog written from scratch: its title and the line linking the other languages. */
function changelogHead(locale) {
  const { title } = LANGUAGES.find((language) => language.locale === locale);
  const line = languageLine(
    LANGUAGES.map((language) => language.locale),
    [locale],
    (other) => `${other}.md`,
  );
  return `# ${title}\n\n${line}\n`;
}

const CARGO_TOML = "Cargo.toml";
const VERSION_FILES = ["package.json", "resources/app.json"];
const CARGO_VERSION = /(\[workspace\.package\][^[]*?\nversion = ")([^"]+)(")/;
// Top-level key only: these files are indented with two spaces.
const JSON_VERSION = /^( {2}"version": ")([^"]+)(")/m;

const HELP = `사용법: node scripts/release.mjs <명령>

  bump [major|minor|patch|<버전>] [--dry-run]
      다음 버전을 계산하고 버전 번호와 ${CHANGELOG}를 갱신하며 changelog/ 아래 다른 언어 파일에
      번역 대기 항목을 씁니다. 커밋하고 태그를 만들며 푸시하지 않습니다. 단계를 지정하지
      않으면 이전 태그 이후의 커밋으로 추론하고 태그가 없으면 현재 버전을 릴리스합니다.
      --dry-run은 버전 번호와 각 언어의 릴리스 설명만 출력하고 파일을 바꾸지 않습니다.
  lint <수정 범위>         범위 안의 커밋 메시지를 검사합니다. 예: origin/main..HEAD
  lint --message <텍스트>  커밋 메시지 하나를 검사합니다(예: 끌어오기 요청 제목)
  verify <태그>            태그와 각 위치의 버전 번호, ${CHANGELOG} 항목, 다른 언어에서 번역을
                           마치고 항목별로 대응하는 항목, 업데이트 공개 키를 확인합니다. 로컬에 해당
                           태그가 있으면 현재 커밋을 가리키는지, 버전 파일과 각 언어 변경 기록을
                           커밋했는지도 확인합니다(릴리스 워크플로의 첫 단계이며 태그를 푸시하기 전에
                           로컬에서 실행합니다)
  notes <버전>             GitHub Release 본문을 출력합니다. 다른 언어 변경 기록의 링크,
                           한국어와 영어 릴리스 설명, 이중 언어 다운로드 파일 안내를 담습니다
                           (릴리스 워크플로에서 사용)
  release-notes <버전> <출력 파일>
                           애플리케이션 내 업데이트 대화 상자가 표시할 업데이트 내용을 씁니다. 해당
                           버전과 그 이전 최근 ${NOTES_RELEASES}개 버전의 항목에 각 언어 번역을 붙입니다
                           (JSON, 릴리스 워크플로가 서명한 뒤 매니페스트에 넣습니다)
  manifest <버전> <설치 패키지> <서명 파일> [<업데이트 내용> <업데이트 내용의 서명 파일>]
                           애플리케이션 내 업데이트가 읽는 매니페스트 JSON을 출력합니다
                           (릴리스 워크플로에서 사용)
  check-signature <버전> <파일> <서명 파일>
                           resources/app.json의 공개 키로 업데이트 서명과 그 안의 버전 번호를
                           검증합니다(릴리스 워크플로에서 사용)`;

const APP_CONF = "resources/app.json";

function fail(message) {
  console.error(`[오류] ${message}`);
  process.exit(1);
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

function tryGit(...args) {
  try {
    return git(...args);
  } catch {
    return null;
  }
}

function read(file) {
  return readFileSync(join(root, file), "utf8");
}

function write(file, text) {
  writeFileSync(join(root, file), text);
}

// --- Conventional Commits ---

function lines(message) {
  return message.replace(/\r\n/g, "\n").trim().split("\n");
}

/** Returns the parsed header, or null when the message is not a Conventional Commit. */
function parse(message) {
  const [header, ...rest] = lines(message);
  const m = HEADER.exec(header);
  if (!m || !TYPES.includes(m.groups.type)) return null;
  const note = /^BREAKING[ -]CHANGE: *(.+)$/m.exec(rest.join("\n"))?.[1];
  return { ...m.groups, breaking: Boolean(m.groups.bang || note), note };
}

function lintMessage(message) {
  const [header = "", second] = lines(message);
  const errors = [];
  const m = HEADER.exec(header);
  if (!m) errors.push("첫 줄은 `<type>(<scope>)!: <설명>` 형식이어야 하며 scope와 !는 생략할 수 있고 콜론 뒤에 공백을 하나 둡니다");
  else if (!TYPES.includes(m.groups.type))
    errors.push(`알 수 없는 type입니다: ${m.groups.type}. 사용할 수 있는 값: ${TYPES.join(", ")}`);
  if ([...header].length > MAX_HEADER) errors.push(`첫 줄이 ${MAX_HEADER}자를 넘습니다`);
  if (second !== undefined && second.trim() !== "") errors.push("첫 줄과 본문 사이에 빈 줄을 하나 두어야 합니다");
  return errors;
}

/** Commits in `range`, oldest first, without merges. */
function readCommits(range) {
  const log = git("log", "--no-merges", "--reverse", "--format=%H%x1f%B%x1e", range);
  return log
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, message] = record.split("\x1f");
      return { hash, message, header: lines(message)[0], parsed: parse(message) };
    });
}

function cmdLint(args) {
  if (args[0] === "--message") {
    if (args.length < 2) fail("검사할 텍스트가 없습니다");
    const errors = lintMessage(args.slice(1).join(" "));
    if (errors.length)
      fail(`Conventional Commits를 따르지 않습니다: ${args.slice(1).join(" ")}\n  - ${errors.join("\n  - ")}`);
    console.log("[통과] Conventional Commits를 따릅니다");
    return;
  }
  if (args.length !== 1) fail("사용법: lint <수정 범위> 또는 lint --message <텍스트>");
  const commits = readCommits(args[0]);
  let bad = 0;
  for (const commit of commits) {
    const errors = lintMessage(commit.message);
    if (!errors.length) continue;
    bad++;
    console.error(`${commit.hash.slice(0, 7)} ${commit.header}\n  - ${errors.join("\n  - ")}`);
  }
  if (bad) fail(`${commits.length}개 커밋 중 ${bad}개가 Conventional Commits를 따르지 않습니다`);
  console.log(`[통과] ${commits.length}개 커밋이 Conventional Commits를 따릅니다`);
}

// --- SemVer ---

function parseVersion(text) {
  const m = SEMVER.exec(text);
  return m && { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split(".") : [] };
}

function formatVersion(v) {
  return `${v.major}.${v.minor}.${v.patch}${v.pre.length ? `-${v.pre.join(".")}` : ""}`;
}

/** SemVer precedence (§11). */
function compare(a, b) {
  for (const key of ["major", "minor", "patch"]) if (a[key] !== b[key]) return a[key] - b[key];
  // A version without a prerelease ranks above its prereleases.
  if (!a.pre.length || !b.pre.length) return b.pre.length - a.pre.length;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const [x, y] = [a.pre[i], b.pre[i]];
    if (x === y) continue;
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const [nx, ny] = [/^\d+$/.test(x), /^\d+$/.test(y)];
    if (nx && ny) return Number(x) - Number(y);
    if (nx !== ny) return nx ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

/** Same rules as `npm version`: a prerelease is first promoted to its release. */
function increment(v, level) {
  const pre = v.pre.length > 0;
  if (level === "major") {
    return pre && v.minor === 0 && v.patch === 0
      ? { ...v, pre: [] }
      : { major: v.major + 1, minor: 0, patch: 0, pre: [] };
  }
  if (level === "minor") {
    return pre && v.patch === 0 ? { ...v, pre: [] } : { ...v, minor: v.minor + 1, patch: 0, pre: [] };
  }
  return pre ? { ...v, pre: [] } : { ...v, patch: v.patch + 1, pre: [] };
}

function inferLevel(commits, current) {
  let level = "patch";
  for (const { parsed } of commits) {
    if (parsed?.breaking) level = "major";
    else if (parsed?.type === "feat" && level === "patch") level = "minor";
  }
  // SemVer §4: 0.y.z is initial development, so breaking changes bump the
  // minor version until 1.0.0 is released explicitly.
  return level === "major" && current.major === 0 ? "minor" : level;
}

// --- Version files ---

function workspaceMembers() {
  const list = /^members = \[([^\]]*)\]/m.exec(read(CARGO_TOML))?.[1];
  if (!list) fail(`${CARGO_TOML}에서 workspace members를 찾을 수 없습니다`);
  return [...list.matchAll(/"([^"]+)"/g)].map(([, dir]) => {
    const manifest = read(`${dir}/Cargo.toml`);
    if (!/^version\.workspace = true$/m.test(manifest)) fail(`${dir}/Cargo.toml이 작업 공간 버전을 상속하지 않습니다`);
    return /^name = "([^"]+)"/m.exec(manifest)[1];
  });
}

function lockPattern(name) {
  return new RegExp(`(\\[\\[package\\]\\]\\nname = "${name}"\\nversion = ")([^"]+)(")`);
}

/** The version shared by every version file; fails if they disagree. */
function readVersion() {
  const found = [[CARGO_TOML, CARGO_VERSION.exec(read(CARGO_TOML))?.[2]]];
  for (const file of VERSION_FILES) found.push([file, JSON_VERSION.exec(read(file))?.[2]]);
  const lock = read("Cargo.lock");
  for (const name of workspaceMembers())
    found.push([`Cargo.lock (${name})`, lockPattern(name).exec(lock)?.[2]]);
  const version = found[0][1];
  if (found.some(([, v]) => !v || v !== version)) {
    fail(`각 위치의 버전 번호가 일치하지 않습니다:\n${found.map(([file, v]) => `  ${file}: ${v ?? "찾을 수 없음"}`).join("\n")}`);
  }
  return version;
}

function writeVersion(version) {
  const replace = (file, pattern) => write(file, read(file).replace(pattern, `$1${version}$3`));
  replace(CARGO_TOML, CARGO_VERSION);
  for (const file of VERSION_FILES) replace(file, JSON_VERSION);
  for (const name of workspaceMembers()) replace("Cargo.lock", lockPattern(name));
}

// --- Changelog ---

function repoUrl() {
  const url = tryGit("remote", "get-url", "origin");
  const m = url && /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(url);
  return m ? `https://github.com/${m[1]}` : null;
}

function renderSection(version, prevTag, commits) {
  const repo = repoUrl();
  const link = (hash) => (repo ? `[${hash.slice(0, 7)}](${repo}/commit/${hash})` : hash.slice(0, 7));
  const entry = ({ hash, header, parsed }, text) => {
    if (!parsed) return `- ${header} (${link(hash)})`;
    const scope = parsed.scope ? `**${parsed.scope}:** ` : "";
    return `- ${scope}${text ?? parsed.subject} (${link(hash)})`;
  };
  const groups = new Map(SECTIONS.map(([key]) => [key, []]));
  for (const commit of commits) {
    const { parsed } = commit;
    if (parsed?.breaking) groups.get("breaking").push(entry(commit, parsed.note));
    const key = parsed ? parsed.type : "other";
    if (groups.has(key)) groups.get(key).push(entry(commit));
  }
  const body = SECTIONS.filter(([key]) => groups.get(key).length)
    .map(([key, kind]) => `### ${kindHeading(kind, SOURCE)}\n\n${groups.get(key).join("\n")}`)
    .join("\n\n");
  return `${sectionHeading(version, prevTag)}\n\n${body || "내부 변경(리팩터링, 문서, 빌드 등)만 있으며 사용자가 확인할 수 있는 변경은 없습니다."}\n`;
}

/** "## [1.2.0](compare link) - 2026-10-12"; the first release has no link. */
function sectionHeading(version, prevTag) {
  const repo = repoUrl();
  const date = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local time
  const title = repo && prevTag ? `[${version}](${repo}/compare/${prevTag}...v${version})` : version;
  return `## ${title} - ${date}`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The heading of an entry for `version` written ahead of time, with any text
 * after the dash: `bun run release` replaces it with the dated one. Everything
 * else reads entries with changelogEntries, which needs that date.
 */
const headingPattern = (version) =>
  new RegExp(`^## \\[?${escapeRegExp(version)}\\]?(?:\\([^)]*\\))? - .*$`, "m");

/** The text of `locale`'s changelog, or null when it has none. */
function readChangelog(locale) {
  const file = changelogFile(locale);
  return existsSync(join(root, file)) ? read(file) : null;
}

/** Every entry of `locale`'s changelog, newest first: version, date and body. */
function readEntries(locale = SOURCE) {
  const text = readChangelog(locale);
  return text === null ? [] : changelogEntries(text);
}

/** Body of the changelog entry for `version`, without its heading; null when missing or empty. */
function readNotes(version) {
  return readEntries().find((e) => e.version === version)?.notes || null;
}

/**
 * The entry to translate into `locale`, drafted from the source one: the same
 * items, with the section headings already in that language. `verify` refuses
 * it while any of the source text is left.
 */
function draft(notes, locale) {
  return notes.replace(/^(#{3,6}[ \t]+)(.+?)[ \t]*$/gm, (line, hashes, title) => {
    for (const names of Object.values(CHANGELOG_CONF.sections)) {
      const at = names[SOURCE].indexOf(title);
      if (at >= 0) return `${hashes}${names[locale][at] ?? names[locale][0]}`;
    }
    return line;
  });
}

/**
 * What keeps `locale`'s entry for `version` (in `text`) from going out beside
 * the source entry `source`: missing, dated differently, with other sections
 * or items than the source, or, when it must be `translated`, source text
 * still in it.
 */
function translationProblems(text, locale, version, source, { translated = true } = {}) {
  const file = changelogFile(locale);
  const problems = strayHeadings(text).map(
    ({ line, text: heading }) =>
      `${file} ${line}번째 줄의 제목이 버전 항목의 제목이 아닙니다: ${heading.trim()}. 항목 제목은 ${CHANGELOG}와 같으며 항목 안의 소절은 \`###\`를 씁니다`,
  );
  const entry = changelogEntries(text).find((e) => e.version === version);
  if (!entry?.notes) return [...problems, `${file}에 ${version} 항목이 없거나 항목에 내용이 없습니다`];
  if (source && entry.date !== source.date) {
    problems.push(`${file}의 ${version} 날짜 ${entry.date}가 ${CHANGELOG}의 ${source.date}와 다릅니다`);
  }
  if (source) {
    const [mine, theirs] = [outline(entry.notes), outline(source.notes)];
    if (mine.join() !== theirs.join()) {
      problems.push(
        `${file}의 ${version} 소절과 항목 수(${mine.join("/")})가 ${CHANGELOG}(${theirs.join("/")})와 다릅니다. 번역은 항목별로 대응해야 합니다`,
      );
    }
  }
  const left = untranslatedLines(locale, entry.notes);
  if (translated && left.length) {
    const sample = left.slice(0, 3).map((line) => (line.length > 60 ? `${line.slice(0, 60)}…` : line));
    problems.push(`${file}의 ${version} 항목에 아직 번역하지 않은 줄이 ${left.length}개 있습니다. 예:\n      ${sample.join("\n      ")}`);
  }
  return problems;
}

/**
 * What keeps the entry for `version` in `text` from reaching the release, the
 * update dialog and the app as written. Checked before the tag is pushed: the
 * release workflow fails on the same rules only after it has started.
 */
function changelogProblems(text, version) {
  const problems = strayHeadings(text).map(
    ({ line, text: heading }) =>
      `${line}번째 줄의 제목이 버전 항목의 제목이 아니며 애플리케이션과 릴리스 워크플로는 이 위치에서 항목을 나누지 않습니다: ${heading.trim()}.` +
      "항목 제목은 `## [버전](비교 링크) - YYYY-MM-DD` 형식이며 날짜 뒤에 다른 글자를 두지 않습니다. 항목 안의 소절은 `###`를 씁니다",
  );
  if (!changelogEntries(text).find((e) => e.version === version)?.notes) {
    problems.push(`${version} 항목이 없거나 항목에 내용이 없습니다`);
  }
  return problems;
}

function prepend(text, section) {
  const first = /^## /m.exec(text);
  const at = first ? first.index : text.length;
  const head = text.slice(0, at).trimEnd();
  const tail = text.slice(at);
  return `${head}\n\n${section}${tail ? `\n${tail}` : ""}`;
}

// --- Commands ---

function cmdBump(args) {
  const dryRun = args.includes("--dry-run");
  const target = args.find((arg) => !arg.startsWith("--"));
  const current = parseVersion(readVersion());
  if (!dryRun) {
    requirePubkey();
    if (git("status", "--porcelain")) fail("작업 트리에 커밋하지 않은 변경이 있습니다. 먼저 커밋하거나 스테이징합니다");
    const branch = git("rev-parse", "--abbrev-ref", "HEAD");
    if (branch !== "main") fail(`main 브랜치에서만 릴리스할 수 있습니다. 현재 브랜치: ${branch}`);
  }

  const prevTag = tryGit("describe", "--tags", "--abbrev=0", "--match", "v[0-9]*");
  const commits = readCommits(prevTag ? `${prevTag}..HEAD` : "HEAD");
  if (prevTag && !commits.length) fail(`${prevTag} 이후에 새 커밋이 없습니다`);

  let next;
  if (!target) next = prevTag ? increment(current, inferLevel(commits, current)) : current;
  else if (["major", "minor", "patch"].includes(target)) next = increment(current, target);
  else next = parseVersion(target.replace(/^v/, "")) ?? fail(`올바른 유의적 버전 번호가 아닙니다: ${target}`);
  // Without a tag the current version has never been released, so it may be released as is.
  const order = compare(next, current);
  if (order < 0 || (order === 0 && prevTag)) {
    fail(`새 버전 ${formatVersion(next)}은 현재 버전 ${formatVersion(current)}보다 높아야 합니다`);
  }
  const version = formatVersion(next);
  const tag = `v${version}`;
  if (tryGit("rev-parse", "-q", "--verify", `refs/tags/${tag}`)) fail(`${tag} 태그가 이미 있습니다`);

  // Notes written ahead of time (e.g. for the first release) are kept; only
  // their heading is brought up to date.
  const before = readChangelog(SOURCE);
  const written = before !== null && headingPattern(version).test(before);
  const changelog = written
    ? before.replace(headingPattern(version), () => sectionHeading(version, prevTag))
    : prepend(before ?? changelogHead(SOURCE), renderSection(version, prevTag, commits));
  const problems = changelogProblems(changelog, version);
  if (problems.length) fail(`${CHANGELOG}를 먼저 수정해야 합니다. 파일은 바꾸지 않았습니다:\n  - ${problems.join("\n  - ")}`);
  const entry = changelogEntries(changelog).find((e) => e.version === version);

  // The entry in every other language: kept when written ahead of time, else
  // drafted from the source one, to be translated before the tag is pushed.
  const translations = TRANSLATIONS.map((locale) => {
    const file = changelogFile(locale);
    const text = readChangelog(locale);
    const kept = text !== null && headingPattern(version).test(text);
    const updated = kept
      ? text.replace(headingPattern(version), () => sectionHeading(version, prevTag))
      : prepend(text ?? changelogHead(locale), `${sectionHeading(version, prevTag)}\n\n${draft(entry.notes, locale)}\n`);
    const problems = translationProblems(updated, locale, version, entry, { translated: false });
    if (problems.length) fail(`${file}를 먼저 수정해야 합니다. 파일은 바꾸지 않았습니다:\n  - ${problems.join("\n  - ")}`);
    const notes = changelogEntries(updated).find((e) => e.version === version).notes;
    const untranslated = translationProblems(updated, locale, version, entry).length > 0;
    return { file, text: updated, kept, notes, untranslated };
  });
  const pending = translations.filter((t) => t.untranslated).map((t) => t.file);

  console.log(
    `버전: ${formatVersion(current)} → ${version}(이전 태그: ${prevTag ?? "없음"}, 커밋 ${commits.length}개)\n`,
  );
  if (written) console.log(`${CHANGELOG}에 미리 쓴 릴리스 설명을 그대로 썼습니다.\n`);
  for (const t of translations) if (t.kept) console.log(`${t.file}에 미리 쓴 릴리스 설명을 그대로 썼습니다.\n`);
  if (dryRun) {
    console.log(`${CHANGELOG}:\n\n${sectionHeading(version, prevTag)}\n\n${entry.notes}\n`);
    for (const t of translations) {
      console.log(`${t.file}${t.untranslated ? "(번역 대기)" : ""}:\n\n${sectionHeading(version, prevTag)}\n\n${t.notes}\n`);
    }
    return;
  }

  writeVersion(version);
  write(CHANGELOG, changelog);
  for (const t of translations) write(t.file, t.text);
  try {
    // Cargo.lock was edited by hand above; make sure Cargo agrees with it.
    execFileSync("cargo", ["metadata", "--locked", "--offline", "--format-version", "1"], {
      cwd: root,
      stdio: ["ignore", "ignore", "inherit"],
    });
  } catch {
    fail("Cargo.lock이 매니페스트와 일치하지 않습니다. 버전 파일은 수정했지만 커밋하지 않았습니다. git restore .로 되돌립니다");
  }
  git("add", CARGO_TOML, "Cargo.lock", ...VERSION_FILES, ...CHANGELOGS);
  // Empty when nothing changed: a first release of the current version with
  // its notes written ahead of time on the same day.
  git("commit", "--quiet", "--allow-empty", "-m", `chore(release): ${tag}`);
  git("tag", "-a", tag, "-m", `GoodGood ${tag}`);
  const translate = pending.length
    ? `\n먼저 다음 파일에서 ${version} 항목을 해당 언어로 번역하고 한국어 항목과 항목별로 대응시킵니다. 그러지 않으면 verify가 통과하지 않습니다:\n  ${pending.join("\n  ")}`
    : "";
  console.log(`chore(release): ${tag} 커밋과 ${tag} 태그를 만들었습니다. changelog/ 아래 각 언어 변경 기록을 확인하고 수정한 뒤
최종 커밋을 git commit --amend로 제출하고 태그를 git tag -fa ${tag} -m "GoodGood ${tag}"로 옮깁니다.${translate}
푸시하기 전에 확인하며 태그를 푸시하면 릴리스가 시작됩니다:

  node scripts/release.mjs verify ${tag}
  git push --atomic origin main ${tag}

푸시 전에 취소하려면: git tag -d ${tag} && git reset --hard HEAD~1`);
}

function cmdVerify([tag]) {
  if (!tag?.startsWith("v") || !parseVersion(tag.slice(1))) fail(`태그가 v<유의적 버전 번호> 형식이 아닙니다: ${tag ?? "(지정 없음)"}`);
  const version = readVersion();
  if (version !== tag.slice(1)) fail(`${tag} 태그가 버전 번호 ${version}과 일치하지 않습니다`);
  const text = readChangelog(SOURCE);
  const problems = text === null ? [`${CHANGELOG}가 없습니다`] : changelogProblems(text, version);
  if (problems.length)
    fail(`${CHANGELOG}는 ${tag} 릴리스에 사용할 수 없습니다(릴리스는 bun run release를 사용합니다):\n  - ${problems.join("\n  - ")}`);
  const source = readEntries().find((e) => e.version === version);
  const translationsProblems = TRANSLATIONS.flatMap((locale) => {
    const translated = readChangelog(locale);
    return translated === null
      ? [`${changelogFile(locale)}가 없습니다`]
      : translationProblems(translated, locale, version, source);
  });
  if (translationsProblems.length)
    fail(`다른 언어의 변경 기록을 ${tag} 릴리스에 사용할 수 없습니다:\n  - ${translationsProblems.join("\n  - ")}`);
  requirePubkey();
  // Before pushing, the files checked above must be the ones the tag carries.
  // In the workflow the checkout is the tagged commit itself, so this holds.
  const tagged = tryGit("rev-parse", "-q", "--verify", `refs/tags/${tag}^{commit}`);
  if (tagged && tagged !== tryGit("rev-parse", "HEAD")) {
    fail(`${tag} 태그가 현재 커밋을 가리키지 않습니다. 릴리스 커밋을 수정한 뒤 git tag -fa ${tag} -m "GoodGood ${tag}"로 태그를 옮깁니다`);
  }
  const files = [CARGO_TOML, "Cargo.lock", ...VERSION_FILES, ...CHANGELOGS];
  const changed = tryGit("status", "--porcelain", "--", ...files);
  if (changed)
    fail(`다음 파일에 커밋하지 않은 변경이 있으며 태그에는 이 변경이 들어 있지 않습니다:\n${changed}\ngit commit --amend로 제출한 뒤 태그를 옮깁니다`);
  console.log(`[통과] ${tag} 태그가 버전 번호, ${LANGUAGES.length}개 언어의 변경 기록, 업데이트 공개 키와 일치합니다`);
}

/** Without it the released app can verify, and therefore install, no update. */
function requirePubkey() {
  if (!JSON.parse(read(APP_CONF)).updater?.pubkey) fail(`${APP_CONF}에 업데이트 서명 공개 키가 없습니다`);
}

/** The repository's web address, from the workflow's environment or the `origin` remote. */
function publicRepo() {
  return process.env.GITHUB_REPOSITORY
    ? `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY}`
    : repoUrl();
}

/** GitHub's anchor for a heading: lower case, punctuation dropped, spaces as hyphens. */
function anchor(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
    .replaceAll(" ", "-");
}

/**
 * The GitHub release's changes followed by the bilingual download guide. The
 * release shows the Korean and English notes in full; a line at the top, as
 * in the READMEs, links the entry in each other language's changelog.
 */
function cmdNotes([version]) {
  const source = version && readEntries().find((e) => e.version === version);
  if (!source?.notes) fail(`${CHANGELOG}에 ${version ?? "(버전 미지정)"} 항목이 없습니다`);
  const notes = source.notes;
  const english = readEntries(ENGLISH).find((e) => e.version === version)?.notes;
  const shown = english ? [SOURCE, ENGLISH] : [SOURCE];
  const linked = TRANSLATIONS.filter(
    (locale) => !shown.includes(locale) && readEntries(locale).some((e) => e.version === version && e.notes),
  );
  const repo = publicRepo();
  const href = (locale) =>
    `${repo ? `${repo}/blob/v${version}/` : ""}${changelogFile(locale)}#${anchor(`${version} - ${source.date}`)}`;
  const languages = linked.length ? `${languageLine([...shown, ...linked], shown, href)}\n\n` : "";
  const changes = english ? `## ${LANGUAGES[0].name}\n\n${notes}\n\n## English\n\n${english}` : notes;
  const downloads = read("scripts/lib/release-downloads.md").trim().replaceAll("{{version}}", version);
  console.log(`${languages}${changes}\n\n---\n\n${downloads}`);
}

/**
 * Release notes as versions before 0.2 show them: plain text, no links or
 * Markdown, and no commit scopes (core, ui, ...), which mean nothing to users.
 */
function plainNotes(markdown) {
  return markdown
    .replace(/ \(\[[0-9a-f]{7}\]\([^)]*\)\)/g, "")
    .replace(/ \([0-9a-f]{7}\)$/gm, "")
    .replace(/^### /gm, "")
    .replace(/^- \*\*[a-z0-9][a-z0-9,-]*:\*\* /gm, "· ")
    .replace(/^- /gm, "· ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

/**
 * The notes the update dialog shows, as one JSON text: the entries of
 * `version` and the releases before it, so someone skipping versions sees
 * every change, each with its translations by locale (`translations`, which
 * versions before 0.3 ignore; an entry still untranslated is left out, so the
 * app falls back as it does for a missing one). Older releases are dropped
 * while the text is larger than the app accepts. The release workflow signs
 * the file as written, bound to the version, and the manifest carries it
 * verbatim; the app shows nothing that fails the signature.
 */
function cmdReleaseNotes([version, output]) {
  if (!version || !output) fail("사용법: release-notes <버전> <출력 파일>");
  const target = parseVersion(version) ?? fail(`올바른 유의적 버전 번호가 아닙니다: ${version}`);
  let entries = readEntries();
  for (const locale of TRANSLATIONS) {
    const translated = readEntries(locale).filter((e) => !untranslatedLines(locale, e.notes).length);
    entries = withTranslation(entries, locale, translated);
  }
  if (!entries.some((e) => e.version === version)) fail(`${CHANGELOG}에 ${version} 항목이 없습니다`);
  const releases = entries
    .filter((e) => {
      const v = parseVersion(e.version);
      return v && compare(v, target) <= 0;
    })
    .slice(0, NOTES_RELEASES);
  const all = releases.length;
  let text = JSON.stringify({ version, releases });
  while (Buffer.byteLength(text) > MAX_NOTES_BYTES && releases.length > 1) {
    releases.pop();
    text = JSON.stringify({ version, releases });
  }
  if (Buffer.byteLength(text) > MAX_NOTES_BYTES) fail(`${version}의 업데이트 내용이 애플리케이션이 받는 ${MAX_NOTES_BYTES} 바이트를 넘습니다`);
  writeFileSync(output, text);
  const counts = releases.map((e) => `${e.version}(${Object.keys(e.translations ?? {}).length}개 번역)`);
  const dropped = all - releases.length;
  console.log(
    `${output} 파일을 썼습니다: ${counts.join(", ")}` +
      (dropped ? `\n애플리케이션이 받는 ${MAX_NOTES_BYTES} 바이트를 넘지 않도록 이전 버전 ${dropped}개를 생략했습니다` : ""),
  );
}

/** The manifest the in-app updater reads (latest.json and beta.json). */
function cmdManifest([version, installer, signature, releaseNotes, releaseNotesSignature]) {
  if (!version || !installer || !signature || Boolean(releaseNotes) !== Boolean(releaseNotesSignature))
    fail("사용법: manifest <버전> <설치 패키지> <서명 파일> [<업데이트 내용> <업데이트 내용의 서명 파일>]");
  const notes = readNotes(version) ?? fail(`${CHANGELOG}에 ${version} 항목이 없습니다`);
  const repo = publicRepo() ?? fail("GitHub 저장소 주소를 찾을 수 없습니다");
  const asset = {
    signature: readFileSync(signature, "utf8").trim(),
    url: `${repo}/releases/download/v${version}/${encodeURIComponent(basename(installer))}`,
  };
  const manifest = {
    version,
    notes: plainNotes(notes),
    pub_date: new Date().toISOString(),
    // The updater looks for `{os}-{arch}-{installer}` first, then `{os}-{arch}`.
    platforms: { "windows-x86_64-nsis": asset, "windows-x86_64": asset },
  };
  if (releaseNotes) {
    // Kept as the exact text that was signed; the app parses it after checking.
    const text = readFileSync(releaseNotes, "utf8");
    if (JSON.parse(text).version !== version) fail(`${releaseNotes}는 ${version}의 업데이트 내용이 아닙니다`);
    manifest.goodgood = { releaseNotes: text, signature: readFileSync(releaseNotesSignature, "utf8").trim() };
  }
  console.log(JSON.stringify(manifest, null, 2));
}

/**
 * Verifies a minisign signature the way the updater does, signed version included,
 * so a release signed with a key that does not match the public key never ships.
 */
function cmdCheckSignature([version, file, signature]) {
  if (!version || !file || !signature) fail("사용법: check-signature <버전> <파일> <서명 파일>");
  // Tauri stores both as base64 of the minisign text files.
  const lines = (base64) => Buffer.from(base64.trim(), "base64").toString("utf8").split("\n");
  const pubkey =
    JSON.parse(read(APP_CONF)).updater?.pubkey || fail(`${APP_CONF}에 업데이트 서명 공개 키가 없습니다`);
  // Public key: algorithm (2) + key id (8) + Ed25519 key (32).
  const pk = Buffer.from(lines(pubkey)[1], "base64");
  // Signature: algorithm (2) + key id (8) + Ed25519 signature (64), then the
  // trusted comment and the global signature over signature + comment.
  const [, sigLine = "", commentLine = "", globalLine = ""] = lines(readFileSync(signature, "utf8"));
  const sig = Buffer.from(sigLine, "base64");
  const comment = commentLine.replace(/^trusted comment: /, "");
  const key = createPublicKey({
    key: { kty: "OKP", crv: "Ed25519", x: pk.subarray(10).toString("base64url") },
    format: "jwk",
  });
  if (sig.length !== 74 || !sig.subarray(2, 10).equals(pk.subarray(2, 10))) {
    fail(`서명에 사용한 키가 ${APP_CONF}의 공개 키와 다릅니다`);
  }
  const data = readFileSync(file);
  // "ED" signs the BLAKE2b-512 hash of the file, legacy "Ed" the file itself.
  const message =
    sig.subarray(0, 2).toString() === "ED" ? createHash("blake2b512").update(data).digest() : data;
  if (!verify(null, message, key, sig.subarray(10))) fail("서명이 파일 내용과 맞지 않습니다");
  const signedComment = Buffer.concat([sig.subarray(10), Buffer.from(comment)]);
  if (!verify(null, signedComment, key, Buffer.from(globalLine, "base64")))
    fail("서명의 신뢰 주석이 검증을 통과하지 못했습니다");
  if (!comment.split("\t").includes(`version:${version}`)) fail(`서명의 버전이 ${version}이 아닙니다: ${comment}`);
  console.log(`[통과] 서명이 ${APP_CONF}의 공개 키와 맞고 버전은 ${version}입니다`);
}

const [command, ...args] = process.argv.slice(2);
const commands = {
  bump: cmdBump,
  lint: cmdLint,
  verify: cmdVerify,
  notes: cmdNotes,
  "release-notes": cmdReleaseNotes,
  manifest: cmdManifest,
  "check-signature": cmdCheckSignature,
};
if (commands[command]) commands[command](args);
else if (!command || command === "help" || command === "--help") console.log(HELP);
else fail(`알 수 없는 명령: ${command}\n\n${HELP}`);
