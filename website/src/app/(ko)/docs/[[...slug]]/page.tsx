import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import {
  DocsBody,
  DocsPage,
  EditOnGitHub,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/spacious/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { BookOpen, Code, Layers, Map, Palette, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentProps, FC } from "react";
import {
  articleSchema,
  breadcrumbSchema,
  canonicalPath,
  editionOf,
  editionSummary,
  markdownUrl,
  pageDescription,
  pageTitle,
  resolveHref,
} from "@/lib/docs";
import { previewImage } from "@/lib/page";
import { development, jsonLd, origin, repo, stable } from "@/lib/site";
import { pathOf, source } from "@/lib/source";

type Props = { params: Promise<{ slug?: string[] }> };

const date = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return year + "년 " + month + "월 " + day + "일";
};

// The chapters of docs/README.md on the documentation home.
const chapters: Record<string, { icon: FC; text: string }> = {
  "사용 가이드": { icon: BookOpen, text: "인터페이스와 조작, 상주 모드와 바로 가기, 설정 항목, 하드웨어 데이터의 출처와 한계." },
  "개발 가이드": { icon: Code, text: "빌드 환경과 명령, 빌드 캐시, 성능 측정, 커밋과 릴리스, 코드 서명." },
  아키텍처: { icon: Layers, text: "수집 계층, 호스트, 권한 있는 서비스와 프런트엔드 등 모듈의 역할과 경계." },
  디자인: { icon: Palette, text: "디자인 원칙과 곡선, 창, 전역 바로 가기의 절충." },
};
const others: Record<string, FC> = { 로드맵: Map, "알려진 문제": TriangleAlert };

export default async function Page({ params }: Props) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  const edition = editionOf(page);
  const home = page.data.source === "docs/README.md";
  const { body: MDX, toc } = await page.data.load();
  const Link = defaultMdxComponents.a;
  return (
    <DocsPage toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(page)) }} />
      {!home && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleSchema(page)) }} />
      )}
      {/* Earlier links to the page used GitHub's fragment for the title. */}
      <span id={page.data.anchor} />
      <h1 className="text-[1.75em] font-semibold">{page.data.heading}</h1>
      {home && <p className="mb-2 text-lg text-fd-muted-foreground">{editionSummary(edition)}</p>}
      {!home && (
        <div className="mb-6 flex flex-row flex-wrap items-center gap-2 border-b pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl(page)} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl(page)}
            githubUrl={repo + "/blob/" + edition.ref + "/" + page.data.source}
            pageUrl={origin + pathOf(page)}
          />
        </div>
      )}
      <DocsBody className="docs-prose flex-1 text-fd-foreground/90">
        {/* The home's introduction only names the chapters the cards show. */}
        {!home && (
          <MDX
            components={{
              ...defaultMdxComponents,
              a: (props: ComponentProps<"a">) => (
                <Link {...props} href={resolveHref(edition, page.data.source, props.href)} />
              ),
              blockquote: Callout as unknown as FC<ComponentProps<"blockquote">>,
            }}
          />
        )}
        {home && (
          <>
            <Cards>
              {edition.nav
                .filter((group) => group.label in chapters)
                .map((group) => {
                  const Icon = chapters[group.label].icon;
                  return (
                    <Card key={group.label} icon={<Icon />} title={group.label} href={group.items[0].path}>
                      {chapters[group.label].text}
                    </Card>
                  );
                })}
            </Cards>
            <Callout title={edition === development ? "개발판 문서를 보고 있습니다" : "보고 있는 문서: " + edition.label}>
              {edition === development ? (
                <>
                  개발판은 main 브랜치를 따라 갱신되며 아직 릴리스하지 않은 변경을 담고 있습니다. 설치된 버전은
                  <Link href={stable.base}>안정판 문서</Link>를 참고하십시오.
                </>
              ) : (
                <>
                  안정판은 현재 정식 버전과 함께 배포됩니다. 아직 릴리스하지 않은 변경은
                  <Link href={development.base}>개발판 문서</Link>에서 확인할 수 있습니다.
                </>
              )}
            </Callout>
            <Cards>
              {edition.nav
                .filter((group) => !(group.label in chapters))
                .flatMap((group) => group.items)
                .map((item) => {
                  const Icon = others[item.label] ?? Map;
                  return <Card key={item.path} icon={<Icon />} title={item.label} href={item.path} />;
                })}
            </Cards>
          </>
        )}
      </DocsBody>
      <div className="flex flex-row flex-wrap items-center justify-between gap-4 empty:hidden">
        {page.data.updated && (
          <p className="text-sm text-fd-muted-foreground">마지막 업데이트: {date(page.data.updated)}</p>
        )}
        {edition === development && <EditOnGitHub href={repo + "/edit/main/" + page.data.source} />}
      </div>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  const title = pageTitle(page),
    description = pageDescription(page),
    home = page.data.source === "docs/README.md";
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: origin + canonicalPath(page),
      // The same page as Markdown, for language models and other tools.
      types: home ? undefined : { "text/markdown": origin + markdownUrl(page) },
    },
    // A page's openGraph replaces the layout's, so the shared fields repeat here.
    openGraph: {
      type: home ? "website" : "article",
      siteName: "GoodGood",
      title,
      description,
      url: origin + pathOf(page),
      images: previewImage("ko"),
      locale: "zh_CN",
      ...(!home && page.data.updated && { modifiedTime: page.data.updated }),
    },
  };
}
