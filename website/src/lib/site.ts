import data from "../../content/site.json";
import { downloadOrigin, origin, repo } from "../../scripts/release.mjs";
import { languages, localized, notesLanguage, languageInfo, type Language } from "./languages";
import { withLanguages } from "./site-i18n";

export { downloadOrigin, origin, repo };

export type { Language } from "./languages";
export { localized } from "./languages";
export type Policy = "privacy" | "signing" | "security";
export const policies: Policy[] = ["privacy", "signing", "security"];
interface Download {
  name: string;
  size: number;
  sha256: string;
  url: string;
  upstream: string;
}
export interface DocLink {
  label: string;
  file: string;
  path: string;
  note: string;
}
interface Snapshot {
  softwareLanguages: string[];
  release: {
    version: string;
    tag: string;
    published: string;
    beta: string;
    files: { installer: Download; portable: Download };
  };
  translations: Record<
    Language,
    {
      operatingSystem: string;
      requirements: string;
      signing: string;
      privacy: string;
    }
  >;
  editions: Edition[];
  contact: boolean;
  // Each language that has release notes; the others fall back to changelogLanguage.
  changelog: Partial<Record<Language, ReleaseNote[]>>;
  // Commits per day up to the documented development commit.
  activity: { total: number; first: string; days: [string, number][] };
  // GitHub's figures, absent when they could not be fetched.
  repository: { stars: number; forks: number; releases: number; downloads: number; checked: string } | null;
}
// One release of the changelog: plain text for summaries, HTML (links kept) for the full notes.
export interface ReleaseNote {
  version: string;
  date: string;
  // GitHub's comparison with the previous release; empty for the first.
  compare: string;
  notice: string;
  withdrawn: boolean;
  intro: string;
  introHtml: string;
  groups: {
    title: string;
    kind: "feature" | "fix" | "performance" | "breaking" | "upgrade" | "known" | "other";
    items: { label: string; text: string; html: string }[];
  }[];
}
export interface Edition {
  id: "stable" | "dev";
  label: string;
  note: string;
  ref: string;
  base: string;
  folder: string;
  routes: Record<string, string>;
  nav: { label: string; items: DocLink[] }[];
}
// Written by scripts/content.mjs; raise siteFormat there when this shape changes.
if (data.format !== 7)
  throw Error("content/site.json is from an older version of the website scripts. Restart start-website.bat.");
const snapshot = data as unknown as Snapshot;
// The language a page's release notes are in: its own changelog, or the
// source language's when the release has no edition in it.
export const changelogLanguage = (lang: Language): Language =>
  snapshot.changelog[lang]?.length ? lang : notesLanguage(lang);
export const site = {
  ...snapshot,
  changelog: Object.fromEntries(languages.map(({ id }) => [id, snapshot.changelog[changelogLanguage(id)]])) as Record<Language, ReleaseNote[]>,
  translations: Object.fromEntries(languages.map(({ id }) => [id, snapshot.translations[id] ?? snapshot.translations[notesLanguage(id)]])) as Snapshot["translations"],
};
export const [stable, development] = site.editions;
// The first native release documents the interface demonstrated on the home page.
const [releaseMajor, releaseMinor] = site.release.version.split(".").map(Number);
export const nativeStable = releaseMajor > 0 || (releaseMajor === 0 && releaseMinor >= 4);
// The development base is nested inside the stable one; the last match is the closest.
export const editionOf = (path: string) =>
  site.editions.findLast((edition) => path.startsWith(edition.base)) ?? stable;
export const text = withLanguages({
  ko: {
    home: "홈",
    docs: "문서",
    download: "다운로드",
    changelog: "변경 기록",
    started: "다운로드를 시작했습니다",
    install: "Windows용 다운로드",
    skip: "본문으로 이동",
    privacy: "개인정보 처리방침",
    signing: "코드 서명 정책",
    security: "보안 신고",
    contact: "관리자에게 문의",
    questions: "자주 묻는 질문",
    source: "소스 코드",
    language: "언어",
    search: "문서 검색",
    theme: "테마",
    themeOptions: { auto: "시스템 설정 따르기", light: "밝게", dark: "어둡게" },
  },
  en: {
    home: "Home",
    docs: "Docs",
    download: "Download",
    changelog: "Changelog",
    started: "Download started",
    install: "Download for Windows",
    skip: "Skip to content",
    privacy: "Privacy",
    signing: "Code signing policy",
    security: "Security",
    contact: "Contact",
    questions: "Questions",
    source: "Source code",
    language: "Language",
    search: "Search docs",
    theme: "Theme",
    themeOptions: { auto: "System", light: "Light", dark: "Dark" },
  },
});
// What GoodGood is: the home page's head tags and lead, the structured data and llms.txt.
export const about = withLanguages({
  ko: {
    title: "GoodGood · 빠르고 현대적이며 정보가 풍부한 Windows 작업 관리자",
    description:
      "GoodGood은 오픈 소스 Windows 작업 관리자입니다. GPU로 그리는 기본 인터페이스와 화면 주사율에 맞춰 흐르는 곡선, 포트, 파일 잠금, 프로세스별 디스크 입출력, 디스크 상태, 최근 7일 기록을 제공합니다.",
    lead: "GoodGood은 Rust로 Windows 기본 인터페이스를 직접 읽고 GPU로 화면을 그립니다. 프로세스, 성능, 서비스, 시작 프로그램, 네트워크 연결, 파일 잠금을 하나의 매끄러운 창에 모았습니다.",
  },
  en: {
    title: "GoodGood · A fast, modern, information-rich Windows task manager",
    description:
      "GoodGood is an open-source task manager for Windows: a native GPU-drawn interface, curves at the display's refresh rate, ports, file locks, per-process disk I/O, disk health and seven days of history.",
    lead: "GoodGood reads Windows directly in Rust and draws its window on the GPU. Processes, performance, services, startup apps, network connections and file locks share one fluid window.",
  },
});
export const jsonLd = (data: unknown) =>
  JSON.stringify(data).replaceAll("<", "\\u003c");
export const sourceFor = (lang: Language) => languageInfo(lang).tag;
export const mebibytes = (bytes: number) => (bytes / 1048576).toFixed(1);
// The withdrawn releases are left out; the last entry is the first release.
export const releases = (lang: Language) => site.changelog[lang].filter((note) => !note.withdrawn);
// The same entity on every page that describes it; the home page adds its features.
export function softwareSchema(lang: Language, features?: string[]) {
  const { release } = site;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": origin + "/#software",
    name: "GoodGood",
    url: origin + localized(lang),
    description: about[lang].description,
    image: origin + "/assets/goodgood.svg",
    screenshot: origin + "/assets/preview-" + notesLanguage(lang) + "-dark.png",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: site.translations[lang].operatingSystem,
    inLanguage: site.softwareLanguages,
    softwareVersion: release.version,
    datePublished: releases(lang).at(-1)?.date,
    dateModified: release.published.slice(0, 10),
    downloadUrl: release.files.installer.url,
    installUrl: origin + localized(lang, "/download/"),
    fileSize: mebibytes(release.files.installer.size) + " MiB",
    releaseNotes: origin + localized(lang, "/changelog/"),
    softwareHelp: { "@type": "CreativeWork", url: origin + stable.base },
    featureList: features,
    license: repo + "/blob/" + release.tag + "/LICENSE",
    isAccessibleForFree: true,
    sameAs: [repo],
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}
