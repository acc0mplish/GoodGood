import { copyFor, localize } from "@/lib/site-i18n";
import type { CSSProperties } from "react";
import { longDate } from "@/components/home/Releases";
import { CopyButton } from "@/components/site/CopyButton";
import { DownloadButton } from "@/components/site/DownloadButton";
import { ReleaseBody } from "@/views/Changelog";
import { Icon, type IconName } from "@/components/site/Icon";
import { SiteFrame } from "@/components/site/SiteFrame";
import { SiteLink } from "@/components/site/SiteLink";
import { pageMetadata } from "@/lib/page";
import { changelogLanguage, downloadOrigin, localized, mebibytes, repo, site, softwareSchema, text, type Language } from "@/lib/site";

const title = (lang: Language) => (localize(lang, lang !== "ko" ? "Download GoodGood for Windows" : "GoodGood Windows 버전 다운로드"));
const description = (lang: Language) =>
  localize(lang, lang !== "ko"
    ? "Download the GoodGood Windows x64 installer or portable executable, and view the system requirements, release notes and SHA-256 checksums."
    : "GoodGood의 Windows x64 설치 버전이나 포터블 버전을 내려받고 시스템 요구 사항, 배포 정보, SHA-256 체크섬을 확인하십시오.");

export const downloadMetadata = (lang: Language) =>
  pageMetadata({ lang, path: "/download/", title: title(lang), description: description(lang) });

const copy = {
  ko: {
    h1: "GoodGood 다운로드",
    lead: "무료 오픈 소스 Windows 작업 관리자입니다. 설치 버전과 포터블 버전은 설정과 기록을 공유합니다.",
    released: "배포일",
    system: "Windows 10 / 11 · x64",
    recommended: "권장",
    copy: "SHA-256 복사",
    copied: "복사했습니다",
    after: ["설치한 다음", "내려받아 언제든 열기까지 몇 단계면 충분합니다."],
    steps: [
      ["설치 관리자 실행", "Program Files에 설치하고 시작 메뉴 바로 가기를 만듭니다. 포터블 버전은 바로 실행하면 됩니다."],
      ["첫 설정 마무리", "언어, 모양, 상주와 바로 가기, 업데이트 방식, 선택적인 권한 있는 서비스를 차례로 설정합니다. 어느 단계든 건너뛸 수 있습니다."],
      ["언제든 열기", "Ctrl+Alt+Esc로 창을 표시하거나 숨깁니다. 설정 → 권한에서 대체를 켜면 Ctrl+Shift+Esc로도 GoodGood이 열립니다."],
    ],
    notes: "새 기능",
    all: "전체 변경 기록",
    sums: "SHA256SUMS.txt",
    checks: "체크섬과 서명:",
    requirements: "시스템 요구 사항",
    history: ["이전 버전", "예전 버전은 GitHub 배포 페이지에서 내려받을 수 있습니다."],
    withdrawn: "철회됨",
    source: "GitHub 소스 코드",
  },
  en: {
    h1: "Download GoodGood",
    lead: "A free, open-source task manager for Windows. The installer and the portable edition share settings and history.",
    released: "Released",
    system: "Windows 10 / 11 · x64",
    recommended: "Recommended",
    copy: "Copy SHA-256",
    copied: "Copied",
    after: ["After installation", "A few steps from the download to a window that is always one key away."],
    steps: [
      ["Run the installer", "It installs to Program Files and adds a Start menu shortcut. The portable edition simply runs."],
      ["Finish the first-run guide", "Language, appearance, tray and shortcut, updates and the optional privileged service; every step can be skipped."],
      ["Open it any time", "Ctrl+Alt+Esc shows or hides the window. With the replacement on in Settings → Permissions, Ctrl+Shift+Esc opens GoodGood too."],
    ],
    notes: "What's new",
    all: "Full changelog",
    sums: "SHA256SUMS.txt",
    checks: "Checksums and signing:",
    requirements: "System requirements",
    history: ["Earlier releases", "Earlier versions are available on GitHub."],
    withdrawn: "Withdrawn",
    source: "Source code on GitHub",
  },
};

export function Download({ lang }: { lang: Language }) {
  const en = lang !== "ko",
    t = copyFor(lang, copy),
    r = site.release;
  const notes = site.changelog[lang];
  const current = notes[0]?.version === r.version ? notes[0] : null;
  const packages: { file: typeof r.files.installer; title: string; icon: IconName; points: string[]; action: string }[] = localize(lang, [
    {
      file: r.files.installer,
      title: localize(lang, en ? "Installer" : "설치 버전"),
      icon: "box",
      points: localize(lang, en
        ? ["Installs for all users in Program Files", "Start menu shortcut, uninstall from Windows Settings", "Updates in the app, downloaded in the background"]
        : ["모든 사용자를 위해 Program Files에 설치", "시작 메뉴 바로 가기를 만들고 Windows 설정에서 제거할 수 있음", "앱 안에서 업데이트하며 새 버전은 백그라운드에서 내려받음"]),
      action: localize(lang, en ? "Download installer" : "설치 버전 다운로드"),
    },
    {
      file: r.files.portable,
      title: localize(lang, en ? "Portable" : "포터블 버전"),
      icon: "file",
      points: localize(lang, en
        ? ["One executable, runs without installing", "Shares settings and history with the installer", "Tells you about new versions; update it by hand"]
        : ["설치 없이 바로 실행하는 단일 실행 파일", "설치 버전과 설정, 기록을 공유", "새 버전을 확인하고 배포 페이지에서 직접 업데이트"]),
      action: localize(lang, en ? "Download portable" : "포터블 버전 다운로드"),
    },
  ]);
  return (
    <SiteFrame lang={lang} path="/download/" title={title(lang)} schema={softwareSchema(lang)}>
      <div className="site-wrap download">
        <header className="dl-hero" data-motion="">
          <div className="cta-mark" aria-hidden="true">
            <img src="/assets/goodgood.svg" width="64" height="64" alt="" />
          </div>
          <h1>{t.h1}</h1>
          <p className="dl-lead">
            {t.lead}
          </p>
          <ul className="dl-meta">
            <li>
              <a href={repo + "/releases/tag/" + r.tag}>
                <Icon name="tag" size={15} />
                <span className="figures">{r.tag}</span>
              </a>
            </li>
            <li>
              <Icon name="clock" size={15} />
              <time dateTime={current?.date ?? r.published}>
                {localize(lang, en ? t.released + " " : "")}
                {longDate(current?.date ?? r.published.slice(0, 10), lang)}
                {localize(lang, en ? "" : t.released)}
              </time>
            </li>
            <li>
              <Icon name="monitor" size={15} />
              {t.system}
            </li>
            <li>
              <Icon name="scale" size={15} />
              Apache-2.0
            </li>
          </ul>
        </header>

        <div className="packages">
          {packages.map((pkg, i) => (
            <article key={pkg.file.name} className={i === 0 ? "package is-primary" : "package"} data-spotlight="" data-rise={i ? "2" : ""}>
              <div className="package-head">
                <span className="package-icon">
                  <Icon name={pkg.icon} size={24} />
                </span>
                <h2>{pkg.title}</h2>
                {i === 0 && <span className="package-badge">{t.recommended}</span>}
              </div>
              <ul className="package-points">
                {pkg.points.map((point) => (
                  <li key={point}>
                    <Icon name="check" size={16} />
                    {point}
                  </li>
                ))}
              </ul>
              <DownloadButton
                primary={i === 0}
                className="package-get"
                href={pkg.file.url}
                started={text[lang].started}
                extra={<span className="package-size figures">{mebibytes(pkg.file.size)} MiB</span>}
              >
                {pkg.action}
              </DownloadButton>
              <div className="package-file">
                <span className="figures">{pkg.file.name}</span>
                <details data-disclose="">
                  <summary>SHA-256</summary>
                  <span className="package-hash">
                    <code>{pkg.file.sha256}</code>
                    <CopyButton text={pkg.file.sha256} label={t.copy} done={t.copied} />
                  </span>
                </details>
              </div>
            </article>
          ))}
        </div>

        <section className="dl-steps" aria-labelledby="after-title">
          <header>
            <h2 id="after-title" data-rise="">
              {t.after[0]}
            </h2>
            <p data-rise="2">{t.after[1]}</p>
          </header>
          <ol>
            {t.steps.map(([name, detail], i) => (
              <li key={name} style={{ "--i": i } as CSSProperties} data-rise={String(i + 1)}>
                {/* The list already numbers the steps for assistive technology and the Markdown copy. */}
                <span className="dl-step-number figures" aria-hidden="true">{i + 1}</span>
                <h3>{name}</h3>
                <p>{detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="dl-more">
          {current && (
            <section className="panel dl-notes" data-rise="">
              <header className="dl-notes-head">
                <h2>
                  {r.tag} {t.notes}
                </h2>
                <SiteLink lang={lang} className="text-link" href={localized(lang, "/changelog/")}>
                  {t.all} <Icon name="arrow" size={14} />
                </SiteLink>
              </header>
              <div className="dl-release">
                {lang !== changelogLanguage(lang) && <p className="release-language">{localize(lang, changelogLanguage(lang) === "ko" ? "Release notes are shown in Korean." : "Release notes are shown in English.")}</p>}
                <ReleaseBody note={current} lang={lang} />
              </div>
              <h3 className="dl-history-title">{t.history[0]}</h3>
              <ul className="dl-history">
                {notes.slice(1).map((note) => (
                  <li key={note.version}>
                    <SiteLink lang={lang} className="figures" href={localized(lang, "/changelog/") + "#v" + note.version}>
                      v{note.version}
                    </SiteLink>
                    <time dateTime={note.date}>{longDate(note.date, lang)}</time>
                    {note.withdrawn && <span className="release-badge is-muted">{t.withdrawn}</span>}
                  </li>
                ))}
              </ul>
              <p className="dl-history-note">{t.history[1]}</p>
            </section>
          )}
          <div className="dl-side">
            <section className="panel site-prose" data-rise="2">
              <h2>{t.requirements}</h2>
              <div dangerouslySetInnerHTML={{ __html: site.translations[lang].requirements }} />
            </section>
            <p className="dl-fine">
              {t.checks}
              <a href={downloadOrigin + "/" + r.tag + "/SHA256SUMS.txt"}>{t.sums}</a>
              <SiteLink lang={lang} href={localized(lang, "/signing/")}>
                {text[lang].signing}
              </SiteLink>
              <a href={repo}>{t.source}</a>
            </p>
          </div>
        </div>
      </div>
    </SiteFrame>
  );
}
