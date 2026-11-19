import { copyFor, localize } from "@/lib/site-i18n";
import { development, localized, repo, site, stable, text, type Language } from "@/lib/site";
import { SiteLink } from "./SiteLink";

export function Footer({ lang = "ko" }: { lang?: Language }) {
  const t = text[lang],
    en = lang !== "ko";
  const columns = localize(lang, [
    {
      title: localize(lang, en ? "Product" : "제품"),
      links: [
        [localized(lang, "/download/"), t.download],
        [localized(lang, "/#faq"), t.questions],
        [localized(lang, "/changelog/"), t.changelog],
      ],
    },
    {
      title: localize(lang, en ? "Documentation" : "문서"),
      links: [
        [stable.base, localize(lang, en ? "Stable" : "안정판") + " " + site.release.tag],
        [development.base, localize(lang, en ? "Development" : "개발 빌드")],
        [stable.nav[0]?.items[0]?.path ?? stable.base, localize(lang, en ? "User guide" : "사용자 가이드")],
      ],
    },
    {
      title: localize(lang, en ? "Project" : "프로젝트"),
      links: [
        [repo, "GitHub"],
        [repo + "/issues", localize(lang, en ? "Issues" : "문제 보고")],
        [repo + "/blob/main/LICENSE", "Apache-2.0"],
      ],
    },
    {
      title: localize(lang, en ? "Policies" : "정책"),
      links: [
        [localized(lang, "/privacy/"), t.privacy],
        [localized(lang, "/signing/"), t.signing],
        [localized(lang, "/security/"), t.security],
      ],
    },
  ]);
  return (
    <footer className="site-wrap site-footer">
      <div className="footer-brand">
        <SiteLink lang={lang} className="brand" href={localized(lang)}>
          <img src="/assets/goodgood.svg" width="22" height="22" alt="" />
          GoodGood
        </SiteLink>
        <p>
          {localize(lang, en
            ? "A fast, modern, information-rich task manager for Windows."
            : "빠르고 현대적이며 정보가 풍부한 Windows 작업 관리자입니다.")}
        </p>
      </div>
      <nav className="footer-links" aria-label={localize(lang, en ? "Site" : "사이트")}>
        {columns.map((column) => (
          <div key={column.title}>
            <h2>{column.title}</h2>
            {column.links.map(([href, label]) => (
              <SiteLink lang={lang} key={label} href={href}>
                {label}
              </SiteLink>
            ))}
          </div>
        ))}
      </nav>
      <p className="footer-fine">
        © GoodGood contributors ·
        <a href={site.contact ? "mailto:contact@example.com" : repo + "/issues"}>{t.contact}</a>
      </p>
    </footer>
  );
}
