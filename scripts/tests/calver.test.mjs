import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { compare, formatVersion, monthOf, nextRc, nextStable, parseCalver, parseVersion } from "../lib/version.ts";

const TODAY = "2026-11-20";

test("monthOf names the version's month without a leading zero and rejects other dates", () => {
  assert.equal(monthOf("2026-01-05"), "2026.1");
  assert.equal(monthOf("2026-11-20"), "2026.11");
  for (const bad of ["2026-13-01", "2026-00-10", "20261120", "2026.11.20"]) {
    assert.throws(() => monthOf(bad), bad);
  }
});

test("parseCalver takes calendar versions, rc included, and keeps old versions parsing", () => {
  assert.deepEqual(parseCalver("2026.11.0"), { major: 2026, minor: 11, patch: 0, pre: [] });
  assert.deepEqual(parseCalver("2026.1.0"), { major: 2026, minor: 1, patch: 0, pre: [] });
  assert.deepEqual(parseCalver("2026.11.0-rc.1"), { major: 2026, minor: 11, patch: 0, pre: ["rc", "1"] });
  for (const good of ["0.5.0", "1.2.3", "0.4.1-beta.1", "1.3.0-beta.2"]) {
    assert(parseVersion(good), good);
    assert(parseCalver(good), good);
  }
  // Months beyond 1-12, a leading zero, a dropped or merged component.
  for (const bad of ["2026.13.0", "2026.0.5", "2026.01.0", "2026.11", "2026.1120"]) {
    assert.equal(parseCalver(bad), null, bad);
  }
});

test("formatVersion writes the version back the way it was read", () => {
  for (const text of ["2026.11.0", "2026.1.0", "2026.11.0-rc.1", "2026.11.1-rc.2", "0.5.0"]) {
    assert.equal(formatVersion(parseVersion(text)), text);
  }
});

test("calendar versions rank by precedence, so month resets and rc ordering hold", () => {
  const v = (text) => parseVersion(text);
  assert(compare(v("0.5.0"), v("2026.11.0")) < 0);
  assert(compare(v("2026.11.0-rc.1"), v("2026.11.0")) < 0);
  assert(compare(v("2026.11.0"), v("2026.11.1")) < 0);
  assert(compare(v("2026.11.5"), v("2026.12.0")) < 0);
  assert(compare(v("2026.12.5"), v("2027.1.0")) < 0);
  assert.equal(compare(v("2026.11.0"), v("2026.11.0")), 0);
});

test("nextStable continues the month's N and starts a new month back at 0, rc tags aside", () => {
  assert.equal(nextStable([], TODAY), "2026.11.0");
  assert.equal(nextStable(["v0.5.0", "v2026.11.0"], TODAY), "2026.11.1");
  assert.equal(nextStable(["v2026.11.0", "v2026.11.1", "v2026.11.0-rc.2"], TODAY), "2026.11.2");
  assert.equal(nextStable(["v2026.11.0-rc.1"], TODAY), "2026.11.0");
  // Tags of other months never raise N; a new month (or year) starts over.
  assert.equal(nextStable(["v2026.12.3"], TODAY), "2026.11.0");
  assert.equal(nextStable(["v2026.11.5"], "2026-12-01"), "2026.12.0");
  assert.equal(nextStable(["v2026.12.3"], "2027-01-02"), "2027.1.0");
});

test("nextRc numbers the candidates of the next stable release", () => {
  assert.equal(nextRc([], TODAY), "2026.11.0-rc.1");
  assert.equal(nextRc(["v2026.11.0-rc.1"], TODAY), "2026.11.0-rc.2");
  assert.equal(nextRc(["v2026.11.0-rc.1", "v2026.11.0-rc.2"], TODAY), "2026.11.0-rc.3");
  assert.equal(nextRc(["v2026.11.0"], TODAY), "2026.11.1-rc.1");
});

// --- The release script itself, in a scratch copy of the repository ---------

/**
 * A throwaway git repository with the files cmdBump reads: the version files,
 * the changelog configuration and every workspace member's manifest.
 */
async function fixture(t, { tags = [] } = {}) {
  const root = resolve(await mkdtemp(join(tmpdir(), "goodgood-calver-")));
  t.after(async () => {
    assert.equal(dirname(root), resolve(tmpdir()));
    assert(basename(root).startsWith("goodgood-calver-"));
    await rm(root, { recursive: true, force: true });
  });
  const repository = resolve(import.meta.dirname, "../..");
  const read = (file) => readFile(join(repository, file), "utf8");
  await mkdir(join(root, "resources"), { recursive: true });
  await mkdir(join(root, "scripts/lib"), { recursive: true });
  const originals = {};
  const files = [
    "Cargo.toml",
    "Cargo.lock",
    "package.json",
    "resources/app.json",
    "resources/changelog.json",
    "scripts/release.mjs",
    "scripts/lib/version.ts",
    "scripts/lib/release-notes.ts",
  ];
  // The fixtures start from the historical 0.5.0 so the tests keep passing when
  // the real repository moves on to later calendar versions.
  const liveVersion = JSON.parse(await read("package.json")).version;
  const pinsVersion = ["Cargo.toml", "Cargo.lock", "package.json", "resources/app.json", "resources/changelog.json"];
  for (const file of files) {
    let text = await read(file);
    if (pinsVersion.includes(file)) text = text.split(liveVersion).join("0.5.0");
    originals[file] = text;
    await writeFile(join(root, file), text);
  }
  // Every workspace member's manifest, which readVersion walks to check Cargo.lock.
  const members = [.../\nmembers = \[([^\]]*)\]/.exec(originals["Cargo.toml"])[1].matchAll(/"([^"]+)"/g)].map(
    ([, dir]) => dir,
  );
  for (const dir of members) {
    await mkdir(join(root, dir), { recursive: true });
    originals[`${dir}/Cargo.toml`] = await read(`${dir}/Cargo.toml`);
    await copyFile(join(repository, `${dir}/Cargo.toml`), join(root, `${dir}/Cargo.toml`));
  }
  const git = (...args) =>
    execFileSync("git", ["-c", "user.email=fixture@example.com", "-c", "user.name=fixture", ...args], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    });
  git("init", "--quiet");
  git("commit", "--quiet", "--allow-empty", "-m", "feat: 첫 커밋 예시");
  for (const tag of tags) git("tag", "-a", tag, "-m", `GoodGood ${tag}`);
  if (tags.length) git("commit", "--quiet", "--allow-empty", "-m", "fix: 예시 수정");
  const run = (...args) =>
    execFileSync(process.execPath, [join(root, "scripts/release.mjs"), ...args], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    });
  return { root, originals, run };
}

test("bump --dry-run names the migrated version and writes nothing", async (t) => {
  const f = await fixture(t);
  const body = f.run("bump", "2026.11.0", "--dry-run");
  const today = new Date().toLocaleDateString("sv-SE"); // the date the heading carries
  assert(body.includes(`버전: 0.5.0 → 2026.11.0`), body);
  // No tags in this repository: the heading has no compare link.
  assert(body.includes(`## 2026.11.0 - ${today}`), body);
  assert(!body.includes("/compare/"), body);
  assert(body.includes("- 첫 커밋 예시"));
  for (const [file, text] of Object.entries(f.originals)) {
    assert.equal(await readFile(join(f.root, file), "utf8"), text, file);
  }
  assert(!existsSync(join(f.root, "changelog/ko-KR.md")), "dry-run must not write the changelog");
});

test("bump continues the month's releases from the tags and numbers rc candidates", async (t) => {
  const f = await fixture(t, { tags: ["v2026.11.0"] });
  // The wall clock picks the month, so the expectation derives from the same
  // functions the script uses instead of a date that goes stale next month.
  const today = new Date().toLocaleDateString("sv-SE");
  const tags = ["v2026.11.0"];
  assert(f.run("bump", "--dry-run").includes(`버전: 0.5.0 → ${nextStable(tags, today)}`));
  assert(f.run("bump", "rc", "--dry-run").includes(`버전: 0.5.0 → ${nextRc(tags, today)}`));
  for (const [file, text] of Object.entries(f.originals)) {
    assert.equal(await readFile(join(f.root, file), "utf8"), text, file);
  }
});
