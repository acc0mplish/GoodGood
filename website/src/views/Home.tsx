import { copyFor, localize } from "@/lib/site-i18n";
import type { CSSProperties, ReactNode } from "react";
import { DemoLanguage } from "@/components/replica/DemoLanguage";
import { demoDictionary } from "@/lib/demo";
import { languageInfo, languages } from "@/lib/languages";
import AccentPicker from "@/components/home/AccentPicker";
import CurveCompare from "@/components/home/CurveCompare";
import DeskWindow from "@/components/home/DeskWindow";
import FileDrop from "@/components/home/FileDrop";
import HeroTour from "@/components/home/HeroTour";
import LatencyBoard from "@/components/home/LatencyBoard";
import { OpenSource, ProjectStats } from "@/components/home/OpenSource";
import Releases, { longDate } from "@/components/home/Releases";
import ShowPage from "@/components/home/ShowPage";
import Taskbar from "@/components/home/Taskbar";
import { DownloadButton } from "@/components/site/DownloadButton";
import { Icon } from "@/components/site/Icon";
import { SiteFrame } from "@/components/site/SiteFrame";
import { SiteLink } from "@/components/site/SiteLink";
import { differences, docs, fastest, latency, questions } from "@/lib/home-content";
import { pageMetadata } from "@/lib/page";
import { about, localized, mebibytes, origin, releases, site, softwareSchema, stable, text, type Language } from "@/lib/site";

const r = site.release,
  installer = r.files.installer;
// The changelog dates releases by the maintainer's day, GitHub by UTC.
const releasedOn = (lang: Language) => {
  const note = site.changelog[lang][0];
  return note?.version === r.version ? note.date : r.published.slice(0, 10);
};
const copy = {
  en: {
    h1: ["A fast, modern,", "information-rich Windows task manager"],
    pill: ["Released ", "What's new"],
    replace: ["Replaces Task Manager", "opens GoodGood"],
    download: "Download for Windows",
    other: "Portable and checksums",
    facts: [r.tag + " · installer " + mebibytes(installer.size) + " MiB", "Windows 10 / 11 · x64", "Open source · Apache-2.0"],
    intro: ["Made for finding what is wrong.", " Pages appear within tens of milliseconds and curves move with the display; ports, file locks, per-process disk I/O, disk health and seven days of history are available in one place."],
    fast: ["Fast", "From a click to the page on screen, GoodGood needs a fraction of Task Manager's time.", " Back from CPU to Processes: " + fastest.goodgood + " ms against " + fastest.native + " ms."],
    note: "Median time from the mouse click until the window shows the target content.",
    raw: "Raw data",
    modern: ["Modern", "A native window drawn by the GPU, in step with every frame of the display.", " Look, accent and theme follow Windows."],
    curves: ["Curves that flow", "The same recorded load drawn two ways: GoodGood moves the curve at the display's refresh rate, Task Manager jumps once per update."],
    keys: ["Show or hide it any time", "The global shortcut can be changed or turned off. Hidden in the tray, the window stops drawing while sampling, history and rules continue."],
    native: ["Native from end to end", "Rust and GPUI Kit power the interface. Process and hardware data come from NT and Win32 interfaces; Direct3D 11 draws the window and DirectComposition composes it."],
    pipe: [["Collect", "NT · Win32"], ["Draw", "Direct3D 11"], ["Compose", "DirectComposition"], ["Display", "Refresh rate"]],
    rich: ["Information-rich", "What Task Manager leaves to other tools, or does not show.", " Only the rows where the two differ."],
    head: ["When you need", "GoodGood", "Task Manager"],
    changelog: [
      "Always improving",
      releases("en").length + " releases since the first on " + longDate(releases("en").at(-1)?.date ?? "", "en") + ".",
      " Every change is recorded in the changelog.",
    ],
    oss: ["Open source", "GoodGood is developed in the open on GitHub under Apache-2.0.", " Code, issues and releases are public; feedback and contributions are welcome."],
    faq: "Questions",
    more: "Read more",
    moreKorean: "Read more (Korean)",
    rotate: "Turn your phone sideways to see the full desktop",
    cta: ["Get GoodGood", "Free and open source. The installer downloads updates in the background and verifies each signature before installing."],
    install: "Download installer",
  },
  ko: {
    h1: ["빠르고 현대적이며 정보가 풍부한", "Windows 작업 관리자"],
    pill: ["배포일 ", "새 기능 보기"],
    replace: ["Windows 작업 관리자를 대체할 수 있으며", "GoodGood이 열립니다"],
    download: "Windows용 다운로드",
    other: "포터블 버전과 체크섬",
    facts: [r.tag + " · 설치 버전 " + mebibytes(installer.size) + " MiB", "Windows 10 / 11 · x64", "오픈 소스 · Apache-2.0"],
    intro: ["문제를 찾기 위해 만든 작업 관리자입니다.", " 클릭에서 화면이 나타나기까지 수십 밀리초면 충분하고 곡선은 화면 주사율에 맞춰 흐릅니다. 포트, 파일 잠금, 프로세스별 디스크 읽기/쓰기, 디스크 상태, 최근 7일 기록을 한 창에서 볼 수 있습니다."],
    fast: ["빠름", "클릭에서 대상 화면이 나타나기까지 GoodGood은 Windows 작업 관리자의 일부 시간만 필요로 합니다.", " CPU 성능에서 프로세스로 돌아오기: " + fastest.goodgood + "밀리초 대 " + fastest.native + "밀리초."],
    note: "중앙값입니다. 마우스를 클릭한 순간부터 창에 대상 내용이 나타날 때까지입니다.",
    raw: "원본 데이터",
    modern: ["현대적", "기본 인터페이스를 GPU로 그려 디스플레이의 매 프레임을 따라갑니다.", " 모양, 강조색, 밝고 어두운 테마가 Windows 설정을 따릅니다."],
    curves: ["끊김 없이 흐르는 곡선", "같은 실측 부하를 두 가지로 그렸습니다. GoodGood은 디스플레이 주사율에 맞춰 곡선을 옮기고, 작업 관리자는 새로 고칠 때마다 한 칸씩 건너뜁니다."],
    keys: ["언제든 열고 언제든 숨기기", "전역 바로 가기는 바꾸거나 끌 수 있습니다. 알림 영역에 숨기면 창은 그리기를 멈추고 수집, 기록, 규칙은 계속 실행됩니다."],
    native: ["수집부터 그리기까지 기본 기능", "인터페이스는 Rust와 GPUI Kit로 만들었고 프로세스와 하드웨어 데이터는 NT 및 Win32 인터페이스에서 직접 가져옵니다. 창은 Direct3D 11로 그리고 DirectComposition으로 합성합니다."],
    pipe: [["수집", "NT · Win32"], ["그리기", "Direct3D 11"], ["합성", "DirectComposition"], ["표시", "주사율에 맞춤"]],
    rich: ["정보가 풍부함", "작업 관리자에서는 다른 도구를 열어야 하거나 볼 수 없는 정보입니다.", " 아래 표는 두 프로그램이 다른 부분만 정리했습니다."],
    head: ["필요한 작업", "GoodGood", "작업 관리자"],
    changelog: [
      "꾸준한 개선",
      longDate(releases("ko").at(-1)?.date ?? "", "ko") + "에 첫 버전을 배포한 이후 정식 버전 " + releases("ko").length + "개를 배포했습니다.",
      " 버전마다의 변경 사항은 변경 기록에 기록됩니다.",
    ],
    oss: ["오픈 소스", "GoodGood은 Apache-2.0 라이선스로 GitHub에서 공개 개발합니다.", " 코드, 이슈, 배포 기록이 모두 공개되어 있으며 피드백과 기여를 환영합니다."],
    faq: "자주 묻는 질문",
    more: "자세한 설명",
    moreKorean: "자세한 설명(한국어)",
    rotate: "휴대폰을 가로로 돌리면 데스크톱 전체를 볼 수 있습니다",
    cta: ["GoodGood 받기", "무료 오픈 소스입니다. 설치 버전은 백그라운드에서 업데이트를 내려받고 설치 전에 서명을 확인합니다."],
    install: "설치 버전 다운로드",
  },
};

export const homeMetadata = (lang: Language) =>
  pageMetadata({ lang, path: "/", title: about[lang].title, description: about[lang].description });

// The site, the application with what it adds to Task Manager, and the questions below.
const homeSchema = (lang: Language) => [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": origin + "/#website",
    name: "GoodGood",
    url: origin + "/",
    description: about[lang].description,
    inLanguage: languages.map(item => item.tag),
    about: { "@id": origin + "/#software" },
  },
  softwareSchema(
    lang,
    differences(lang).map(([need, goodgood]) => need + (localize(lang, lang !== "ko" ? ": " : "：")) + goodgood),
  ),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": origin + localized(lang) + "#faq",
    inLanguage: languageInfo(lang).tag,
    mainEntity: questions(lang).map(([id, question, answer]) => ({
      "@type": "Question",
      "@id": origin + localized(lang) + "#" + id,
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  },
];

// The route loads the shared window and only the selected language's dictionary.
export function Home({ lang, demo }: { lang: Language; demo: ReactNode }) {
  const en = lang !== "ko",
    t = copyFor(lang, copy);
  // On a phone the comparison's cells stack, and Task Manager's is labelled
  // with its column's heading and the language's colon.
  const nativeLabel = t.head[2] + (["ko", "ko", "ja"].includes(lang) ? "：" : lang === "fr" ? "\u202f: " : ": ");
  const releaseSummary = lang === "ko" ? t.changelog[1] : localize(lang, `${releases(lang).length} releases since the first on ${longDate(releases(lang).at(-1)?.date ?? "", lang)}.`);
  return (
    <DemoLanguage lang={lang} dictionary={demoDictionary(lang)}>
    <SiteFrame
      lang={lang}
      path="/"
      title={about[lang].title}
      schema={homeSchema(lang)}
    >
      <section className="hero" aria-labelledby="hero-title">
        <div className="site-wrap hero-copy">
          <a className="hero-pill" href="#changelog">
            <b className="figures">{r.tag}</b>
            <span>
              {t.pill[0]}
              {longDate(releasedOn(lang), lang)}
            </span>
            <span className="hero-pill-more">
              {t.pill[1]}
              <Icon name="arrow" size={14} />
            </span>
          </a>
          {/* The lines are grid items; the space only keeps the words apart in the text. */}
          <h1 id="hero-title">
            <span>{t.h1[0]}</span> <span>{t.h1[1]}</span>
          </h1>
          <p className="hero-replace">
            <span className="hero-replace-what">
              <Icon name="replace" size={18} />
              {t.replace[0]}
            </span>
            <span className="hero-replace-keys">
              <kbd>Ctrl</kbd>
              <kbd>Shift</kbd>
              <kbd>Esc</kbd>
              {t.replace[1]}
            </span>
          </p>
          <p className="lead">{about[lang].lead}</p>
          <div className="button-row">
            <DownloadButton primary href={installer.url} started={text[lang].started}>
              {t.download}
            </DownloadButton>
            <SiteLink lang={lang} className="btn" href={localized(lang, "/download/")}>
              {t.other}
            </SiteLink>
          </div>
          <ul className="facts">
            {t.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
        {/* A 1920 × 1080 desktop drawn at the width of the page; the window can be
            resized and maximized, and the desktop shown full screen. */}
        <div className="stage" id="demo" data-motion="" data-markdown="skip">
          <div className="desk">
            <div className="wallpaper" aria-hidden="true">
              <i className="petal p1"></i>
              <i className="petal p2"></i>
              <i className="petal p3"></i>
              <i className="petal p4"></i>
            </div>
            <DeskWindow width={1600} height={900}>
              {demo}
            </DeskWindow>
            <Taskbar lang={lang} />
          </div>
          <p className="rotate-hint">
            <Icon name="rotate" size={18} />
            {t.rotate}
          </p>
          <HeroTour lang={lang} />
        </div>
      </section>

      <section className="site-wrap stats" aria-label={localize(lang, en ? "Project figures" : "프로젝트 데이터")}>
        <ProjectStats lang={lang} />
      </section>

      <section className="site-wrap intro">
        <p data-rise="">
          {t.intro[0]}
          <span>{t.intro[1]}</span>
        </p>
      </section>

      <section className="site-wrap section" id="fast" aria-labelledby="fast-title">
        <header className="section-head">
          <h2 id="fast-title" data-rise="">
            {t.fast[0]}
          </h2>
          <p data-rise="2">
            {t.fast[1]}
            <span>{t.fast[2]}</span>
          </p>
        </header>
        <div data-rise="3">
          <LatencyBoard rows={latency(lang)} lang={lang} />
        </div>
        <p className="note">
          {t.note}
          <a className="text-link" href="/benchmarks/windows-interaction.json">
            {t.raw}
          </a>
        </p>
      </section>

      <section className="site-wrap section" id="modern" aria-labelledby="modern-title">
        <header className="section-head">
          <h2 id="modern-title" data-rise="">
            {t.modern[0]}
          </h2>
          <p data-rise="2">
            {t.modern[1]}
            <span>{t.modern[2]}</span>
          </p>
        </header>
        <div className="feature-grid">
          <article className="cell cell-curves" data-spotlight="" data-rise="">
            <h3>{t.curves[0]}</h3>
            <p>{t.curves[1]}</p>
            <CurveCompare lang={lang} />
          </article>
          {(
            <article className="cell cell-accent" data-spotlight="" data-rise="2">
              <h3>{localize(lang, en ? "Follow the system accent" : "시스템 강조색 따르기")}</h3>
              <p>{localize(lang, en ? "Mica on Windows 11. Choose an accent to change the window above." : "Windows 11에서는 Mica 소재를 씁니다. 강조색을 선택하면 위 창이 함께 바뀝니다.")}</p>
              <AccentPicker />
            </article>
          )}
          <article className="cell cell-keys" data-spotlight="" data-rise="2" data-motion="">
            <div className="keys" aria-hidden="true">
              <kbd>
                <span>Ctrl</span>
              </kbd>
              <kbd>
                <span>Alt</span>
              </kbd>
              <kbd>
                <span>Esc</span>
              </kbd>
              <span className="mini-window">
                <img src="/assets/goodgood.svg" width="18" height="18" alt="" />
              </span>
            </div>
            <h3>{t.keys[0]}</h3>
            <p>{t.keys[1]}</p>
          </article>
          <article className="cell cell-native" data-spotlight="" data-rise="3" data-motion="">
            <h3>{t.native[0]}</h3>
            <p>{t.native[1]}</p>
            <ol className="pipeline" aria-hidden="true">
              {t.pipe.map(([name, detail], i) => (
                <li key={name} style={{ "--i": i } as CSSProperties}>
                  {i > 0 && (
                    <i className="pipe-line">
                      <i />
                    </i>
                  )}
                  <span className="pipe-node">
                    <b>{name}</b>
                    <small>{detail}</small>
                  </span>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </section>

      <section className="site-wrap section" id="rich" aria-labelledby="rich-title">
        <header className="section-head">
          <h2 id="rich-title" data-rise="">
            {t.rich[0]}
          </h2>
          <p data-rise="2">
            {t.rich[1]}
            <span>{t.rich[2]}</span>
          </p>
        </header>
        <div className="rich">
          <table className="diff-table" data-rise="">
            <caption className="sr-only">{t.rich[0]}</caption>
            <thead>
              <tr>
                {t.head.map((h) => (
                  <th scope="col" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {differences(lang).map(([need, goodgood, native, page], i) => (
                <tr key={need} style={{ "--i": i } as CSSProperties}>
                  <th scope="row">{need}</th>
                  <td className="yes">
                    {goodgood}
                    {page && <ShowPage page={page}>{localize(lang, en ? "See it in the demo" : "데모에서 보기")}</ShowPage>}
                  </td>
                  <td className="no" data-label={nativeLabel}>{native}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(
            <aside className="cell drop" data-spotlight="" data-motion="" data-markdown="skip">
              <h3>{localize(lang, en ? "Drop a file here" : "여기로 파일을 끌어다 놓기")}</h3>
              <p>{localize(lang, en ? "Only file names are read. Results are simulated in the browser; files stay on the device." : "파일 이름만 읽으며 브라우저 안에서 결과를 재현합니다. 파일은 전송하지 않습니다.")}</p>
              <FileDrop />
            </aside>
          )}
        </div>
      </section>

      <section className="site-wrap section" id="changelog" aria-labelledby="changelog-title">
        <header className="section-head">
          <h2 id="changelog-title" data-rise="">
            {t.changelog[0]}
          </h2>
          <p data-rise="2">
            {releaseSummary}
            <span>{t.changelog[2]}</span>
          </p>
        </header>
        <Releases notes={site.changelog[lang]} lang={lang} />
      </section>

      <section className="site-wrap section" id="open-source" aria-labelledby="oss-title">
        <header className="section-head">
          <h2 id="oss-title" data-rise="">
            {t.oss[0]}
          </h2>
          <p data-rise="2">
            {t.oss[1]}
            <span>{t.oss[2]}</span>
          </p>
        </header>
        <OpenSource lang={lang} guide={docs("docs/development/README.md")} />
      </section>

      <section className="site-wrap section faq" id="faq" aria-labelledby="faq-title">
        <header className="section-head">
          <h2 id="faq-title" data-rise="">
            {t.faq}
          </h2>
        </header>
        <div className="faq-list" data-rise="2">
          {questions(lang).map(([id, question, answer, link], i) => (
            <details id={id} key={id} open={i === 0} data-disclose="">
              <summary>
                {question}
                <Icon name="plus" size={18} />
              </summary>
              <div className="faq-answer">
                <p>{answer}</p>
                <SiteLink lang={lang} className="text-link" href={link}>
                  {en && link.startsWith("/docs/") ? copy.en.moreKorean : t.more} <Icon name="arrow" size={14} />
                </SiteLink>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="site-wrap cta" aria-labelledby="cta-title">
        <div className="cta-inner" data-spotlight="" data-rise="" data-motion="">
          <div className="cta-mark" aria-hidden="true">
            <img src="/assets/goodgood.svg" width="64" height="64" alt="" />
          </div>
          <h2 id="cta-title">{t.cta[0]}</h2>
          <p>{t.cta[1]}</p>
          <div className="button-row">
            <DownloadButton primary href={installer.url} started={text[lang].started}>
              {t.install}
            </DownloadButton>
            <SiteLink lang={lang} className="btn" href={localized(lang, "/download/")}>
              {t.other}
            </SiteLink>
          </div>
          <p className="fine">
            {r.tag} · {site.translations[lang].operatingSystem} ·
            <SiteLink lang={lang} href={stable.base}>
              {localize(lang, en ? "Documentation (Korean)" : "사용 문서")}
            </SiteLink>
          </p>
        </div>
      </section>
    </SiteFrame>
    </DemoLanguage>
  );
}
