import { copyFor, localize } from "@/lib/site-i18n";
import { SiteFrame } from "@/components/site/SiteFrame";
import { pageMetadata } from "@/lib/page";
import { repo, site, text, type Language, type Policy as PolicyName } from "@/lib/site";

const summary = (lang: Language, policy: PolicyName) => {
  const en = lang !== "ko";
  return {
    privacy: localize(lang, en
      ? "How GoodGood stores data and connects to update services."
      : "GoodGood의 로컬 데이터 저장, 업데이트 요청, 네트워크 연결에 관한 안내입니다."),
    signing: localize(lang, en ? "The project's public code signing policy." : "GoodGood 프로젝트의 공개 코드 서명 정책입니다."),
    security: localize(lang, en
      ? "Report a vulnerability privately to the GoodGood maintainers."
      : "GoodGood 관리자에게 보안 취약점을 비공개로 신고하십시오."),
  }[policy];
};

export const policyMetadata = (lang: Language, policy: PolicyName) =>
  pageMetadata({
    lang,
    path: "/" + policy + "/",
    title: text[lang][policy] + " · GoodGood",
    description: summary(lang, policy),
  });

export function Policy({ lang, policy }: { lang: Language; policy: PolicyName }) {
  const en = lang !== "ko",
    title = text[lang][policy];
  return (
    <SiteFrame lang={lang} path={"/" + policy + "/"} title={title}>
      <div className="site-wrap">
        <header className="page-head">
          <h1 data-rise="">{title}</h1>
          <p data-rise="2">{summary(lang, policy)}</p>
        </header>
        <article className="panel" data-rise="3">
          {policy === "security" ? (
            <div className="site-prose">
              <p>
                {localize(lang, en
                  ? "Send the affected GoodGood and Windows versions, reproduction steps and expected impact to the maintainers."
                  : "영향을 받은 GoodGood과 Windows 버전, 재현 단계, 예상되는 영향을 알려 주십시오.")}
              </p>
              <ul>
                <li>
                  <a href={repo + "/security/advisories/new"}>
                    {localize(lang, en ? "GitHub private vulnerability report" : "GitHub 비공개 취약점 신고")}
                  </a>
                </li>
                {site.contact && (
                  <li>
                    <a href="mailto:security@example.com">security@example.com</a>
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div
              className={"site-prose" + (policy === "privacy" ? " privacy-content" : "")}
              dangerouslySetInnerHTML={{ __html: site.translations[lang][policy] }}
            />
          )}
        </article>
      </div>
    </SiteFrame>
  );
}
