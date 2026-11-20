// Version numbers in the `YYYY.MM.N[-rc.M]` calendar scheme, as release.mjs
// writes and compares them. Erasable TypeScript, so that Node runs it
// directly, and pure functions, so the unit tests need no git or files.

/** A three-part version: `2026.11.0`, `0.5.0`, `2026.11.0-rc.1`. */
export interface Version {
  major: number;
  minor: number;
  patch: number;
  /** Prerelease identifiers, e.g. `["rc", "1"]`. */
  pre: string[];
}

// The SemVer 2.0.0 grammar: numeric parts without leading zeros, an optional
// prerelease. `2026.11.0` is an ordinary version of it, so old releases
// (0.5.0, 0.4.1-beta.1, ...) and calendar ones parse the same way.
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?$/;

/** The version `text` names, or null when it is not a valid version number. */
export function parseVersion(text: string): Version | null {
  const m = SEMVER.exec(text);
  return m && { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split(".") : [] };
}

/**
 * The version as written: `2026.11.0`, `2026.11.0-rc.1`. The month keeps no
 * leading zero because the grammar above (like SemVer's) rejects one.
 */
export function formatVersion(v: Version): string {
  return `${v.major}.${v.minor}.${v.patch}${v.pre.length ? `-${v.pre.join(".")}` : ""}`;
}

/**
 * `parseVersion` kept to the calendar scheme: the month (`2026.11.0`'s 11)
 * must be 1-12, which tells a dropped component or a mistyped date apart from
 * a real version.
 */
export function parseCalver(text: string): Version | null {
  const v = parseVersion(text);
  return v && v.minor >= 1 && v.minor <= 12 ? v : null;
}

/** SemVer precedence (§11). */
export function compare(a: Version, b: Version): number {
  for (const key of ["major", "minor", "patch"] as const) if (a[key] !== b[key]) return a[key] - b[key];
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

/** The number of a `-rc.M` prerelease, or null when `v` is not one. */
function rcOf(v: Version): number | null {
  return v.pre.length === 2 && v.pre[0] === "rc" && /^\d+$/.test(v.pre[1]) ? +v.pre[1] : null;
}

/** The version's year and month as `YYYY-MM-DD` names them: `2026-01-05` is `2026.1`. */
export function monthOf(today: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  const month = m ? +m[2] : 0;
  if (!m || month < 1 || month > 12) throw new Error(`YYYY-MM-DD 날짜가 아닙니다: ${today}`);
  return `${m[1]}.${month}`;
}

/**
 * The next stable release as of `today` (`YYYY-MM-DD`): the highest N released
 * in that month plus one, or 0 when the month has no release yet — so each new
 * month starts over at `.0`. Prerelease tags (`-rc.M`) are not releases and
 * never raise N.
 */
export function nextStable(tags: string[], today: string): string {
  const month = monthOf(today);
  const released = tags
    .map((tag) => parseCalver(tag.replace(/^v/, "")))
    .filter((v) => v !== null && !v.pre.length && `${v.major}.${v.minor}` === month)
    .map((v) => v.patch);
  return `${month}.${released.length ? Math.max(...released) + 1 : 0}`;
}

/**
 * The first release candidate of the next stable release (`nextStable`): that
 * exact version with the highest `-rc.M` already tagged for it plus one.
 */
export function nextRc(tags: string[], today: string): string {
  const base = nextStable(tags, today);
  const candidates = tags
    .map((tag) => parseCalver(tag.replace(/^v/, "")))
    .filter((v) => v !== null && formatVersion({ ...v, pre: [] }) === base)
    .map((v) => rcOf(v))
    .filter((rc): rc is number => rc !== null);
  return `${base}-rc.${(candidates.length ? Math.max(...candidates) : 0) + 1}`;
}
