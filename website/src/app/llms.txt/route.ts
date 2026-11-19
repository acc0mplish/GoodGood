import { differences, fastest, latency, questions } from "@/lib/home-content";
import { about, development, localized, mebibytes, origin, repo, site, stable } from "@/lib/site";

export const dynamic = "force-static";

// Home page links into the development edition; here they name the stable page
// that describes the released version, when it has one.
const absolute = (href: string) => {
  const [path, hash] = href.split(/#(.*)/s);
  const file = Object.keys(development.routes).find((name) => development.routes[name] === path);
  return origin + ((file && stable.routes[file]) || path) + (hash ? "#" + hash : "");
};
const markdown = (path: string) => origin + "/llms.mdx" + path + "content.md";

// The site for language models (llmstxt.org): what GoodGood is, the facts the home
// page states, and the stable documentation as Markdown.
export function GET() {
  const r = site.release,
    { installer, portable } = r.files;
  const released = site.changelog.en[0]?.version === r.version ? site.changelog.en[0].date : r.published.slice(0, 10);
  const lines = [
    "# GoodGood",
    "",
    "> " + about.en.description,
    "",
    about.en.lead,
    "",
    "한국어 소개: " + about.ko.description,
    "",
    `- Latest release: ${r.tag}, released ${released}`,
    "- System requirements: " + site.translations.en.operatingSystem,
    "- Price and license: free and open source under AGPL-3.0",
    `- Installer: ${installer.url} (${mebibytes(installer.size)} MiB, SHA-256 ${installer.sha256})`,
    `- Portable edition: ${portable.url} (${mebibytes(portable.size)} MiB, SHA-256 ${portable.sha256})`,
    "- Source code: " + repo,
    `- Measured speed: ${latency("en").find((row) => row.id === fastest.id)?.label} takes ${fastest.goodgood} ms in GoodGood and ${fastest.native} ms in Task Manager (median time from the click until the window shows the target content)`,
    "",
    "Compared with the Windows Task Manager (only the differences):",
    "",
    ...differences("en").map(([need, goodgood, native]) => `- ${need}: GoodGood — ${goodgood}. Task Manager — ${native}.`),
    "",
    "Questions:",
    "",
    ...questions("en").map(([, question, answer, link]) => `- ${question} ${answer} (${absolute(link)})`),
    "",
    `The documentation is written in Korean. The sections after Website link to the Markdown of each page in the stable edition, released with ${r.tag}.`,
    "",
    "## Website",
    "",
    `- [Home](${origin}/en/): overview in English; the Korean home page is ${origin}/`,
    `- [Download](${origin}/en/download/): installer, portable edition, system requirements and checksums`,
    `- [Changelog](${origin}/en/changelog/): new features, fixes and upgrade notes in every release`,
    `- [Privacy](${origin}/en/privacy/): local data, update requests and network connections`,
    `- [Security](${origin}/en/security/): reporting a vulnerability`,
    "",
    ...stable.nav.flatMap((group) => [
      "## " + group.label,
      "",
      ...group.items.map((item) => `- [${item.label}](${markdown(item.path)})` + (item.note ? ": " + item.note : "")),
      "",
    ]),
    "## Optional",
    "",
    `- [Full documentation](${origin}/llms-full.txt): every page above in one file, in Korean`,
    `- [Development documentation](${origin + development.base}): the main branch, with changes not yet released`,
    `- [Interaction latency](${origin}/benchmarks/windows-interaction.json): the raw measurements behind the speed figure`,
    `- [한국어 홈페이지](${origin + localized("ko")}): the home page in Korean`,
  ];
  return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
