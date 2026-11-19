import { SiteFrame } from "@/components/site/SiteFrame";
import { pageMetadata } from "@/lib/page";

const title = "페이지를 찾을 수 없습니다 · GoodGood";

export const notFoundMetadata = pageMetadata({
  lang: "ko",
  path: "/404.html",
  title,
  description: "GoodGood 웹사이트나 문서로 이동하십시오.",
  alternate: false,
  noindex: true,
});

export function NotFound() {
  return (
    <SiteFrame lang="ko" path="/404.html" title={title} alternate={false} noindex>
      <div className="site-wrap">
        <header className="page-head">
          <h1>페이지를 찾을 수 없습니다</h1>
          <p>
            <a className="text-link" href="/">
              홈으로
            </a>
            ·
            <a className="text-link" href="/docs/">
              문서 보기
            </a>
          </p>
        </header>
      </div>
    </SiteFrame>
  );
}
